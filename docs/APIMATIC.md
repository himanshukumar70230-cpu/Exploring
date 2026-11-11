# APIMatic import guide

Bidline ships a complete OpenAPI 3.1 description at [`backend/openapi.yaml`](../backend/openapi.yaml).
It covers every public and authenticated route, the Clerk bearer security
scheme, request/response schemas, and the money-as-whole-dollars convention.

APIMatic turns this contract into a developer portal, SDKs, mock servers, and
test cases without maintaining a second source of truth.

## 1. Import the specification

1. Sign in at [app.apimatic.io](https://app.apimatic.io).
2. Choose **API Specification → Import**.
3. Upload `backend/openapi.yaml` or point APIMatic at the raw GitHub URL.
4. Name the API **Bidline API** and set the version to `1.0.0`.

### If the importer rejects OpenAPI 3.1

Some APIMatic plans validate against OpenAPI 3.0.x. Convert a copy first; do not
edit the checked-in 3.1 spec.

```bash
npx openapi-down-convert \
  --input backend/openapi.yaml \
  --output build/openapi-3.0.yaml
```

Upload `build/openapi-3.0.yaml` instead. The conversion only changes the
document envelope; the schemas and paths are preserved.

## 2. Configure authentication

The spec declares a single `clerkSession` HTTP bearer scheme. In the APIMatic
portal:

- Set **Authentication** to `Bearer token`.
- Document that the token is a Clerk session JWT, not an API key.
- Do not add a global API key. The API intentionally has no static keys.

The only unauthenticated routes are:

| Route | Why |
| --- | --- |
| `GET /healthz` | Render health probe |
| `GET /v1/meta` | public capability metadata |
| `POST /v1/auth/dev` | local-only demo login, disabled in production |
| `POST /v1/webhooks/paypal` | authenticated by PayPal's transmission signature |

## 3. Set environments

Create three APIMatic environments:

| Name | Base URL |
| --- | --- |
| Local | `http://localhost:8080` |
| Render | the live `bidline-api` URL from the Render dashboard |
| Mock | APIMatic's generated mock server |

## 4. Generate artifacts

From the imported API, APIMatic can generate:

- **Developer portal** — publish the endpoint reference and auth guide.
- **SDKs** — TypeScript, Python, Go, and Java clients for external agents.
- **Mock server** — exercise the frontend against stable fixtures.
- **Test cases** — import the bundled request examples and add assertions for
  the lifecycle: publish brief → bid → award → fund escrow → submit → accept.

Keep generated code out of this repository. Publish SDKs as separate packages
so the API contract remains the only checked-in source.

## 5. Keeping the contract current

`backend/openapi.yaml` is the canonical contract. When a route or schema
changes:

1. Update the Go handler and the OpenAPI document in the same commit.
2. Run `go test ./...` and `corepack pnpm exec tsc --noEmit`.
3. Re-import or sync the spec in APIMatic.
4. Regenerate the portal and SDKs.

## Conventions worth preserving

- **Money** is a whole-dollar integer in JSON (`budgetMin: 8000`) and cents in
  SQLite. Negative transaction amounts are debits.
- **Milestones** expose both `status` (the UI vocabulary: `pending`, `active`,
  `paid`) and `actionStatus` (the raw lifecycle: `pending`, `submitted`,
  `rejected`, `released`).
- **Deals** end in `settled`, not `released`; `released` is a milestone action.
- **AI responses** report `provider` as `gemini:<model>` when Gemini answered,
  or `heuristic` when the deterministic fallback ran.
