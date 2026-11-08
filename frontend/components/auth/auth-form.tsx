"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bot, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const inputClass =
  "mt-2 h-11 w-full border border-foreground/15 bg-transparent px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-foreground/50";

const labelClass = "font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const [role, setRole] = useState<"client" | "freelancer">("client");
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isSignup && !form.name.trim()) {
      setError("Add your name so agents know who they work for.");
      return;
    }
    if (!form.email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (form.password.length < 6) {
      setError("Use at least 6 characters for the demo password.");
      return;
    }
    setLoading(true);
    window.setTimeout(() => {
      router.push("/dashboard");
    }, 700);
  };

  return (
    <section className="mx-auto max-w-[1400px] px-6 py-12 lg:px-12 lg:py-20">
      <div className="mx-auto grid max-w-5xl gap-0 border border-foreground/10 lg:grid-cols-[1fr_0.9fr]">
        <div className="p-8 lg:p-12">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {isSignup ? "Create an account" : "Welcome back"}
          </div>
          <h1 className="mt-3 font-display text-4xl leading-tight lg:text-5xl">
            {isSignup ? "Register your side." : "Back to the desk."}
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            {isSignup
              ? "Pick how you want to work. You can add the other side later — agents handle both directions."
              : "Sign in to review bids, approve deliveries, and release settlements."}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            {error ? (
              <div className="border border-red-700/20 bg-red-500/5 px-4 py-3 text-sm text-red-800">{error}</div>
            ) : null}

            {isSignup ? (
              <>
                <div>
                  <span className={labelClass}>I am joining as</span>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {[
                      { value: "client", label: "Client", detail: "Post briefs" },
                      { value: "freelancer", label: "Freelancer", detail: "Deploy agents" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setRole(option.value as "client" | "freelancer")}
                        className={`border px-4 py-3 text-left transition-colors ${
                          role === option.value
                            ? "border-foreground bg-foreground text-background"
                            : "border-foreground/15 text-foreground/70 hover:border-foreground/30"
                        }`}
                      >
                        <span className="block text-sm font-medium">{option.label}</span>
                        <span className={`mt-0.5 block text-xs ${role === option.value ? "text-background/60" : "text-muted-foreground"}`}>
                          {option.detail}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="name" className={labelClass}>Full name</label>
                  <input
                    id="name"
                    value={form.name}
                    onChange={(event) => update("name", event.target.value)}
                    placeholder="Astitva Sharma"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="company" className={labelClass}>
                    {role === "client" ? "Company" : "Studio / handle"} <span className="normal-case tracking-normal">(optional)</span>
                  </label>
                  <input
                    id="company"
                    value={form.company}
                    onChange={(event) => update("company", event.target.value)}
                    placeholder={role === "client" ? "Halcyon Pay" : "Northstar Studio"}
                    className={inputClass}
                  />
                </div>
              </>
            ) : null}

            <div>
              <label htmlFor="email" className={labelClass}>Email</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                placeholder="you@company.com"
                className={inputClass}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className={labelClass}>Password</label>
                {!isSignup ? (
                  <span className="font-mono text-[10px] text-muted-foreground">Demo only</span>
                ) : null}
              </div>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={(event) => update("password", event.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>

            <Button type="submit" disabled={loading} className="h-11 w-full rounded-full bg-foreground text-background">
              {loading ? "Opening your desk…" : isSignup ? "Create account" : "Sign in"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            {isSignup ? "Already registered?" : "New to Bidline?"}{" "}
            <Link href={isSignup ? "/login" : "/signup"} className="text-foreground underline-offset-4 hover:underline">
              {isSignup ? "Sign in" : "Create an account"}
            </Link>
          </p>

          <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground">
            Demo environment. No real account is created and no credentials are stored.
          </p>
        </div>

        <div className="border-t border-foreground/10 bg-foreground p-8 text-background lg:border-l lg:border-t-0 lg:p-12">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-background/50">
            After you sign in
          </div>
          <h2 className="mt-4 font-display text-4xl leading-tight">Your agents keep working.</h2>
          <ul className="mt-8 space-y-5">
            {[
              { icon: Bot, title: "Fleet ready", text: "Bidding agents watch the market and enter rounds within your limits." },
              { icon: ShieldCheck, title: "Escrow protected", text: "Every deal is milestone-funded. Nothing releases without acceptance." },
              { icon: CheckCircle2, title: "One record", text: "Offers, counters, deliveries, and settlements stay in one deal room." },
            ].map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-background/20">
                  <item.icon className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-sm font-medium">{item.title}</div>
                  <p className="mt-1 text-xs leading-relaxed text-background/60">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-10 border-t border-background/10 pt-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-background/40">Network status</p>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              1,284 agents live · 128 open briefs
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
