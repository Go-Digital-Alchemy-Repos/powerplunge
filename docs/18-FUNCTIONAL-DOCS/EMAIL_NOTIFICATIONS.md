# Email Notifications

## Overview

Power Plunge uses Mailgun for transactional email delivery. The system sends automated emails for key customer lifecycle events including order confirmations, shipping updates, authentication flows, and checkout recovery. Email templates are configurable via the admin panel.

## Email Service Architecture

### Mailgun Integration

The email service is implemented in `server/src/integrations/mailgun/EmailService.ts` and uses the Mailgun API for delivery.

Required environment variables:

| Variable | Purpose |
|----------|---------|
| `MAILGUN_API_KEY` | Mailgun API authentication |
| `MAILGUN_DOMAIN` | Sending domain (e.g., `mg.powerplunge.com`) |
| `MAILGUN_FROM_EMAIL` | Default sender address |

### Customer Email Service

`server/src/services/customer-email.service.ts` provides high-level email functions that compose templates and trigger delivery:

- `sendOrderConfirmation(order)` - Sent after successful payment
- `sendShippingNotification(order, trackingInfo)` - Sent when order ships
- `sendMagicLinkEmail(email)` - Passwordless login link
- `sendPasswordResetEmail(email, token)` - Password reset flow
- `sendWelcomeEmail(customer)` - New account registration

## Email Types

### Transactional Emails

| Email Type | Trigger | Template |
|------------|---------|----------|
| Order Confirmation | Payment successful | Order details, items, totals |
| Shipping Update | Order status changed to `shipped` | Tracking number, carrier link |
| Delivery Confirmation | Order status changed to `delivered` | Delivery confirmation |
| Welcome Email | New customer registration | Account details, getting started |
| Magic Link | Customer requests passwordless login | One-time login URL |
| Password Reset | Customer requests password reset | Reset URL with token |

### Recovery Emails

The checkout recovery service (`server/src/services/checkout-recovery.service.ts`) sends:

| Email Type | Trigger | Timing |
|------------|---------|--------|
| Abandoned Cart | Cart created but no payment attempted | After configured delay |
| Payment Failed | Payment attempt failed | Immediately after failure |
| Recovery Follow-up | No action on first recovery email | After second delay |

Recovery emails include a direct link back to the checkout with cart contents preserved.

### Alert Emails

The error alerting service (`server/src/services/error-alerting.service.ts`) sends internal notifications:

- Payment failure alerts to admin
- Revenue threshold warnings
- System error notifications

### Support Ticket Emails

The support email service (`server/src/services/support-email.service.ts`) handles all ticket-related email flows:

| Email Type | Direction | Trigger | Recipient |
|------------|-----------|---------|-----------|
| Admin Notification | Outbound | New ticket created | Configured admin emails |
| Customer Confirmation | Outbound | New ticket created (auto-reply) | Customer |
| Admin Reply | Outbound | Admin adds note to ticket | Customer |
| Status Change | Outbound | Admin changes ticket status | Customer |
| Customer Reply Notification | Outbound | Customer replies to ticket | Configured admin emails |
| Inbound Reply | Inbound | Customer replies via email | System (Mailgun webhook) |
| Inbound New Ticket | Inbound | Customer emails support address | System (Mailgun webhook) |

Support emails are configured via `/admin/support/settings` with these controls:
- **Notify emails**: Comma-separated admin addresses for notifications
- **Notify on new**: Toggle admin email for new tickets
- **Notify on reply**: Toggle customer reply and status change emails
- **Auto-reply**: Toggle and customize the confirmation message sent to customers
- **From email**: Sender address for support emails
- **SLA hours**: Response time commitment (used in auto-reply template with `{{sla_hours}}`)
- **Inbound replies**: Enable Mailgun inbound email routing for direct email replies

All support emails are logged to the `email_logs` table for audit purposes, viewable per-ticket in the admin panel.

For full details, see [Support Ticket System](./SUPPORT_TICKET_SYSTEM.md).

## Admin Email Management

### Template Configuration

Admins can manage email templates via `/admin/email-templates`:
- Edit subject lines and body content
- Preview templates with sample data
- Toggle individual email types on/off
- Configure sending settings

### Email Settings

Global email settings are managed in admin settings:
- Default from address
- Reply-to address
- Company branding (logo, colors)
- Unsubscribe handling

## Background Job Integration

The `recovery_emails` background job handles scheduled email delivery:
- Scans for abandoned carts past the delay threshold
- Queues recovery emails
- Tracks delivery status and open rates
- Prevents duplicate sends

## Twilio SMS Integration

For affiliate invite flows, SMS notifications use the Twilio Verify API:
- Phone verification during affiliate signup
- Configurable via admin SMS settings
- Auth token stored encrypted in the database

## Related Files

- `server/src/integrations/mailgun/EmailService.ts` - Core email delivery
- `server/src/services/customer-email.service.ts` - Customer email functions
- `server/src/services/checkout-recovery.service.ts` - Recovery email logic
- `server/src/services/error-alerting.service.ts` - Alert notifications
- `server/src/services/support-email.service.ts` - Support ticket email functions
- `server/src/routes/admin/settings.routes.ts` - Email configuration
- `server/src/routes/webhooks/mailgun-inbound.routes.ts` - Inbound email webhook

## Related Documentation

- [Support Ticket System](./SUPPORT_TICKET_SYSTEM.md) - Full support ticket and notification flow documentation
