# Payments (Public)

## Module Info

| Property | Value |
|----------|-------|
| Domain | payments |
| Source Files | server/src/routes/public/payments.routes.ts |
| Endpoint Count | 8 |
| Mount Point | `/api` |
| Auth Middleware | None (public); rate limiters on payment endpoints |

## Notes

Revenue-critical payment flow endpoints. Handles Stripe configuration, referral code validation, payment intent creation/repricing, payment confirmation, checkout analytics, legacy checkout session creation, and session-based order lookup.
Rate limiters (`paymentLimiter`, `checkoutLimiter`) are applied per-route within the router file.
Helper function `sendOrderNotification()` was relocated here from legacy routes.ts during extraction.

<!-- === AUTO-GENERATED SECTION (do not edit below this line) === -->

## Endpoints

| Method | Path | Handler | Line |
|--------|------|---------|------|
| `GET` | `/api/stripe/config` | Get Stripe publishable key | 13 |
| `GET` | `/api/validate-referral-code/:code` | Validate affiliate referral code | 25 |
| `POST` | `/api/create-payment-intent` | Create Stripe payment intent with tax calculation (rate limited) | 42 |
| `POST` | `/api/reprice-payment-intent` | Reprice existing order on address/cart change — recalculates tax, updates PaymentIntent (rate limited) | 287 |
| `POST` | `/api/confirm-payment` | Confirm payment, finalize order idempotently (rate limited) | 544 |
| `POST` | `/api/checkout` | Legacy Stripe Checkout session (rate limited) | 628 |
| `GET` | `/api/orders/by-session/:sessionId` | Look up order by Stripe session ID | 813 |
| `POST` | `/api/analytics/checkout-event` | Log checkout funnel analytics event | 992 |

_8 endpoint(s) detected._

### `POST /api/reprice-payment-intent` (new)

Reprices an existing pending order when the customer changes their shipping address or cart contents. Recalculates tax via Stripe Tax API, updates order totals, and updates (or recreates) the associated PaymentIntent.

**Request body:**
```json
{
  "orderId": "uuid",
  "items": [{ "productId": "uuid", "quantity": 1 }],
  "customer": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1 555-222-1111",
    "address": "123 Main St",
    "line2": "",
    "city": "Charlotte",
    "state": "NC",
    "zipCode": "28202"
  },
  "billingAddress": null,
  "billingSameAsShipping": true,
  "affiliateCode": "OPTIONAL"
}
```

**Success response (200):**
```json
{
  "clientSecret": "pi_..._secret_...",
  "orderId": "uuid",
  "subtotal": 99900,
  "taxAmount": 7253,
  "total": 107153
}
```

**Guards:**
- Order must exist and be in `pending` status
- Order must have an existing `stripePaymentIntentId`
- All address/contact validation rules apply (same as create endpoint)

<!-- === END AUTO-GENERATED SECTION === -->
