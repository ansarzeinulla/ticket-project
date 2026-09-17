// Package api wires HTTP routes to handlers.
package api

import (
	"net/http"

	"github.com/biletflow/api/internal/config"
	"github.com/biletflow/api/internal/httpx"
	"github.com/biletflow/api/internal/store"
)

// Server holds the dependencies every handler needs.
type Server struct {
	cfg   config.Config
	store *store.Store
}

// New builds a server.
func New(cfg config.Config, st *store.Store) *Server {
	return &Server{cfg: cfg, store: st}
}

// Handler returns the router.
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", s.handleHealth)
	if !s.cfg.IsProduction() {
		mux.HandleFunc("GET /dev/config", s.handleDevConfig)
	}
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		httpx.WriteError(w, http.StatusNotFound, httpx.CodeNotFound, "Route not found.")
	})
	return mux
}
