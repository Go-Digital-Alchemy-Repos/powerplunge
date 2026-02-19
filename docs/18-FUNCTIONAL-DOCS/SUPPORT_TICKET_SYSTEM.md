# Support Ticket System

## Overview

The Power Plunge support ticket system provides multi-channel customer support with integrated email notifications, in-app notifications, and real-time push updates. Customers can create tickets via a public contact form, their account dashboard, or by emailing the support address directly. Admin staff manage tickets through a dedicated admin panel with reply, status management, priority, and email audit trail capabilities.

## Architecture

### Database Schema

#### `support_tickets`

| Column | Type | Description |
|--------|------|-------------|
| `id` | varchar (UUID) | Primary key, auto-generated |
| `customerId` | varchar | FK → `customers.id` (required) |
| `orderId` | varchar | FK → `orders.id` (optional, for order-related issues) |
| `subject` | text | Ticket subject line |
| `message` | text | Initial customer message |
| `type` | text | Category: `general`, `return`, `refund`, `shipping`, `technical` |
| `status` | text | Lifecycle state: `open`, `in_progress`, `resolved`, `closed` |
| `priority` | text | `low`, `normal`, `high`, `urgent` |
| `adminNotes` | jsonb | Array of `{ text, adminId, adminName, createdAt }` |
| `customerReplies` | jsonb | Array of `{ text, customerName, createdAt }` |
| `resolvedBy` | varchar | FK → `admin_users.id` |
| `resolvedAt` | timestamp | When ticket was resolved/closed |
| `createdAt` | timestamp | Auto-set on creation |
| `updatedAt` | timestamp | Auto-updated on changes |

#### `email_logs`

Tracks all email activity for audit/debugging (7-day retention).

| Column | Type | Description |
|--------|------|-------------|
| `id` | varchar (UUID) | Primary key |
| `ticketId` | varchar | FK → `support_tickets.id` |
| `direction` | text | `outbound` or `inbound` |
| `fromAddress` | text | Sender address |
| `toAddress` | text | Recipient address(es) |
| `subject` | text | Email subject |
| `htmlBody` | text | HTML content (outbound) |
| `textBody` | text | Plain text content (inbound) |
| `emailType` | text | `admin_notification`, `customer_confirmation`, `admin_reply`, `status_change`, `admin_reply_notification`, `inbound_reply`, `inbound_new_ticket` |
| `status` | text | `success` or `failed` |
| `error` | text | Error message if failed |
| `messageId` | text | Mailgun message ID |
| `createdAt` | timestamp | Auto-set |

#### `notifications`

General-purpose notification table used across the platform, including for support ticket events.

| Column | Type | Description |
|--------|------|-------------|
| `recipientType` | text | `admin` or `customer` |
| `recipientId` | varchar | Target user ID |
| `type` | text | Namespaced event type (see below) |
| `title` / `body` | text | Display strings |
| `linkUrl` | text | Deep link for click-through |
| `entityType` / `entityId` | text | Entity reference (e.g., `ticket`, ticket ID) |
| `dedupeKey` | text (unique) | Prevents duplicate notifications |
| `isRead` / `readAt` | boolean/timestamp | Read tracking |

**Ticket notification types:**
- `ticket.new` — new ticket created (sent to admins)
- `ticket.message.customer` — customer replied (sent to admins)
- `ticket.message.admin` — admin replied (sent to customer)
- `ticket.status` — ticket status changed (sent to customer)

---

## Ticket Lifecycle

```
┌─────────┐    Admin adds note    ┌─────────────┐    Admin resolves    ┌──────────┐    Admin closes    ┌────────┐
│  Open   │ ─────────────────────>│ In Progress │ ──────────────────>│ Resolved │ ────────────────>│ Closed │
└─────────┘    (auto-transition)  └─────────────┘                    └──────────┘                  └────────┘
     ^                                                                    │
     │                 Customer replies to resolved ticket                 │
     └────────────────────────────────────────────────────────────────────┘
```

- **Open → In Progress**: Automatic when an admin adds a note to an open ticket.
- **In Progress → Resolved**: Admin explicitly sets status to `resolved`.
- **Resolved → Open**: Customer replies to a resolved ticket (via dashboard or inbound email), re-opening it.
- **Closed**: Terminal state. Replies to closed tickets are rejected (dashboard) or ignored (inbound email).

---

## Entry Points (Ticket Creation)

