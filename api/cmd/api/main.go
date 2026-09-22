// Command api runs the BiletFlow HTTP API.
package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/biletflow/api/internal/api"
	"github.com/biletflow/api/internal/config"
	"github.com/biletflow/api/internal/database"
	"github.com/biletflow/api/internal/store"
)

func main() {
	if err := run(); err != nil {
		slog.Error("startup failed", "error", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := database.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	server := &http.Server{
		Addr:    cfg.Addr(),
		Handler: api.New(cfg, store.New(pool)).Handler(),
	}
	go func() {
		<-ctx.Done()
		_ = server.Shutdown(context.Background())
	}()

	slog.Info("api listening", "addr", cfg.Addr(), "env", cfg.Env)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		return err
	}
	return nil
}
