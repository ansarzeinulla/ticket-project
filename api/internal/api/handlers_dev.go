package api

import (
	"net/http"

	"github.com/biletflow/api/internal/httpx"
)

// handleDevConfig dumps the non-secret settings. Registered outside
// production only; it goes away once roles exist.
func (s *Server) handleDevConfig(w http.ResponseWriter, r *http.Request) {
	httpx.WriteJSON(w, http.StatusOK, map[string]any{
		"env":  s.cfg.Env,
		"addr": s.cfg.Addr(),
	})
}
