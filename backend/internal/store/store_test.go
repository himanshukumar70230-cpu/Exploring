package store

import (
	"context"
	"encoding/json"
	"path/filepath"
	"testing"
)

func TestMoneyJSONUsesWholeDollars(t *testing.T) {
	data, err := json.Marshal(FromDollars(9800))
	if err != nil {
		t.Fatalf("marshal money: %v", err)
	}
	if string(data) != "9800" {
		t.Fatalf("marshal = %s, want 9800", data)
	}

	var decoded Money
	if err := json.Unmarshal([]byte("9800"), &decoded); err != nil {
		t.Fatalf("unmarshal money: %v", err)
	}
	if decoded != FromDollars(9800) {
		t.Fatalf("unmarshal = %s, want $9800", decoded)
	}
}

func TestMilestonePlanSurvivesJSONRoundTrip(t *testing.T) {
	planned := defaultMilestones(FromDollars(10500))
	data, err := json.Marshal(planned)
	if err != nil {
		t.Fatalf("marshal milestones: %v", err)
	}

	var decoded []Milestone
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal milestones: %v", err)
	}
	if len(decoded) != len(planned) {
		t.Fatalf("decoded %d milestones, want %d", len(decoded), len(planned))
	}
	for index := range planned {
		if decoded[index].Amount != planned[index].Amount {
			t.Fatalf("milestone %d amount = %s, want %s", index, decoded[index].Amount, planned[index].Amount)
		}
	}
}

func testStore(t *testing.T) *Store {
	t.Helper()
	store, err := Open(filepath.Join(t.TempDir(), "bidline-test.db"))
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	t.Cleanup(func() { store.Close() })
	return store
}

func TestSeedAndLifecycle(t *testing.T) {
	ctx := context.Background()
	store := testStore(t)

	agents, err := store.ListAgents(ctx, "")
	if err != nil {
		t.Fatalf("list agents: %v", err)
	}
	if len(agents) != 14 {
		t.Fatalf("expected 14 seeded agents, got %d", len(agents))
	}

	jobs, err := store.ListJobs(ctx, JobFilter{})
	if err != nil {
		t.Fatalf("list jobs: %v", err)
	}
	if len(jobs) != 6 {
		t.Fatalf("expected 6 seeded jobs, got %d", len(jobs))
	}

	demo, err := store.UserByClerkID(ctx, "dev:demo@bidline.dev")
	if err != nil {
		t.Fatalf("demo user: %v", err)
	}
	deals, err := store.ListDeals(ctx, demo.ID)
	if err != nil {
		t.Fatalf("list deals: %v", err)
	}
	if len(deals) != 2 {
		t.Fatalf("expected 2 demo deals, got %d", len(deals))
	}

	wallet, err := store.WalletFor(ctx, demo.ID)
	if err != nil {
		t.Fatalf("wallet: %v", err)
	}
	if wallet.Available <= 0 {
		t.Fatalf("expected positive available balance, got %d", wallet.Available)
	}

	// Create a fresh brief as the demo client.
	job, err := store.CreateJob(ctx, *demo, CreateJobInput{
		Title:       "Launch a partner portal",
		Category:    "Development",
		Description: "Build a small partner portal with SSO and a usage dashboard.",
		Company:     "Northstar Studio",
		BudgetMin:   500000,
		BudgetMax:   800000,
		Deadline:    "20 Dec 2026",
		Skills:      []string{"Next.js", "SSO"},
		Scope:       []string{"Partner SSO", "Usage dashboard"},
	})
	if err != nil {
		t.Fatalf("create job: %v", err)
	}

	maya, err := store.UserByID(ctx, "USR-maya")
	if err != nil {
		t.Fatalf("maya user: %v", err)
	}
	bid, err := store.CreateBid(ctx, maya.ID, job.ID, CreateBidInput{
		AgentID: "loom",
		Amount:  650000,
		Days:    16,
		Score:   93,
		Note:    "Two milestones, weekly demos.",
	})
	if err != nil {
		t.Fatalf("create bid: %v", err)
	}
	if bid.Amount.Dollars() != 6500 {
		t.Fatalf("expected $6,500 bid, got %s", usd(bid.Amount))
	}

	deal, err := store.AcceptBid(ctx, demo.ID, job.ID, bid.ID)
	if err != nil {
		t.Fatalf("accept bid: %v", err)
	}
	if deal.Status != "active" || len(deal.Milestones) != 3 {
		t.Fatalf("unexpected deal after award: %+v", deal)
	}

	deal, err = store.FundEscrow(ctx, deal.ID, demo.ID, deal.Amount, "Bidline escrow")
	if err != nil {
		t.Fatalf("fund escrow: %v", err)
	}
	if deal.Escrow != deal.Amount {
		t.Fatalf("expected fully funded escrow, got %d", deal.Escrow)
	}

	deal, err = store.SubmitMilestone(ctx, deal.ID, deal.Milestones[0].ID, maya.ID)
	if err != nil {
		t.Fatalf("submit milestone: %v", err)
	}
	beforeWallet, err := store.WalletFor(ctx, maya.ID)
	if err != nil {
		t.Fatalf("maya wallet before release: %v", err)
	}
	deal, err = store.AcceptMilestone(ctx, deal.ID, deal.Milestones[0].ID, demo.ID, 150)
	if err != nil {
		t.Fatalf("accept milestone: %v", err)
	}
	if deal.Milestones[0].Status != "released" {
		t.Fatalf("expected first milestone released, got %s", deal.Milestones[0].Status)
	}
	if deal.Escrow >= deal.Amount {
		t.Fatalf("expected escrow to decrease, got %d", deal.Escrow)
	}

	mayaWallet, err := store.WalletFor(ctx, maya.ID)
	if err != nil {
		t.Fatalf("maya wallet: %v", err)
	}
	if mayaWallet.Available <= 0 {
		t.Fatalf("expected maya to be paid, got %d", mayaWallet.Available)
	}
	released := deal.Milestones[0].Amount
	fee := released * 150 / 10000
	if credited := mayaWallet.Available - beforeWallet.Available; credited != released-fee {
		t.Fatalf("maya credited %s, want %s (release %s minus %s fee)", credited, released-fee, released, fee)
	}
}

