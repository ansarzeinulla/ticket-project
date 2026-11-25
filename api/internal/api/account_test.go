package api

import (
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/biletflow/api/internal/email"
	"github.com/biletflow/api/internal/store"
)

// resetTokenFor reads the plaintext code out of the recorded email, which is
// the only place it exists outside the user's inbox.
func (c *client) resetTokenFor(address string) string {
	c.t.Helper()
	c.waitForMail()

	for _, msg := range c.mail.To(address) {
		if msg.Type == email.TypePasswordReset {
			return codeFromConsole(c.t, msg.Body)
		}
	}
	return ""
}

// TestPasswordResetDoesNotLeakWhoHasAnAccount is the reason the endpoint
// answers 202 either way.
func TestPasswordResetDoesNotLeakWhoHasAnAccount(t *testing.T) {
	c := newClient(t)
	account := c.register("leakcheck")

	real := c.post("/api/v1/auth/password-reset/request", "",
		map[string]any{"email": account.Email})
	unknown := c.post("/api/v1/auth/password-reset/request", "",
		map[string]any{"email": "nobody.here@biletflow.test"})

	if real.Status != unknown.Status {
		t.Errorf("known address answered %d, unknown answered %d - the difference "+
			"tells an attacker which addresses are registered",
			real.Status, unknown.Status)
	}
	if real.Raw != unknown.Raw {
		t.Errorf("the two responses differ:\n known:   %s\n unknown: %s", real.Raw, unknown.Raw)
	}

	// Only the real one actually produced a token.
	c.waitForMail()
	if got := len(c.mail.To("nobody.here@biletflow.test")); got != 0 {
		t.Errorf("emails to an unregistered address = %d, want 0", got)
	}
	// Registering also sent a verification email; count only reset emails.
	resets := 0
	for _, msg := range c.mail.To(account.Email) {
		if msg.Type == email.TypePasswordReset {
			resets++
		}
	}
	if resets != 1 {
		t.Errorf("reset emails to the registered address = %d, want 1", resets)
	}
}

// TestPasswordResetSupersedesEarlierTokens: clicking "forgot password" three
// times must not leave three working keys in an inbox.
func TestPasswordResetSupersedesEarlierTokens(t *testing.T) {
	c := newClient(t)
	account := c.register("supersede")

	requireStatus(t, c.post("/api/v1/auth/password-reset/request", "",
		map[string]any{"email": account.Email}), http.StatusAccepted)
	first := c.resetTokenFor(account.Email)

	c.mail.Reset()
	requireStatus(t, c.post("/api/v1/auth/password-reset/request", "",
		map[string]any{"email": account.Email}), http.StatusAccepted)
	second := c.resetTokenFor(account.Email)

	if first == "" || second == "" || first == second {
		t.Fatalf("expected two different tokens, got %q and %q", first, second)
	}

	// The older one is dead.
	requireErrorCode(t, c.post("/api/v1/auth/password-reset", "",
		map[string]any{"email": account.Email, "code": first, "password": "the older passphrase"}),
		http.StatusBadRequest, CodeTokenInvalid)

	// The newer one works.
	requireStatus(t, c.post("/api/v1/auth/password-reset", "",
		map[string]any{"email": account.Email, "code": second, "password": "the newer passphrase"}), http.StatusOK)
}

func TestPasswordResetRejectsExpiredTokens(t *testing.T) {
	c := newClient(t)
	account := c.register("expiredreset")

	requireStatus(t, c.post("/api/v1/auth/password-reset/request", "",
		map[string]any{"email": account.Email}), http.StatusAccepted)
	token := c.resetTokenFor(account.Email)

	// Age the token past its window rather than waiting an hour for it. Both
	// timestamps move: user_tokens_expiry_chk holds that a token's window was
	// non-empty when it was written, and an honest "issued two hours ago"
	// respects that where a bare expires_at in the past would not.
	if _, err := c.pool.Exec(t.Context(),
		`UPDATE user_tokens
		    SET created_at = now() - interval '2 hours',
		        expires_at = now() - interval '1 hour'
		  WHERE user_id = $1 AND purpose = 'password_reset' AND consumed_at IS NULL`, account.ID); err != nil {
		t.Fatalf("age the token: %v", err)
	}

	requireErrorCode(t, c.post("/api/v1/auth/password-reset", "",
		map[string]any{"email": account.Email, "code": token, "password": "too late for this"}),
		http.StatusBadRequest, CodeTokenInvalid)

	// And the old password still works, because nothing changed.
	requireStatus(t, c.post("/api/v1/auth/login", "",
		map[string]any{"email": account.Email, "password": account.Password}), http.StatusOK)
}

