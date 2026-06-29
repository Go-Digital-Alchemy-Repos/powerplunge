# Admin Auth

## Module Info

| Property | Value |
|----------|-------|
| Domain | admin-auth |
| Source Files | server/src/routes/admin/auth.routes.ts |
| Endpoint Count | 12 |
| Mount Point | `/api/admin` |
| Auth Middleware | Per-route Better Auth session checks |

## Notes

Admin authentication endpoints for setup wizard, Better Auth login/logout, profile management, and password recovery.
First-time setup creates the initial admin account. Subsequent requests use Better Auth session cookies. Password reset links are scoped to Better Auth users linked to `admin_users`.
`server/src/auth/adminBetterAuth.ts` attaches canonical Better Auth request fields (`req.adminAuth`, `req.adminId`, and `req.adminUser`) after Better Auth succeeds; admin routes should use those fields for audit IDs and profile data.

<!-- === AUTO-GENERATED SECTION (do not edit below this line) === -->

## Endpoints

| Method | Path | Handler | Line |
|--------|------|---------|------|
| `GET` | `/api/admin/check-setup` | Check if admin setup is needed | — |
| `POST` | `/api/admin/setup` | Create initial admin account | — |
| `POST` | `/api/admin/login` | Admin Better Auth login | — |
| `POST` | `/api/admin/logout` | Admin session logout | — |
| `GET` | `/api/admin/me` | Get current admin user info | — |
| `GET` | `/api/admin/optional-me` | Get current admin user info or `null` | — |
| `GET` | `/api/admin/me/profile` | Get current admin profile | — |
| `PATCH` | `/api/admin/me/profile` | Update current admin profile | — |
| `POST` | `/api/admin/me/change-password` | Change current admin password | — |
| `POST` | `/api/admin/forgot-password` | Request admin password reset email | — |
| `GET` | `/api/admin/validate-reset-token` | Validate admin password reset token | — |
| `POST` | `/api/admin/reset-password` | Reset admin password with token | — |

_12 endpoint(s) detected._

<!-- === END AUTO-GENERATED SECTION === -->
