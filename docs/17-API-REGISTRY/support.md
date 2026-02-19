# Customer Support

## Module Info

| Property | Value |
|----------|-------|
| Domain | support |
| Source Files | `server/src/routes/admin/support.routes.ts`, `server/src/routes/customer/order-tracking.routes.ts`, `server/src/routes/public/contact.routes.ts`, `server/src/routes/webhooks/mailgun-inbound.routes.ts` |
| Endpoint Count | 14 |

## Auth & Authorization

| Scope | Auth Required | Roles Allowed |
|-------|---------------|---------------|
| Customer endpoints | Customer session token (Bearer) | Authenticated customers |
| Admin endpoints | Admin session cookie | `admin`, `store_manager`, `fulfillment` (via `requireAdmin`) |
| Public endpoints | None (rate-limited) | Anyone |
| Webhook endpoints | Mailgun HMAC signature | Mailgun service |

## Notes

The support system spans four route files. Customer-facing ticket operations are in `order-tracking.routes.ts` under the `/support` prefix. Admin management is in `support.routes.ts`. The public contact form is a standalone route. Inbound email handling is a webhook route.

For the full functional specification including notification flows, email templates, and configuration, see [Support Ticket System](../18-FUNCTIONAL-DOCS/SUPPORT_TICKET_SYSTEM.md).

## Endpoints

### Customer Endpoints — Order Tracking (Auth: Customer Bearer Token via `requireCustomerAuth`)

| Method | Path | Description | Source File |
|--------|------|-------------|-------------|
| `GET` | `/api/customer/orders/support` | List customer's support tickets | `server/src/routes/customer/order-tracking.routes.ts` |
| `POST` | `/api/customer/orders/support` | Create a new support ticket | `server/src/routes/customer/order-tracking.routes.ts` |
| `POST` | `/api/customer/orders/support/:id/reply` | Reply to an existing ticket | `server/src/routes/customer/order-tracking.routes.ts` |

### Customer Endpoints — Legacy (Auth: Replit Auth via `isAuthenticated`)

| Method | Path | Description | Source File |
|--------|------|-------------|-------------|
| `POST` | `/api/customer/support` | Create ticket (legacy, no notifications) | `server/src/routes/admin/support.routes.ts` (default `router`) |
| `GET` | `/api/customer/support` | List customer's tickets (legacy) | `server/src/routes/admin/support.routes.ts` (default `router`) |

### Admin Endpoints (Auth: Admin Session)

| Method | Path | Description | Source File |
|--------|------|-------------|-------------|
| `GET` | `/api/admin/support` | List all tickets with stats, optional `?status=` filter | `server/src/routes/admin/support.routes.ts` |
| `GET` | `/api/admin/support/:id` | Get single ticket detail with customer info | `server/src/routes/admin/support.routes.ts` |
| `PATCH` | `/api/admin/support/:id` | Update ticket (status, priority, add admin note) | `server/src/routes/admin/support.routes.ts` |
| `POST` | `/api/admin/support` | Create ticket on behalf of a customer | `server/src/routes/admin/support.routes.ts` |
| `GET` | `/api/admin/support/customers/search` | Search customers by name/email/phone (`?q=`) | `server/src/routes/admin/support.routes.ts` |
| `GET` | `/api/admin/support/customers/:customerId/orders` | Get customer order history for ticket context | `server/src/routes/admin/support.routes.ts` |
| `GET` | `/api/admin/support/email-logs/:ticketId` | Get email audit log for a ticket | `server/src/routes/admin/support.routes.ts` |

### Public Endpoints (No Auth, Rate-Limited)

| Method | Path | Description | Source File |
|--------|------|-------------|-------------|
| `POST` | `/api/contact` | Submit contact form (creates ticket) | `server/src/routes/public/contact.routes.ts` |

### Webhook Endpoints (Mailgun Signature)

| Method | Path | Description | Source File |
|--------|------|-------------|-------------|
| `POST` | `/api/webhooks/mailgun/inbound` | Process inbound email (new ticket or reply) | `server/src/routes/webhooks/mailgun-inbound.routes.ts` |

_14 endpoint(s) documented._
