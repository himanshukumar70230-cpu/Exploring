package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"github.com/bidline/backend/internal/store"
)

// BidSuggestion is the structured output used by the bid panel.
type BidSuggestion struct {
	Amount    int    `json:"amount"` // whole dollars, matching the frontend
	Days      int    `json:"days"`
	Score     int    `json:"score"`
	Note      string `json:"note"`
	Rationale string `json:"rationale"`
}

type NegotiationSuggestion struct {
	Message string `json:"message"`
	Amount  int    `json:"amount"`
}

type BriefReview struct {
	Summary   string   `json:"summary"`
	Scope     []string `json:"scope"`
	Questions []string `json:"questions"`
	BudgetMin int      `json:"budgetMin"`
	BudgetMax int      `json:"budgetMax"`
	Provider  string   `json:"provider"`
	Model     string   `json:"model,omitempty"`
}

// DraftBid asks Gemini for a competitive offer, then validates it against the
// brief. Any failure produces a deterministic local suggestion instead.
func (c *Client) DraftBid(ctx context.Context, job *store.Job, agent *store.Agent) (BidSuggestion, string) {
	fallback := heuristicBid(job, agent)
	if !c.Enabled() {
		return fallback, "heuristic"
	}

	system := "You are an autonomous freelancer agent bidding in a professional marketplace. " +
		"You are candid, specific, and protect your margin. Reply with JSON only."
	prompt := fmt.Sprintf(`Draft a bid for this brief.

AGENT
Name: %s
Role: %s
Bio: %s
Persona: %s
Reputation: %.1f/5 · %d deals · %d%% success
Rate: %s

BRIEF
Title: %s
Category: %s
Client: %s (%s)
Description: %s
Budget: $%d–$%d USD
Deadline: %s
Skills: %s
Scope:
%s

Return JSON exactly like:
{"amount": 9800, "days": 18, "score": 94, "note": "two-sentence bid to the client", "rationale": "one sentence on pricing and risk"}
Rules:
- amount must be a whole number inside the budget range
- days between 5 and 60
- score between 70 and 99, reflecting fit
- note must mention a concrete plan and one risk you will manage
- do not use markdown`,
		agent.Name, agent.Role, agent.Bio, agent.Persona, agent.Reputation, agent.Deals, agent.SuccessRate, agent.Rate,
		job.Title, job.Category, job.Client, job.Company, job.Description,
		job.BudgetMin.Dollars(), job.BudgetMax.Dollars(), job.Deadline,
		strings.Join(job.Skills, ", "), bulletList(job.Scope),
	)

	text, model, err := c.Generate(ctx, system, prompt, true)
	if err != nil {
		log.Printf("ai: bid drafting fell back to heuristic: %v", err)
		return fallback, "heuristic"
	}
	var suggestion BidSuggestion
	if err := decodeJSON(text, &suggestion); err != nil {
		log.Printf("ai: bid drafting returned unreadable JSON (%v): %.240s", err, text)
		return fallback, "heuristic"
	}
	suggestion = sanitizeBid(suggestion, job, fallback)
	return suggestion, "gemini:" + model
}

func (c *Client) Negotiate(ctx context.Context, job *store.Job, agent *store.Agent, lastMessage string, counter int) (NegotiationSuggestion, string) {
	fallback := heuristicNegotiation(job, agent, lastMessage, counter)
	if !c.Enabled() {
		return fallback, "heuristic"
	}
	system := "You are an autonomous freelancer agent negotiating a fixed-scope project. " +
		"Stay professional, never bluff, and trade scope for price. Reply with JSON only."
	prompt := fmt.Sprintf(`Write the next negotiation message.

AGENT: %s — %s
Persona: %s
BRIEF: %s
Budget: $%d–$%d
Client's latest message: %s
Your target amount: $%d

Return JSON exactly like:
{"message": "2-4 sentence reply that moves the deal forward", "amount": 9800}
If you are holding your price, repeat your amount. If you are conceding, explain what scope moved.`,
		agent.Name, agent.Role, agent.Persona, job.Title,
		job.BudgetMin.Dollars(), job.BudgetMax.Dollars(), lastMessage, fallback.Amount)

	text, model, err := c.Generate(ctx, system, prompt, true)
	if err != nil {
		log.Printf("ai: negotiation fell back to heuristic: %v", err)
		return fallback, "heuristic"
	}
	var suggestion NegotiationSuggestion
	if err := decodeJSON(text, &suggestion); err != nil {
		log.Printf("ai: negotiation returned unreadable JSON (%v): %.240s", err, text)
		return fallback, "heuristic"
	}
	if strings.TrimSpace(suggestion.Message) == "" {
		return fallback, "heuristic"
	}
	if suggestion.Amount < job.BudgetMin.Dollars() || suggestion.Amount > job.BudgetMax.Dollars() {
		suggestion.Amount = fallback.Amount
	}
	return suggestion, "gemini:" + model
}

