# Affiliate Signup

## Module Info

| Property | Value |
|----------|-------|
| Domain | affiliate-signup |
| Source Files | `server/src/routes/public/affiliate-signup.routes.ts` |
| Mount Point | `/api/affiliate-signup` |
| Endpoint Count | 5 |

## Auth & Authorization

| Property | Value |
|----------|-------|
| Auth Required | No (public routes; no mount-level middleware) |
| Roles Allowed | Public — some endpoints check for a Bearer token internally (see notes) |

## Current reality

- **Canonical source:** `server/src/routes/public/affiliate-signup.routes.ts`
- **Effective base mount:** `/api/affiliate-signup` (see `server/routes.ts` line 88; no auth middleware at mount).
- **Paths in the corrected table in the Notes section are fully qualified** (mount prefix + router path). The auto-generated table further below has incorrect paths — see the correction notice in Notes.
- **Auth notes:**
  - `GET /api/affiliate-signup/` and `POST /api/affiliate-signup/` — fully public; the GET optionally inspects a Bearer token to detect existing affiliates.
  - `POST /api/affiliate-signup/join` — requires a valid Bearer session token (`Authorization: Bearer <token>`) checked internally.
  - `POST /api/affiliate-signup/send-verification` and `POST /api/affiliate-signup/verify-phone` — fully public.

## Notes

> **Endpoint count correction:** The auto-generated table below lists only 2 endpoints. The route file actually defines **5** endpoints. The 3 missing endpoints (`/join`, `/send-verification`, `/verify-phone`) were added after the auto-generated table was last produced. The corrected table is below.

| Method | Effective URL | Description |
|--------|---------------|-------------|
| `GET` | `/api/affiliate-signup/` | Get signup info, validate invite code |
| `POST` | `/api/affiliate-signup/` | Register new affiliate (with account creation) |
| `POST` | `/api/affiliate-signup/join` | Join affiliate program (authenticated existing customer) |
| `POST` | `/api/affiliate-signup/send-verification` | Send phone verification SMS for invite |
| `POST` | `/api/affiliate-signup/verify-phone` | Verify phone number for invite |

> **Path correction notice:** The auto-generated table below shows paths as `/api/` instead of `/api/affiliate-signup/`. The corrected paths are above.


<!-- === AUTO-GENERATED SECTION (do not edit below this line) === -->

## Endpoints

| Method | Path | Source File | Line |
|--------|------|-------------|------|
| `GET` | `/api/` | server/src/routes/public/affiliate-signup.routes.ts | 21 |
| `POST` | `/api/` | server/src/routes/public/affiliate-signup.routes.ts | 136 |
| `POST` | `/api/join` | server/src/routes/public/affiliate-signup.routes.ts | 330 |
| `POST` | `/api/send-verification` | server/src/routes/public/affiliate-signup.routes.ts | 448 |
| `POST` | `/api/verify-phone` | server/src/routes/public/affiliate-signup.routes.ts | 529 |

_5 endpoint(s) detected._

<!-- === END AUTO-GENERATED SECTION === -->
