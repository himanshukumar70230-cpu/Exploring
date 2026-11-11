package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/bidline/backend/internal/ai"
	"github.com/bidline/backend/internal/api"
	"github.com/bidline/backend/internal/auth"
	"github.com/bidline/backend/internal/config"
	"github.com/bidline/backend/internal/payments"
	"github.com/bidline/backend/internal/store"
)

func main() {
	log.SetFlags(log.LstdFlags | log.LUTC)
	config.LoadDotEnv(".env")

	cfg := config.Load()
	if cfg.AppEnv == "production" && cfg.AuthDevMode {
		log.Fatal("refusing to start: AUTH_DEV_MODE cannot be enabled in production")
	}

	db, err := store.Open(cfg.DatabasePath)
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	defer db.Close()

	authenticator := auth.New(cfg)
	gemini := ai.New(cfg)
	paypal := payments.New(cfg)
	server := api.New(cfg, db, authenticator, gemini, paypal)

	httpServer := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           server.Handler(),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      0, // SSE connections stay open
		IdleTimeout:       2 * time.Minute,
	}

	go func() {
		log.Printf("Bidline API listening on :%s (env=%s, clerk=%t, devAuth=%t, gemini=%t, paypal=%s)",
			cfg.Port, cfg.AppEnv, authenticator.ClerkEnabled(), authenticator.DevEnabled(), gemini.Enabled(), paypal.Mode())
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("listen: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	log.Print("shutting down")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(ctx); err != nil {
		log.Printf("shutdown: %v", err)
	}
}
