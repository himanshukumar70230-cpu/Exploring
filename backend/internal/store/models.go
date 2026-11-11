package store

import (
	"encoding/json"
	"fmt"
	"strconv"
)

// Money stores an amount in cents and serialises to whole dollars, matching the
// shapes the Bidline frontend already uses.
type Money int

func (m Money) MarshalJSON() ([]byte, error) {
	return strconv.AppendInt(nil, int64(m)/100, 10), nil
}

// UnmarshalJSON mirrors MarshalJSON: JSON carries whole dollars, so a decoded
// value must be converted back to cents. Without this, milestone plans stored
// as JSON read back 100x too small.
func (m *Money) UnmarshalJSON(data []byte) error {
	var dollars int64
	if err := json.Unmarshal(data, &dollars); err != nil {
		return err
	}
	*m = Money(dollars * 100)
	return nil
}

// Dollars returns the display value used across the product.
func (m Money) Dollars() int { return int(m) / 100 }

// Decimal renders the exact amount for payment providers, e.g. "112.00".
func (m Money) Decimal() string { return fmt.Sprintf("%d.%02d", int(m)/100, int(m)%100) }

// String renders the user-facing dollar amount.
func (m Money) String() string { return fmt.Sprintf("$%d", m.Dollars()) }

// FromDollars converts a whole-dollar amount into cents.
func FromDollars(dollars int) Money { return Money(dollars * 100) }

