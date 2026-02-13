# Order Management

## Overview

The order management system tracks orders from creation through fulfillment, providing admin tools for status management, manual order creation, and detailed order history.

## Order Lifecycle

Orders progress through the following statuses:

| Status | Description |
|--------|-------------|
| `pending` | Created during checkout, payment not yet confirmed |
| `paid` | Payment confirmed via Stripe webhook or manual creation |
| `processing` | Admin has acknowledged and is preparing the order |
| `shipped` | Order has been dispatched with tracking information |
| `delivered` | Order confirmed delivered |
| `cancelled` | Order cancelled by admin or due to payment failure |
| `refunded` | Full refund processed |

## Admin Order Management

### Listing & Filtering

The admin order list (`GET /api/admin/orders`) supports:
- **Status filter**: Filter by any order status
- **Search**: Search by customer email or name
- **Date range**: Filter by order date (`startDate`, `endDate`)
- **Pagination**: Paginated results for large order volumes

### Order Details

Each order record includes:
- Customer information (name, email, address)
- Line items with product details, quantities, and prices
- Payment details (subtotal, discount, tax, total)
- Stripe Payment Intent ID (for online orders)
- Affiliate code and discount applied (if any)
- Shipping address and tracking information
- Timestamps (created, updated)

### Status Updates

Admins can update order status via `PATCH /api/admin/orders/:id`. Status transitions trigger:
- Database update with timestamp
- Email notification to customer (for key transitions like shipped, delivered)
- Affiliate commission updates (voided on cancellation/refund)

### Manual Order Creation

Admins with `store_manager` or `admin` role can create orders manually via `POST /api/admin/orders`. This is used for:
- Phone orders
- Custom quotes
- Replacement orders
- Gift orders

Manual orders are created directly in `paid` status and bypass Stripe payment processing. The `fulfillment` role is blocked from creating manual orders via `requireFullAccess` middleware.

## Customer Order Tracking

Customers can track their orders through:

1. **Order Status Page** (`/order-status/:id`) - Public page accessible via order confirmation email link
2. **Customer Dashboard** - Logged-in customers see full order history
3. **Order Tracking API** (`/api/customer/orders`) - Returns order history for authenticated customers

## Order Data Model

Key fields in the `orders` table:
- `id` - UUID primary key
- `customerEmail`, `customerName` - Contact information
- `items` - JSON array of line items
- `subtotal`, `affiliateDiscount`, `taxAmount`, `total` - Financial breakdown
- `status` - Current order status
- `stripePaymentIntentId` - Stripe reference
- `affiliateCode` - Referral attribution
- `shippingAddress` - Delivery address JSON
- `trackingNumber`, `trackingUrl` - Shipment tracking

## Access Control

| Action | Required Role |
|--------|--------------|
| View orders | Any admin role |
| Update order status | Any admin role |
| Create manual orders | `admin`, `store_manager` |
| Delete orders | `admin` only |

## Related Routes

- `server/src/routes/admin/orders.routes.ts` - Admin CRUD operations
- `server/src/routes/customer/order-tracking.routes.ts` - Customer order history
- `server/src/routes/public/order-status.routes.ts` - Public order status lookup
