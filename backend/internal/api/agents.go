package api

import (
	"net/http"
	"strings"

	"github.com/bidline/backend/internal/store"
)

func (s *Server) handleListAgents(w http.ResponseWriter, r *http.Request) {
	ownerID := ""
	if strings.EqualFold(r.URL.Query().Get("mine"), "true") {
		ownerID = currentUser(r).ID
	}
	agents, err := s.store.ListAgents(r.Context(), ownerID)
	if err != nil {
		storeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"agents": agents, "count": len(agents)})
}

func (s *Server) handleGetAgent(w http.ResponseWriter, r *http.Request) {
	agent, err := s.store.GetAgent(r.Context(), r.PathValue("id"))
	if err != nil {
		storeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, agent)
}

type agentRequest struct {
	Name       string   `json:"name"`
	Role       string   `json:"role"`
	Initials   string   `json:"initials"`
	Location   string   `json:"location"`
	Bio        string   `json:"bio"`
	Persona    string   `json:"persona"`
	Status     string   `json:"status"`
	Skills     []string `json:"skills"`
	HourlyRate int      `json:"hourlyRate"` // whole dollars
}

func (s *Server) handleCreateAgent(w http.ResponseWriter, r *http.Request) {
	var body agentRequest
	if err := decodeBody(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	agent, err := s.store.CreateAgent(r.Context(), *currentUser(r), store.CreateAgentInput{
		Name:       body.Name,
		Role:       body.Role,
		Initials:   body.Initials,
		Location:   body.Location,
		Bio:        body.Bio,
		Persona:    body.Persona,
		Status:     body.Status,
		Skills:     body.Skills,
		HourlyRate: body.HourlyRate * 100,
	})
	if err != nil {
		storeError(w, err)
		return
	}
	if err := s.store.InsertActivity(r.Context(), agent.Name, "joined the agent fleet", agent.Role); err != nil {
		// Activity is best-effort; the agent is already created.
		_ = err
	}
	writeJSON(w, http.StatusCreated, agent)
}

func (s *Server) handleUpdateAgent(w http.ResponseWriter, r *http.Request) {
	var body agentRequest
	if err := decodeBody(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	user := currentUser(r)
	agentID := r.PathValue("id")

	if body.Status != "" && body.Name == "" && body.Role == "" && body.Location == "" && body.Bio == "" && len(body.Skills) == 0 {
		agent, err := s.store.UpdateAgentStatus(r.Context(), user.ID, agentID, body.Status)
		if err != nil {
			storeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, agent)
		return
	}

	agent, err := s.store.UpdateAgent(r.Context(), user.ID, agentID, store.CreateAgentInput{
		Name: body.Name, Role: body.Role, Location: body.Location,
		Bio: body.Bio, Skills: body.Skills, Status: body.Status,
	})
	if err != nil {
		storeError(w, err)
		return
	}
	if body.HourlyRate > 0 {
		agent, err = s.store.SetAgentRate(r.Context(), user.ID, agentID, body.HourlyRate*100)
		if err != nil {
			storeError(w, err)
			return
		}
	}
	writeJSON(w, http.StatusOK, agent)
}
