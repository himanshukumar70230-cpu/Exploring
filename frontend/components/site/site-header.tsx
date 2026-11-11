"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowUpRight, ChevronDown } from "lucide-react";
import type { User } from "@/lib/api-types";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/site/auth-menu";
import { cn } from "@/lib/utils";

const navLinks = [
  { name: "Marketplace", href: "/marketplace" },
  { name: "Agents", href: "/agents" },
  { name: "Deals", href: "/deals" },
  { name: "Wallet", href: "/wallet" },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function SiteHeader({ viewer }: { viewer: User | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-foreground/10 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6 lg:px-12">
        <div className="flex items-center gap-10">
          <Link href="/" className="font-display text-2xl tracking-tight" onClick={() => setOpen(false)}>
            Bidline
          </Link>
          <nav className="hidden items-center gap-7 lg:flex">
            {navLinks.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative py-1 text-sm transition-colors",
                    active ? "text-foreground" : "text-foreground/60 hover:text-foreground"
                  )}
                >
                  {link.name}
                  {active ? <span className="absolute -bottom-1 left-0 right-0 h-px bg-foreground" /> : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden items-center gap-5 md:flex">
          <span className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground xl:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            1,284 agents live
          </span>
          {viewer ? (
            <>
              <Link href="/dashboard" className="text-sm text-foreground/60 transition-colors hover:text-foreground">
                Dashboard
              </Link>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((value) => !value)}
                  className="flex items-center gap-2 text-sm text-foreground/75 transition-colors hover:text-foreground"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground font-mono text-[10px] text-background">
                    {initials(viewer.name || viewer.email)}
                  </span>
                  <span className="max-w-[120px] truncate">{viewer.name || viewer.email}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {menuOpen ? (
                  <div
                    className="absolute right-0 top-full mt-3 w-64 border border-foreground/15 bg-background p-2 shadow-lg"
                    role="menu"
                  >
                    <div className="border-b border-foreground/10 px-3 py-2.5">
                      <div className="truncate text-sm font-medium">{viewer.name || "Bidline account"}</div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">{viewer.email}</div>
                      <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                        {viewer.role === "both" ? "Client & freelancer" : viewer.role}
                      </div>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="mt-1 block px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
                      role="menuitem"
                    >
                      Open dashboard
                    </Link>
                    <Link
                      href="/agents"
                      onClick={() => setMenuOpen(false)}
                      className="block px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
                      role="menuitem"
                    >
                      Agent fleet
                    </Link>
                    <SignOutButton className="mt-1 flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground/70 transition-colors hover:bg-foreground/[0.04] hover:text-foreground" />
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <Link href="/login" className="text-sm text-foreground/60 transition-colors hover:text-foreground">
              Sign in
            </Link>
          )}
          <Button asChild size="sm" className="h-9 rounded-full bg-foreground px-5 text-background hover:bg-foreground/90">
            <Link href="/jobs/new">
              Post a project
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="p-2 md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <div
        className={cn(
          "fixed inset-x-0 top-16 z-40 border-b border-foreground/10 bg-background transition-all duration-300 md:hidden",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        )}
      >
        <div className="flex flex-col gap-1 px-6 py-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="border-b border-foreground/5 py-3 font-display text-3xl"
            >
              {link.name}
            </Link>
          ))}
          <Link href="/dashboard" onClick={() => setOpen(false)} className="border-b border-foreground/5 py-3 font-display text-3xl">
            Dashboard
          </Link>
          {viewer ? (
            <div className="mt-4 border border-foreground/10 p-4">
              <div className="text-sm font-medium">{viewer.name || viewer.email}</div>
              <div className="mt-1 truncate text-xs text-muted-foreground">{viewer.email}</div>
              <SignOutButton className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground" />
            </div>
          ) : null}
          <div className="mt-6 flex gap-3">
            <Button asChild variant="outline" className="h-12 flex-1 rounded-full">
              <Link href="/login" onClick={() => setOpen(false)}>{viewer ? "Switch account" : "Sign in"}</Link>
            </Button>
            <Button asChild className="h-12 flex-1 rounded-full bg-foreground text-background">
              <Link href="/jobs/new" onClick={() => setOpen(false)}>Post a project</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
