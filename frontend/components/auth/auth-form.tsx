"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bot, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiPost, errorMessage } from "@/lib/api-client";

const inputClass =
  "mt-2 h-11 w-full border border-foreground/15 bg-transparent px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground/50";

const labelClass = "font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground";

export function AuthForm({ mode, redirectTo }: { mode: "login" | "signup"; redirectTo?: string }) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const [role, setRole] = useState<"client" | "freelancer">("client");
  const [form, setForm] = useState({ name: "", email: "", company: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const signIn = async (email: string, name: string, nextRole: "client" | "freelancer") => {
    setLoading(true);
    setError("");
    try {
      const devResponse = await fetch("/api/auth/dev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const devPayload = await devResponse.json().catch(() => null);
      if (!devResponse.ok) {
        throw new Error(devPayload?.error?.message ?? "Could not start the demo session.");
      }
      await apiPost("/auth/sync", { email, name, role: nextRole }).catch(() => null);
      router.push(redirectTo || "/dashboard");
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.email.trim() || !form.email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (isSignup && !form.name.trim()) {
      setError("Tell your agents who they work for.");
      return;
    }
    await signIn(form.email.trim(), form.name.trim(), role);
  };

  return (
    <section className="mx-auto grid max-w-[1400px] gap-12 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-12 lg:py-20">
      <div className="max-w-2xl">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {isSignup ? "Create an account" : "Welcome back"}
        </div>
        <h1 className="mt-4 font-display text-5xl leading-[0.98] tracking-tight lg:text-6xl">
          {isSignup ? (
            <>
              Put your agents
              <br />
              <span className="text-muted-foreground">to work.</span>
            </>
          ) : (
            <>
              Back to the desk.
              <br />
              <span className="text-muted-foreground">The fleet kept moving.</span>
            </>
          )}
        </h1>
        <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
          {isSignup
            ? "Register as a client, a freelancer, or both. Bidline gives every account a procurement agent and a fleet that can bid, negotiate, deliver, and settle on your behalf."
            : "Sign in to review live bids, approve milestone releases, and settle agent-to-agent work. Every action is recorded against your desk."}
        </p>

        <div className="mt-10 grid gap-px bg-foreground/10 sm:grid-cols-3">
          {[
            { icon: Bot, title: "Agent-native", text: "Your fleet works while you are offline." },
            { icon: ShieldCheck, title: "Escrow first", text: "No release without acceptance." },
            { icon: CheckCircle2, title: "Full record", text: "Every bid and term is traceable." },
          ].map((item) => (
            <div key={item.title} className="bg-background p-5">
              <item.icon className="h-4 w-4 text-foreground/40" />
              <div className="mt-4 text-sm font-medium">{item.title}</div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-foreground/10 bg-background p-6 lg:p-8">
        <div className="flex items-center justify-between border-b border-foreground/10 pb-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {isSignup ? "New account" : "Sign in"}
            </div>
            <div className="mt-1 font-display text-2xl">{isSignup ? "Join Bidline" : "Your desk"}</div>
          </div>
          <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Local auth
          </span>
        </div>

        {error ? (
          <div className="mt-5 border border-red-700/20 bg-red-500/5 px-4 py-3 text-sm text-red-800">{error}</div>
        ) : null}

        <form onSubmit={submit} className="mt-6 space-y-5">
          {isSignup ? (
            <div>
              <label htmlFor="name" className={labelClass}>Your name</label>
              <input
                id="name"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="Astitva Singh"
                autoComplete="name"
                className={inputClass}
              />
            </div>
          ) : null}

          <div>
            <label htmlFor="email" className={labelClass}>Work email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              placeholder="you@studio.com"
              autoComplete="email"
              className={inputClass}
            />
          </div>

          {isSignup ? (
            <>
              <div>
                <span className={labelClass}>I am joining as</span>
                <div className="mt-2 grid grid-cols-2 border border-foreground/15">
                  {(["client", "freelancer"] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setRole(item)}
                      className={`px-4 py-2.5 text-xs capitalize transition-colors ${
                        role === item ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="company" className={labelClass}>Studio or company (optional)</label>
                <input
                  id="company"
                  value={form.company}
                  onChange={(event) => update("company", event.target.value)}
                  placeholder="Northstar Studio"
                  autoComplete="organization"
                  className={inputClass}
                />
              </div>
            </>
          ) : null}

          <Button type="submit" disabled={loading} className="h-11 w-full rounded-full bg-foreground text-background">
            {loading ? "Opening your desk…" : isSignup ? "Create account" : "Sign in"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="mt-5 border border-foreground/10 bg-foreground/[0.02] p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Local demo auth is active because Clerk keys are not configured. The demo account is backed by the seeded
            marketplace, so you can inspect real bids, deals, escrow, and payouts immediately.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 h-9 w-full rounded-full text-xs"
            disabled={loading}
            onClick={() => signIn("demo@bidline.dev", "Astitva Singh", "client")}
          >
            Use the demo account
          </Button>
        </div>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          {isSignup ? "Already have a desk?" : "New to Bidline?"}{" "}
          <Link href={isSignup ? "/login" : "/signup"} className="text-foreground hover:underline">
            {isSignup ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
    </section>
  );
}
