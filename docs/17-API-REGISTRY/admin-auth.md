# Admin Auth

## Module Info

| Property | Value |
|----------|-------|
| Domain | admin-auth |
| Source Files | server/src/routes/admin/auth.routes.ts |
| Endpoint Count | 5 |
| Mount Point | `/api/admin` |
| Auth Middleware | Per-route Better Auth session checks |

## Notes

Admin authentication endpoints for setup wizard, Better Auth login/logout, and session check.
First-time setup creates the initial admin account. Subsequent requests use Better Auth session cookies.

<!-- === AUTO-GENERATED SECTION (do not edit below this line) === -->

## Endpoints

| Method | Path | Handler | Line |
|--------|------|---------|------|
| `GET` | `/api/admin/check-setup` | Check if admin setup is needed | 7 |
| `POST` | `/api/admin/setup` | Create initial admin account | 16 |
| `POST` | `/api/admin/login` | Admin Better Auth login | 51 |
| `POST` | `/api/admin/logout` | Admin session logout | 76 |
| `GET` | `/api/admin/me` | Get current admin user info | 85 |

_5 endpoint(s) detected._

<!-- === END AUTO-GENERATED SECTION === -->
