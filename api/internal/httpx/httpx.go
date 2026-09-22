// Package httpx holds the JSON response plumbing shared by every handler:
// one response writer and one error shape.
package httpx

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

// Error codes returned in the "code" field. Clients switch on these rather
// than on the human-readable message.
const (
	CodeNotFound         = "not_found"
	CodeMethodNotAllowed = "method_not_allowed"
	CodeInternal         = "internal_error"
)

// ErrorBody is the payload of every non-2xx response.
type ErrorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type errorEnvelope struct {
	Error ErrorBody `json:"error"`
}

// WriteJSON serialises v as JSON with the given status code.
func WriteJSON(w http.ResponseWriter, status int, v any) {
	body, err := json.Marshal(v)
	if err != nil {
		slog.Error("encode response", "error", err)
		status = http.StatusInternalServerError
		body = []byte(`{"error":{"code":"internal_error","message":"Failed to encode the response."}}`)
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

// WriteError writes the standard error envelope.
func WriteError(w http.ResponseWriter, status int, code, message string) {
	WriteJSON(w, status, errorEnvelope{Error: ErrorBody{Code: code, Message: message}})
}
