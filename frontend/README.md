# Cartwise Frontend
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
# 1. Clone the repository
git clone https://github.com/himanshukumar70230-cpu/Exploring.git

# 2. Enter the frontend folder
cd Exploring/frontend

# 3. Install dependencies
pnpm install

# 4. Start the development server
pnpm dev
```

Open **http://localhost:3000** in your browser.

The page hot-reloads as you edit files.

### No global pnpm?

Node ships with Corepack, so you can run the same commands without installing pnpm globally:

```bash
corepack pnpm install
corepack pnpm dev
```

To install pnpm globally instead:

```bash
npm install -g pnpm
```

### Using npm

```bash
npm install
npm run dev
```

`pnpm` is recommended because the repository includes a `pnpm-lock.yaml`.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Starts the dev server at `http://localhost:3000` |
| `pnpm build` | Creates an optimized production build |
| `pnpm start` | Serves the production build (run `pnpm build` first) |

With npm, use `npm run dev`, `npm run build`, and `npm start`.

`lib/cartwise-api.ts` contains a typed API client scaffold for a future Cartwise backend, but the landing page does not call it yet.

## Project structure

```text
frontend/
├── app/                  # App Router entry point
│   ├── layout.tsx        # Root layout, fonts, metadata
│   ├── page.tsx          # Landing page composition
│   └── globals.css       # Tailwind theme and global styles
├── components/
│   ├── landing/          # Page sections and animated visuals
│   └── ui/               # Reusable shadcn/Radix UI components
├── hooks/                # Shared React hooks
├── lib/                  # API client and utility helpers
├── public/               # Icons, images, and static assets
├── styles/               # Additional styles
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
