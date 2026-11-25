package store

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Token purposes, mirroring the user_token_purpose enum.
const (
	TokenEmailVerification = "email_verification"
	TokenPasswordReset     = "password_reset"
)

// Code lifetimes and the number of wrong tries a code survives (BF-100).
//
// Both flows use a 6-digit code the person types where they already are, so a
// link that only works on one machine is never needed. A million possible
// codes is little, which is why each one dies after MaxCodeAttempts misses.
const (
	PasswordResetTTL     = 1 * time.Hour
	EmailVerificationTTL = 1 * time.Hour
	MaxCodeAttempts      = 5
)

// ErrTokenInvalid covers every way a code can fail to work: wrong, expired,
// already used, or out of tries.
//
// They are deliberately one error. Telling a caller that a token exists but has
// expired confirms the token was real, which is exactly the fact an attacker
// guessing tokens is trying to learn.
var ErrTokenInvalid = errors.New("token is invalid, expired or already used")

// IssuedToken is what the caller emails out. The plaintext code exists only in
// this struct and in the message; the database sees the hash.
type IssuedToken struct {
	Code      string
	ExpiresAt time.Time
	UserID    uuid.UUID
	Email     string
	FullName  string
}

// TokenStore issues and consumes single-use account tokens (SRS 4.1).
type TokenStore struct {
	pool *pgxpool.Pool
}

// NewTokenStore builds a TokenStore.
func NewTokenStore(pool *pgxpool.Pool) *TokenStore { return &TokenStore{pool: pool} }

// HashToken is the one-way function between what the user holds and what is
// stored. Exported so tests can look a value up the way the database does.
func HashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

// codeHash salts a code with its row id: six digits repeat across accounts and
// over time, and the stored hashes must stay unique and not be comparable.
func codeHash(rowID uuid.UUID, code string) string {
	return HashToken(rowID.String() + ":" + code)
}

// newAccountCode returns six random digits, leading zeros kept.
func newAccountCode() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1_000_000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

// Issue creates a code for a user, invalidating any earlier one for the same
// purpose.
//
// Superseding rather than accumulating matters: someone who clicks "forgot
// password" three times should not leave three working keys to their account
// lying in an inbox.
func (s *TokenStore) Issue(
	ctx context.Context, userID uuid.UUID, purpose string, ttl time.Duration,
) (IssuedToken, error) {
	code, err := newAccountCode()
	if err != nil {
		return IssuedToken{}, err
	}
	rowID := uuid.New()

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return IssuedToken{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, `
		UPDATE user_tokens SET consumed_at = now()
		 WHERE user_id = $1 AND purpose = $2::user_token_purpose AND consumed_at IS NULL`,
		userID, purpose); err != nil {
		return IssuedToken{}, mapError(err)
	}

	issued := IssuedToken{Code: code, UserID: userID}
	err = tx.QueryRow(ctx, `
		INSERT INTO user_tokens (id, user_id, purpose, token_hash, expires_at)
		VALUES ($1, $2, $3::user_token_purpose, $4, now() + $5::interval)
		RETURNING expires_at`,
		rowID, userID, purpose, codeHash(rowID, code), ttl.String(),
	).Scan(&issued.ExpiresAt)
	if err != nil {
		return IssuedToken{}, mapError(err)
	}

	if err := tx.QueryRow(ctx,
		`SELECT email::text, full_name FROM users WHERE id = $1`, userID,
	).Scan(&issued.Email, &issued.FullName); err != nil {
		return IssuedToken{}, mapError(err)
	}

	if err := tx.Commit(ctx); err != nil {
		return IssuedToken{}, mapError(err)
	}
	return issued, nil
}

// IssueForEmail issues a token addressed by email rather than by id.
//
// It returns ErrNotFound for an unknown address. The *handler* must not pass
// that distinction on to the caller - "no account with this email" turns the
// password-reset form into a way of testing which addresses are registered -
// but the store still reports honestly and lets the handler decide.
func (s *TokenStore) IssueForEmail(
	ctx context.Context, email, purpose string, ttl time.Duration,
) (IssuedToken, error) {
	var userID uuid.UUID
	err := s.pool.QueryRow(ctx, `SELECT id FROM users WHERE email = $1`, email).Scan(&userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return IssuedToken{}, ErrNotFound
	}
	if err != nil {
		return IssuedToken{}, mapError(err)
	}
	return s.Issue(ctx, userID, purpose, ttl)
}