func TestCreatedJobMilestonesKeepTheirValue(t *testing.T) {
	ctx := context.Background()
	store := testStore(t)

	owner, err := store.UpsertUser(ctx, "clerk_milestone_owner", "owner@example.com", "Owner", "", "client")
	if err != nil {
		t.Fatalf("upsert user: %v", err)
	}
	job, err := store.CreateJob(ctx, *owner, CreateJobInput{
		Title:       "Analytics dashboard",
		Category:    "Development",
		Description: "Ship a dashboard.",
		BudgetMin:   int(FromDollars(9000)),
		BudgetMax:   int(FromDollars(12000)),
	})
	if err != nil {
		t.Fatalf("create job: %v", err)
	}

	var total Money
	for _, milestone := range job.Milestones {
		total += milestone.Amount
	}
	if total != FromDollars(10500) {
		t.Fatalf("milestone total = %s, want $10500", total)
	}
	if job.Milestones[0].Amount != FromDollars(2625) {
		t.Fatalf("first milestone = %s, want $2625", job.Milestones[0].Amount)
	}
}

func TestWithdrawRejectsOverdraft(t *testing.T) {
	ctx := context.Background()
	store := testStore(t)
	demo, err := store.UserByClerkID(ctx, "dev:demo@bidline.dev")
	if err != nil {
		t.Fatalf("demo user: %v", err)
	}
	if _, err := store.Withdraw(ctx, demo.ID, WithdrawInput{Amount: 999999999}); err == nil {
		t.Fatal("expected overdraft rejection")
	}
}

func TestScaleMilestonesFitsAwardedOffer(t *testing.T) {
	milestones := []Milestone{
		{Title: "Kickoff", Amount: FromDollars(1500)},
		{Title: "Build", Amount: FromDollars(4500)},
		{Title: "Launch", Amount: FromDollars(3000)},
	}
	scaled := scaleMilestones(milestones, FromDollars(7000))

	var total Money
	for _, milestone := range scaled {
		total += milestone.Amount
	}
	if total != FromDollars(7000) {
		t.Fatalf("scaled total = %s, want $7000", total)
	}
	if scaled[0].Amount < Money(116500) || scaled[0].Amount > Money(116800) {
		t.Fatalf("first tranche = %s, want about $1166.67", scaled[0].Amount)
	}
	if scaled[2].Amount <= 0 {
		t.Fatalf("final tranche must stay positive, got %s", scaled[2].Amount)
	}
	if milestones[0].Amount != FromDollars(1500) {
		t.Fatal("scaleMilestones mutated its input")
	}
}

func TestEnsureProcurementAgentIsIdempotent(t *testing.T) {
	ctx := context.Background()
	store := testStore(t)

	user, err := store.UpsertUser(ctx, "clerk_new_user", "new@example.com", "New User", "", "both")
	if err != nil {
		t.Fatalf("upsert user: %v", err)
	}

	first, err := store.EnsureProcurementAgent(ctx, *user)
	if err != nil {
		t.Fatalf("ensure procurement agent: %v", err)
	}
	if first.OwnerUserID != user.ID {
		t.Fatalf("agent owner = %s, want %s", first.OwnerUserID, user.ID)
	}

	second, err := store.EnsureProcurementAgent(ctx, *user)
	if err != nil {
		t.Fatalf("ensure procurement agent again: %v", err)
	}
	if second.ID != first.ID {
		t.Fatalf("second call created a new agent: %s vs %s", second.ID, first.ID)
	}

	agents, err := store.ListAgents(ctx, user.ID)
	if err != nil {
		t.Fatalf("list agents: %v", err)
	}
	if len(agents) != 1 {
		t.Fatalf("expected exactly one agent, got %d", len(agents))
	}
}
