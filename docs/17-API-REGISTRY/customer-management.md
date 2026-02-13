# Customer Management

## Module Info

| Property | Value |
|----------|-------|
| Domain | customer-management |
| Source Files | server/src/routes/admin/customer-management.routes.ts |
| Endpoint Count | 13 |

## Auth & Authorization

| Property | Value |
|----------|-------|
| Auth Required | TBD |
| Roles Allowed | TBD |

## Notes

_Add manual documentation notes here. This section is preserved during sync._


<!-- === AUTO-GENERATED SECTION (do not edit below this line) === -->

## Endpoints

| Method | Path | Source File | Line |
|--------|------|-------------|------|
| `GET` | `/:customerId/audit-logs` | server/src/routes/admin/customer-management.routes.ts | 97 |
| `POST` | `/:customerId/disable` | server/src/routes/admin/customer-management.routes.ts | 106 |
| `POST` | `/:customerId/enable` | server/src/routes/admin/customer-management.routes.ts | 133 |
| `POST` | `/:customerId/force-logout` | server/src/routes/admin/customer-management.routes.ts | 220 |
| `GET` | `/:customerId/notes` | server/src/routes/admin/customer-management.routes.ts | 7 |
| `POST` | `/:customerId/notes` | server/src/routes/admin/customer-management.routes.ts | 16 |
| `DELETE` | `/:customerId/notes/:noteId` | server/src/routes/admin/customer-management.routes.ts | 30 |
| `GET` | `/:customerId/orders` | server/src/routes/admin/customer-management.routes.ts | 84 |
| `GET` | `/:customerId/profile` | server/src/routes/admin/customer-management.routes.ts | 39 |
| `POST` | `/:customerId/reset-password` | server/src/routes/admin/customer-management.routes.ts | 184 |
| `POST` | `/:customerId/send-password-reset` | server/src/routes/admin/customer-management.routes.ts | 160 |
| `GET` | `/:customerId/tags` | server/src/routes/admin/customer-management.routes.ts | 51 |
| `PUT` | `/:customerId/tags` | server/src/routes/admin/customer-management.routes.ts | 60 |

_13 endpoint(s) detected._

<!-- === END AUTO-GENERATED SECTION === -->
