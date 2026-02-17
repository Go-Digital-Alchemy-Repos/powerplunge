# Affiliate System

## Overview

The Power Plunge affiliate program is an invite-only referral system that allows approved partners to earn commissions by driving sales. It integrates tightly with Stripe Connect for payouts and includes fraud prevention, compliance guardrails, and a multi-step onboarding wizard.

## Invite Flow

Affiliate signups are invite-only. The invite sender page (`/admin/affiliate-invite-sender`) provides three distinct delivery methods:

### Delivery Methods

**1. Share from Contacts**
- Creates an invite with shared options (max uses, expiry) and no target contact info.
- On mobile devices with Web Share API support, opens the native share sheet (Messages, WhatsApp, etc.).
- On desktop or unsupported browsers, copies the invite link to the clipboard with a toast notification.
- `deliveryMethod: "contacts"` is recorded in audit metadata.

**2. Share via Text (SMS)**
- Form with phone number (required) and name (optional), plus shared invite options.
- Sends the invite through the backend SMS path using Twilio.
- If SMS fails but the invite was created, the invite URL is displayed with a copy option as fallback.
- `deliveryMethod: "text"` is recorded in audit metadata.

**3. Share via Email**
- Form with email address (required) and name (optional), plus shared invite options.
- Sends the invite through the backend Mailgun email path.
- If email fails but the invite was created, the invite URL is displayed with a copy option as fallback.
- `deliveryMethod: "email"` is recorded in audit metadata.

### Shared Invite Options

All three methods share configurable options displayed above the method cards:
- **Max Uses** — how many times the invite code can be used (default: 1)
- **Expires In (days)** — number of days before the invite expires (default: 7)

### Fallback Matrix

| Platform | Contacts | Text | Email |
|----------|----------|------|-------|
| Mobile (Web Share API) | Native share sheet | Backend SMS | Backend email |
| Desktop / unsupported | Copy to clipboard | Backend SMS | Backend email |
| SMS service unavailable | N/A | Fallback: show + copy link | N/A |
| Email service unavailable | N/A | N/A | Fallback: show + copy link |

### API Contract

`POST /api/admin/affiliate-invites/send` accepts an optional `deliveryMethod` field:

```
deliveryMethod: "contacts" | "text" | "email"  // optional, defaults to legacy behavior
```

When `deliveryMethod` is provided, the backend uses it to determine which channel to send through:
- `"contacts"` — creates invite only, no email/SMS sent from backend
- `"text"` — sends SMS if phone is provided
- `"email"` — sends email if email is provided
- Omitted — legacy behavior (email if provided, SMS if phone and no email)

The field is included in `affiliate_invite.sent` audit logs for reporting.

### Invite Validation

When a potential affiliate receives an invite, they visit the signup page with a unique `?code=` parameter. The system validates:

1. Invite code existence and active status
2. Expiration date has not passed
3. Usage limit has not been exceeded
4. Email/phone matches the invite target (if specified)

If phone verification is required (Twilio Verify API), the user must complete SMS verification before proceeding.

## Onboarding Wizard

New affiliates go through a 5-step onboarding process:

1. **Accept Agreement** - Review and accept the affiliate program terms
2. **Profile Setup** - Enter personal and business details
3. **Connect Stripe** - Set up a Stripe Connect account for payouts
4. **Customize Code** - Choose a personalized referral code (e.g., `JOHNDOE10`)
5. **Start Promoting** - Access marketing materials and tracking links

The system tracks onboarding progress and shows the next recommended step. Affiliates who skip Stripe setup can still track referrals but cannot request payouts until connected.

## Referral Tracking

When a customer visits the site via an affiliate link (`?ref=CODE`), the system:

1. Sets an `affiliate` cookie with the referral code
2. Records a click event with IP, user agent, and timestamp
3. At checkout, applies any affiliate discount to the order
4. Links the order to the affiliate via the `affiliateCode` field

Affiliate discounts can be configured globally or per-product via admin settings.

## Commission Management

Commissions flow through the following lifecycle:

| Status | Description |
|--------|-------------|
| `pending` | Recorded at order completion, awaiting review |
| `approved` | Verified and ready for payout |
| `paid` | Included in a completed payout |
| `voided` | Cancelled due to refund, fraud, or admin action |

Admins can approve, void, or flag commissions individually or in bulk. A background job (`commission_approval`) handles auto-approval of commissions that meet configured criteria (e.g., after a refund window closes).

Commission rates are configurable:
- Global default rate (percentage of order subtotal)
- Per-affiliate custom rates
- Per-product overrides

## Payout System

Affiliates can request payouts when their approved balance exceeds the minimum payout threshold. The payout flow:

1. Affiliate requests payout via the portal
2. Admin reviews and approves the payout request
3. Payout is processed via Stripe Connect transfer
4. Status updates via Stripe webhooks (`account.updated`, `capability.updated`)

A background job (`affiliate_payout`) handles scheduled batch processing of approved payouts.

## Fraud & Compliance Guardrails

- Self-referral detection (affiliate cannot earn on their own orders)
- Duplicate click filtering (same IP within time window)
- Commission flagging for unusual patterns
- Audit logging for all admin actions on commissions and payouts
- Agreement versioning and tracking

## Admin Dashboard

The admin affiliate management panel provides:

- Affiliate listing with status filters and search
- Individual affiliate profiles with performance metrics
- Leaderboard showing top performers
- Commission management with bulk actions
- Payout history and processing queue
- Invite management (create, send, revoke)
- Program settings (rates, thresholds, agreement text)

## API Routes

- **Admin**: `server/src/routes/admin/affiliates-v2.routes.ts` - Full CRUD, commissions, payouts, invites
- **Customer Portal**: `server/src/routes/customer/affiliate-portal.routes.ts` - Dashboard, Stripe Connect, payout requests
- **Public Signup**: `server/src/routes/public/affiliate-signup.routes.ts` - Invite validation, registration
- **Tracking**: `server/src/routes/public/affiliate-tracking.routes.ts` - Click recording, cookie management

## Database Tables

- `affiliates` - Affiliate accounts with balances and stats
- `affiliate_referrals` - Commission records linking orders to affiliates
- `affiliate_clicks` - Click tracking data
- `affiliate_payouts` - Payout request and processing records
- `affiliate_agreements` - Signed agreement versions
- `affiliate_invites` - Invite codes with expiry and usage tracking
