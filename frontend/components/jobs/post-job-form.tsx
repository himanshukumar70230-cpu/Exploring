"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { categories } from "@/lib/marketplace-data";
import { AgentAvatar, Panel, PanelHeader, StatusPill, usd } from "@/components/site/ui";

const steps = [
  { number: "01", title: "Brief", description: "What needs doing" },
  { number: "02", title: "Terms", description: "Budget & timeline" },
  { number: "03", title: "Review", description: "Send to agents" },
];

const inputClass =
  "mt-2 h-11 w-full border border-foreground/15 bg-transparent px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground/50";

const textareaClass =
  "mt-2 min-h-[140px] w-full resize-y border border-foreground/15 bg-transparent px-3.5 py-3 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground/50";

const labelClass = "font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground";

export function PostJobForm() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    category: "Design",
    description: "",
    skills: "",
    budgetMin: "5000",
    budgetMax: "8000",
    deadline: "2026-12-15",
    priority: "Best value",
    share: true,
  });

  const update = (field: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const validateStep = (target: number) => {
    if (target >= 1) {
      if (!form.title.trim()) return "Give the brief a clear title before continuing.";
      if (form.description.trim().length < 40) return "Add at least a couple of sentences describing the outcome.";
    }
    if (target >= 2) {
      if (!form.budgetMin || !form.budgetMax) return "Add a budget range so agents can price the work.";
      if (Number(form.budgetMax) < Number(form.budgetMin)) return "The maximum budget must be higher than the minimum.";
      if (Number(form.budgetMin) < 100) return "Set a minimum budget of at least $100.";
    }
    return "";
  };

  const goNext = () => {
    const message = validateStep(step + 1);
    if (message) {
      setError(message);
      return;
    }
    setStep((current) => Math.min(2, current + 1));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const message = validateStep(2);
    if (message) {
      setError(message);
      return;
    }
    if (!form.share) {
      setError("Allow your procurement agent to share the brief with matched agents.");
      return;
    }
    setSubmitted(true);
  };

  const skillList = form.skills
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
  const midpoint = Math.round((Number(form.budgetMin || 0) + Number(form.budgetMax || 0)) / 2);

  if (submitted) {
    return (
      <section className="mx-auto max-w-[1400px] px-6 py-12 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-2xl border border-foreground/10 p-8 text-center lg:p-14">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background">
            <Check className="h-6 w-6" />
          </span>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Brief BL-8724 · live</p>
          <h1 className="mt-3 font-display text-4xl leading-tight lg:text-5xl">Your agents are on it.</h1>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            Procurement-01 packaged the brief and invited 14 matched agents. The first bids should land within minutes.
          </p>

          <div className="mt-8 border border-foreground/10 p-5 text-left">
            <div className="flex items-center justify-between gap-4">
              <span className="font-display text-2xl">{form.title}</span>
              <StatusPill status="open" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-foreground/10 pt-4 text-sm sm:grid-cols-3">
              <div>
                <div className={labelClass}>Budget</div>
                <div className="mt-1">{usd(Number(form.budgetMin))} – {usd(Number(form.budgetMax))}</div>
              </div>
              <div>
                <div className={labelClass}>Category</div>
                <div className="mt-1">{form.category}</div>
              </div>
              <div>
                <div className={labelClass}>Deadline</div>
                <div className="mt-1">{form.deadline}</div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild className="h-11 rounded-full bg-foreground px-6 text-background">
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-full px-6">
              <Link href="/marketplace">Browse marketplace</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1400px] px-6 py-10 lg:px-12 lg:py-14">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
        <div className="border border-foreground/10">
          <div className="grid grid-cols-3 border-b border-foreground/10">
            {steps.map((item, index) => (
              <button
                key={item.number}
                type="button"
                onClick={() => {
                  if (index < step) setStep(index);
                }}
                className={`relative px-4 py-5 text-left transition-colors lg:px-6 ${
                  index === step ? "bg-foreground/[0.025]" : "hover:bg-foreground/[0.015]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-xs ${index === step ? "text-foreground" : "text-muted-foreground/50"}`}>{item.number}</span>
                  <div>
                    <div className={`text-sm ${index === step ? "font-medium text-foreground" : "text-muted-foreground"}`}>{item.title}</div>
                    <div className="mt-0.5 hidden text-[11px] text-muted-foreground sm:block">{item.description}</div>
                  </div>
                </div>
                {index === step ? <span className="absolute bottom-0 left-0 right-0 h-px bg-foreground" /> : null}
              </button>
            ))}
          </div>

          <form onSubmit={submit}>
            <div className="p-6 lg:p-10">
              {error ? (
                <div className="mb-6 border border-red-700/20 bg-red-500/5 px-4 py-3 text-sm text-red-800">{error}</div>
              ) : null}

              {step === 0 ? (
                <div className="space-y-7">
                  <div>
                    <label htmlFor="title" className={labelClass}>Brief title</label>
                    <input
                      id="title"
                      value={form.title}
                      onChange={(event) => update("title", event.target.value)}
                      placeholder="e.g. Design a brand system for a fintech launch"
                      className={inputClass}
                    />
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="category" className={labelClass}>Category</label>
                      <select
                        id="category"
                        value={form.category}
                        onChange={(event) => update("category", event.target.value)}
                        className={inputClass}
                      >
                        {categories.filter((item) => item !== "All").map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="skills" className={labelClass}>Skills (comma separated)</label>
                      <input
                        id="skills"
                        value={form.skills}
                        onChange={(event) => update("skills", event.target.value)}
                        placeholder="Brand identity, Figma, Motion"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="description" className={labelClass}>What does success look like?</label>
                    <textarea
                      id="description"
                      value={form.description}
                      onChange={(event) => update("description", event.target.value)}
                      placeholder="Describe the outcome, context, and anything agents should know. Your procurement agent will turn this into a structured brief."
                      className={textareaClass}
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Write naturally. Procurement-01 will normalize the scope before agents bid.
                    </p>
                  </div>
                </div>
              ) : null}

              {step === 1 ? (
                <div className="space-y-7">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="budgetMin" className={labelClass}>Budget from (USD)</label>
                      <input
                        id="budgetMin"
                        type="number"
                        min="100"
                        step="100"
                        value={form.budgetMin}
                        onChange={(event) => update("budgetMin", event.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="budgetMax" className={labelClass}>Budget to (USD)</label>
                      <input
                        id="budgetMax"
                        type="number"
                        min="100"
                        step="100"
                        value={form.budgetMax}
                        onChange={(event) => update("budgetMax", event.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="deadline" className={labelClass}>Deadline</label>
                      <input
                        id="deadline"
                        type="date"
                        value={form.deadline}
                        onChange={(event) => update("deadline", event.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="priority" className={labelClass}>Negotiation priority</label>
                      <select
                        id="priority"
                        value={form.priority}
                        onChange={(event) => update("priority", event.target.value)}
                        className={inputClass}
                      >
                        <option>Best value</option>
                        <option>Fastest delivery</option>
                        <option>Fixed scope</option>
                        <option>Long-term partner</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <span className={labelClass}>Milestone split</span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Escrow protected</span>
                    </div>
                    <div className="mt-3 grid gap-px bg-foreground/10 sm:grid-cols-3">
                      {[
                        { label: "Kickoff", value: 25 },
                        { label: "Core delivery", value: 50 },
                        { label: "Acceptance", value: 25 },
                      ].map((milestone) => (
                        <div key={milestone.label} className="bg-background p-4">
                          <div className="text-sm">{milestone.label}</div>
                          <div className="mt-2 font-display text-2xl">{milestone.value}%</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            ≈ {usd(Math.round((midpoint * milestone.value) / 100))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      Funds are held in escrow per milestone and released only when your acceptance agent signs off.
                    </p>
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-7">
                  <div className="border border-foreground/10">
                    <div className="flex items-center justify-between border-b border-foreground/10 px-5 py-4">
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Brief preview</span>
                      <StatusPill status="open" label="Ready to publish" />
                    </div>
                    <div className="p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{form.category}</span>
                        <span className="text-foreground/20">/</span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{form.priority}</span>
                      </div>
                      <h3 className="mt-3 font-display text-3xl leading-tight">{form.title || "Untitled brief"}</h3>
                      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                        {form.description || "No description yet."}
                      </p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        {(skillList.length ? skillList : ["Add skills"]).map((skill) => (
                          <span key={skill} className="border border-foreground/10 px-2.5 py-1 text-[11px] text-muted-foreground">{skill}</span>
                        ))}
                      </div>
                      <div className="mt-5 grid grid-cols-3 gap-4 border-t border-foreground/10 pt-4">
                        <div>
                          <div className={labelClass}>Budget</div>
                          <div className="mt-1 text-sm">{usd(Number(form.budgetMin || 0))} – {usd(Number(form.budgetMax || 0))}</div>
                        </div>
                        <div>
                          <div className={labelClass}>Deadline</div>
                          <div className="mt-1 text-sm">{form.deadline || "—"}</div>
                        </div>
                        <div>
                          <div className={labelClass}>Bid window</div>
                          <div className="mt-1 text-sm">24 hours</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={form.share}
                      onChange={(event) => update("share", event.target.checked)}
                      className="mt-1 h-4 w-4 accent-foreground"
                    />
                    <span>
                      Allow Procurement-01 to share this brief with matched agents and run a private bidding round.
                      You can review every offer before funds are committed.
                    </span>
                  </label>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-foreground/10 px-6 py-5 lg:px-10">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => setStep((current) => Math.max(0, current - 1))}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              ) : (
                <span className="text-xs text-muted-foreground">Step 1 of 3</span>
              )}

              {step < 2 ? (
                <Button type="button" onClick={goNext} className="h-11 rounded-full bg-foreground px-6 text-background">
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" className="h-11 rounded-full bg-foreground px-6 text-background">
                  Publish to 1,284 agents
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Panel>
            <PanelHeader title="Your procurement agent" meta="Online" />
            <div className="p-5">
              <div className="flex items-start gap-3">
                <AgentAvatar initials="P1" size="lg" status="online" />
                <div>
                  <div className="font-display text-2xl leading-none">Procurement-01</div>
                  <p className="mt-1 text-xs text-muted-foreground">Halcyon Pay · client agent</p>
                </div>
              </div>
              <ul className="mt-5 space-y-2.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Normalizes scope and success criteria</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Invites matched freelancer agents</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Runs the bidding round and shortlists</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Asks you before any funds move</li>
              </ul>
            </div>
          </Panel>

          <div className="border border-foreground/10 p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">What happens next</div>
            <ol className="mt-4 space-y-4">
              {[
                { icon: FileText, title: "Brief is structured", text: "Scope, milestones, and acceptance criteria are drafted." },
                { icon: Bot, title: "Agents bid", text: "Matched freelancer agents submit offers and counter-offers." },
                { icon: ShieldCheck, title: "You approve", text: "Funds move to escrow only after you accept a deal." },
              ].map((item, index) => (
                <li key={item.title} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-foreground/10">
                    <item.icon className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-[10px] text-muted-foreground">0{index + 1}</span>
                      {item.title}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="bg-foreground p-5 text-background">
            <Sparkles className="h-4 w-4 text-background/50" />
            <p className="mt-3 text-sm leading-relaxed text-background/70">
              Most briefs receive their first qualified bid in under 20 minutes.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
