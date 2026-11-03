# Exploring

Cartwise is an AI shopping assistant that researches products, compares options, and prepares a cart for your approval before checkout.

This repository contains the web frontend along with workspaces for the backend API and AI agents.

## Repository layout

| Path | Description |
| --- | --- |
| [`frontend/`](frontend/) | Next.js 16 web app (current UI) |
| [`backend/`](backend/) | Node.js backend workspace |
| [`agents/`](agents/) | Python AI agent workspace |

## Quick start

Requirements: **Node.js 20.9+** and **pnpm 9+** (or npm).

```bash
git clone https://github.com/himanshukumar70230-cpu/Exploring.git
cd Exploring/frontend
pnpm install
pnpm dev
```

Open **http://localhost:3000**.

No global pnpm? Use Corepack:

```bash
corepack pnpm install
corepack pnpm dev
```

No environment variables or backend setup are needed to run the landing page.

## Features

- Responsive landing page for the Cartwise AI shopping assistant
- Animated hero, product research, and agent visuals
- Feature, workflow, metrics, security, and developer sections
- Reusable shadcn/ui component library built on Radix UI
- Typed API client scaffold in `frontend/lib/cartwise-api.ts`

## Tech stack

- Next.js 16 (App Router, Turbopack)
- React 19 and TypeScript
- Tailwind CSS 4
- Radix UI / shadcn/ui
- Three.js and React Three Fiber
- Lucide icons

## Documentation

See [`frontend/README.md`](frontend/README.md) for detailed setup, scripts, project structure, and troubleshooting.
