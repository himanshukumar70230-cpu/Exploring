# Deploying Bidline on Render

## Live deployment

| Service | URL |
| --- | --- |
| Web app | <https://bidline-web.onrender.com> |
| API | <https://bidline-api-rj25.onrender.com> |
| Health probe | <https://bidline-api-rj25.onrender.com/healthz> |
| API metadata | <https://bidline-api-rj25.onrender.com/v1/meta> |

PayPal runs in `mock` mode on the live deployment until sandbox credentials are
added. Both services are on Render's free plan, so the first request after
inactivity can take up to a minute while the instance wakes.

The repository includes a Render Blueprint (`render.yaml`) that provisions two
services:

| Service | Runtime | Root | Purpose |
| --- | --- | --- | --- |
| `bidline-api` | Docker | `backend/` | Go API, SQLite, Gemini, PayPal |
| `bidline-web` | Node | `frontend/` | Next.js app and Clerk auth |

The frontend never exposes the Clerk token to the browser: every `/api/bidline/*`
call is proxied server-side to the API.

## One-click Blueprint

1. Push this repository to GitHub.
2. Open <https://dashboard.render.com/blueprints> and choose **New Blueprint Instance**.
3. Select the repository and the `main` branch.
4. Render reads `render.yaml` and prompts for the secrets marked `sync: false`.
5. Fill in the values below, then create the services.

### Required secrets

| Variable | Service | Value |
| --- | --- | --- |
| `CLERK_SECRET_KEY` | both | Clerk secret key (`sk_test_…` or `sk_live_…`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | both | Clerk publishable key (`pk_test_…` or `pk_live_…`) |
| `GEMINI_API_KEY` | API | Google AI Studio key |
| `FRONTEND_URL` | API | `https://<bidline-web host>` (set after the web service exists) |
| `PAYPAL_RETURN_URL` | API | `https://<bidline-web host>/payments/paypal/return` |
| `PAYPAL_CANCEL_URL` | API | `https://<bidline-web host>/deals` |
| `PAYPAL_CLIENT_ID` | API | only when `PAYPAL_MODE` is `sandbox` or `live` |
| `PAYPAL_CLIENT_SECRET` | API | only for sandbox/live |
| `PAYPAL_WEBHOOK_ID` | API | only for sandbox/live |

`BIDLINE_API_URL` on the web service is wired automatically from the API
service's host. The frontend adds `https://` when the value is a bare host.

### Clerk settings

Add the Render web host to the Clerk instance's allowed origins. Clerk test
instances accept any origin; production instances need the deployed domain in
the dashboard.

The API verifies tokens against:

```
https://<instance>.clerk.accounts.dev/.well-known/jwks.json
```

Those values are already in `render.yaml` for the current test instance. Update
`CLERK_ISSUER` and `CLERK_JWKS_URL` when switching to a production Clerk
instance. Both the web and API services must use the same instance.

### PayPal

`PAYPAL_MODE=mock` is the default so the full escrow lifecycle runs without
credentials. Switch to `sandbox` and add the client id, secret, and webhook id
to exercise real PayPal Sandbox orders and payouts. Register the webhook as:

```
https://<bidline-api host>/v1/webhooks/paypal
```

Subscribe to `PAYMENT.CAPTURE.COMPLETED` and `PAYMENT.PAYOUTS-ITEM.SUCCEEDED`.

## Persistence

Render free web services have an **ephemeral filesystem**. `render.yaml` sets
`DATABASE_PATH=/tmp/bidline.db`, which survives while the instance is running
but resets on deploy or restart. Seeded demo data is recreated automatically;
Clerk accounts are recreated on first sign-in.

For durable data:

1. Upgrade the API service to a paid plan that supports disks.
2. Add a disk mounted at `/var/data`.
3. Set `DATABASE_PATH=/var/data/bidline.db`.

```yaml
    disk:
      name: bidline-data
      mountPath: /var/data
      sizeGB: 1
```

## Manual setup without a Blueprint

### API

- Runtime: Docker
- Dockerfile: `backend/Dockerfile`
- Docker context: `backend`
- Health check: `/healthz`
- Environment: copy `backend/.env.example` and set `APP_ENV=production`,
  `DATABASE_PATH=/tmp/bidline.db`, plus the secrets above.

### Web

- Runtime: Node
- Root directory: `frontend`
- Build: `corepack enable && corepack pnpm install --frozen-lockfile && corepack pnpm build`
- Start: `corepack pnpm start`
- Health check: `/login`
- Environment: `BIDLINE_API_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
  `CLERK_SECRET_KEY`.

## Verify the deployment

```bash
curl https://<bidline-api host>/healthz
curl https://<bidline-api host>/v1/meta
```

`/v1/meta` should report:

```json
{
  "auth": { "clerk": true, "dev": false },
  "ai": { "enabled": true, "provider": "gemini" },
  "payments": { "provider": "paypal", "mode": "mock", "mock": true }
}
```

Then open the web URL, sign in with Clerk, and confirm the dashboard loads with
an auto-provisioned Procurement-01 agent.

## Operational notes

- **Cold starts**: free services sleep after inactivity; the first request can
  take 30–60 seconds.
- **SSE**: `GET /v1/activity/stream` is proxied through Next.js with buffering
  disabled. Keep the API's `WriteTimeout` at `0` (already configured).
- **Rate limits**: AI and PayPal routes are limited per identity and IP. The
  limiter is in-memory per instance; move it to Redis if you scale horizontally.
- **SQLite**: single-writer. Keep the API at one instance until you migrate to a
  networked database.
