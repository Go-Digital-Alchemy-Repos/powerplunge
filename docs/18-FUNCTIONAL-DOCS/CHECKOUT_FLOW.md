# Checkout Flow

## Overview

The Power Plunge checkout is a streamlined, single-page checkout experience that integrates Stripe for payment processing, supports affiliate discounts, real-time tax calculation, and express payment methods (Apple Pay, Google Pay, Link).

## Flow Steps

### 1. Cart Review

The customer reviews their cart items on the checkout page. Each item displays:
- Product image, name, and variant details
- Unit price and quantity
- Subtotal per line item

Cart upsell suggestions may appear based on configured product relationships.

### 2. Customer Information

Customers provide their contact details:
- Email address (required)
- Full name (required)
- Phone number (optional)

Returning customers who are logged in have their details pre-filled from their profile.

### 3. Shipping Address

Shipping address collection uses Stripe's `AddressElement` component for:
- Auto-complete and address validation
- Consistent address formatting
- International address support

Required fields: street address, city, state/province, postal code, country.

### 4. Affiliate Code Application

If a customer has an affiliate referral cookie or enters a code manually:
- The system validates the affiliate code
- Calculates the applicable discount (percentage-based)
- Displays the discount amount and adjusted total
- The affiliate code is stored with the order

### 5. Tax Calculation

Tax is calculated in real-time using Stripe Tax:
- Based on shipping address and product types
- The `/api/reprice` endpoint recalculates when the address changes
- Tax amount is displayed as a line item
- Tax Calculation ID is stored with the order for compliance

### 6. Payment Processing

The checkout supports multiple payment methods via Stripe's dynamic payment method resolution:

**Standard Payment (PaymentElement):**
- Credit/debit card
- Any additional payment methods enabled in your Stripe Dashboard (e.g., ACH, Klarna, Afterpay, etc.)
- `automatic_payment_methods` is enabled on PaymentIntents, so Stripe dynamically surfaces eligible methods based on Dashboard configuration, currency, country, and amount constraints.

**Express Checkout:**
- Apple Pay (Safari/iOS)
- Google Pay (Chrome/Android)
- Link (Stripe's one-click checkout)

These are rendered via Stripe's `ExpressCheckoutElement`.

**Checkout Session flow:**
- No hardcoded `payment_method_types`; Stripe dynamically determines eligible methods based on Dashboard enablement and transaction context.

> **Note:** Final payment method availability depends on Stripe Dashboard enablement, currency, country, and eligibility constraints.

### 7. Order Creation

When payment is initiated:

1. `POST /api/create-payment-intent` is called with cart items, customer data, and address
2. Server creates a `pending` order in the database
3. Stripe Payment Intent is created with order metadata
4. Client receives `clientSecret` to confirm payment
5. On successful payment, Stripe webhook updates order to `paid`

### 8. Post-Purchase

After successful payment:
- Order confirmation page displays with order details
- Confirmation email is sent to the customer
- Post-purchase upsell offer may be presented
- Affiliate commission is recorded (if applicable)

## Reprice Endpoint

`POST /api/reprice` recalculates the order total when shipping address changes:

```json
{
  "items": [{ "productId": "...", "quantity": 1 }],
  "shippingAddress": { "state": "CA", "postalCode": "90210", "country": "US" },
  "affiliateCode": "PARTNER10"
}
```

Returns updated subtotal, discount, tax, and total.

## Error Handling

- Card declined: User sees inline error from Stripe, can retry
- Network errors: Order stays `pending`, can be recovered
- Tax calculation failures: Logged as warning, order proceeds with zero tax
- Invalid affiliate code: Discount removed, user notified

## Manual Orders

Admins with `store_manager` or `admin` role can create manual orders via the admin panel. These bypass Stripe and create orders directly in `paid` status.

## Recovery System

Abandoned carts and failed payments are tracked by the checkout recovery system. See `CHECKOUT_RECOVERY` section in recovery routes for details on recovery email triggers and analytics.

## Related Routes

- `server/src/routes/public/products.routes.ts` - Payment intent creation, repricing
- `server/src/routes/webhooks/stripe.routes.ts` - Payment confirmation webhooks
- `server/src/routes/admin/orders.routes.ts` - Manual order creation
