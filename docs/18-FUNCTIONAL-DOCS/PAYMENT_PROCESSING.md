# Payment Processing (Stripe)

## Overview

Power Plunge uses Stripe for all payment processing, supporting credit/debit cards, Apple Pay, Google Pay, and Link (one-click checkout). The integration includes Payment Intents for card payments, Stripe Tax for tax calculation, Stripe Connect for affiliate payouts, and webhooks for event-driven order updates.

## Stripe Configuration

The system supports both test and live Stripe keys:

| Environment Variable | Purpose |
|---------------------|---------|
| `STRIPE_SECRET_KEY_TEST` | Test mode API key |
| `STRIPE_SECRET_KEY_LIVE` | Live mode API key |
| `STRIPE_WEBHOOK_SECRET_TEST` | Test webhook signing secret |
| `STRIPE_WEBHOOK_SECRET_LIVE` | Live webhook signing secret |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Connect webhook signing secret (affiliate payouts) |

The system checks for test keys first, falling back to live keys. If no Stripe keys are configured, manual payment mode is used.

## Payment Flow

### 1. Payment Intent Creation

When the customer initiates checkout, `POST /api/create-payment-intent` is called:

```typescript
{
  items: [{ id: "product-uuid", quantity: 1 }],
  customerName: "John Doe",
  customerEmail: "john@example.com",
  shippingAddress: { line1: "...", city: "...", state: "CA", postalCode: "90210", country: "US" },
  affiliateCode: "PARTNER10"  // optional
}
```

The server:
1. Validates products exist and calculates subtotal
2. Applies affiliate discount if applicable
3. Calculates tax via Stripe Tax API
4. Creates a `pending` order in the database
5. Creates a Stripe Payment Intent with metadata
6. Returns `clientSecret` to the frontend

### 2. Client-Side Payment

The frontend uses Stripe Elements to collect payment details:
- `PaymentElement` for card input
- `AddressElement` for shipping address
- `ExpressCheckoutElement` for Apple Pay / Google Pay / Link

Payment confirmation is handled by `stripe.confirmPayment()`.

### 3. Webhook Processing

Stripe sends webhook events to `POST /api/webhooks/stripe`:

**`checkout.session.completed`**:
- Looks up order by Stripe session ID
- Updates order status to `paid`
- Records affiliate commission if applicable
- Triggers order notification

**`payment_intent.succeeded`**:
- Looks up order by orderId in payment intent metadata
- Verifies amount matches
- Updates order status to `paid`
- Records affiliate commission

**`payment_intent.payment_failed`**:
- Logs failure details (error code, message)
- Sends payment failure alert via error alerting service
- Triggers checkout recovery flow

### 4. Webhook Idempotency

All webhook events are deduplicated:
1. Check `processed_webhook_events` table for event ID
2. If already processed, return early with `duplicate: true`
3. If new, record the event before processing
4. Handles concurrent duplicates via unique constraint (`23505` error code)

## Tax Calculation

Tax is calculated using Stripe Tax:
- Based on shipping address (state, postal code, country)
- Recalculated when address changes via `/api/reprice`
- Tax Calculation ID stored with the order for compliance
- Falls back gracefully if tax calculation fails (logged as warning)

## Stripe Connect (Affiliate Payouts)

Affiliates connect their Stripe accounts for receiving payouts:

1. Affiliate initiates Stripe Connect onboarding
2. Redirected to Stripe-hosted onboarding flow
3. Stripe sends `account.updated` and `capability.updated` webhooks
4. System tracks onboarding status and payout capability
5. Admin processes payouts via Stripe Connect transfers

## Manual Payment Orders

When Stripe is not configured or for admin-created orders:
- Orders are created directly in `paid` status
- No Payment Intent is created
- Used for phone orders, custom quotes, replacements

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Card declined | Stripe returns error, user can retry |
| Webhook signature invalid | 400 response, logged |
| Duplicate webhook | Acknowledged, not reprocessed |
| Stripe not configured | Manual payment mode |
| Tax calculation fails | Warning logged, zero tax applied |
| Payment intent amount mismatch | Logged, order not updated |

## Related Files

- `server/src/routes/public/products.routes.ts` - Payment intent creation
- `server/src/routes/webhooks/stripe.routes.ts` - Webhook handler
- `server/src/routes/customer/affiliate-portal.routes.ts` - Stripe Connect
- `server/src/services/checkout-recovery.service.ts` - Recovery on failure
