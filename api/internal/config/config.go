// Package config loads the API's runtime settings from the environment.
package config

import "fmt"

// Config holds everything the API needs to start.
type Config struct {
	Env         string
	Host        string
	Port        int
	DatabaseURL string
}

// Load reads the configuration from the environment, applying defaults that
// match the docker-compose database.
func Load() (Config, error) {
	cfg := Config{
		Env:  envString("APP_ENV", "development"),
		Host: envString("API_HOST", "0.0.0.0"),
		DatabaseURL: envString("DATABASE_URL",
			"postgres://postgres:postgres@localhost:5432/biletflow"),
	}

	var err error
	if cfg.Port, err = envInt("APP_PORT", 8080); err != nil {
		return Config{}, err
	}
	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}
	if cfg.Port < 1 || cfg.Port > 65535 {
		return Config{}, fmt.Errorf("APP_PORT out of range: %d", cfg.Port)
	}
	return cfg, nil
}

// IsProduction reports whether the API runs in production.
func (c Config) IsProduction() bool {
	return c.Env == "production"
}

// Addr is the host:port the server listens on.
func (c Config) Addr() string {
	return fmt.Sprintf("%s:%d", c.Host, c.Port)
}
