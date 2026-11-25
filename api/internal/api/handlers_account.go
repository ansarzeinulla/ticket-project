package api

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/biletflow/api/internal/email"
	"github.com/biletflow/api/internal/httpx"
	"github.com/biletflow/api/internal/store"
)

// CodeTokenInvalid is returned for a code that is wrong, expired, spent or out
// of tries. The cases share one answer deliberately - see store.ErrTokenInvalid.
const CodeTokenInvalid = "token_invalid"

type emailRequest struct {
	Email string `json:"email"`
}

// verifyEmailRequest confirms an address with the 6-digit code emailed to it.
type verifyEmailRequest struct {
	Email string `json:"email"`
	Code  string `json:"code"`
}

// resetPasswordRequest sets a new password with the 6-digit code emailed to
// the account's address.
type resetPasswordRequest struct {
	Email    string `json:"email"`
	Code     string `json:"code"`
	Password string `json:"password"`
}

// validCode accepts six digits, ignoring spaces a person may type or paste.
func validCode(code string) (string, bool) {
	code = strings.ReplaceAll(strings.TrimSpace(code), " ", "")
	if len(code) != 6 {
		return code, false
	}
	for _, r := range code {
		if r < '0' || r > '9' {
			return code, false
		}
	}
	return code, true
}

// acceptedResponse is the deliberately uninformative answer to both "send me a
// reset link" and "send me a verification link".
type acceptedResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}

// handleRequestPasswordReset issues a reset token and emails it (SRS 4.1).
//
// The response is the same whether or not the address has an account. Saying
// "no account with this email" would turn this form into a way of testing which
// addresses are registered, which is a privacy leak dressed as helpfulness.
func (s *Server) handleRequestPasswordReset(w http.ResponseWriter, r *http.Request) {
	var req emailRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, httpx.CodeInvalidJSON, err.Error())
		return
	}

	address := normalizeEmail(req.Email)
	if msg := validateEmail(address); msg != "" {
		errs := fieldErrors{}
		errs.add("email", msg)
		httpx.WriteValidationError(w, errs)
		return
	}

	issued, err := s.accountTokens.IssueForEmail(
		r.Context(), address, store.TokenPasswordReset, store.PasswordResetTTL)

	switch {
	case errors.Is(err, store.ErrNotFound):
		// Nothing to send, and nothing to say about it.
	case err != nil:
		httpx.WriteInternalError(w, r, err)
		return
	default:
		s.sendPasswordReset(issued)
	}

	httpx.WriteJSON(w, http.StatusAccepted, acceptedResponse{
		Status:  "accepted",
		Message: "If that address has an account, a reset code is on its way.",
	})
}

// handleResetPassword consumes a reset token and sets the new password.
func (s *Server) handleResetPassword(w http.ResponseWriter, r *http.Request) {
	var req resetPasswordRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, httpx.CodeInvalidJSON, err.Error())
		return
	}

	errs := fieldErrors{}
	address := normalizeEmail(req.Email)
	if msg := validateEmail(address); msg != "" {
		errs.add("email", msg)
	}
	code, ok := validCode(req.Code)
	if !ok {
		errs.add("code", "Enter the 6-digit code from the email.")
	}
	if msg := validatePassword(req.Password); msg != "" {
		errs.add("password", msg)
	}
	if errs.any() {
		httpx.WriteValidationError(w, errs)
		return
	}

	hash, err := s.hasher.Hash(req.Password)
	if err != nil {
		httpx.WriteInternalError(w, r, err)
		return
	}

	user, err := s.accountTokens.ConsumePasswordReset(r.Context(), address, code, hash)
	if errors.Is(err, store.ErrTokenInvalid) {
		httpx.WriteError(w, http.StatusBadRequest, CodeTokenInvalid,
			"This code is wrong or has expired. Check the latest email, or ask for a new code.")
		return
	}
	if err != nil {
		httpx.WriteInternalError(w, r, err)
		return
	}

	// No session is returned. Resetting a password proves control of an inbox,
	// not an intent to sign in on this device, and issuing a session here would
	// let a stolen reset code skip the login screen entirely.
	httpx.WriteJSON(w, http.StatusOK, acceptedResponse{
		Status:  "ok",
		Message: "Your password has been changed. Sign in with it now.",
	})
	_ = user
}

