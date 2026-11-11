package api

import (
	"net/http"
	"strings"

	"github.com/bidline/backend/internal/store"
)

func decorateJob(job *store.Job, user *store.User) {
	job.IsOwner = job.OwnerUserID == user.ID
	job.MyBid = nil
	for index := range job.Bids {
		if job.Bids[index].OwnerUserID == user.ID {
			bid := job.Bids[index]
			job.MyBid = &bid
			break
		}
	}
}

func (s *Server) handleListJobs(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	filter := store.JobFilter{
		Category: query.Get("category"),
		Status:   query.Get("status"),
		Query:    strings.TrimSpace(query.Get("q")),
		Sort:     query.Get("sort"),
	}
	if strings.EqualFold(query.Get("mine"), "true") {
		filter.OwnerID = currentUser(r).ID
	}
	jobs, err := s.store.ListJobs(r.Context(), filter)
	if err != nil {
		storeError(w, err)
		return
	}
	user := currentUser(r)
	for index := range jobs {
		decorateJob(&jobs[index], user)
	}
	writeJSON(w, http.StatusOK, map[string]any{"jobs": jobs, "count": len(jobs)})
}

func (s *Server) handleGetJob(w http.ResponseWriter, r *http.Request) {
	job, err := s.store.GetJob(r.Context(), r.PathValue("id"))
	if err != nil {
		storeError(w, err)
		return
	}
	decorateJob(job, currentUser(r))
	writeJSON(w, http.StatusOK, job)
}

type milestoneRequest struct {
	Title  string `json:"title"`
	Amount int    `json:"amount"` // whole dollars
	Due    string `json:"due"`
}

type createJobRequest struct {
	Title       string             `json:"title"`
	Category    string             `json:"category"`
	Description string             `json:"description"`
	Company     string             `json:"company"`
	BudgetMin   int                `json:"budgetMin"`
	BudgetMax   int                `json:"budgetMax"`
	Deadline    string             `json:"deadline"`
	Priority    string             `json:"priority"`
	Skills      []string           `json:"skills"`
	Scope       []string           `json:"scope"`
	Milestones  []milestoneRequest `json:"milestones"`
}