func (c *Client) ReviewBrief(ctx context.Context, title, description string, skills []string, budgetMin, budgetMax int) (BriefReview, string) {
	fallback := heuristicBrief(title, description, skills, budgetMin, budgetMax)
	if !c.Enabled() {
		fallback.Provider = "heuristic"
		return fallback, "heuristic"
	}
	system := "You are a procurement agent who turns rough briefs into scoped, buyable work. " +
		"Be specific and avoid filler. Reply with JSON only."
	prompt := fmt.Sprintf(`Review this project brief.

Title: %s
Description: %s
Skills: %s
Budget: $%d–$%d

Return JSON exactly like:
{"summary": "one sentence on what is clear and what is missing", "scope": ["four measurable scope items"], "questions": ["three questions the client must answer"], "budgetMin": 8000, "budgetMax": 12000}
Use whole dollars. Keep scope items under 18 words.`,
		title, description, strings.Join(skills, ", "), budgetMin, budgetMax)

	text, model, err := c.Generate(ctx, system, prompt, true)
	if err != nil {
		log.Printf("ai: brief review fell back to heuristic: %v", err)
		fallback.Provider = "heuristic"
		return fallback, "heuristic"
	}
	var review BriefReview
	if err := decodeJSON(text, &review); err != nil || len(review.Scope) == 0 {
		log.Printf("ai: brief review returned unusable JSON (%v): %.240s", err, text)
		fallback.Provider = "heuristic"
		return fallback, "heuristic"
	}
	if review.BudgetMin > 0 && review.BudgetMax >= review.BudgetMin {
		fallback.BudgetMin = review.BudgetMin
		fallback.BudgetMax = review.BudgetMax
	}
	if review.Summary != "" {
		fallback.Summary = review.Summary
	}
	fallback.Scope = review.Scope
	if len(review.Questions) > 0 {
		fallback.Questions = review.Questions
	}
	fallback.Provider = "gemini"
	fallback.Model = model
	return fallback, "gemini:" + model
}

func heuristicBid(job *store.Job, agent *store.Agent) BidSuggestion {
	min := job.BudgetMin.Dollars()
	max := job.BudgetMax.Dollars()
	if min <= 0 {
		min = 1000
	}
	if max < min {
		max = min
	}
	ratio := 0.5 + (agent.Reputation-4.5)/2
	if ratio < 0.35 {
		ratio = 0.35
	}
	if ratio > 0.85 {
		ratio = 0.85
	}
	amount := min + int(float64(max-min)*ratio)
	amount = roundToHundred(amount)
	if amount < min {
		amount = min
	}
	if amount > max {
		amount = max
	}
	days := 12 + amount/2500
	if days > 45 {
		days = 45
	}
	if days < 7 {
		days = 7
	}
	overlap := skillOverlap(agent.Skills, job.Skills)
	score := 80 + overlap*4 + int((agent.Reputation-4.0)*8)
	if score > 98 {
		score = 98
	}
	if score < 74 {
		score = 74
	}
	firstScope := "the first milestone"
	if len(job.Scope) > 0 {
		firstScope = strings.TrimSuffix(job.Scope[0], ".")
	}
	note := fmt.Sprintf("I can own this end to end in %d days, starting with %s. I price the risk in: one review round per milestone and a written handoff are included, so there are no surprises at acceptance.", days, lowerFirst(firstScope))
	rationale := fmt.Sprintf("%s sits in the upper half of the range because the brief needs %s and a fixed deadline.", store.Money(amount*100), strings.Join(job.Skills, ", "))
	return BidSuggestion{Amount: amount, Days: days, Score: score, Note: note, Rationale: rationale}
}

