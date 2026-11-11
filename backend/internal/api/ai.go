package api

import (
	"net/http"
	"strings"
	"time"
)

func (s *Server) handleAIBid(w http.ResponseWriter, r *http.Request) {
	if !s.allow(r, "ai", 30, time.Minute) {
		writeError(w, http.StatusTooManyRequests, "rate_limited", "The agents need a moment. Try again shortly.")
		return
	}
	var body struct {
		AgentID string `json:"agentId"`
	}
	if err := decodeBody(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	job, err := s.store.GetJob(r.Context(), r.PathValue("id"))
	if err != nil {
		storeError(w, err)
		return
	}
	if job.OwnerUserID == currentUser(r).ID {
		writeError(w, http.StatusForbidden, "own_brief", "Your agents cannot bid on your own brief.")
		return
	}
	agent, err := s.store.GetAgent(r.Context(), body.AgentID)
	if err != nil {
		storeError(w, err)
		return
	}
	if agent.OwnerUserID != currentUser(r).ID {
		writeError(w, http.StatusForbidden, "not_your_agent", "Choose one of your own agents.")
		return
	}
	suggestion, provider := s.ai.DraftBid(r.Context(), job, agent)
	writeJSON(w, http.StatusOK, map[string]any{
		"suggestion": suggestion,
		"provider":   provider,
		"jobId":      job.ID,
		"agentId":    agent.ID,
	})
}

func (s *Server) handleAINegotiate(w http.ResponseWriter, r *http.Request) {
	if !s.allow(r, "ai", 30, time.Minute) {
		writeError(w, http.StatusTooManyRequests, "rate_limited", "The agents need a moment. Try again shortly.")
		return
	}
	var body struct {
		AgentID     string `json:"agentId"`
		LastMessage string `json:"lastMessage"`
		Amount      int    `json:"amount"`
	}
	if err := decodeBody(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	job, err := s.store.GetJob(r.Context(), r.PathValue("id"))
	if err != nil {
		storeError(w, err)
		return
	}
	agent, err := s.store.GetAgent(r.Context(), body.AgentID)
	if err != nil {
		storeError(w, err)
		return
	}
	if agent.OwnerUserID != currentUser(r).ID {
		writeError(w, http.StatusForbidden, "not_your_agent", "Choose one of your own agents.")
		return
	}
	suggestion, provider := s.ai.Negotiate(r.Context(), job, agent, strings.TrimSpace(body.LastMessage), body.Amount)
	writeJSON(w, http.StatusOK, map[string]any{
		"suggestion": suggestion,
		"provider":   provider,
		"jobId":      job.ID,
		"agentId":    agent.ID,
	})
}

func (s *Server) handleAIBrief(w http.ResponseWriter, r *http.Request) {
	if !s.allow(r, "ai", 30, time.Minute) {
		writeError(w, http.StatusTooManyRequests, "rate_limited", "The agents need a moment. Try again shortly.")
		return
	}
	var body struct {
		Title       string   `json:"title"`
		Description string   `json:"description"`
		Skills      []string `json:"skills"`
		BudgetMin   int      `json:"budgetMin"`
		BudgetMax   int      `json:"budgetMax"`
	}
	if err := decodeBody(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	if strings.TrimSpace(body.Title) == "" || strings.TrimSpace(body.Description) == "" {
		writeError(w, http.StatusBadRequest, "brief_required", "Add a title and description before asking for a review.")
		return
	}
	review, provider := s.ai.ReviewBrief(r.Context(), body.Title, body.Description, body.Skills, body.BudgetMin, body.BudgetMax)
	writeJSON(w, http.StatusOK, map[string]any{
		"review":   review,
		"provider": provider,
	})
}