func TestPasswordResetValidatesTheNewPassword(t *testing.T) {
	c := newClient(t)
	account := c.register("weakreset")

	requireStatus(t, c.post("/api/v1/auth/password-reset/request", "",
		map[string]any{"email": account.Email}), http.StatusAccepted)
	token := c.resetTokenFor(account.Email)

	// Too short: refused, and the token is not burned by the attempt.
	requireStatus(t, c.post("/api/v1/auth/password-reset", "",
		map[string]any{"email": account.Email, "code": token, "password": "short"}), http.StatusUnprocessableEntity)

	requireStatus(t, c.post("/api/v1/auth/password-reset", "",
		map[string]any{"email": account.Email, "code": token, "password": "a long enough passphrase"}), http.StatusOK)
}

// TestPasswordResetStoresOnlyAHash: a leaked backup must not contain working
// reset links.
func TestPasswordResetStoresOnlyAHash(t *testing.T) {
	c := newClient(t)
	account := c.register("hashonly")

	requireStatus(t, c.post("/api/v1/auth/password-reset/request", "",
		map[string]any{"email": account.Email}), http.StatusAccepted)
	token := c.resetTokenFor(account.Email)

	var stored string
	if err := c.pool.QueryRow(t.Context(), `
		SELECT token_hash FROM user_tokens
		 WHERE consumed_at IS NULL AND purpose = 'password_reset'`).Scan(&stored); err != nil {
		t.Fatalf("read the stored token: %v", err)
	}
	if strings.Contains(stored, token) {
		t.Fatal("the plaintext code was stored in the database")
	}
	// Salted with the row id, so equal codes never share a hash.
	if len(stored) != 64 || stored == store.HashToken(token) {
		t.Errorf("the stored value %q is not a salted hash of the code", stored)
	}
}

func TestEmailVerificationActivatesTheAccount(t *testing.T) {
	c := newClient(t)
	account := c.registerUnverified("verifyme")

	// A new account starts unverified.
	var status string
	var verifiedAt *time.Time
	if err := c.pool.QueryRow(t.Context(),
		`SELECT status::text, email_verified_at FROM users WHERE id = $1`,
		account.ID).Scan(&status, &verifiedAt); err != nil {
		t.Fatalf("read the account: %v", err)
	}
	if status != "pending_verification" || verifiedAt != nil {
		t.Fatalf("a new account is %s / verified %v", status, verifiedAt)
	}

	c.mail.Reset()
	requireStatus(t, c.post("/api/v1/auth/verify-email/request", account.Token, nil),
		http.StatusAccepted)
	c.waitForMail()

	sent := c.mail.To(account.Email)
	if len(sent) != 1 || sent[0].Type != email.TypeEmailVerification {
		t.Fatalf("verification emails = %d", len(sent))
	}
	token := codeFromConsole(t, sent[0].Body)
	if token == "" {
		t.Fatalf("no token in the email:\n%s", sent[0].Body)
	}

	// Verifying needs no session: the link is followed from an inbox.
	verified := c.post("/api/v1/auth/verify-email", "", map[string]any{"email": account.Email, "code": token})
	requireStatus(t, verified, http.StatusOK)
	if verified.Body["account_status"] != "active" {
		t.Errorf("account_status = %v, want active", verified.Body["account_status"])
	}

	if err := c.pool.QueryRow(t.Context(),
		`SELECT status::text, email_verified_at FROM users WHERE id = $1`,
		account.ID).Scan(&status, &verifiedAt); err != nil {
		t.Fatalf("re-read the account: %v", err)
	}
	if status != "active" || verifiedAt == nil {
		t.Errorf("after verifying, the account is %s / verified %v", status, verifiedAt)
	}

	// Good once.
	requireErrorCode(t, c.post("/api/v1/auth/verify-email", "", map[string]any{"email": account.Email, "code": token}),
		http.StatusBadRequest, CodeTokenInvalid)

	// Asking again says there is nothing to do.
	requireStatus(t, c.post("/api/v1/auth/verify-email/request", account.Token, nil),
		http.StatusOK)
}

func TestVerifyEmailRejectsGarbage(t *testing.T) {
	c := newClient(t)

	requireStatus(t, c.post("/api/v1/auth/verify-email", "",
		map[string]any{"email": "someone@biletflow.test", "code": ""}), http.StatusUnprocessableEntity)
	requireStatus(t, c.post("/api/v1/auth/verify-email", "",
		map[string]any{"email": "someone@biletflow.test", "code": "12ab56"}), http.StatusUnprocessableEntity)
	requireErrorCode(t, c.post("/api/v1/auth/verify-email", "",
		map[string]any{"email": "someone@biletflow.test", "code": "123456"}), http.StatusBadRequest, CodeTokenInvalid)
}

