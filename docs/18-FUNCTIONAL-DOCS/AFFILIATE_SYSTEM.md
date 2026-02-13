# Affiliate System

## Overview

The Power Plunge affiliate program is an invite-only referral system that allows approved partners to earn commissions by driving sales. It integrates tightly with Stripe Connect for payouts and includes fraud prevention, compliance guardrails, and a multi-step onboarding wizard.

## Invite Flow

Affiliate signups are invite-only. Admins create invites via the admin panel specifying:

- Target email and/or phone number
- Custom expiry date
- Usage limits (single-use or multi-use)
- Optional personalized message

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
