// Command api runs the BiletFlow HTTP API.
package main

import (
	"log/slog"
	"net/http"
	"os"

	"github.com/biletflow/api/internal/config"
	"github.com/biletflow/api/internal/httpx"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("startup failed", "error", err)
		os.Exit(1)
	}

	// No routes yet: every request gets the JSON error envelope, so clients
	// can rely on its shape from the first build.
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		httpx.WriteError(w, http.StatusNotFound, httpx.CodeNotFound, "Route not found.")
	})

	slog.Info("api listening", "addr", cfg.Addr(), "env", cfg.Env)
	if err := http.ListenAndServe(cfg.Addr(), handler); err != nil {
		slog.Error("server stopped", "error", err)
		os.Exit(1)
	}
}