func heuristicNegotiation(job *store.Job, agent *store.Agent, lastMessage string, counter int) NegotiationSuggestion {
	min, max := job.BudgetMin.Dollars(), job.BudgetMax.Dollars()
	if counter <= 0 {
		counter = (min + max) / 2
	}
	if counter < min {
		counter = min
	}
	if counter > max {
		counter = max
	}
	lower := strings.Contains(strings.ToLower(lastMessage), "lower") ||
		strings.Contains(strings.ToLower(lastMessage), "budget") ||
		strings.Contains(strings.ToLower(lastMessage), "discount")

	message := fmt.Sprintf("I can hold the scope at $%d and keep the deadline intact. That includes a kickoff review, one consolidated feedback round per milestone, and a written handoff. If the budget is fixed, I can move the first review async and meet you at $%d without dropping acceptance criteria.",
		counter, maxInt(min, counter-500))
	if !lower {
		message = fmt.Sprintf("My number is $%d for the scope as written. I would start with %s, then lock acceptance criteria before build. If you want to trade price, the clean lever is moving one review round to async — I can then come down by $500.",
			counter, agent.Role)
	}
	return NegotiationSuggestion{Message: message, Amount: counter}
}

func heuristicBrief(title, description string, skills []string, budgetMin, budgetMax int) BriefReview {
	if budgetMin <= 0 {
		budgetMin = 5000
	}
	if budgetMax < budgetMin {
		budgetMax = budgetMin + 2000
	}
	summary := "The brief has a clear outcome but needs measurable acceptance criteria and a tighter review loop."
	scope := []string{
		fmt.Sprintf("Kickoff: lock success metrics, audience, and the single source of truth for %s", strings.ToLower(title)),
		"Milestone 1: discovery and a reviewed direction, delivered with a written decision log",
		"Milestone 2: core delivery with one consolidated feedback round",
		"Final: measurable acceptance tests, source files, and a 30-minute handover",
	}
	questions := []string{
		"What does success look like 30 days after delivery?",
		"Who signs off on each milestone, and what is the turnaround?",
		"Which existing tools, systems, or brand rules must this integrate with?",
	}
	if len(skills) > 0 {
		scope[1] = fmt.Sprintf("Milestone 1: discovery across %s, with a reviewed direction and decision log", strings.Join(skills, ", "))
	}
	return BriefReview{
		Summary: summary, Scope: scope, Questions: questions,
		BudgetMin: budgetMin, BudgetMax: budgetMax, Provider: "heuristic",
	}
}

func decodeJSON(text string, target any) error {
	text = strings.TrimSpace(text)
	if strings.HasPrefix(text, "```") {
		lines := strings.Split(text, "\n")
		if len(lines) >= 2 {
			lines = lines[1:]
			if strings.HasPrefix(strings.TrimSpace(lines[len(lines)-1]), "```") {
				lines = lines[:len(lines)-1]
			}
			text = strings.Join(lines, "\n")
		}
	}
	start := strings.Index(text, "{")
	end := strings.LastIndex(text, "}")
	if start < 0 || end <= start {
		return fmt.Errorf("no json object found")
	}
	return json.Unmarshal([]byte(text[start:end+1]), target)
}

func sanitizeBid(suggestion BidSuggestion, job *store.Job, fallback BidSuggestion) BidSuggestion {
	min, max := job.BudgetMin.Dollars(), job.BudgetMax.Dollars()
	if suggestion.Amount < min || suggestion.Amount > max || suggestion.Amount <= 0 {
		suggestion.Amount = fallback.Amount
	}
	if suggestion.Days < 5 || suggestion.Days > 60 {
		suggestion.Days = fallback.Days
	}
	if suggestion.Score < 70 || suggestion.Score > 99 {
		suggestion.Score = fallback.Score
	}
	if strings.TrimSpace(suggestion.Note) == "" {
		suggestion.Note = fallback.Note
	}
	if strings.TrimSpace(suggestion.Rationale) == "" {
		suggestion.Rationale = fallback.Rationale
	}
	return suggestion
}

func bulletList(items []string) string {
	if len(items) == 0 {
		return "- not specified"
	}
	var builder strings.Builder
	for _, item := range items {
		builder.WriteString("- ")
		builder.WriteString(item)
		builder.WriteString("\n")
	}
	return builder.String()
}

func skillOverlap(left, right []string) int {
	count := 0
	for _, a := range left {
		for _, b := range right {
			if strings.EqualFold(strings.TrimSpace(a), strings.TrimSpace(b)) {
				count++
			}
		}
	}
	return count
}

func roundToHundred(value int) int {
	if value < 0 {
		return 0
	}
	return (value + 50) / 100 * 100
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func lowerFirst(value string) string {
	if value == "" {
		return value
	}
	return strings.ToLower(value[:1]) + value[1:]
}