There are five entry points for creating tickets, spread across four route files. Two are customer-facing (using different auth mechanisms), one is public, one is admin, and one is a webhook.

### 1. Public Contact Form

**Route:** `POST /api/contact`
**Source:** `server/src/routes/public/contact.routes.ts`
**Auth:** None (public, rate-limited: 5 per 15 min)
**Spam protection:** Honeypot field

Flow:
1. Validate form data (name, email, subject, message, type).
2. Find or create a `customers` record by email.
3. Insert `support_tickets` row.
4. Fire-and-forget: `sendNewTicketAdminNotification()` → emails configured admin addresses.
5. Fire-and-forget: `sendTicketConfirmationToCustomer()` → auto-reply to customer.
6. No in-app notifications or Socket.IO events are emitted.

### 2. Customer Dashboard (Order Tracking Routes)

**Route:** `POST /api/customer/orders/support`
**Source:** `server/src/routes/customer/order-tracking.routes.ts`
**Auth:** Customer session token (Bearer, via `requireCustomerAuth`)

Flow:
1. Validate input (subject, message, optional orderId, type).
2. Verify orderId belongs to customer if provided.
3. Insert `support_tickets` row.
4. `notificationService.notifyAdminsOfNewTicket()` → in-app + real-time for all admins.
5. If customer has email: `sendNewTicketAdminNotification()` + `sendTicketConfirmationToCustomer()`.

### 3. Customer Support (Legacy Replit Auth Routes)

**Route:** `POST /api/customer/support`
**Source:** `server/src/routes/admin/support.routes.ts` (default export `router`, mounted at `/api/customer/support`)
**Auth:** Replit Auth (`(req as any).user` — `isAuthenticated` middleware)

This is a legacy route using Replit Auth. It creates a ticket but does **not** trigger any email or in-app notifications. Only the DB insert is performed.

### 4. Inbound Email (Mailgun Webhook)

**Route:** `POST /api/webhooks/mailgun/inbound`
**Source:** `server/src/routes/webhooks/mailgun-inbound.routes.ts`
**Auth:** Mailgun HMAC signature verification
**Feature toggle:** `supportInboundRepliesEnabled` in site_settings

Flow for new tickets (no ticket ID in recipient address):
1. Verify Mailgun signature using `MAILGUN_WEBHOOK_SIGNING_KEY`.
2. Resolve real sender email (handles CAF envelope forwarding).
3. Strip quoted text from reply body.
4. Find or create customer by email.
5. Insert `support_tickets` row.
6. Fire-and-forget: `sendNewTicketAdminNotification()` + `sendTicketConfirmationToCustomer()`.
7. No in-app notifications or Socket.IO events are emitted for admins.

Flow for replies to existing tickets (recipient contains `support+ticket-{id}@domain`):
1. Same signature verification.
2. Extract ticket ID from recipient address pattern.
3. Validate ticket exists and is not closed. If closed, the reply is silently ignored (returns 200 OK).
4. Validate sender email matches ticket's customer email. If mismatch, reply is silently ignored.
5. Append reply to `customerReplies` JSON array.
6. If ticket was `resolved`, reopen to `open`.
7. `notificationService.notifyAdminsOfCustomerReply()` → in-app + real-time for admins.
8. Log inbound email to `email_logs`.
9. No admin email notification is sent (unlike in-app customer replies).

### 5. Admin-Created Ticket

**Route:** `POST /api/admin/support`
**Source:** `server/src/routes/admin/support.routes.ts` (`adminSupportRouter`)
**Auth:** Admin session cookie (via `requireAdmin` middleware)

Flow:
1. Admin selects a customer (searchable) and provides subject, message, type, priority.
2. Insert `support_tickets` row.
3. `notificationService.notifyCustomerOfAdminReply()` → in-app + real-time for customer.
4. No email is sent to the customer for admin-created tickets.

---

## Customer Reply (In-App)

**Route:** `POST /api/customer/orders/support/:id/reply`
**Source:** `server/src/routes/customer/order-tracking.routes.ts`
**Auth:** Customer session token

Flow:
1. Validate message (1–5000 chars).
2. Verify ticket belongs to customer and is not closed.
3. Append to `customerReplies` JSON array.
4. `notificationService.notifyAdminsOfCustomerReply()` → in-app + real-time for all admins.
5. `sendNewReplyAdminNotification()` → email to configured admin addresses.

