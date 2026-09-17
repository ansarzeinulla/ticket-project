package api

import (
	"context"
	"net/http"
	"time"

	"github.com/biletflow/api/internal/httpx"
)

// handleHealth reports whether the API and its database are up.
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	if err := s.store.Ping(ctx); err != nil {
		httpx.WriteJSON(w, http.StatusServiceUnavailable,
			map[string]string{"status": "degraded", "database": "unreachable"})
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok", "database": "ok"})
}