func (s *Server) handleCreateJob(w http.ResponseWriter, r *http.Request) {
	var body createJobRequest
	if err := decodeBody(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	if strings.TrimSpace(body.Title) == "" {
		writeError(w, http.StatusBadRequest, "title_required", "Give the brief a title.")
		return
	}
	if strings.TrimSpace(body.Description) == "" {
		writeError(w, http.StatusBadRequest, "description_required", "Describe the outcomes you need.")
		return
	}
	if body.BudgetMin <= 0 || body.BudgetMax < body.BudgetMin {
		writeError(w, http.StatusBadRequest, "invalid_budget", "Budget max must be greater than or equal to budget min.")
		return
	}
	if body.BudgetMax > 100_000_000 {
		writeError(w, http.StatusBadRequest, "invalid_budget", "That budget is outside the supported range.")
		return
	}

	milestones := make([]store.Milestone, 0, len(body.Milestones))
	for index, item := range body.Milestones {
		if strings.TrimSpace(item.Title) == "" || item.Amount <= 0 {
			continue
		}
		milestones = append(milestones, store.Milestone{
			Title:    strings.TrimSpace(item.Title),
			Amount:   store.FromDollars(item.Amount),
			Due:      strings.TrimSpace(item.Due),
			Status:   "pending",
			Position: index + 1,
		})
	}

	job, err := s.store.CreateJob(r.Context(), *currentUser(r), store.CreateJobInput{
		Title:       strings.TrimSpace(body.Title),
		Category:    strings.TrimSpace(body.Category),
		Description: strings.TrimSpace(body.Description),
		Company:     strings.TrimSpace(body.Company),
		BudgetMin:   int(store.FromDollars(body.BudgetMin)),
		BudgetMax:   int(store.FromDollars(body.BudgetMax)),
		Currency:    "USD",
		Deadline:    strings.TrimSpace(body.Deadline),
		Priority:    strings.TrimSpace(body.Priority),
		Skills:      cleanList(body.Skills),
		Scope:       cleanList(body.Scope),
		Milestones:  milestones,
	})
	if err != nil {
		storeError(w, err)
		return
	}
	decorateJob(job, currentUser(r))
	writeJSON(w, http.StatusCreated, job)
}

type createBidRequest struct {
	AgentID string `json:"agentId"`
	Amount  int    `json:"amount"` // whole dollars
	Days    int    `json:"days"`
	Score   int    `json:"score"`
	Note    string `json:"note"`
}

func (s *Server) handleCreateBid(w http.ResponseWriter, r *http.Request) {
	var body createBidRequest
	if err := decodeBody(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	if body.AgentID == "" {
		writeError(w, http.StatusBadRequest, "agent_required", "Choose one of your agents to bid.")
		return
	}
	if body.Amount <= 0 {
		writeError(w, http.StatusBadRequest, "invalid_amount", "Offer must be greater than zero.")
		return
	}
	job, err := s.store.GetJob(r.Context(), r.PathValue("id"))
	if err != nil {
		storeError(w, err)
		return
	}
	if job.OwnerUserID == currentUser(r).ID {
		writeError(w, http.StatusForbidden, "own_brief", "An agent cannot bid on its own client's brief.")
		return
	}
	bid, err := s.store.CreateBid(r.Context(), currentUser(r).ID, job.ID, store.CreateBidInput{
		AgentID: body.AgentID,
		Amount:  int(store.FromDollars(body.Amount)),
		Days:    body.Days,
		Score:   body.Score,
		Note:    strings.TrimSpace(body.Note),
	})
	if err != nil {
		storeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, bid)
}

type negotiationRequest struct {
	AgentID string `json:"agentId"`
	Message string `json:"message"`
	Amount  int    `json:"amount"` // whole dollars
}

func (s *Server) handleNegotiation(w http.ResponseWriter, r *http.Request) {
	var body negotiationRequest
	if err := decodeBody(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	job, err := s.store.GetJob(r.Context(), r.PathValue("id"))
	if err != nil {
		storeError(w, err)
		return
	}
	user := currentUser(r)

	input := store.AddTurnInput{
		Message: strings.TrimSpace(body.Message),
		Amount:  store.FromDollars(body.Amount),
	}
	if job.OwnerUserID == user.ID {
		input.Side = "client"
		input.From = job.ClientAgent
		input.AgentID = job.ClientAgentID
	} else {
		agent, err := s.store.GetAgent(r.Context(), body.AgentID)
		if err != nil {
			storeError(w, err)
			return
		}
		if agent.OwnerUserID != user.ID {
			writeError(w, http.StatusForbidden, "not_your_agent", "You can only negotiate with your own agent.")
			return
		}
		input.Side = "talent"
		input.From = agent.Name
		input.AgentID = agent.ID
	}

	turn, err := s.store.AddNegotiationTurn(r.Context(), job.ID, input)
	if err != nil {
		storeError(w, err)
		return
	}
	_ = s.store.InsertActivity(r.Context(), input.From, "posted in a negotiation room", job.Title)
	writeJSON(w, http.StatusCreated, turn)
}

func (s *Server) handleAward(w http.ResponseWriter, r *http.Request) {
	var body struct {
		BidID string `json:"bidId"`
	}
	if err := decodeBody(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	if strings.TrimSpace(body.BidID) == "" {
		writeError(w, http.StatusBadRequest, "bid_required", "Choose the offer to award.")
		return
	}
	deal, err := s.store.AcceptBid(r.Context(), currentUser(r).ID, r.PathValue("id"), body.BidID)
	if err != nil {
		storeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, deal)
}

func cleanList(items []string) []string {
	out := make([]string, 0, len(items))
	for _, item := range items {
		item = strings.TrimSpace(item)
		if item != "" {
			out = append(out, item)
		}
	}
	return out
}
