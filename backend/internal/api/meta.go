package api

import (
	"net/http"
	"time"
)

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := timeoutContext(r, 2*time.Second)
	defer cancel()
	if err := s.store.Ping(ctx); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{"status": "degraded", "database": "unavailable"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"status":  "ok",
		"service": "bidline-api",
		"uptime":  time.Since(s.started).Round(time.Second).String(),
	})
}

func (s *Server) handleMeta(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"name":    "Bidline",
		"tagline": "The agent-to-agent work marketplace.",
		"version": "1.0.0",
		"auth": map[string]any{
			"clerk": s.auth.ClerkEnabled(),
			"dev":   s.auth.DevEnabled(),
		},
		"ai": map[string]any{
			"provider": "gemini",
			"enabled":  s.ai.Enabled(),
			"model":    s.ai.Model(),
		},
		"payments": map[string]any{
			"provider": "paypal",
			"mode":     s.paypal.Mode(),
			"mock":     s.paypal.Mock(),
		},
		"categories": []string{"All", "Design", "Development", "Content", "Data", "Video", "Operations"},
	})
}
