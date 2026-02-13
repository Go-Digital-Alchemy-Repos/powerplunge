# Upsell / Cross-sell System

## Overview

The upsell and cross-sell system increases average order value by suggesting related products at strategic points in the customer journey. It supports product relationships, cart-based suggestions, post-purchase one-click offers, configurable rules, and analytics tracking.

## Product Relationships

Product relationships define how items are connected for upsell purposes:

| Relationship Type | Description | Use Case |
|-------------------|-------------|----------|
| `frequently_bought_together` | Products commonly purchased together | Cart suggestions |
| `accessory` | Complementary add-on products | "Complete your setup" |

### Managing Relationships

Admins create and manage relationships via:
- `POST /api/upsells/admin/relationships` - Create a relationship
- `GET /api/upsells/admin/relationships/:productId` - View relationships for a product
- `DELETE /api/upsells/admin/relationships/:id` - Remove a relationship

Relationships are bidirectional and can be sorted by priority (`sortOrder`).

## Cart Upsells

When a customer adds items to their cart, the system suggests related products:

**API**: `POST /api/upsells/cart-suggestions`

```json
{
  "productIds": ["uuid-1", "uuid-2"]
}
```

**Response**: Array of suggestions with:
- Product details (name, price, image)
- Relationship type ("frequently_bought_together" or "accessory")
- Reason text ("Frequently bought together" or "Complete your setup")

Cart suggestions are displayed on the cart page and checkout sidebar.

## Post-Purchase Offers

After order completion, customers may see a one-click upsell offer:

### Flow

1. **Offer Generation**: When an order is placed, the system checks for applicable post-purchase offers based on the purchased items and configured rules
2. **Offer Display**: The order confirmation page shows the offer with product details and a special price
3. **Accept**: `POST /api/upsells/post-purchase/:offerId/accept` - Adds the product to the order
4. **Decline**: `POST /api/upsells/post-purchase/:offerId/decline` - Marks the offer as declined

Post-purchase offers are time-limited and can only be accepted once per order.

### Retrieving Offers

`GET /api/upsells/post-purchase/:orderId` returns any pending offer for the given order, including full product details.

## Upsell Rules

Admins configure rules that control when and how upsells appear:

| Field | Description |
|-------|-------------|
| `productId` | Trigger product |
| `upsellProductId` | Product to suggest |
| `triggerType` | When to show (cart, post-purchase, both) |
| `discountPercent` | Special price discount for the offer |
| `priority` | Display order when multiple rules match |
| `isActive` | Enable/disable the rule |

### Rule Management

- `GET /api/upsells/admin/rules` - List all rules (filterable by productId)
- `POST /api/upsells/admin/rules` - Create a rule
- `PATCH /api/upsells/admin/rules/:id` - Update a rule
- `DELETE /api/upsells/admin/rules/:id` - Delete a rule

## Analytics

The system tracks upsell performance with detailed metrics:

### Event Tracking

`POST /api/upsells/track` records events:
- `impression` - Upsell was shown to the customer
- `click` - Customer clicked on an upsell
- `conversion` - Customer purchased an upsell item

### Analytics Dashboard

`GET /api/upsells/admin/analytics` returns:
- Total impressions, clicks, and conversions
- Click-through rate (CTR)
- Conversion rate
- Revenue attributed to upsells
- Top-performing upsell products
- Performance over time (filterable by date range)

The analytics are integrated into the Revenue Dashboard for a unified view.

## Related Files

- `server/src/routes/admin/upsells.routes.ts` - All upsell API routes
- `server/src/services/upsell.service.ts` - Business logic
- `client/src/pages/admin-revenue.tsx` - Revenue dashboard with upsell metrics
