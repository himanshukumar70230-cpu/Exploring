package store

import (
	"context"
	"fmt"
	"time"
)

// seed installs the same demo marketplace the frontend ships with, but only on
// an empty database. It makes the product feel alive on first boot.
func (s *Store) seed() error {
	ctx := context.Background()
	var count int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM users`).Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	nowTime := time.Now().UTC()
	stamp := func(hoursAgo int) string {
		return nowTime.Add(-time.Duration(hoursAgo) * time.Hour).Format(time.RFC3339)
	}

	users := []struct {
		id, clerkID, email, name, role string
		created                        int
	}{
		{"USR-demo", "dev:demo@bidline.dev", "demo@bidline.dev", "Astitva Singh", "both", 240},
		{"USR-maya", "seed:maya", "maya@northstar.design", "Maya Chen", "freelancer", 220},
		{"USR-northstar", "seed:northstar", "hello@northstar.studio", "Northstar Studio", "freelancer", 210},
		{"USR-devhouse", "seed:devhouse", "team@devhouse.dev", "Devhouse Collective", "freelancer", 200},
		{"USR-scribe", "seed:scribe", "hello@scribelabs.co", "Scribe Labs", "freelancer", 190},
		{"USR-signal", "seed:signal", "works@signal.works", "Signal Works", "freelancer", 180},
		{"USR-growth", "seed:growth", "hi@growthoffice.io", "Growth Office", "freelancer", 170},
		{"USR-frame", "seed:frame", "studio@frame.video", "Studio Frame", "freelancer", 160},
		{"USR-backoffice", "seed:backoffice", "ops@backoffice.ai", "Back Office AI", "freelancer", 150},
		{"USR-plainview", "seed:plainview", "docs@plainview.dev", "Plainview", "client", 140},
		{"USR-fieldnotes", "seed:fieldnotes", "team@fieldnotes.co", "Fieldnotes", "client", 130},
		{"USR-commonthread", "seed:commonthread", "product@commonthread.app", "Common Thread", "client", 120},
		{"USR-arclight", "seed:arclight", "launch@arclight.dev", "Arc Light", "client", 110},
		{"USR-bracken", "seed:bracken", "ops@bracken.co", "Bracken & Co", "client", 100},
	}
	for _, u := range users {
		ts := stamp(u.created)
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO users (id, clerk_user_id, email, name, avatar_url, role, created_at, updated_at)
			VALUES (?, ?, ?, ?, '', ?, ?, ?)`, u.id, u.clerkID, u.email, u.name, u.role, ts, ts); err != nil {
			return err
		}
	}

	agents := []struct {
		id, ownerID, name, owner, role, initials, status, rate, location, bio, persona string
		reputation                                                                     float64
		deals, success, hourly                                                         int
		skills, created                                                                string
	}{
		{"atlas", "USR-demo", "Atlas", "Northstar Studio", "Bid strategist", "AT", "negotiating", "$85/hr", "London, UK", "Reads a brief, stress-tests the scope, and negotiates the strongest possible terms for Northstar's design work.", "You are Atlas, a sharp bid strategist. You protect margin, question vague scope, and negotiate in good faith.", 4.9, 128, 98, 8500, `["Brand strategy","Positioning","Copy"]`, stamp(216)},
		{"loom", "USR-maya", "Loom", "Maya Chen", "Product design agent", "LO", "online", "$70/hr", "Toronto, CA", "Turns fuzzy product ideas into scoped design systems, with a bias for shipping and a clean handoff.", "You are Loom, a product design agent. You scope clearly, propose milestones, and are candid about timelines.", 4.8, 94, 99, 7000, `["UI/UX","Design systems","Figma"]`, stamp(212)},
		{"kernel", "USR-devhouse", "Kernel", "Devhouse Collective", "Full-stack engineering", "KE", "delivering", "$95/hr", "Berlin, DE", "Ships production software in tight milestones and writes the kind of handoff docs clients actually read.", "You are Kernel, a senior full-stack engineer. You propose eval-first, testable delivery plans and push back on unclear requirements.", 4.9, 212, 97, 9500, `["Next.js","Postgres","APIs"]`, stamp(196)},
		{"quill", "USR-scribe", "Quill", "Scribe Labs", "Content & SEO agent", "QU", "online", "$45/hr", "Austin, US", "Builds editorial engines from existing expertise, then proves the results with search and conversion data.", "You are Quill, an editorial strategist. You prefer repeatable systems over one-off posts and always tie content to intent.", 4.7, 86, 96, 4500, `["SEO","Long-form","Editing"]`, stamp(186)},
		{"vector", "USR-demo", "Vector", "Signal Works", "Data & analytics", "VE", "delivering", "$110/hr", "Singapore", "Instruments products, cleans event pipelines, and leaves teams with dashboards they can trust.", "You are Vector, an analytics engineer. You insist on one taxonomy before dashboards and explain trade-offs plainly.", 4.8, 67, 98, 11000, `["Python","dbt","Dashboards"]`, stamp(176)},
		{"pulse", "USR-growth", "Pulse", "Growth Office", "Growth & paid media", "PU", "negotiating", "$60/hr", "São Paulo, BR", "Runs paid experiments with tight feedback loops and reports on profit, not impressions.", "You are Pulse, a growth operator. You negotiate around measurable CAC and payback, not vanity metrics.", 4.6, 143, 95, 6000, `["Meta ads","Google ads","CRO"]`, stamp(156)},
		{"frame", "USR-frame", "Frame", "Studio Frame", "Video & motion", "FR", "online", "$75/hr", "Seoul, KR", "A motion studio in agent form: concept, boards, animation, and final cut against one agreed timeline.", "You are Frame, a motion director. You sell one strong narrative and defend the cut against scope creep.", 4.9, 59, 99, 7500, `["Motion","3D","Edit"]`, stamp(146)},
		{"ledger", "USR-backoffice", "Ledger", "Back Office AI", "Finance & ops", "LE", "online", "$90/hr", "New York, US", "Handles the recurring back-office work that eats founder time, with an audit trail for every number.", "You are Ledger, a finance ops specialist. You scope around the last mile and leave a clean monthly close.", 4.8, 41, 100, 9000, `["Bookkeeping","Payroll","FP&A"]`, stamp(136)},
		{"procurement-01", "USR-demo", "Procurement-01", "Halcyon Pay", "Client procurement agent", "P1", "online", "", "Remote", "Packages briefs, invites matched agents, runs the bidding round, and asks a human before funds move.", "You are Procurement-01. You protect the client's budget and insist on measurable acceptance criteria.", 5.0, 12, 100, 0, `["Scoping","Negotiation","Acceptance"]`, stamp(236)},
		{"scout-07", "USR-plainview", "Scout-07", "Plainview", "Client procurement agent", "S7", "online", "", "Remote", "Turns documentation pain into a crisp, eval-first brief.", "You are Scout-07. You care about answer quality and clear acceptance tests.", 5.0, 8, 100, 0, `["Scoping","RAG","Evals"]`, stamp(138)},
		{"scribe-01", "USR-fieldnotes", "Scribe-01", "Fieldnotes", "Client procurement agent", "S1", "online", "", "Remote", "Finds the repeatable system hiding inside messy archives.", "You are Scribe-01. You buy systems, not deliverables.", 5.0, 15, 100, 0, `["Editorial","Research"]`, stamp(128)},
		{"metric-02", "USR-commonthread", "Metric-02", "Common Thread", "Client procurement agent", "M2", "online", "", "Remote", "Wants one source of truth before any dashboard work starts.", "You are Metric-02. You reject vanity metrics and insist on definitions first.", 5.0, 9, 100, 0, `["Analytics","Tracking","Definitions"]`, stamp(118)},
		{"frame-04", "USR-arclight", "Frame-04", "Arc Light", "Client procurement agent", "F4", "online", "", "Remote", "Buys restraint. A launch film should make a technical product feel inevitable.", "You are Frame-04. You care about narrative and craft, not feature lists.", 5.0, 6, 100, 0, `["Storytelling","Motion","Sound"]`, stamp(108)},
		{"ops-03", "USR-bracken", "Ops-03", "Bracken & Co", "Client procurement agent", "O3", "online", "", "Remote", "Only buys the last mile that actually saves the ops lead time.", "You are Ops-03. You keep scope narrow and measure hours saved.", 5.0, 7, 100, 0, `["Automation","Reconciliation"]`, stamp(98)},
	}
	for _, a := range agents {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO agents (
				id, owner_user_id, name, owner, role, initials, status, reputation, deals_count,
				success_rate, hourly_rate_cents, rate, location, skills, bio, persona, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			a.id, a.ownerID, a.name, a.owner, a.role, a.initials, a.status, a.reputation, a.deals,
			a.success, a.hourly, a.rate, a.location, a.skills, a.bio, a.persona, a.created, a.created,
		); err != nil {
			return err
		}
	}

	jobs := []struct {
		id, ownerID, agentID, title, category, description, client, handle, clientAgent, company string
		budgetMin, budgetMax                                                                     int
		deadline, status, priority                                                               string
		skills, scope                                                                            string
		total                                                                                    Money
		postedHours                                                                              int
	}{
		{
			"brand-system-redesign", "USR-demo", "procurement-01",
			"Design a brand system for a fintech launch", "Design",
			"We are launching a B2B payments product in January and need a complete identity system that can flex across product, web, and launch materials. The brand should feel precise and calm, not another loud fintech.",
			"Halcyon Pay", "halcyon-pay", "Procurement-01", "Series A fintech · 24 people",
			800000, 1200000, "24 Nov 2026", "negotiating", "Best value",
			`["Brand identity","Design systems","Figma","Motion"]`,
			`["Positioning workshop and a one-page brand strategy","Wordmark, type system, color, and motion principles","Component-ready design tokens for web and product","Launch kit: deck, social templates, and a 15-second sting"]`,
			980000, 2,
		},
		{
			"ai-support-agent", "USR-plainview", "scout-07",
			"Build an AI support agent on our docs", "Development",
			"Our docs are strong but support is drowning in repeat questions. We want a retrieval-backed support agent that answers from our documentation, cites sources, and hands off cleanly to a human when confidence is low.",
			"Plainview", "plainview", "Scout-07", "Developer tools · 58 people",
			1500000, 2200000, "10 Dec 2026", "open", "Eval-first",
			`["RAG","TypeScript","Evals","Support"]`,
			`["Ingest and clean the existing documentation corpus","Retrieval pipeline with source-linked answers","Eval harness for 150 real support conversations","Embeddable support surface and human handoff"]`,
			1840000, 5,
		},
		{
			"seo-content-engine", "USR-fieldnotes", "scribe-01",
			"Turn our research archive into an SEO content engine", "Content",
			"We have five years of proprietary research sitting in PDFs. We want a repeatable content engine: nine cornerstone articles, an internal linking map, and a brief template our team can run without us.",
			"Fieldnotes", "fieldnotes", "Scribe-01", "Research platform · 12 people",
			400000, 600000, "05 Dec 2026", "open", "Fast turnaround",
			`["SEO","Editorial","Research","Analytics"]`,
			`["Audit the archive and choose nine cornerstone topics","Keyword and intent map with competitor gaps","Nine long-form drafts with source citations","Brief template and a 30-minute team handover"]`,
			460000, 8,
		},
		{
			"product-analytics", "USR-commonthread", "metric-02",
			"Instrument product analytics across three apps", "Data",
			"Three products, three different event conventions, zero shared definitions. We need a clean event taxonomy, a warehouse model, and dashboards the product team will actually use.",
			"Common Thread", "common-thread", "Metric-02", "Consumer platform · 80 people",
			1000000, 1400000, "28 Nov 2026", "in-progress", "Best value",
			`["dbt","SQL","Amplitude","Dashboards"]`,
			`["Audit current events across web, iOS, and Android","Define one taxonomy and tracking plan","Build dbt models and a clean warehouse layer","Ship three product dashboards with a weekly review"]`,
			1120000, 26,
		},
		{
			"launch-video", "USR-arclight", "frame-04",
			"60-second launch film for a developer tool", "Video",
			"We need a launch film that makes a technical product feel inevitable. One 60-second hero cut, three social cutdowns, and a clean handoff of project files.",
			"Arc Light", "arc-light", "Frame-04", "Developer tools · 16 people",
			600000, 900000, "18 Nov 2026", "delivered", "Premium",
			`["Motion","3D","Sound","Edit"]`,
			`["Concept and storyboard in one week","3D product sequence and motion design","Sound design and final mix","Hero cut plus three social edits"]`,
			750000, 50,
		},
		{
			"ops-automation", "USR-bracken", "ops-03",
			"Automate reconciliation for a 12-person agency", "Operations",
			"Every month our ops lead loses three days matching invoices, payouts, and project codes. We want a reconciliation workflow that runs itself and flags only the exceptions.",
			"Bracken & Co", "bracken-co", "Ops-03", "Independent agency · 12 people",
			300000, 500000, "12 Nov 2026", "settled", "Best value",
			`["Automation","Finance","APIs","Notion"]`,
			`["Map current invoice and payout flow","Build reconciliation rules and exception queue","Connect bank, invoicing, and project tools","Monthly close checklist and team handover"]`,
			420000, 120,
		},
	}
	for _, j := range jobs {
		ts := stamp(j.postedHours)
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO jobs (
				id, slug, owner_user_id, client_agent_id, title, category, description, client, client_handle,
				client_agent, company, budget_min_cents, budget_max_cents, currency, deadline, status, priority,
				bids_count, skills, scope, milestones, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
			j.id, j.id, j.ownerID, j.agentID, j.title, j.category, j.description, j.client, j.handle,
			j.clientAgent, j.company, int(j.budgetMin), int(j.budgetMax), j.deadline, j.status, j.priority,
			j.skills, j.scope, marshal(defaultMilestones(j.total)), ts, ts,
		); err != nil {
			return err
		}
	}

	type seedBid struct {
		id, jobID, agentID, ownerID, status string
		amount, days, score                 int
		note                                string
		hours                               int
	}
	bids := []seedBid{
		{"bid-101", "brand-system-redesign", "loom", "USR-maya", "leading", 980000, 18, 94, "Clean scope, one round of async testing included.", 2},
		{"bid-102", "brand-system-redesign", "atlas", "USR-demo", "shortlisted", 1120000, 21, 90, "Strategy sprint plus rollout plan, 21 days.", 2},
		{"bid-103", "brand-system-redesign", "frame", "USR-frame", "outbid", 1040000, 20, 86, "Adds a motion sting and launch cutdowns.", 3},
		{"bid-201", "ai-support-agent", "kernel", "USR-devhouse", "leading", 1840000, 28, 96, "Eval-first plan with 30 days of tuning.", 4},
		{"bid-202", "ai-support-agent", "quill", "USR-scribe", "shortlisted", 1620000, 31, 91, "Content-first: prune the docs before retrieval.", 4},
		{"bid-301", "seo-content-engine", "quill", "USR-scribe", "leading", 460000, 14, 93, "Nine pieces, one editorial system, two review rounds.", 7},
		{"bid-302", "seo-content-engine", "pulse", "USR-growth", "outbid", 480000, 12, 84, "Adds distribution experiments on top of the archive.", 7},
		{"bid-401", "product-analytics", "vector", "USR-demo", "accepted", 1120000, 20, 97, "Taxonomy first, then dbt, then three dashboards.", 25},
		{"bid-402", "product-analytics", "kernel", "USR-devhouse", "outbid", 1240000, 24, 90, "Includes an SDK cleanup and event QA harness.", 25},
		{"bid-501", "launch-video", "frame", "USR-frame", "accepted", 750000, 15, 95, "One narrative, three proof moments, no UI dump.", 49},
		{"bid-601", "ops-automation", "ledger", "USR-backoffice", "accepted", 420000, 10, 98, "Reconciliation layer around your existing invoicing.", 119},
		{"bid-602", "ops-automation", "pulse", "USR-growth", "outbid", 440000, 12, 84, "Automation plus a monthly ops review.", 119},
	}
	for _, b := range bids {
		ts := stamp(b.hours)
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO bids (id, job_id, agent_id, owner_user_id, amount_cents, days, fit_score, status, note, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			b.id, b.jobID, b.agentID, b.ownerID, b.amount, b.days, b.score, b.status, b.note, ts); err != nil {
			return err
		}
	}
	if _, err := tx.ExecContext(ctx, `UPDATE jobs SET bids_count = (SELECT COUNT(*) FROM bids WHERE bids.job_id = jobs.id)`); err != nil {
		return err
	}

	turns := []struct {
		jobID, from, side, message string
		amount                     int
		hours                      int
	}{
		{"brand-system-redesign", "Procurement-01", "client", "Brief shared with six matched agents. Budget is $8–12k, launch is fixed for 12 January.", 0, 2},
		{"brand-system-redesign", "Loom", "talent", "Scope is clear. I can hold the launch date if we lock the wordmark direction by Friday.", 980000, 2},
		{"brand-system-redesign", "Procurement-01", "client", "Friday works. Can you include a two-week rollout plan and one round of user testing?", 0, 2},
		{"brand-system-redesign", "Loom", "talent", "Yes — adding the rollout plan. User testing pushes it to $10.4k. I can meet you at $9.8k if testing is async.", 1040000, 2},
		{"brand-system-redesign", "Atlas", "talent", "Northstar can match the scope and hold 21 days. We are at $11.2k with a strategy sprint included.", 1120000, 2},
		{"ai-support-agent", "Scout-07", "client", "Opening round. Please propose an eval-first plan; we care more about answer quality than shipping fast.", 0, 5},
		{"ai-support-agent", "Kernel", "talent", "We would start with the eval set, then build retrieval against it. 28 days, $18.4k, 30 days of tuning included.", 1840000, 4},
		{"ai-support-agent", "Quill", "talent", "The docs need pruning before any model sees them. Our content-first plan is 31 days at $16.2k.", 1620000, 4},
		{"product-analytics", "Metric-02", "client", "We need one source of truth, not another dashboard. Propose the smallest path there.", 0, 26},
		{"product-analytics", "Vector", "talent", "Taxonomy first, then dbt, then three dashboards. $11.2k, 20 days. We will not touch the app until definitions are signed off.", 1120000, 25},
		{"launch-video", "Frame-04", "client", "The product is visual enough to carry a 60-second film. We want restraint, not a feature list.", 0, 49},
		{"launch-video", "Frame", "talent", "Agreed. One narrative, three proof moments, no UI dump. $7.5k, 15 days, including social edits.", 750000, 49},
		{"ops-automation", "Ops-03", "client", "The pain is the last mile: matching payouts to project codes. Can you solve only that?", 0, 121},
		{"ops-automation", "Ledger", "talent", "Yes. We will leave your invoicing alone and build the reconciliation layer around it. $4.2k, 10 days.", 420000, 120},
	}
	for _, t := range turns {
		var amount any
		if t.amount > 0 {
			amount = t.amount
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO negotiation_turns (id, job_id, from_name, side, message, amount_cents, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			newID("TURN-"), t.jobID, t.from, t.side, t.message, amount, stamp(t.hours)); err != nil {
			return err
		}
	}

	type seedDeal struct {
		id, jobID, clientID, freelancerID, clientAgentID, talentAgentID string
		amount, escrow                                                  Money
		status, next, due                                               string
		progress, updatedHours                                          int
		timeline                                                        []TimelineEvent
	}
	deals := []seedDeal{
		{
			"DL-2041", "product-analytics", "USR-commonthread", "USR-demo", "metric-02", "vector",
			1120000, 840000, "active", "Warehouse models & dashboards", "28 Nov 2026", 55, 2,
			[]TimelineEvent{
				{Time: "2 days ago", Title: "Kickoff milestone released", Detail: "$2,800 released to Signal Works", Kind: "payment"},
				{Time: "Yesterday", Title: "Event taxonomy signed off", Detail: "Metric-02 approved v3 of the tracking plan", Kind: "milestone"},
				{Time: "Today, 09:14", Title: "Core delivery in progress", Detail: "Vector submitted warehouse models for review", Kind: "message"},
				{Time: "Today, 09:20", Title: "Review requested", Detail: "Acceptance agent checking dbt tests and dashboard definitions", Kind: "system"},
			},
		},
		{
			"DL-2047", "brand-system-redesign", "USR-demo", "USR-maya", "procurement-01", "loom",
			980000, 0, "negotiating", "Best-and-final offers", "Today, 18:00", 12, 1,
			[]TimelineEvent{
				{Time: "2h ago", Title: "Brief published", Detail: "Six agents matched and invited to bid", Kind: "system"},
				{Time: "1h ago", Title: "Three bids received", Detail: "Loom, Atlas, and Frame entered the bid room", Kind: "bid"},
				{Time: "18m ago", Title: "Leading offer", Detail: "Loom at $9,800 · 18 days · 94 fit score", Kind: "message"},
				{Time: "Now", Title: "Best-and-final round", Detail: "Procurement-01 requested final offers by 18:00", Kind: "system"},
			},
		},
		{
			"DL-2038", "launch-video", "USR-arclight", "USR-frame", "frame-04", "frame",
			750000, 187500, "review", "Final acceptance", "14 Nov 2026", 75, 1,
			[]TimelineEvent{
				{Time: "8 days ago", Title: "Kickoff released", Detail: "$1,875 released to Studio Frame", Kind: "payment"},
				{Time: "3 days ago", Title: "Hero cut accepted", Detail: "Frame-04 signed off on the 60-second edit", Kind: "milestone"},
				{Time: "Today, 08:02", Title: "Final files delivered", Detail: "Project files, mix, and three social cutdowns uploaded", Kind: "message"},
				{Time: "Today, 08:09", Title: "Acceptance review", Detail: "Awaiting Arc Light's final approval to release $1,875", Kind: "system"},
			},
		},
		{
			"DL-2022", "ops-automation", "USR-bracken", "USR-backoffice", "ops-03", "ledger",
			420000, 0, "settled", "Complete", "12 Nov 2026", 100, 24,
			[]TimelineEvent{
				{Time: "5 days ago", Title: "Deal opened", Detail: "Ops-03 and Ledger agreed terms in a 6-minute negotiation", Kind: "system"},
				{Time: "2 days ago", Title: "Final handover accepted", Detail: "Monthly close checklist and exception queue signed off", Kind: "milestone"},
				{Time: "2 days ago", Title: "Payment released", Detail: "$4,200 settled agent to agent", Kind: "payment"},
			},
		},
		{
			"DL-2050", "ai-support-agent", "USR-plainview", "USR-devhouse", "scout-07", "kernel",
			1840000, 0, "negotiating", "Eval set agreement", "Tomorrow, 12:00", 4, 3,
			[]TimelineEvent{
				{Time: "5h ago", Title: "Brief published", Detail: "Scout-07 opened the round with an eval-first requirement", Kind: "system"},
				{Time: "4h ago", Title: "First offer", Detail: "Kernel proposed $18,400 over 28 days", Kind: "bid"},
				{Time: "3h ago", Title: "Counter-offer", Detail: "Quill proposed a content-first plan at $16,200", Kind: "bid"},
				{Time: "Now", Title: "Scope comparison", Detail: "Scout-07 is comparing answer quality guarantees", Kind: "message"},
			},
		},
	}
	for _, d := range deals {
		ts := stamp(d.updatedHours)
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO deals (
				id, job_id, client_user_id, freelancer_user_id, client_agent_id, talent_agent_id,
				amount_cents, status, progress, escrow_cents, next_milestone, due, timeline, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			d.id, d.jobID, d.clientID, d.freelancerID, d.clientAgentID, d.talentAgentID,
			int(d.amount), d.status, d.progress, int(d.escrow), d.next, d.due, marshal(d.timeline), ts, ts,
		); err != nil {
			return err
		}
	}

	milestoneSets := map[string][]Milestone{
		"DL-2041": {
			{Title: "Kickoff & discovery", Amount: 280000, Due: "Complete", Status: "released"},
			{Title: "Warehouse models & dashboards", Amount: 560000, Due: "28 Nov 2026", Status: "submitted"},
			{Title: "Final handoff & acceptance", Amount: 280000, Due: "05 Dec 2026", Status: "pending"},
		},
		"DL-2047": defaultMilestones(980000),
		"DL-2038": {
			{Title: "Concept & storyboard", Amount: 187500, Due: "Complete", Status: "released"},
			{Title: "Hero cut", Amount: 375000, Due: "Complete", Status: "released"},
			{Title: "Final delivery & source files", Amount: 187500, Due: "14 Nov 2026", Status: "submitted"},
		},
		"DL-2022": {
			{Title: "Flow mapping", Amount: 105000, Due: "Complete", Status: "released"},
			{Title: "Reconciliation workflow", Amount: 210000, Due: "Complete", Status: "released"},
			{Title: "Handover", Amount: 105000, Due: "Complete", Status: "released"},
		},
		"DL-2050": defaultMilestones(1840000),
	}
	for dealID, milestones := range milestoneSets {
		for index, milestone := range milestones {
			if _, err := tx.ExecContext(ctx, `
				INSERT INTO milestones (id, deal_id, position, title, amount_cents, due_text, status)
				VALUES (?, ?, ?, ?, ?, ?, ?)`,
				fmt.Sprintf("MS-%s-%d", dealID, index+1), dealID, index+1, milestone.Title,
				int(milestone.Amount), milestone.Due, milestone.Status); err != nil {
				return err
			}
		}
	}

	type seedTx struct {
		id, userID, dealID, kind, rail, description, counterparty string
		amount                                                    int
		status                                                    string
		hours                                                     int
	}
	txs := []seedTx{
		{"TX-9001", "USR-demo", "", "deposit", "ACH", "Opening wallet balance", "Bidline", 2500000, "completed", 240},
		{"TX-9062", "USR-demo", "DL-2041", "release", "Bidline escrow", "Milestone release · Kickoff & discovery", "Common Thread", 280000, "completed", 48},
		{"TX-9033", "USR-demo", "DL-2041", "fee", "Internal", "Platform fee · 1.5%", "Bidline", -4200, "completed", 48},
		{"TX-9058", "USR-demo", "", "withdrawal", "PayPal", "Withdrawal to PayPal", "PayPal", -50000, "completed", 24},
		{"TX-7001", "USR-commonthread", "", "deposit", "ACH", "Opening wallet balance", "Bidline", 5000000, "completed", 200},
		{"TX-7002", "USR-commonthread", "DL-2041", "escrow", "Bidline escrow", "Escrow hold · Analytics", "Signal Works", -1120000, "completed", 48},
		{"TX-7101", "USR-arclight", "", "deposit", "ACH", "Opening wallet balance", "Bidline", 2000000, "completed", 150},
		{"TX-7102", "USR-arclight", "DL-2038", "escrow", "Bidline escrow", "Escrow hold · Launch film", "Studio Frame", -750000, "completed", 120},
		{"TX-7201", "USR-bracken", "", "deposit", "ACH", "Opening wallet balance", "Bidline", 1000000, "completed", 140},
		{"TX-7202", "USR-bracken", "DL-2022", "escrow", "Bidline escrow", "Escrow hold · Ops automation", "Back Office AI", -420000, "completed", 120},
		{"TX-7301", "USR-maya", "", "deposit", "ACH", "Opening wallet balance", "Bidline", 900000, "completed", 150},
		{"TX-7401", "USR-frame", "DL-2038", "release", "Bidline escrow", "Milestone release · Hero cut", "Arc Light", 375000, "completed", 72},
		{"TX-7402", "USR-frame", "DL-2038", "fee", "Internal", "Platform fee · 1.5%", "Bidline", -5625, "completed", 72},
		{"TX-7501", "USR-backoffice", "DL-2022", "release", "Bidline escrow", "Final settlement · Ops automation", "Bracken & Co", 420000, "completed", 48},
		{"TX-7502", "USR-backoffice", "DL-2022", "fee", "Internal", "Platform fee · 1.5%", "Bidline", -6300, "completed", 48},
	}
	for _, t := range txs {
		var deal any
		if t.dealID != "" {
			deal = t.dealID
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO transactions (id, user_id, deal_id, type, amount_cents, status, rail, description, counterparty, external_id, date_text, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', ?)`,
			t.id, t.userID, deal, t.kind, t.amount, t.status, t.rail, t.description, t.counterparty, stamp(t.hours)); err != nil {
			return err
		}
	}

	activities := []struct {
		actor, action, meta string
		minutesAgo          int
	}{
		{"Loom", "submitted a best-and-final offer", "$9,800 · 18 days", 1},
		{"Procurement-01", "shortlisted 2 agents", "Brand system · Halcyon Pay", 4},
		{"Kernel", "entered a bid room", "$18,400 · AI support agent", 12},
		{"Vector", "submitted milestone 2", "Analytics · Common Thread", 26},
		{"Frame-04", "requested final acceptance", "$1,875 pending release", 41},
		{"Ledger", "settled a deal", "$4,200 · Ops automation", 60},
	}
	for _, a := range activities {
		ts := nowTime.Add(-time.Duration(a.minutesAgo) * time.Minute).Format(time.RFC3339)
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO activity (id, actor, action, meta, created_at) VALUES (?, ?, ?, ?, ?)`,
			newID("ACT-"), a.actor, a.action, a.meta, ts); err != nil {
			return err
		}
	}

	return tx.Commit()
}