// User is a platform account. ClerkUserID is the Clerk subject (or a dev id).
type User struct {
	ID          string `json:"id"`
	ClerkUserID string `json:"-"`
	Email       string `json:"email"`
	Name        string `json:"name"`
	AvatarURL   string `json:"avatarUrl"`
	Role        string `json:"role"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

type Agent struct {
	ID          string   `json:"id"`
	OwnerUserID string   `json:"-"`
	Name        string   `json:"name"`
	Owner       string   `json:"owner"`
	Role        string   `json:"role"`
	Initials    string   `json:"initials"`
	Status      string   `json:"status"`
	Reputation  float64  `json:"reputation"`
	Deals       int      `json:"deals"`
	SuccessRate int      `json:"successRate"`
	Rate        string   `json:"rate"`
	Location    string   `json:"location"`
	Skills      []string `json:"skills"`
	Bio         string   `json:"bio"`
	Persona     string   `json:"-"`
	HourlyRate  Money    `json:"hourlyRate,omitempty"`
	CreatedAt   string   `json:"-"`
	UpdatedAt   string   `json:"-"`
}

type Bid struct {
	ID          string `json:"id"`
	AgentID     string `json:"agentId"`
	Agent       string `json:"agent"`
	Owner       string `json:"owner"`
	Amount      Money  `json:"amount"`
	Days        int    `json:"days"`
	Score       int    `json:"score"`
	Status      string `json:"status"`
	Note        string `json:"note"`
	Submitted   string `json:"submitted"`
	OwnerUserID string `json:"-"`
	CreatedAt   string `json:"-"`
}

type NegotiationTurn struct {
	ID        string `json:"-"`
	AgentID   string `json:"-"`
	From      string `json:"from"`
	Side      string `json:"side"`
	Message   string `json:"message"`
	Amount    Money  `json:"amount,omitempty"`
	Time      string `json:"time"`
	CreatedAt string `json:"-"`
}

type TimelineEvent struct {
	Time   string `json:"time"`
	Title  string `json:"title"`
	Detail string `json:"detail"`
	Kind   string `json:"kind"`
}

type Job struct {
	ID            string            `json:"id"`
	Slug          string            `json:"slug"`
	Title         string            `json:"title"`
	Category      string            `json:"category"`
	Description   string            `json:"description"`
	Client        string            `json:"client"`
	ClientHandle  string            `json:"clientHandle"`
	ClientAgent   string            `json:"clientAgent"`
	Company       string            `json:"company"`
	BudgetMin     Money             `json:"budgetMin"`
	BudgetMax     Money             `json:"budgetMax"`
	Currency      string            `json:"currency"`
	Deadline      string            `json:"deadline"`
	Posted        string            `json:"posted"`
	Status        string            `json:"status"`
	Priority      string            `json:"priority"`
	BidsCount     int               `json:"bidsCount"`
	Skills        []string          `json:"skills"`
	Scope         []string          `json:"scope"`
	Milestones    []Milestone       `json:"milestones"`
	Bids          []Bid             `json:"bids"`
	Negotiation   []NegotiationTurn `json:"negotiation"`
	OwnerUserID   string            `json:"-"`
	ClientAgentID string            `json:"clientAgentId,omitempty"`
	IsOwner       bool              `json:"isOwner"`
	MyBid         *Bid              `json:"myBid,omitempty"`
	CreatedAt     string            `json:"-"`
	UpdatedAt     string            `json:"-"`
}

type Milestone struct {
	ID       string `json:"id"`
	Position int    `json:"position"`
	Title    string `json:"title"`
	Amount   Money  `json:"amount"`
	Due      string `json:"due"`
	Status   string `json:"status"`
}

// MarshalJSON projects the internal settlement lifecycle onto the vocabulary
// the Bidline UI already uses: released -> paid, submitted -> active.
func (m Milestone) MarshalJSON() ([]byte, error) {
	status := m.Status
	switch status {
	case "released":
		status = "paid"
	case "submitted":
		status = "active"
	case "rejected":
		status = "pending"
	}
	type milestone Milestone
	return json.Marshal(struct {
		milestone
		Status       string `json:"status"`
		ActionStatus string `json:"actionStatus"`
	}{milestone: milestone(m), Status: status, ActionStatus: m.Status})
}

type Deal struct {
	ID               string            `json:"id"`
	JobID            string            `json:"jobId"`
	Title            string            `json:"title"`
	Client           string            `json:"client"`
	Freelancer       string            `json:"freelancer"`
	ClientAgent      string            `json:"clientAgent"`
	TalentAgent      string            `json:"talentAgent"`
	Amount           Money             `json:"amount"`
	Status           string            `json:"status"`
	Progress         int               `json:"progress"`
	Escrow           Money             `json:"escrow"`
	NextMilestone    string            `json:"nextMilestone"`
	Due              string            `json:"due"`
	Milestones       []Milestone       `json:"milestones"`
	Timeline         []TimelineEvent   `json:"timeline"`
	Negotiation      []NegotiationTurn `json:"negotiation"`
	ViewerRole       string            `json:"viewerRole,omitempty"`
	ClientUserID     string            `json:"-"`
	FreelancerUserID string            `json:"-"`
	ClientAgentID    string            `json:"-"`
	TalentAgentID    string            `json:"-"`
	CreatedAt        string            `json:"-"`
	UpdatedAt        string            `json:"-"`
}

type Transaction struct {
	ID           string `json:"id"`
	Date         string `json:"date"`
	Description  string `json:"description"`
	Counterparty string `json:"counterparty"`
	Type         string `json:"type"`
	Amount       Money  `json:"amount"`
	Status       string `json:"status"`
	Rail         string `json:"rail"`
	ExternalID   string `json:"-"`
	CreatedAt    string `json:"-"`
}

type Activity struct {
	Time      string `json:"time"`
	Actor     string `json:"actor"`
	Action    string `json:"action"`
	Meta      string `json:"meta"`
	UserID    string `json:"-"`
	CreatedAt string `json:"-"`
}

type Wallet struct {
	Available    Money         `json:"available"`
	InEscrow     Money         `json:"inEscrow"`
	Pending      Money         `json:"pending"`
	Currency     string        `json:"currency"`
	Transactions []Transaction `json:"transactions"`
}

type PayPalOrder struct {
	ID            string
	DealID        string
	UserID        string
	PayPalOrderID string
	Amount        Money
	Status        string
	ApprovalURL   string
}

type Dashboard struct {
	User             User       `json:"user"`
	ClientDeals      []Deal     `json:"clientDeals"`
	TalentDeals      []Deal     `json:"talentDeals"`
	Agents           []Agent    `json:"agents"`
	Activity         []Activity `json:"activity"`
	Wallet           Wallet     `json:"wallet"`
	Jobs             []Job      `json:"jobs"`
	OpenBriefs       int        `json:"openBriefs"`
	ActiveDeals      int        `json:"activeDeals"`
	ActiveBids       int        `json:"activeBids"`
	LeadingBids      int        `json:"leadingBids"`
	AwaitingApproval int        `json:"awaitingApproval"`
	TotalEarned      Money      `json:"totalEarned"`
}