// handleRequestEmailVerification re-sends the confirmation for the signed-in
// account (SRS 4.1).
func (s *Server) handleRequestEmailVerification(w http.ResponseWriter, r *http.Request) {
	userID := mustUserID(r.Context())

	user, err := s.users.GetByID(r.Context(), userID)
	if err != nil {
		httpx.WriteInternalError(w, r, err)
		return
	}
	if user.EmailVerifiedAt != nil {
		httpx.WriteJSON(w, http.StatusOK, acceptedResponse{
			Status:  "ok",
			Message: "This address is already confirmed.",
		})
		return
	}

	issued, err := s.accountTokens.Issue(
		r.Context(), userID, store.TokenEmailVerification, store.EmailVerificationTTL)
	if err != nil {
		httpx.WriteInternalError(w, r, err)
		return
	}
	s.sendEmailVerification(issued)

	httpx.WriteJSON(w, http.StatusAccepted, acceptedResponse{
		Status:  "accepted",
		Message: "Check your inbox for the confirmation code.",
	})
}

type verifiedResponse struct {
	Status string `json:"status"`
	Email  string `json:"email"`
	State  string `json:"account_status"`
}

// handleVerifyEmail confirms an address with its 6-digit code.
//
// It needs no authentication: the code is the proof, and the address says
// whose code it is. Wrong codes are counted, so guessing gets five tries.
func (s *Server) handleVerifyEmail(w http.ResponseWriter, r *http.Request) {
	var req verifyEmailRequest
	if err := httpx.DecodeJSON(w, r, &req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, httpx.CodeInvalidJSON, err.Error())
		return
	}
	errs := fieldErrors{}
	address := normalizeEmail(req.Email)
	if msg := validateEmail(address); msg != "" {
		errs.add("email", msg)
	}
	code, ok := validCode(req.Code)
	if !ok {
		errs.add("code", "Enter the 6-digit code from the email.")
	}
	if errs.any() {
		httpx.WriteValidationError(w, errs)
		return
	}

	user, err := s.accountTokens.ConsumeEmailVerification(r.Context(), address, code)
	if errors.Is(err, store.ErrTokenInvalid) {
		httpx.WriteError(w, http.StatusBadRequest, CodeTokenInvalid,
			"This code is wrong or has expired. Check the latest email, or ask for a new code.")
		return
	}
	if err != nil {
		httpx.WriteInternalError(w, r, err)
		return
	}

	httpx.WriteJSON(w, http.StatusOK, verifiedResponse{
		Status: "verified", Email: user.Email, State: user.Status,
	})
}

// --- the notifications these produce ----------------------------------------

// sendPasswordReset emails a reset code (SRS 4.10).
func (s *Server) sendPasswordReset(issued store.IssuedToken) {
	msg := email.PasswordReset(email.AccountTokenDetails{
		FullName:  issued.FullName,
		Email:     issued.Email,
		Locale:    s.localeFor(issued.Email, ""),
		Code:      issued.Code,
		ExpiresIn: humanDuration(store.PasswordResetTTL),
	})
	userID := issued.UserID
	s.dispatch(msg, store.NotificationParams{
		UserID:         &userID,
		RecipientEmail: issued.Email,
	})
}

// sendEmailVerification emails a confirmation code (SRS 4.1).
func (s *Server) sendEmailVerification(issued store.IssuedToken) {
	msg := email.EmailVerification(email.AccountTokenDetails{
		FullName:  issued.FullName,
		Email:     issued.Email,
		Locale:    s.localeFor(issued.Email, ""),
		Code:      issued.Code,
		ExpiresIn: humanDuration(store.EmailVerificationTTL),
	})
	userID := issued.UserID
	s.dispatch(msg, store.NotificationParams{
		UserID:         &userID,
		RecipientEmail: issued.Email,
	})
}

// humanDuration renders a TTL the way a person would say it.
func humanDuration(d time.Duration) string {
	switch {
	case d >= 48*time.Hour:
		return itoa(int(d.Hours()/24)) + " days"
	case d >= time.Hour:
		hours := int(d.Hours())
		if hours == 1 {
			return "1 hour"
		}
		return itoa(hours) + " hours"
	default:
		return itoa(int(d.Minutes())) + " minutes"
	}
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	digits := ""
	for n > 0 {
		digits = string(rune('0'+n%10)) + digits
		n /= 10
	}
	return digits
}
