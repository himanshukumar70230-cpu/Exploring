import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function usd(amount: number) {
  const sign = amount < 0 ? "-" : "";
  return `${sign}$${Math.abs(amount).toLocaleString("en-US")}`;
}

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3 text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground", className)}>
      <span className="h-px w-8 bg-foreground/30" />
      {children}
    </span>
  );
}

export function PageIntro({
  kicker,
  title,
  description,
  actions,
  children,
}: {
  kicker: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-foreground/10">
      <div className="mx-auto max-w-[1400px] px-6 pb-12 pt-14 lg:px-12 lg:pb-16 lg:pt-20">
        <Kicker>{kicker}</Kicker>
        <div className="mt-6 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-4xl">
            <h1 className="text-4xl font-display leading-[0.95] tracking-tight sm:text-5xl lg:text-7xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground lg:text-xl">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
        </div>
        {children}
      </div>
    </section>
  );
}

const statusStyles: Record<string, { pill: string; dot: string; label: string }> = {
  open: { pill: "border-green-700/20 bg-green-500/10 text-green-800", dot: "bg-green-600", label: "Open" },
  live: { pill: "border-green-700/20 bg-green-500/10 text-green-800", dot: "bg-green-600", label: "Live" },
  online: { pill: "border-green-700/20 bg-green-500/10 text-green-800", dot: "bg-green-600", label: "Online" },
  completed: { pill: "border-green-700/20 bg-green-500/10 text-green-800", dot: "bg-green-600", label: "Completed" },
  paid: { pill: "border-green-700/20 bg-green-500/10 text-green-800", dot: "bg-green-600", label: "Paid" },
  negotiating: { pill: "border-amber-700/20 bg-amber-500/10 text-amber-800", dot: "bg-amber-600", label: "Negotiating" },
  review: { pill: "border-amber-700/20 bg-amber-500/10 text-amber-800", dot: "bg-amber-600", label: "In review" },
  pending: { pill: "border-amber-700/20 bg-amber-500/10 text-amber-800", dot: "bg-amber-600", label: "Pending" },
  "in escrow": { pill: "border-amber-700/20 bg-amber-500/10 text-amber-800", dot: "bg-amber-600", label: "In escrow" },
  "in-progress": { pill: "border-foreground/15 bg-foreground/5 text-foreground", dot: "bg-foreground", label: "In progress" },
  active: { pill: "border-foreground/15 bg-foreground/5 text-foreground", dot: "bg-foreground", label: "Active" },
  delivering: { pill: "border-foreground/15 bg-foreground/5 text-foreground", dot: "bg-foreground", label: "Delivering" },
  delivered: { pill: "border-blue-700/20 bg-blue-500/10 text-blue-800", dot: "bg-blue-600", label: "Delivered" },
  settled: { pill: "border-foreground bg-foreground text-background", dot: "bg-background", label: "Settled" },
  accepted: { pill: "border-foreground bg-foreground text-background", dot: "bg-background", label: "Accepted" },
  leading: { pill: "border-foreground bg-foreground text-background", dot: "bg-background", label: "Leading" },
  shortlisted: { pill: "border-foreground/20 bg-foreground/[0.03] text-foreground", dot: "bg-foreground/60", label: "Shortlisted" },
  outbid: { pill: "border-foreground/10 bg-transparent text-muted-foreground", dot: "bg-foreground/20", label: "Outbid" },
  paused: { pill: "border-foreground/10 bg-transparent text-muted-foreground", dot: "bg-foreground/20", label: "Paused" },
};

export function StatusPill({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  const style = statusStyles[status] ?? {
    pill: "border-foreground/10 bg-transparent text-muted-foreground",
    dot: "bg-foreground/30",
    label: status,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-mono uppercase tracking-[0.12em]",
        style.pill,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      {label ?? style.label}
    </span>
  );
}

export function AgentAvatar({
  initials,
  size = "md",
  status,
  className,
}: {
  initials: string;
  size?: "sm" | "md" | "lg";
  status?: string;
  className?: string;
}) {
  const sizes = {
    sm: "h-8 w-8 text-[10px]",
    md: "h-10 w-10 text-xs",
    lg: "h-14 w-14 text-sm",
  };

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <span
        className={cn(
          "flex items-center justify-center border border-foreground/15 bg-foreground font-mono uppercase tracking-wider text-background",
          sizes[size]
        )}
      >
        {initials}
      </span>
      {status ? (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
            status === "paused" || status === "outbid" ? "bg-foreground/30" : status === "negotiating" || status === "review" || status === "pending" ? "bg-amber-500" : "bg-green-500"
          )}
        />
      ) : null}
    </span>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1 w-full overflow-hidden bg-foreground/10", className)}>
      <div className="h-full bg-foreground transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function StatBlock({
  value,
  label,
  detail,
}: {
  value: ReactNode;
  label: string;
  detail?: string;
}) {
  return (
    <div className="border-l border-foreground/10 pl-5 first:border-l-0 first:pl-0">
      <div className="font-display text-3xl leading-none tracking-tight lg:text-4xl">{value}</div>
      <div className="mt-2 text-sm text-muted-foreground">{label}</div>
      {detail ? <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">{detail}</div> : null}
    </div>
  );
}

export function StatStrip({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-6 border-t border-foreground/10 pt-6 md:grid-cols-4">
      {children}
    </div>
  );
}

export function TextLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-1.5 text-sm text-foreground underline-offset-4 hover:underline",
        className
      )}
    >
      {children}
      <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </Link>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("border border-foreground/10 bg-background", className)}>{children}</div>;
}

export function PanelHeader({
  title,
  meta,
  action,
}: {
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-foreground/10 px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{title}</span>
        {meta ? <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{meta}</span> : null}
      </div>
      {action}
    </div>
  );
}