---

## Admin Actions

### Reply to Ticket (Add Note)

**Route:** `PATCH /api/admin/support/:id`
**Body:** `{ noteText: "..." }`

Flow:
1. Append note to `adminNotes` JSON array with admin name and timestamp.
2. Auto-transition `open` → `in_progress` if no explicit status change.
3. `notificationService.notifyCustomerOfAdminReply()` → in-app + real-time for customer.
4. `sendAdminReplyToCustomer()` → email to customer with reply content.
   - If inbound replies enabled: email includes `Reply-To: support+ticket-{id}@{domain}` header.
   - If customer is registered: email includes "View in Dashboard" button.

### Change Ticket Status

**Route:** `PATCH /api/admin/support/:id`
**Body:** `{ status: "resolved" }`

Flow:
1. Update status. If `resolved` or `closed`, record `resolvedAt` and `resolvedBy`.
2. `notificationService.notifyCustomerOfStatusChange()` → in-app + real-time for customer.
3. `sendStatusChangeToCustomer()` → email with new status badge.
   - Note: status change email is skipped if a `noteText` is also included in the same request (the reply email covers it).

### Change Priority

**Route:** `PATCH /api/admin/support/:id`
**Body:** `{ priority: "high" }`

Updates priority. No notifications are sent for priority changes.

### View Email Audit Log

**Route:** `GET /api/admin/support/email-logs/:ticketId`

Returns all `email_logs` entries for a ticket, showing the complete email history (inbound and outbound).

---

## Notification Matrix

| Event | Admin Email | Admin In-App | Customer Email | Customer In-App | Socket.IO |
|-------|:-----------:|:------------:|:--------------:|:---------------:|:---------:|
| New ticket (contact form) | ✅ | ❌ | ✅ (auto-reply) | ❌ | ❌ |
| New ticket (customer dashboard) | ✅ | ✅ | ✅ (auto-reply) | ❌ | ✅ |
| New ticket (legacy Replit Auth) | ❌ | ❌ | ❌ | ❌ | ❌ |
| New ticket (inbound email) | ✅ | ❌ | ✅ (auto-reply) | ❌ | ❌ |
| Admin creates ticket | ❌ | ❌ | ❌ | ✅ | ✅ |
| Admin replies (note) | N/A | N/A | ✅ | ✅ | ✅ |
| Customer replies (in-app) | ✅ | ✅ | N/A | N/A | ✅ |
| Customer replies (inbound email) | ❌ | ✅ | N/A | N/A | ✅ |
| Ticket status change | N/A | N/A | ✅ * | ✅ | ✅ |

\* Status change email is only sent when no `noteText` is included in the same request (to avoid duplicate emails with the admin reply email).

### Known Gaps

1. **Contact form & inbound email new tickets** do not trigger admin in-app notifications (`notifyAdminsOfNewTicket()` is not called from those routes). Admins receive only the email notification.
2. **Inbound email replies** do not trigger an admin email notification (`sendNewReplyAdminNotification()` is not called in the webhook handler). Admins receive only in-app + real-time notifications.
3. **Status change email** reuses the `supportNotifyOnReply` setting flag rather than having its own dedicated toggle. Disabling reply notifications also disables status change emails.
4. **Legacy Replit Auth route** (`POST /api/customer/support`) creates tickets without any notifications — no emails, no in-app, no real-time. This appears to be an older code path that was not updated when the notification system was built.
5. **Admin-created tickets** send only in-app/real-time notifications to the customer. No email confirmation is sent.

---

## Email Templates

All support emails use a consistent dark-themed design matching the Power Plunge brand:
- Background: `#0a0a0a` with `#1a1a1a` content blocks
- Accent: `#67e8f9` (icy blue)
- Header: gradient from `#0c4a6e` to `#164e63`
- Font: system font stack

### Email Types

| Email Type | Direction | Recipient | Subject Pattern |
|------------|-----------|-----------|-----------------|
| `admin_notification` | Outbound | Admin team | `New Support Ticket: {subject}` |
| `customer_confirmation` | Outbound | Customer | `Re: {subject} - We've received your message` |
| `admin_reply` | Outbound | Customer | `Re: {subject}` |
| `status_change` | Outbound | Customer | `Ticket Update: {subject} - {status}` |
| `admin_reply_notification` | Outbound | Admin team | `Customer Reply: {subject}` |
| `inbound_reply` | Inbound | System | Logged from Mailgun |
| `inbound_new_ticket` | Inbound | System | Logged from Mailgun |

