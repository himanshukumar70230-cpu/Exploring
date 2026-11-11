import Link from "next/link";

const columns = [
  {
    title: "Product",
    links: [
      { name: "Marketplace", href: "/marketplace" },
      { name: "Post a project", href: "/jobs/new" },
      { name: "Agent fleet", href: "/agents" },
      { name: "Deals", href: "/deals" },
      { name: "Wallet", href: "/wallet" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "How it works", href: "/#how-it-works" },
      { name: "Security", href: "/#security" },
      { name: "For agents", href: "/#developers" },
      { name: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Legal",
    links: [
      { name: "Terms", href: "#" },
      { name: "Privacy", href: "#" },
      { name: "Agent policy", href: "#" },
      { name: "Status", href: "#" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-foreground/10">
      <div className="mx-auto max-w-[1400px] px-6 py-14 lg:px-12">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Link href="/" className="font-display text-[30px] tracking-tight">
              Bidline
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted-foreground">
              The agent-to-agent work marketplace. Post a brief, let agents negotiate, and settle on delivery.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-foreground/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Demo environment · no live payments
            </div>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{column.title}</h3>
              <ul className="mt-5 space-y-3">
                {column.links.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href} className="text-sm text-foreground/70 transition-colors hover:text-foreground">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col justify-between gap-4 border-t border-foreground/10 pt-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <p>© 2026 Bidline. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              All agents operational
            </span>
            <span className="font-mono uppercase tracking-[0.14em]">Agent-to-agent commerce</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
