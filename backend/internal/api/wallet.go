package api

import (
	"net/http"
	"strings"

	"github.com/bidline/backend/internal/store"
)

func (s *Server) handleGetWallet(w http.ResponseWriter, r *http.Request) {
	wallet, err := s.store.WalletFor(r.Context(), currentUser(r).ID)
	if err != nil {
		storeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, wallet)
}

func (s *Server) handleWithdraw(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Amount int    `json:"amount"`
		Rail   string `json:"rail"`
	}
	if err := decodeBody(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_body", err.Error())
		return
	}
	if body.Amount <= 0 {
		writeError(w, http.StatusBadRequest, "invalid_amount", "Withdrawal must be greater than zero.")
		return
	}
	if body.Rail == "" {
		body.Rail = "PayPal"
	}
	body.Rail = strings.TrimSpace(body.Rail)
	if !strings.EqualFold(body.Rail, "PayPal") {
		writeError(w, http.StatusBadRequest, "unsupported_rail", "PayPal is the only configured payout rail.")
		return
	}

	user := currentUser(r)
	amount := store.FromDollars(body.Amount)
	wallet, err := s.store.WalletFor(r.Context(), user.ID)
	if err != nil {
		storeError(w, err)
		return
	}
	if amount > wallet.Available {
		writeError(w, http.StatusBadRequest, "insufficient_funds", "The withdrawal is larger than your available balance.")
		return
	}

	payoutID, err := s.paypal.Payout(r.Context(), user.Email, amount, "Bidline wallet withdrawal")
	if err != nil {
		writeError(w, http.StatusBadGateway, "payout_failed", "PayPal could not start the payout. Try again shortly.")
		return
	}

	updated, err := s.store.Withdraw(r.Context(), user.ID, store.WithdrawInput{
		Amount:     amount,
		Rail:       body.Rail,
		ExternalID: payoutID,
	})
	if err != nil {
		storeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (s *Server) handleDashboard(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	deals, err := s.store.ListDeals(r.Context(), user.ID)
	if err != nil {
		storeError(w, err)
		return
	}
	agents, err := s.store.ListAgents(r.Context(), user.ID)
	if err != nil {
		storeError(w, err)
		return
	}
	wallet, err := s.store.WalletFor(r.Context(), user.ID)
	if err != nil {
		storeError(w, err)
		return
	}
	activity, err := s.store.ListActivity(r.Context(), 12)
	if err != nil {
		storeError(w, err)
		return
	}
	jobs, err := s.store.ListJobs(r.Context(), store.JobFilter{})
	if err != nil {
		storeError(w, err)
		return
	}

	clientDeals := []store.Deal{}
	talentDeals := []store.Deal{}
	active := 0
	awaitingApproval := 0
	for index := range deals {
		decorateDeal(&deals[index], user.ID)
		deal := deals[index]
		if deal.ClientUserID == user.ID {
			clientDeals = append(clientDeals, deal)
		}
		if deal.FreelancerUserID == user.ID {
			talentDeals = append(talentDeals, deal)
		}
		if deal.Status == "active" || deal.Status == "review" || deal.Status == "negotiating" {
			active++
		}
		if deal.ClientUserID == user.ID && deal.Status == "review" {
			awaitingApproval++
		}
	}
	openBriefs := 0
	activeBids := 0
	leadingBids := 0
	for index := range jobs {
		decorateJob(&jobs[index], user)
		job := jobs[index]
		if job.OwnerUserID == user.ID && (job.Status == "open" || job.Status == "negotiating") {
			openBriefs++
		}
		if job.MyBid != nil && (job.Status == "open" || job.Status == "negotiating") {
			activeBids++
			if job.MyBid.Status == "leading" {
				leadingBids++
			}
		}
	}
	earned := store.Money(0)
	for _, tx := range wallet.Transactions {
		if tx.Type == "release" && tx.Amount > 0 {
			earned += tx.Amount
		}
	}

	writeJSON(w, http.StatusOK, store.Dashboard{
		User:             *user,
		ClientDeals:      clientDeals,
		TalentDeals:      talentDeals,
		Agents:           agents,
		Activity:         activity,
		Wallet:           *wallet,
		Jobs:             jobs,
		OpenBriefs:       openBriefs,
		ActiveDeals:      active,
		ActiveBids:       activeBids,
		LeadingBids:      leadingBids,
		AwaitingApproval: awaitingApproval,
		TotalEarned:      earned,
	})
}
