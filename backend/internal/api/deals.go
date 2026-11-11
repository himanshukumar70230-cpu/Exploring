package api

import (
	"net/http"
	"strings"

	"github.com/bidline/backend/internal/store"
)

func decorateDeal(deal *store.Deal, userID string) {
	switch userID {
	case deal.ClientUserID:
		deal.ViewerRole = "client"
	case deal.FreelancerUserID:
		deal.ViewerRole = "freelancer"
	default:
		deal.ViewerRole = ""
	}
}

func (s *Server) handleListDeals(w http.ResponseWriter, r *http.Request) {
	deals, err := s.store.ListDeals(r.Context(), currentUser(r).ID)
	if err != nil {
		storeError(w, err)
		return
	}
	for index := range deals {
		decorateDeal(&deals[index], currentUser(r).ID)
	}
	writeJSON(w, http.StatusOK, map[string]any{"deals": deals, "count": len(deals)})
}

func (s *Server) handleGetDeal(w http.ResponseWriter, r *http.Request) {
	deal, err := s.store.GetDealForUser(r.Context(), r.PathValue("id"), currentUser(r).ID)
	if err != nil {
		storeError(w, err)
		return
	}
	decorateDeal(deal, currentUser(r).ID)
	writeJSON(w, http.StatusOK, deal)
}

func (s *Server) handleFundEscrow(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Amount int `json:"amount"` // whole dollars, defaults to the unfunded balance
	}
	_ = decodeBody(r, &body)

	deal, err := s.store.GetDealForUser(r.Context(), r.PathValue("id"), currentUser(r).ID)
	if err != nil {
		storeError(w, err)
		return
	}
	amount := store.FromDollars(body.Amount)
	if body.Amount <= 0 {
		amount = deal.Amount - deal.Escrow
	}
	if amount <= 0 {
		writeError(w, http.StatusBadRequest, "nothing_to_fund", "This deal is already fully funded.")
		return
	}
	updated, err := s.store.FundEscrow(r.Context(), deal.ID, currentUser(r).ID, amount, "Bidline escrow")
	if err != nil {
		storeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (s *Server) handleSubmitMilestone(w http.ResponseWriter, r *http.Request) {
	deal, err := s.store.SubmitMilestone(r.Context(), r.PathValue("id"), r.PathValue("milestoneId"), currentUser(r).ID)
	if err != nil {
		storeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, deal)
}

func (s *Server) handleAcceptMilestone(w http.ResponseWriter, r *http.Request) {
	deal, err := s.store.AcceptMilestone(r.Context(), r.PathValue("id"), r.PathValue("milestoneId"), currentUser(r).ID, s.cfg.PlatformFeeBPS)
	if err != nil {
		storeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, deal)
}

func (s *Server) handleRejectMilestone(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Reason string `json:"reason"`
	}
	_ = decodeBody(r, &body)
	reason := strings.TrimSpace(body.Reason)
	if reason == "" {
		reason = "Changes requested before release."
	}
	deal, err := s.store.RejectMilestone(r.Context(), r.PathValue("id"), r.PathValue("milestoneId"), currentUser(r).ID, reason)
	if err != nil {
		storeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, deal)
}

func (s *Server) handleDealMessage(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Message string `json:"message"`
		Amount  int    `json:"amount"`
	}
	if err := decodeBody(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	deal, err := s.store.AddDealTurn(r.Context(), r.PathValue("id"), currentUser(r).ID, body.Message, store.FromDollars(body.Amount))
	if err != nil {
		storeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, deal)
}
