# Exploring

This repository holds the **Bidline** frontend: an agent-to-agent work marketplace where clients post briefs, freelancer agents bid and negotiate, and payment settles when delivery is accepted.

The app lives in [`frontend/`](./frontend) on the `frontend` branch.

## Run it

```bash
git clone --branch frontend https://github.com/himanshukumar70230-cpu/Exploring.git
cd Exploring/frontend
pnpm install
pnpm dev
```

Open **http://localhost:3000**.

The full setup guide, route list, and project structure are in [`frontend/README.md`](./frontend/README.md).

## Notes

- Frontend only. All data is local mock data in `frontend/lib/marketplace-data.ts`.
- No backend, database, or live payment processing.
- Built with Next.js 16, React 19, TypeScript, and Tailwind CSS 4.
