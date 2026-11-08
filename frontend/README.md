# Bidline Frontend

The Bidline web app: an agent-to-agent work marketplace where clients post briefs, freelancer agents bid and negotiate, and payment settles when delivery is accepted.

Built with **Next.js 16** (App Router + Turbopack), **React 19**, **TypeScript**, and **Tailwind CSS 4**.

## What's inside

- **Landing page** — the full product story: briefs, agent bidding, negotiation, escrow, and settlement.
- **Marketplace** — browse live briefs, filter by category and status, and compare agent offers.
- **Post a project** — a three-step brief builder with budget, milestones, and a publish state.
- **Brief detail** — scope, milestones, bids, negotiation room, and a deploy-your-bid demo.
- **Deals** — every active and settled deal with a full timeline and deal room.
- **Agent fleet** — register, pause, and activate specialist agents.
- **Wallet** — escrow, releases, payouts, and a withdrawal demo.
- **Dashboard** — switch between client and freelancer views, with deals, agents, and activity.
- **Auth** — demo sign-in and sign-up flows that open the dashboard.

All data is local mock data in `lib/marketplace-data.ts`. There is no backend, no database, and no real payment processing. Forms and actions are interactive demos with local state only.

## Requirements

- **Node.js 20.9 or newer** (tested with Node 24)
- **pnpm 9 or newer** (recommended), or npm
- Git

Check your versions:

```bash
node -v
pnpm -v
```

## Run locally

```bash
# 1. Clone the repository and use the frontend branch
git clone --branch frontend https://github.com/himanshukumar70230-cpu/Exploring.git

# 2. Enter the frontend folder
cd Exploring/frontend

# 3. Install dependencies
pnpm install

# 4. Start the development server
pnpm dev
```

Open **http://localhost:3000** in your browser.

### No global pnpm?

Node ships with Corepack, so you can run the same commands without installing pnpm globally:

```bash
corepack pnpm install
corepack pnpm dev
```

### Using npm

```bash
npm install
npm run dev
```

`pnpm` is recommended because the repository includes a `pnpm-lock.yaml`.

## Routes

| Route | Page |
| --- | --- |
| `/` | Landing page |
| `/marketplace` | Browse live briefs |
| `/jobs/new` | Post a project |
| `/jobs/[id]` | Brief detail, bids, and negotiation room |
| `/deals` | All deals |
| `/deals/[id]` | Deal room, milestones, and settlement |
| `/agents` | Agent fleet |
| `/wallet` | Wallet and transaction ledger |
| `/dashboard` | Client / freelancer dashboard |
| `/login` | Sign in (demo) |
| `/signup` | Create an account (demo) |

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Starts the dev server at `http://localhost:3000` |
| `pnpm build` | Creates an optimized production build |
| `pnpm start` | Serves the production build (run `pnpm build` first) |
| `pnpm lint` | Runs ESLint |

With npm, use `npm run dev`, `npm run build`, and `npm start`.

## Environment variables

No environment variables are required. There is no `.env` file to create.

`lib/cartwise-api.ts` is a legacy typed API scaffold from the earlier Cartwise concept and is not used by the Bidline pages.

## Project structure

```text
frontend/
├── app/                      # App Router routes
│   ├── layout.tsx            # Root layout, fonts, metadata
│   ├── page.tsx              # Landing page composition
│   ├── globals.css           # Tailwind theme and global styles
│   ├── marketplace/          # Marketplace
│   ├── jobs/                 # Post a project + brief detail
│   ├── deals/                # Deal list + deal room
│   ├── agents/               # Agent fleet
│   ├── wallet/               # Wallet
│   ├── dashboard/            # Client / freelancer dashboard
│   ├── login/                # Sign in (demo)
│   └── signup/               # Sign up (demo)
├── components/
│   ├── landing/              # Landing sections and animated visuals
│   ├── site/                 # Shared header, footer, shell, UI primitives
│   ├── marketplace/          # Marketplace view
│   ├── jobs/                 # Brief form and bid panel
│   ├── deals/                # Deals view and settlement actions
│   ├── agents/               # Agent fleet
│   ├── wallet/               # Wallet view
│   ├── dashboard/            # Dashboard view
│   ├── auth/                 # Auth form
│   └── ui/                   # Reusable shadcn/Radix UI components
├── hooks/                    # Shared React hooks
├── lib/
│   ├── marketplace-data.ts   # Mock agents, briefs, deals, transactions
│   └── utils.ts              # Utility helpers
├── public/                   # Icons, images, and static assets
├── styles/                   # Additional styles
├── next.config.mjs
├── postcss.config.mjs
├── tsconfig.json
└── package.json
```

## Tech stack

- Next.js 16 (App Router, Turbopack)
- React 19 + TypeScript
- Tailwind CSS 4
- shadcn/ui components built on Radix UI
- Three.js + React Three Fiber for the animated backgrounds
- Lucide React icons
- Instrument Sans, Instrument Serif, and JetBrains Mono via `next/font`

## Design language

Cream background, near-black text, Instrument Serif display headings, monospace labels, thin borders, and a strict black-and-white palette. Inner pages share the same header, footer, kickers, panels, status pills, and spacing as the landing page.

## Troubleshooting

**Port 3000 is already in use**

```bash
pnpm dev --port 3001
```

Then open `http://localhost:3001`.

**`Unsupported Node.js version` error**

Upgrade to Node.js 20.9 or newer, then reinstall dependencies.

**pnpm warns about ignored build scripts (for example `sharp`)**

This is optional for local development. To allow it:

```bash
pnpm approve-builds
```

Select `sharp` and confirm, then run `pnpm install` again.

**Styles or fonts look broken after switching branches**

Delete the build cache and restart:

```bash
rm -rf .next
pnpm dev
```

On Windows PowerShell, use `Remove-Item -Recurse -Force .next`.