// consume checks a code for the account with this address and, if it is right,
// marks it used. A wrong code costs one of its tries; the fifth miss kills it.
//
// It reports a miss with ok=false rather than an error, because the caller has
// to commit the spent try - rolling it back would give an attacker unlimited
// guesses.
func (s *TokenStore) consume(
	ctx context.Context, tx pgx.Tx, address, code, purpose string,
) (userID uuid.UUID, ok bool, err error) {
	var (
		rowID    uuid.UUID
		stored   string
		attempts int
	)
	err = tx.QueryRow(ctx, `
		SELECT t.id, t.user_id, t.token_hash, t.attempts
		  FROM user_tokens t
		  JOIN users u ON u.id = t.user_id
		 WHERE u.email = $1
		   AND t.purpose = $2::user_token_purpose
		   AND t.consumed_at IS NULL
		   AND t.expires_at > now()
		 ORDER BY t.created_at DESC
		 LIMIT 1
		   FOR UPDATE OF t`, address, purpose).Scan(&rowID, &userID, &stored, &attempts)
	if errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, false, nil
	}
	if err != nil {
		return uuid.Nil, false, mapError(err)
	}

	if codeHash(rowID, code) != stored {
		if _, err := tx.Exec(ctx, `
			UPDATE user_tokens
			   SET attempts = attempts + 1,
			       consumed_at = CASE WHEN attempts + 1 >= $2 THEN now() END
			 WHERE id = $1`, rowID, MaxCodeAttempts); err != nil {
			return uuid.Nil, false, mapError(err)
		}
		return uuid.Nil, false, nil
	}

	if _, err := tx.Exec(ctx,
		`UPDATE user_tokens SET consumed_at = now() WHERE id = $1`, rowID); err != nil {
		return uuid.Nil, false, mapError(err)
	}
	return userID, true, nil
}

// spend commits a missed try and reports the code as invalid.
func spend(ctx context.Context, tx pgx.Tx) error {
	if err := tx.Commit(ctx); err != nil {
		return mapError(err)
	}
	return ErrTokenInvalid
}

// VerifiedUser is the account state after a token has done its work.
type VerifiedUser struct {
	ID       uuid.UUID
	Email    string
	FullName string
	Status   string
}

// ConsumeEmailVerification marks an address verified (SRS 4.1).
func (s *TokenStore) ConsumeEmailVerification(ctx context.Context, address, code string) (VerifiedUser, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return VerifiedUser{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	userID, ok, err := s.consume(ctx, tx, address, code, TokenEmailVerification)
	if err != nil {
		return VerifiedUser{}, err
	}
	if !ok {
		return VerifiedUser{}, spend(ctx, tx)
	}

	// An account only leaves pending_verification here. A suspended account
	// verifying its address stays suspended: confirming an inbox is not an
	// appeal against moderation.
	var user VerifiedUser
	err = tx.QueryRow(ctx, `
		UPDATE users
		   SET email_verified_at = COALESCE(email_verified_at, now()),
		       status = CASE WHEN status = 'pending_verification'
		                     THEN 'active'::user_status ELSE status END
		 WHERE id = $1
		RETURNING id, email::text, full_name, status::text`, userID,
	).Scan(&user.ID, &user.Email, &user.FullName, &user.Status)
	if err != nil {
		return VerifiedUser{}, mapError(err)
	}

	if err := tx.Commit(ctx); err != nil {
		return VerifiedUser{}, mapError(err)
	}
	return user, nil
}

// ConsumePasswordReset sets a new password hash and invalidates every other
// outstanding token for the account.
//
// The second part matters: someone recovering an account they lost control of
// should not leave the attacker holding a working verification code.
func (s *TokenStore) ConsumePasswordReset(
	ctx context.Context, address, code, passwordHash string,
) (VerifiedUser, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return VerifiedUser{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	userID, ok, err := s.consume(ctx, tx, address, code, TokenPasswordReset)
	if err != nil {
		return VerifiedUser{}, err
	}
	if !ok {
		return VerifiedUser{}, spend(ctx, tx)
	}

	var user VerifiedUser
	err = tx.QueryRow(ctx, `
		UPDATE users SET password_hash = $2 WHERE id = $1
		RETURNING id, email::text, full_name, status::text`, userID, passwordHash,
	).Scan(&user.ID, &user.Email, &user.FullName, &user.Status)
	if err != nil {
		return VerifiedUser{}, mapError(err)
	}

	if _, err := tx.Exec(ctx, `
		UPDATE user_tokens SET consumed_at = now()
		 WHERE user_id = $1 AND consumed_at IS NULL`, userID); err != nil {
		return VerifiedUser{}, mapError(err)
	}

	if err := tx.Commit(ctx); err != nil {
		return VerifiedUser{}, mapError(err)
	}
	return user, nil
}
