package api

import (
	"net/http"
	"strings"
	"time"
)

func (s *Server) handleDevLogin(w http.ResponseWriter, r *http.Request) {
	if !s.auth.DevEnabled() {
		writeError(w, http.StatusForbidden, "dev_auth_disabled", "Local demo auth is disabled. Sign in with Clerk.")
		return
	}
	if !s.allow(r, "dev-login", 12, time.Minute) {
		writeError(w, http.StatusTooManyRequests, "rate_limited", "Too many sign-in attempts. Try again in a minute.")
		return
	}
	var body struct {
		Email string `json:"email"`
		Name  string `json:"name"`
	}
	if err := decodeBody(r, &body); err != nil {
		// An empty body is fine; fall back to the configured demo account.
		body.Email = ""
	}
	if strings.TrimSpace(body.Email) == "" {
		body.Email = s.cfg.DevAuthEmail
	}
	token, expires, err := s.auth.NewDevToken(body.Email, body.Name)
	if err != nil {
		writeError(w, http.StatusForbidden, "dev_auth_disabled", err.Error())
		return
	}
	identity, err := s.auth.Verify(r.Context(), token)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not create a demo session.")
		return
	}
	user, err := s.store.UpsertUser(r.Context(), identity.Subject, identity.Email, identity.Name, "", "both")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not create your account.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"token":     token,
		"expiresAt": expires.UTC().Format(time.RFC3339),
		"provider":  "dev",
		"user":      user,
	})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	// Provision the default procurement agent on first load. If this fails the
	// same logic runs again when the user posts a brief, so it is best-effort.
	_, _ = s.store.EnsureProcurementAgent(r.Context(), *user)
	writeJSON(w, http.StatusOK, map[string]any{
		"user": user,
		"auth": map[string]bool{"clerk": s.auth.ClerkEnabled(), "dev": s.auth.DevEnabled()},
	})
}

func (s *Server) handleSync(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email     string `json:"email"`
		Name      string `json:"name"`
		AvatarURL string `json:"avatarUrl"`
		Role      string `json:"role"`
	}
	if err := decodeBody(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	if body.Role != "" && body.Role != "client" && body.Role != "freelancer" && body.Role != "both" {
		writeError(w, http.StatusBadRequest, "invalid_role", "Role must be client, freelancer, or both.")
		return
	}
	identity, err := s.auth.Verify(r.Context(), r.Header.Get("Authorization"))
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Sign in to continue.")
		return
	}
	updated, err := s.store.UpsertUser(r.Context(), identity.Subject, body.Email, body.Name, body.AvatarURL, "")
	if err != nil {
		storeError(w, err)
		return
	}
	if body.Role != "" || strings.TrimSpace(body.Name) != "" {
		updated, err = s.store.UpdateUser(r.Context(), updated.ID, body.Name, body.Role)
		if err != nil {
			storeError(w, err)
			return
		}
	}
	writeJSON(w, http.StatusOK, updated)
}