// TestResetPasswordInvalidatesOtherTokens: somebody recovering a compromised
// account should not leave the attacker holding a working verification link.
func TestResetPasswordInvalidatesOtherTokens(t *testing.T) {
	c := newClient(t)
	account := c.registerUnverified("cleansweep")

	c.mail.Reset()
	requireStatus(t, c.post("/api/v1/auth/verify-email/request", account.Token, nil),
		http.StatusAccepted)
	c.waitForMail()
	verification := codeFromConsole(t, c.mail.To(account.Email)[0].Body)

	c.mail.Reset()
	requireStatus(t, c.post("/api/v1/auth/password-reset/request", "",
		map[string]any{"email": account.Email}), http.StatusAccepted)
	reset := c.resetTokenFor(account.Email)

	requireStatus(t, c.post("/api/v1/auth/password-reset", "",
		map[string]any{"email": account.Email, "code": reset, "password": "recovered this account"}), http.StatusOK)

	// The verification token issued before the reset is gone too.
	requireErrorCode(t, c.post("/api/v1/auth/verify-email", "",
		map[string]any{"email": account.Email, "code": verification}), http.StatusBadRequest, CodeTokenInvalid)
}

// TestResetPasswordIssuesNoSession: a stolen reset link must not skip login.
func TestResetPasswordIssuesNoSession(t *testing.T) {
	c := newClient(t)
	account := c.register("nosession")

	requireStatus(t, c.post("/api/v1/auth/password-reset/request", "",
		map[string]any{"email": account.Email}), http.StatusAccepted)
	token := c.resetTokenFor(account.Email)

	done := c.post("/api/v1/auth/password-reset", "",
		map[string]any{"email": account.Email, "code": token, "password": "changed it just now"})
	requireStatus(t, done, http.StatusOK)

	if _, issued := done.Body["access_token"]; issued {
		t.Error("resetting a password handed back a session token")
	}
}

// TestCodesDieAfterFiveWrongTries: six digits are guessable, so each code
// survives only five misses - after that even the right one is refused.
func TestCodesDieAfterFiveWrongTries(t *testing.T) {
	c := newClient(t)
	account := c.registerUnverified("fivetries")

	c.mail.Reset()
	requireStatus(t, c.post("/api/v1/auth/verify-email/request", account.Token, nil),
		http.StatusAccepted)
	c.waitForMail()
	code := codeFromConsole(t, c.mail.To(account.Email)[0].Body)

	wrong := "000000"
	if code == wrong {
		wrong = "111111"
	}
	for i := 0; i < store.MaxCodeAttempts; i++ {
		requireErrorCode(t, c.post("/api/v1/auth/verify-email", "",
			map[string]any{"email": account.Email, "code": wrong}), http.StatusBadRequest, CodeTokenInvalid)
	}
	requireErrorCode(t, c.post("/api/v1/auth/verify-email", "",
		map[string]any{"email": account.Email, "code": code}), http.StatusBadRequest, CodeTokenInvalid)

	// A new code works again.
	c.mail.Reset()
	requireStatus(t, c.post("/api/v1/auth/verify-email/request", account.Token, nil),
		http.StatusAccepted)
	c.waitForMail()
	fresh := codeFromConsole(t, c.mail.To(account.Email)[0].Body)
	requireStatus(t, c.post("/api/v1/auth/verify-email", "",
		map[string]any{"email": account.Email, "code": fresh}), http.StatusOK)
}

// TestCodesAcceptSpacesAndLastOneOnly: "123 456" pasted from an email works,
// and a wrong try below the limit does not spend the code.
func TestCodesAcceptSpacesAndLastOneOnly(t *testing.T) {
	c := newClient(t)
	account := c.register("spacedcode")

	requireStatus(t, c.post("/api/v1/auth/password-reset/request", "",
		map[string]any{"email": account.Email}), http.StatusAccepted)
	code := c.resetTokenFor(account.Email)

	wrong := "000000"
	if code == wrong {
		wrong = "111111"
	}
	requireErrorCode(t, c.post("/api/v1/auth/password-reset", "",
		map[string]any{"email": account.Email, "code": wrong, "password": "a long enough passphrase"}),
		http.StatusBadRequest, CodeTokenInvalid)

	spaced := code[:3] + " " + code[3:]
	requireStatus(t, c.post("/api/v1/auth/password-reset", "",
		map[string]any{"email": account.Email, "code": spaced, "password": "a long enough passphrase"}),
		http.StatusOK)
}

// SRS UC1: "Organizer has a verified account." A draft can be written by
// anyone, but it goes public only once the address is confirmed (BF-100).
func TestPublishingNeedsAConfirmedEmail(t *testing.T) {
	c := newClient(t)
	organizer := c.registerUnverified("unconfirmedorg")

	created := c.post("/api/v1/events", organizer.Token, validEventBody("Unconfirmed Gala"))
	requireStatus(t, created, http.StatusCreated)
	eventID := created.Body["event"].(map[string]any)["id"].(string)

	requireErrorCode(t, c.post("/api/v1/events/"+eventID+"/publish", organizer.Token, nil),
		http.StatusForbidden, CodeEmailUnverified)

	c.waitForMail()
	code := codeFromConsole(t, c.mail.To(organizer.Email)[0].Body)
	requireStatus(t, c.post("/api/v1/auth/verify-email", "",
		map[string]any{"email": organizer.Email, "code": code}), http.StatusOK)

	requireStatus(t, c.post("/api/v1/events/"+eventID+"/publish", organizer.Token, nil), http.StatusOK)
}