---

## Inbound Email Replies (Mailgun)

When enabled via `supportInboundRepliesEnabled`, customers can reply directly to support emails:

1. Admin reply emails include a `Reply-To` header: `support+ticket-{id}@{mailgunDomain}`.
2. Mailgun's inbound routing forwards replies to `POST /api/webhooks/mailgun/inbound`.
3. The webhook extracts the ticket ID from the recipient address pattern.
4. Signature verification uses `MAILGUN_WEBHOOK_SIGNING_KEY` (from env var or encrypted DB setting).
5. Sender email is validated against the ticket's customer email.
6. Reply text is stripped of quoted content (handles `>` prefixes, `On ... wrote:`, `-- Original Message --`, etc.).
7. Dev vs. production: ticket address prefix is `devticket-` in development, `ticket-` in production.

### Mailgun Setup Requirements

- Configure an inbound route in Mailgun pointing to `https://{your-domain}/api/webhooks/mailgun/inbound`.
- Set `MAILGUN_WEBHOOK_SIGNING_KEY` or configure it in admin email settings.
- Enable `supportInboundRepliesEnabled` in admin support settings.

---

## Real-Time Updates (Socket.IO)

Support ticket events are pushed via Socket.IO for instant UI updates:

- **Events emitted:**
  - `notif:new` — new notification payload
  - `notif:unread_count` — updated unread count
  - `ticket:updated` — signals ticket data changed (with `ticketId` and `needsAttention`)
- **Rooms:** `admin:{id}` and `customer:{id}` for secure per-user delivery.
- **Fallback:** REST polling every 30 seconds.
- **Deduplication:** Client-side seen-ID set prevents duplicates on reconnect.

---

## Admin Configuration

Support settings are managed at `/admin/support/settings` and stored in the `site_settings` table:

| Setting | Default | Description |
|---------|---------|-------------|
| `supportNotifyEmails` | `""` | Comma-separated admin email addresses for notifications |
| `supportNotifyOnNew` | `true` | Send email to admins when new ticket created |
| `supportNotifyOnReply` | `true` | Send email to admins when customer replies; also controls customer reply/status emails |
| `supportAutoReplyEnabled` | `true` | Send auto-reply confirmation to customer |
| `supportAutoReplyMessage` | Template | Customizable auto-reply body (supports `{{sla_hours}}` placeholder) |
| `supportFromEmail` | `""` | From address for support emails |
| `supportSlaHours` | `24` | SLA response time (used in auto-reply template) |
| `supportInboundRepliesEnabled` | `false` | Enable inbound email reply handling via Mailgun |
| `supportEmail` | `""` | Public-facing support email address |
| `supportPhone` | `""` | Public-facing support phone number |
| `supportBusinessHours` | `""` | Display business hours |

---

## Source Files

| File | Purpose |
|------|---------|
| `shared/schema.ts` | `supportTickets`, `emailLogs`, `notifications` table definitions |
| `server/src/routes/public/contact.routes.ts` | Public contact form endpoint |
| `server/src/routes/customer/order-tracking.routes.ts` | Customer ticket CRUD + reply |
| `server/src/routes/admin/support.routes.ts` | Admin ticket management + customer-facing ticket CRUD (legacy) |
| `server/src/routes/webhooks/mailgun-inbound.routes.ts` | Inbound email webhook |
| `server/src/services/support-email.service.ts` | All support email composition and sending |
| `server/src/services/notification.service.ts` | In-app notification creation + Socket.IO emission |
| `server/src/realtime/socketServer.ts` | Socket.IO server setup and emit helpers |
| `client/src/pages/admin-support.tsx` | Admin support dashboard |
| `client/src/pages/admin-support-settings.tsx` | Admin support settings page |
| `client/src/pages/account/components/SupportTab.tsx` | Customer support tab |
| `client/src/pages/account/hooks/useAccountSupport.ts` | Customer support data hook |
| `client/src/hooks/use-realtime-notifications.ts` | Real-time notification hook |
| `client/src/lib/realtime/socketClient.ts` | Socket.IO client singleton |

---

## Related Documentation

- [Email Notifications](./EMAIL_NOTIFICATIONS.md) — broader email system overview
- [API Registry: Support](../17-API-REGISTRY/support.md) — endpoint reference
