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

| Method | Path | Source File | Line |
|--------|------|-------------|------|
| `POST` | `/analytics/checkout-event` | server/src/routes/public/payments.routes.ts | 1084 |
| `POST` | `/checkout` | server/src/routes/public/payments.routes.ts | 708 |
| `POST` | `/confirm-payment` | server/src/routes/public/payments.routes.ts | 624 |
| `POST` | `/create-payment-intent` | server/src/routes/public/payments.routes.ts | 73 |
| `GET` | `/orders/by-session/:sessionId` | server/src/routes/public/payments.routes.ts | 905 |
| `POST` | `/reprice-payment-intent` | server/src/routes/public/payments.routes.ts | 339 |
| `GET` | `/stripe/config` | server/src/routes/public/payments.routes.ts | 44 |
| `GET` | `/validate-referral-code/:code` | server/src/routes/public/payments.routes.ts | 56 |

_8 endpoint(s) detected._

<!-- === END AUTO-GENERATED SECTION === -->
