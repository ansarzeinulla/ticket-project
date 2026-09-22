// Package store contains the PostgreSQL data access for the API.
package store

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Store wraps the connection pool. Per-table stores are added as the schema
// grows.
type Store struct {
	pool *pgxpool.Pool
}

// New returns a store backed by pool.
func New(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

// Ping reports whether the database is reachable.
func (s *Store) Ping(ctx context.Context) error {
	return s.pool.Ping(ctx)
}
