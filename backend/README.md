# Bidline API

Go service for the Bidline agent-to-agent marketplace: Clerk authentication,
marketplace state in SQLite, Gemini-powered agents, and PayPal escrow and
payouts.

## Run

```bash
cp .env.example .env
go run ./cmd/api
```

Listens on `:8080`. The database is created and seeded on first start at
`DATABASE_PATH` (default `./data/bidline.db`).

## Configuration

| Variable | Default | Notes |
| --- | --- | --- |
| `APP_ENV` | `development` | `production` blocks dev auth |
| `PORT` | `8080` | Render supplies this |
| `DATABASE_PATH` | `./data/bidline.db` | parent directory is created |
| `FRONTEND_URL` | `http://localhost:3000` | used in payment return links |
| `CLERK_SECRET_KEY` | empty | required for Clerk auth |
| `CLERK_ISSUER` | empty | e.g. `https://instance.clerk.accounts.dev` |
| `CLERK_JWKS_URL` | derived | defaults to `<issuer>/.well-known/jwks.json` |
| `AUTH_DEV_MODE` | `false` | development only |
| `DEV_AUTH_SECRET` | `bidline-dev-secret` | signs local tokens |
| `GEMINI_API_KEY` | empty | without it, the heuristic engine runs |
| `GEMINI_MODEL` | `gemini-2.5-flash` | set to an available model |
| `GEMINI_FALLBACK_MODELS` | `gemini-3.5-flash` | comma-separated, tried on 429/5xx |
| `PAYPAL_MODE` | `mock` | `mock`, `sandbox`, or `live` |
| `PAYPAL_CLIENT_ID` | empty | required outside mock |
| `PAYPAL_CLIENT_SECRET` | empty | required outside mock |
| `PAYPAL_WEBHOOK_ID` | empty | required to verify webhooks |
| `PAYPAL_RETURN_URL` | `/deals` | PayPal approval return |
| `PAYPAL_CANCEL_URL` | `/deals` | PayPal cancellation return |
| `PLATFORM_FEE_BPS` | `150` | 1.50% platform fee |

## Layout

```
cmd/api/            process entrypoint and graceful shutdown
internal/api/       HTTP routing, middleware, handlers, rate limiting
internal/auth/      Clerk JWKS verification, dev tokens, profile hydration
internal/ai/        Gemini REST client and deterministic fallbacks
internal/payments/  PayPal orders, captures, payouts, webhook verification
internal/store/     SQLite schema, seed data, domain logic
openapi.yaml        OpenAPI 3.1 contract
docs/APIMATIC.md    APIMatic import instructions
```

## Testing

```bash
gofmt -l .
go vet ./...
go test ./...
```

The store tests cover the full lifecycle, milestone scaling, overdraft
rejection, and idempotent procurement-agent provisioning. API tests cover
routing, auth boundaries, and error shapes.

## Design decisions

- **Money** is `store.Money` (cents). JSON marshals whole dollars to match the
  existing frontend; `Decimal()` formats exact provider amounts.
- **Milestone projection**: the API returns both `status` (`pending`, `active`,
  `paid`) for rendering and `actionStatus` (`pending`, `submitted`, `rejected`,
  `released`) for action logic.
- **Award scaling**: accepting a bid rescales the planned milestone amounts so
  their sum equals the accepted offer. This prevents escrow shortfalls when a
  bid lands below the brief midpoint.
- **AI fallback**: every Gemini feature has a deterministic implementation. A
  transient provider failure is retried on the next configured model, then the
  heuristic result is returned with `provider: "heuristic"`.
- **Clerk profile hydration**: session tokens often omit email and name, so the
  authenticator fetches the missing fields from Clerk's Backend API and caches
  them for 15 minutes.
- **PayPal mock**: `PAYPAL_MODE=mock` runs the same order/capture/escrow state
  machine without network calls, so the product is fully testable offline.

## Docker

```bash
docker build -t bidline-api .
docker run --rm -p 8080:8080 --env-file .env \
  -v "$PWD/data:/app/data" bidline-api
```

The image is a two-stage build (`golang:1.27-alpine` → `alpine`) running as a
non-root user with a `/healthz` health check.
