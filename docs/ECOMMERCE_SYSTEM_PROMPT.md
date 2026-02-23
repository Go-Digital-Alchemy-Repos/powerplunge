# REUSABLE PROMPT — Complete E-Commerce System (Stripe + Affiliates + Recovery + VIP)

> **Purpose:** Drop-in prompt to build a production-grade e-commerce back-end and storefront on top of an existing admin CMS. Brand-neutral, extensible, battle-tested patterns extracted from a live system.
>
> **Assumes already exist:** Admin user table (`admin_users` with id, email, password, role, firstName, lastName, name), admin auth middleware (`requireAuth`, `requireRole`), CMS layout components, Express + Drizzle ORM + React/Vite stack, Zod validation, and a running PostgreSQL database.

---

## TABLE OF CONTENTS
1. [Data Model (Drizzle + Postgres)](#1-data-model)
2. [Stripe Integration Service](#2-stripe-integration)
3. [Customer Authentication](#3-customer-auth)
4. [Product Catalog](#4-product-catalog)
5. [Shopping Cart & Checkout](#5-checkout)
6. [Order Management](#6-orders)
7. [Stripe Webhooks](#7-webhooks)
8. [Coupon System](#8-coupons)
9. [Affiliate Program](#9-affiliates)
10. [Shipping & Fulfillment](#10-shipping)
11. [Refund System](#11-refunds)
12. [Inventory Tracking](#12-inventory)
13. [Upsell & Cross-Sell](#13-upsells)
14. [VIP Program](#14-vip)
15. [Checkout Recovery](#15-recovery)
16. [Revenue Guardrails & Alerts](#16-revenue)
17. [Support Tickets](#17-support)
18. [Background Jobs](#18-jobs)
19. [Admin Pages to Add](#19-admin-pages)
20. [Customer-Facing Pages](#20-customer-pages)

---

## 1. DATA MODEL {#1-data-model}

All monetary values are stored in **cents** (integer) to avoid floating-point precision issues. UUIDs are used for all primary keys via `gen_random_uuid()`.

### 1.1 Products

```typescript
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  tagline: text("tagline"),
  description: text("description"),
  price: integer("price").notNull(), // cents
  primaryImage: text("primary_image"),
  secondaryImages: text("secondary_images").array().notNull().default(sql`ARRAY[]::text[]`),
  features: text("features").array().notNull().default(sql`ARRAY[]::text[]`),
  included: text("included").array().notNull().default(sql`ARRAY[]::text[]`),
  active: boolean("active").notNull().default(true),
  status: text("status").notNull().default("published"), // "draft" | "published"
  sku: text("sku"),
  tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
  // Sale pricing
  salePrice: integer("sale_price"), // cents
  discountType: text("discount_type").notNull().default("NONE"), // NONE | FIXED | PERCENT
  discountValue: integer("discount_value"), // cents (FIXED) or percentage (PERCENT)
  saleStartAt: timestamp("sale_start_at"),
  saleEndAt: timestamp("sale_end_at"),
  // SEO
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  urlSlug: text("url_slug"),
  canonicalUrl: text("canonical_url"),
  robotsIndex: boolean("robots_index").notNull().default(true),
  robotsFollow: boolean("robots_follow").notNull().default(true),
  ogTitle: text("og_title"),
  ogDescription: text("og_description"),
  ogImage: text("og_image"),
  // Per-product affiliate overrides
  affiliateEnabled: boolean("affiliate_enabled").notNull().default(true),
  affiliateUseGlobalSettings: boolean("affiliate_use_global_settings").notNull().default(true),
  affiliateCommissionType: text("affiliate_commission_type"), // PERCENT | FIXED
  affiliateCommissionValue: integer("affiliate_commission_value"),
  affiliateDiscountType: text("affiliate_discount_type"),
  affiliateDiscountValue: integer("affiliate_discount_value"),
});
```

**Key behavior:**
- `getActiveProducts()` filters `active = true AND status = 'published'` for the storefront listing.
- `getProduct(id)` and `getProductBySlug(slug)` do NOT filter by status, enabling direct-URL access to draft products (useful for Stripe test purchases hidden from the shop).

### 1.2 Customers

```typescript
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"), // optional link to OAuth/external auth
  email: text("email").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  country: text("country").default("USA"),
  avatarUrl: text("avatar_url"),
  isDisabled: boolean("is_disabled").default(false),
  passwordHash: text("password_hash"), // for email/password login
  sessionInvalidatedAt: timestamp("session_invalidated_at"), // force logout
  mergedIntoCustomerId: varchar("merged_into_customer_id"), // for merging duplicate accounts
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

### 1.3 Orders

```typescript
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  status: text("status").notNull().default("pending"), // pending | paid | shipped | delivered | cancelled
  totalAmount: integer("total_amount").notNull(), // cents (subtotal + tax)
  subtotalAmount: integer("subtotal_amount"), // cents (before tax)
  taxAmount: integer("tax_amount"), // cents (Stripe Tax)
  stripeTaxCalculationId: text("stripe_tax_calculation_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeSessionId: text("stripe_session_id"),
  // Affiliate tracking
  affiliateCode: text("affiliate_code"),
  affiliateIsFriendsFamily: boolean("affiliate_is_friends_family").default(false),
  affiliateDiscountAmount: integer("affiliate_discount_amount"), // cents
  // Coupon tracking
  couponDiscountAmount: integer("coupon_discount_amount"), // cents
  couponCode: text("coupon_code"),
  isManualOrder: boolean("is_manual_order").default(false),
  notes: text("notes"),
  customerIp: text("customer_ip"), // fraud detection
  // Shipping address
  shippingName: text("shipping_name"),
  shippingCompany: text("shipping_company"),
  shippingAddress: text("shipping_address"),
  shippingLine2: text("shipping_line2"),
  shippingCity: text("shipping_city"),
  shippingState: text("shipping_state"),
  shippingZip: text("shipping_zip"),
  shippingCountry: text("shipping_country").default("US"),
  // Payment status (computed from refunds)
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  // Billing address
  billingSameAsShipping: boolean("billing_same_as_shipping").default(true),
  billingName: text("billing_name"),
  billingAddress: text("billing_address"),
  billingCity: text("billing_city"),
  billingState: text("billing_state"),
  billingZip: text("billing_zip"),
  billingCountry: text("billing_country").default("US"),
  // Marketing consent
  marketingConsentGranted: boolean("marketing_consent_granted").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull(), // cents at time of purchase
  productName: text("product_name").notNull(), // snapshot
  productImage: text("product_image"), // snapshot
});
```

### 1.4 Categories

```typescript
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  parentId: varchar("parent_id"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const productCategories = pgTable("product_categories", {
  productId: varchar("product_id").notNull().references(() => products.id),
  categoryId: varchar("category_id").notNull().references(() => categories.id),
});
```

### 1.5 Coupons

```typescript
export const coupons = pgTable("coupons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // uppercase normalized
  name: text("name"),
  description: text("description"),
  status: text("status").notNull().default("active"), // active | disabled
  discountType: text("discount_type").notNull(), // percent | fixed
  discountValue: integer("discount_value").notNull(), // percent 1-100, or cents
  currency: text("currency").default("USD"),
  appliesTo: text("applies_to").default("order"), // order | products
  productIds: jsonb("product_ids"), // nullable array for product-specific
  minOrderSubtotal: integer("min_order_subtotal"), // cents
  maxDiscountAmount: integer("max_discount_amount"), // cap for percent coupons
  startsAt: timestamp("starts_at"),
  expiresAt: timestamp("expires_at"),
  usageLimitTotal: integer("usage_limit_total"),
  usageLimitPerCustomer: integer("usage_limit_per_customer"),
  timesUsed: integer("times_used").notNull().default(0),
  affiliateId: varchar("affiliate_id"), // link coupon to affiliate for attribution
  isFriendsFamily: boolean("is_friends_family").default(false), // FF-prefix codes
  createdByUserId: varchar("created_by_user_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const couponRedemptions = pgTable("coupon_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  couponId: varchar("coupon_id").notNull().references(() => coupons.id),
  orderId: varchar("order_id").references(() => orders.id),
  customerId: varchar("customer_id").references(() => customers.id),
  email: text("email"),
  discountAmountApplied: integer("discount_amount_applied").notNull(),
  currency: text("currency").default("USD"),
  redeemedAt: timestamp("redeemed_at").notNull().defaultNow(),
});

// Stacking rules - prevent incompatible discount combinations
export const couponStackingRules = pgTable("coupon_stacking_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  couponId: varchar("coupon_id").notNull().references(() => coupons.id, { onDelete: "cascade" }),
  blockedCouponId: varchar("blocked_coupon_id").references(() => coupons.id, { onDelete: "cascade" }),
  blockAffiliateCommission: boolean("block_affiliate_commission").default(false),
  blockVipDiscount: boolean("block_vip_discount").default(false),
  minMarginPercent: integer("min_margin_percent").default(0), // 0-100
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

### 1.6 Refunds

```typescript
export const refunds = pgTable("refunds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  amount: integer("amount").notNull(), // cents
  reason: text("reason"),
  reasonCode: text("reason_code"), // duplicate | fraudulent | requested_by_customer | product_not_received | other
  status: text("status").notNull().default("pending"), // pending | processed | rejected | failed
  stripeRefundId: text("stripe_refund_id"),
  source: text("source").notNull().default("manual"), // stripe | manual
  processedBy: varchar("processed_by").references(() => adminUsers.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
});
```

**Payment status computation:**
```typescript
type PaymentStatus = "unpaid" | "paid" | "refund_pending" | "partially_refunded" | "refunded" | "refund_failed";

function computePaymentStatus(order, refunds): PaymentStatus {
  // If order isn't paid, return "unpaid"
  // If no refunds, return "paid"
  // Sum processed refund amounts vs totalAmount for partial/full
  // Check for pending/failed refunds
}

function computeRefundableAmount(order, refunds): number {
  // totalAmount minus (processed + pending) refund amounts, min 0
}
```

### 1.7 Shipping

```typescript
export const shippingZones = pgTable("shipping_zones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  countries: text("countries").array().notNull().default(sql`ARRAY[]::text[]`),
  states: text("states").array().notNull().default(sql`ARRAY[]::text[]`),
  isDefault: boolean("is_default").default(false),
});

export const shippingRates = pgTable("shipping_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  zoneId: varchar("zone_id").notNull().references(() => shippingZones.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // "Standard", "Express"
  minOrderAmount: integer("min_order_amount").default(0), // cents
  maxOrderAmount: integer("max_order_amount"),
  price: integer("price").notNull(), // cents
  estimatedDays: text("estimated_days"), // "5-7 business days"
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
});

export const shipments = pgTable("shipments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  carrier: text("carrier"), // "USPS", "UPS", "FedEx"
  trackingNumber: text("tracking_number"),
  trackingUrl: text("tracking_url"),
  status: text("status").notNull().default("pending"), // pending | in_transit | delivered
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

### 1.8 Inventory

```typescript
export const inventory = pgTable("inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id).unique(),
  quantity: integer("quantity").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").default(10),
  trackInventory: boolean("track_inventory").notNull().default(true),
  allowBackorders: boolean("allow_backorders").default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const inventoryLedger = pgTable("inventory_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(), // positive = add, negative = subtract
  reason: text("reason"), // "Order #123", "Manual adjustment", "Restock"
  orderId: varchar("order_id").references(() => orders.id),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

### 1.9 Affiliates

```typescript
export const affiliateSettings = pgTable("affiliate_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enabled: boolean("enabled").default(true),
  defaultCommissionType: text("default_commission_type").default("PERCENT"),
  defaultCommissionValue: integer("default_commission_value").default(15), // percent
  defaultDiscountType: text("default_discount_type").default("PERCENT"),
  defaultDiscountValue: integer("default_discount_value").default(5), // percent
  cookieDuration: integer("cookie_duration").default(30), // days
  minPayoutAmount: integer("min_payout_amount").default(5000), // $50 in cents
  autoApproveCommissions: boolean("auto_approve_commissions").default(false),
  commissionApprovalDays: integer("commission_approval_days").default(30),
  friendsFamilyEnabled: boolean("friends_family_enabled").default(true),
  friendsFamilyCommissionType: text("friends_family_commission_type").default("PERCENT"),
  friendsFamilyCommissionValue: integer("friends_family_commission_value").default(20),
  friendsFamilyDiscountType: text("friends_family_discount_type").default("PERCENT"),
  friendsFamilyDiscountValue: integer("friends_family_discount_value").default(10),
  requirePhoneVerification: boolean("require_phone_verification").default(true),
  requireAgreementSignature: boolean("require_agreement_signature").default(true),
  agreementText: text("agreement_text"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const affiliates = pgTable("affiliates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  affiliateCode: text("affiliate_code").notNull().unique(),
  status: text("status").notNull().default("pending"), // pending | active | suspended | deactivated
  commissionType: text("commission_type"), // custom override: PERCENT | FIXED
  commissionValue: integer("commission_value"), // custom override
  discountType: text("discount_type"), // custom override
  discountValue: integer("discount_value"), // custom override
  isFriendsFamily: boolean("is_friends_family").default(false),
  onboardingStep: integer("onboarding_step").default(0), // 0-5 wizard progress
  onboardingCompleted: boolean("onboarding_completed").default(false),
  phone: text("phone"),
  phoneVerified: boolean("phone_verified").default(false),
  agreementSignedAt: timestamp("agreement_signed_at"),
  bio: text("bio"),
  websiteUrl: text("website_url"),
  socialMediaHandles: jsonb("social_media_handles"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const affiliateClicks = pgTable("affiliate_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliates.id),
  sessionId: text("session_id").notNull(),
  landingUrl: text("landing_url"),
  referrer: text("referrer"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  utmTerm: text("utm_term"),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  isUnique: boolean("is_unique").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const affiliateReferrals = pgTable("affiliate_referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliates.id),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  customerId: varchar("customer_id").references(() => customers.id),
  orderAmount: integer("order_amount").notNull(), // cents
  commissionRate: real("commission_rate").notNull(), // e.g., 0.15 for 15%
  commissionAmount: integer("commission_amount").notNull(), // cents
  commissionType: text("commission_type").notNull(), // PERCENT | FIXED
  status: text("status").notNull().default("pending"), // pending | approved | paid | rejected | reversed
  isFriendsFamily: boolean("is_friends_family").default(false),
  attributionSource: text("attribution_source"), // cookie | coupon | manual
  couponCodeUsed: text("coupon_code_used"),
  clickSessionId: text("click_session_id"),
  approvedAt: timestamp("approved_at"),
  paidAt: timestamp("paid_at"),
  rejectedAt: timestamp("rejected_at"),
  rejectedReason: text("rejected_reason"),
  isFraudFlagged: boolean("is_fraud_flagged").default(false),
  fraudReason: text("fraud_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const affiliatePayouts = pgTable("affiliate_payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliates.id),
  amount: integer("amount").notNull(), // cents
  status: text("status").notNull().default("requested"), // requested | processing | paid | rejected | failed
  paymentMethod: text("payment_method"), // stripe_connect | manual
  stripeTransferId: text("stripe_transfer_id"),
  notes: text("notes"),
  processedBy: varchar("processed_by").references(() => adminUsers.id),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const affiliatePayoutAccounts = pgTable("affiliate_payout_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliates.id),
  accountType: text("account_type").notNull().default("stripe_connect"),
  stripeConnectAccountId: text("stripe_connect_account_id"),
  stripeAccountStatus: text("stripe_account_status"), // pending | active | restricted
  stripeDetailsSubmitted: boolean("stripe_details_submitted").default(false),
  stripeChargesEnabled: boolean("stripe_charges_enabled").default(false),
  stripePayoutsEnabled: boolean("stripe_payouts_enabled").default(false),
  isDefault: boolean("is_default").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Invite-only signup
export const affiliateInvites = pgTable("affiliate_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  email: text("email"),
  name: text("name"),
  maxUses: integer("max_uses").default(1),
  timesUsed: integer("times_used").notNull().default(0),
  isFriendsFamily: boolean("is_friends_family").default(false),
  expiresAt: timestamp("expires_at"),
  createdByAdminId: varchar("created_by_admin_id").references(() => adminUsers.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

**Commission priority chain:** affiliate custom > product-level > friends & family (if applicable) > global defaults. Friends & family always takes priority when `isFriendsFamily = true`.

### 1.10 Upsell & Cross-Sell

```typescript
export const productRelationships = pgTable("product_relationships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  relatedProductId: varchar("related_product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  relationshipType: text("relationship_type").notNull(), // upsell | cross_sell | frequently_bought_together | accessory
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const upsellRules = pgTable("upsell_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  upsellType: text("upsell_type").notNull(), // cart | post_purchase | email
  discountType: text("discount_type").default("none"), // none | percent | fixed
  discountValue: integer("discount_value").default(0),
  headline: text("headline"),
  description: text("description"),
  expirationMinutes: integer("expiration_minutes").default(1440), // 24h for post-purchase
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const upsellEvents = pgTable("upsell_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id),
  customerId: varchar("customer_id").references(() => customers.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  upsellProductId: varchar("upsell_product_id").notNull().references(() => products.id),
  upsellType: text("upsell_type").notNull(), // cart | post_purchase | email
  eventType: text("event_type").notNull(), // impression | click | conversion
  revenue: integer("revenue").default(0), // cents, only for conversions
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const postPurchaseOffers = pgTable("post_purchase_offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: varchar("product_id").notNull().references(() => products.id),
  originalPrice: integer("original_price").notNull(),
  discountedPrice: integer("discounted_price").notNull(),
  status: text("status").notNull().default("pending"), // pending | accepted | declined | expired
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

### 1.11 VIP Program

```typescript
export const vipSettings = pgTable("vip_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lifetimeSpendThreshold: integer("lifetime_spend_threshold").default(100000), // $1000 in cents
  orderCountThreshold: integer("order_count_threshold").default(3),
  autoPromote: boolean("auto_promote").default(true),
  freeShippingEnabled: boolean("free_shipping_enabled").default(true),
  freeShippingThreshold: integer("free_shipping_threshold").default(0),
  exclusiveDiscountPercent: integer("exclusive_discount_percent").default(10),
  prioritySupportEnabled: boolean("priority_support_enabled").default(true),
  earlyAccessEnabled: boolean("early_access_enabled").default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const vipCustomers = pgTable("vip_customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().unique().references(() => customers.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("active"), // active | inactive | revoked
  reason: text("reason").notNull(), // lifetime_spend | order_count | manual
  lifetimeSpendAtPromotion: integer("lifetime_spend_at_promotion").default(0),
  orderCountAtPromotion: integer("order_count_at_promotion").default(0),
  promotedAt: timestamp("promoted_at").notNull().defaultNow(),
  promotedByAdminId: varchar("promoted_by_admin_id").references(() => adminUsers.id),
  revokedAt: timestamp("revoked_at"),
  revokedByAdminId: varchar("revoked_by_admin_id").references(() => adminUsers.id),
  revokeReason: text("revoke_reason"),
  notes: text("notes"),
});

export const vipActivityLog = pgTable("vip_activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  activityType: text("activity_type").notNull(), // free_shipping | exclusive_discount | early_access | priority_support
  orderId: varchar("order_id").references(() => orders.id),
  savedAmount: integer("saved_amount").default(0), // cents
  details: jsonb("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

### 1.12 Checkout Recovery

```typescript
export const abandonedCarts = pgTable("abandoned_carts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  customerId: varchar("customer_id").references(() => customers.id),
  email: text("email"),
  cartData: jsonb("cart_data").notNull(), // { items: [...], couponCode, subtotal }
  cartValue: integer("cart_value").notNull(), // cents
  couponCode: text("coupon_code"),
  affiliateCode: text("affiliate_code"),
  lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),
  abandonedAt: timestamp("abandoned_at"), // set when cart is deemed abandoned (1 hour inactivity)
  recoveryEmailSent: integer("recovery_email_sent").default(0), // max 2
  recoveryEmailSentAt: timestamp("recovery_email_sent_at"),
  recoveredAt: timestamp("recovered_at"),
  recoveredOrderId: varchar("recovered_order_id").references(() => orders.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const failedPayments = pgTable("failed_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  customerId: varchar("customer_id").references(() => customers.id),
  email: text("email").notNull(),
  paymentIntentId: text("payment_intent_id"),
  amount: integer("amount").notNull(), // cents
  failureReason: text("failure_reason"),
  failureCode: text("failure_code"), // Stripe error code
  recoveryEmailSent: integer("recovery_email_sent").default(0),
  recoveryEmailSentAt: timestamp("recovery_email_sent_at"),
  recoveredAt: timestamp("recovered_at"),
  expiredAt: timestamp("expired_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const recoveryEvents = pgTable("recovery_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(), // abandoned_cart | failed_payment
  sourceId: varchar("source_id").notNull(), // abandonedCartId or failedPaymentId
  action: text("action").notNull(), // email_sent | email_opened | link_clicked | recovered | expired
  orderId: varchar("order_id").references(() => orders.id),
  revenueRecovered: integer("revenue_recovered").default(0), // cents
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

### 1.13 Revenue Guardrails

```typescript
export const revenueAlertThresholds = pgTable("revenue_alert_thresholds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  alertType: text("alert_type").notNull(), // refund_rate | affiliate_commission | aov_drop | webhook_failure
  thresholdValue: real("threshold_value").notNull(), // percentage or count
  comparisonPeriod: text("comparison_period").default("7d"), // 24h | 7d | 30d
  enabled: boolean("enabled").default(true),
  emailAlertEnabled: boolean("email_alert_enabled").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const revenueAlerts = pgTable("revenue_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  alertType: text("alert_type").notNull(),
  severity: text("severity").notNull().default("warning"), // info | warning | critical
  message: text("message").notNull(),
  currentValue: real("current_value"),
  thresholdValue: real("threshold_value"),
  metadata: jsonb("metadata"),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: varchar("acknowledged_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

### 1.14 Operational Tables

```typescript
// Webhook idempotency
export const processedWebhookEvents = pgTable("processed_webhook_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: text("event_id").notNull().unique(), // Stripe event ID (evt_xxx)
  eventType: text("event_type").notNull(),
  source: text("source").notNull().default("stripe"), // stripe | stripe_connect
  processedAt: timestamp("processed_at").notNull().defaultNow(),
  metadata: jsonb("metadata"),
});

// Webhook failures (for monitoring)
export const webhookFailures = pgTable("webhook_failures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  source: text("source").notNull(), // stripe | stripe_connect
  eventType: text("event_type"),
  eventId: text("event_id"),
  errorMessage: text("error_message").notNull(),
  payload: jsonb("payload"),
  retryCount: integer("retry_count").default(0),
  resolved: boolean("resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Audit logs
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actor: text("actor"), // admin email or "system"
  action: text("action").notNull(), // e.g., "order.created", "product.updated"
  entityType: text("entity_type"),
  entityId: varchar("entity_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Daily aggregate metrics
export const dailyMetrics = pgTable("daily_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(),
  totalOrders: integer("total_orders").notNull().default(0),
  totalRevenue: integer("total_revenue").notNull().default(0), // cents
  newCustomers: integer("new_customers").notNull().default(0),
  averageOrderValue: integer("average_order_value").default(0), // cents
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }),
});

// Background job tracking
export const jobRuns = pgTable("job_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobName: text("job_name").notNull(),
  status: text("status").notNull().default("running"), // running | completed | failed
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  result: jsonb("result"),
  error: text("error"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Support tickets
export const supportTickets = pgTable("support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  orderId: varchar("order_id").references(() => orders.id),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("open"), // open | in_progress | waiting_on_customer | resolved | closed
  priority: text("priority").notNull().default("normal"), // low | normal | high | urgent
  assignedToAdminId: varchar("assigned_to_admin_id").references(() => adminUsers.id),
  adminNotes: jsonb("admin_notes"), // array of { note, adminId, adminName, timestamp }
  customerReplies: jsonb("customer_replies"), // array of { message, timestamp, source }
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by").references(() => adminUsers.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Customer tags (admin-assigned)
export const customerTags = pgTable("customer_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  tag: text("tag").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdByAdminId: varchar("created_by_admin_id").references(() => adminUsers.id),
});

// Customer notes (admin notes on customer record)
export const customerNotes = pgTable("customer_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  note: text("note").notNull(),
  createdBy: varchar("created_by").references(() => adminUsers.id),
  createdByAdminName: text("created_by_admin_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

### 1.15 Integration Settings (Stripe config stored in DB)

```typescript
// Key fields on integration_settings table (single-row config):
{
  // Stripe dual-mode keys (encrypted in DB)
  stripeActiveMode: text("stripe_active_mode").default("test"), // "test" | "live"
  stripePublishableKeyTest: text("stripe_publishable_key_test"),
  stripeSecretKeyTestEncrypted: text("stripe_secret_key_test_encrypted"),
  stripeWebhookSecretTestEncrypted: text("stripe_webhook_secret_test_encrypted"),
  stripePublishableKeyLive: text("stripe_publishable_key_live"),
  stripeSecretKeyLiveEncrypted: text("stripe_secret_key_live_encrypted"),
  stripeWebhookSecretLiveEncrypted: text("stripe_webhook_secret_live_encrypted"),
  // Legacy single-mode fields (for migration compatibility)
  stripeConfigured: boolean("stripe_configured").default(false),
  stripePublishableKey: text("stripe_publishable_key"),
  stripeSecretKeyEncrypted: text("stripe_secret_key_encrypted"),
  stripeWebhookSecretEncrypted: text("stripe_webhook_secret_encrypted"),
  stripeMode: text("stripe_mode").default("test"),
  // Stripe Tax
  stripeTaxEnabled: boolean("stripe_tax_enabled").default(false),
  stripeTaxBehavior: text("stripe_tax_behavior").default("exclusive"),
}
```

---

## 2. STRIPE INTEGRATION SERVICE {#2-stripe-integration}

### Architecture
A singleton `StripeService` class manages all Stripe API access. It resolves credentials from a priority chain:

1. **Database (dual-mode):** `stripeActiveMode` selects test/live, decrypts matching keys
2. **Database (legacy):** Falls back to single-key `stripeSecretKeyEncrypted`
3. **Environment variables:** `STRIPE_SECRET_KEY_TEST`, `STRIPE_SECRET_KEY_LIVE`, `STRIPE_MODE`

**Critical safety:** The service performs key-mode mismatch detection — if `stripeActiveMode` is "test" but the decrypted key starts with `sk_live_`, it refuses to initialize and reports unconfigured. This prevents accidental live charges.

### Key Methods
```typescript
class StripeService {
  async getConfig(): Promise<StripeConfig>;        // Resolve + cache config (60s TTL)
  async getClient(): Promise<Stripe | null>;        // Get initialized client or null
  async isConfigured(): Promise<boolean>;
  async getPublishableKey(): Promise<string | null>;
  async validateKeys(pk, sk): Promise<{ valid, error?, accountName? }>;
  clearCache(): void;                               // Force re-resolve on next call
  // Stripe Connect (for affiliate payouts)
  async createExpressAccount(params): Promise<Stripe.Account>;
  async createAccountLink(params): Promise<Stripe.AccountLink>;
  async retrieveAccount(accountId): Promise<Stripe.Account>;
  async createTransfer(params): Promise<Stripe.Transfer>;
  // Webhook verification
  async constructWebhookEvent(payload, signature, secret): Promise<Stripe.Event>;
}
```

### Encryption
All secret keys and webhook secrets are encrypted before DB storage using AES-256-GCM with an `ENCRYPTION_KEY` environment variable. The `encrypt()`/`decrypt()` utility wraps Node's `crypto` module.

---

## 3. CUSTOMER AUTHENTICATION {#3-customer-auth}

### HMAC Session Tokens
The system uses stateless HMAC-signed session tokens (not JWTs). Tokens are stored in `localStorage` on the client and passed as `Authorization: Bearer <token>` headers.

```typescript
function createSessionToken(customerId: string, email: string): string {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const payload = JSON.stringify({ customerId, email, expiresAt });
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}.${signature}`).toString("base64");
}

function verifySessionToken(token: string): { valid: boolean; customerId?: string; email?: string } {
  // Decode base64, split payload.signature, verify HMAC, check expiry
}
```

### Auth Middleware
```typescript
async function requireCustomerAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const result = verifySessionToken(token);
  if (!result.valid) return res.status(401).json({ message: "Unauthorized" });
  // Fetch customer from DB, check isDisabled and sessionInvalidatedAt
  req.customerSession = { customerId: result.customerId, email: result.email };
  next();
}
```

### Auth Routes
```
POST /api/customer/auth/register        { email, password, name }
POST /api/customer/auth/login           { email, password }
POST /api/customer/auth/magic-link      { email } → sends email with login link
POST /api/customer/auth/magic-link/verify { token }
POST /api/customer/auth/forgot-password { email }
POST /api/customer/auth/reset-password  { token, newPassword }
GET  /api/customer/auth/me              → returns current customer (requires auth)
```

**Order claiming:** On registration/login, orders placed as guest with the same email are automatically linked to the new customer account via `claimOrdersByEmail()`.

---

## 4. PRODUCT CATALOG {#4-product-catalog}

### Public API
```
GET /api/products          → getActiveProducts() (active=true AND status=published)
GET /api/products/:id      → getProduct(id) (no status filter — direct access works)
GET /api/products/slug/:slug → getProductBySlug(slug) (no status filter)
```

### Admin API
```
GET    /api/admin/products       → all products (including draft/inactive)
POST   /api/admin/products       → create product (auto-generate urlSlug)
PATCH  /api/admin/products/:id   → update product
DELETE /api/admin/products/:id   → delete product
```

### Slug Generation
When creating a product, auto-generate `urlSlug` from the name:
- Lowercase, replace spaces with hyphens, strip unsafe chars
- If collision exists, append `-2`, `-3`, etc.

### Sale Price Logic
- If `discountType = "PERCENT"`, compute `salePrice = price - (price × discountValue / 100)`
- If `discountType = "FIXED"`, compute `salePrice = price - discountValue`
- Respect `saleStartAt` / `saleEndAt` date windows
- Frontend shows strikethrough original price when sale is active

---

## 5. SHOPPING CART & CHECKOUT {#5-checkout}

### Cart (Client-Side)
Cart state is managed entirely in the browser (React context, zustand, or similar). Cart data shape:
```typescript
interface CartItem {
  productId: string;
  name: string;
  price: number; // cents
  quantity: number;
  image?: string;
}
```

### Checkout Flow
1. **Customer enters shipping address** → Uses Stripe `AddressElement` for address autocomplete
2. **Apply coupon / affiliate discount** → `POST /api/coupons/validate`
3. **Calculate tax** → `POST /api/payments/calculate-tax` (Stripe Tax API)
4. **Create PaymentIntent** → `POST /api/payments/create-payment-intent`
5. **Confirm payment** → Stripe Elements `confirmPayment()` on client
6. **On success** → Redirect to `/order-success?orderId=xxx`
7. **Webhook confirms** → `payment_intent.succeeded` creates order server-side

### Tax Calculation (Stripe Tax)
```
POST /api/payments/calculate-tax
Body: { items: [{ productId, quantity, unitPrice }], shippingAddress, couponCode? }
Response: { taxAmount, totalAmount, stripeTaxCalculationId }
```

### Payment Intent Creation
```
POST /api/payments/create-payment-intent
Body: {
  items, customerEmail, customerName, shippingAddress,
  couponCode?, affiliateCode?, stripeTaxCalculationId?
}
Response: { clientSecret, paymentIntentId, orderId }
```

Server-side flow:
1. Validate cart items exist and prices match
2. Apply coupon discount (server-validated)
3. Apply affiliate discount (cookie or coupon-based attribution)
4. Compute subtotal after discounts
5. Add tax amount from Stripe Tax calculation
6. Create Stripe PaymentIntent with `amount`, `metadata: { orderId }`
7. Create order record in DB with status "pending"
8. Create order items
9. Return `clientSecret` to frontend

### Express Checkout
Support Apple Pay / Google Pay / Link via Stripe `ExpressCheckoutElement`:
```
POST /api/payments/create-express-checkout
// Same flow but uses express checkout session
```

### Reprice Endpoint
When shipping address changes (affecting tax), recalculate:
```
POST /api/payments/reprice
Body: { paymentIntentId, shippingAddress }
Response: { newTaxAmount, newTotal }
// Updates the existing PaymentIntent amount
```

---

## 6. ORDER MANAGEMENT {#6-orders}

### Public API
```
GET /api/customer/orders              → customer's orders (requires auth)
GET /api/order-status/:orderId        → public order lookup (email verification)
```

### Admin API
```
GET    /api/admin/orders              → paginated, filterable order list
GET    /api/admin/orders/:id          → order detail with items, refunds, shipments
PATCH  /api/admin/orders/:id/status   → update order status
POST   /api/admin/orders/manual       → create manual order (admin-initiated)
```

### Order Status Flow
```
pending → paid → shipped → delivered
                ↘ cancelled
```

- `pending`: Order created, awaiting payment confirmation
- `paid`: Payment confirmed via webhook
- `shipped`: Admin added tracking info
- `delivered`: Carrier confirmed delivery
- `cancelled`: Order cancelled (triggers refund if paid)

---

## 7. STRIPE WEBHOOKS {#7-webhooks}

### Endpoint
```
POST /api/webhooks/stripe   (raw body, no JSON parsing)
```

### Idempotency
Every webhook event is checked against `processed_webhook_events` table:
```typescript
const existing = await db.select().from(processedWebhookEvents)
  .where(eq(processedWebhookEvents.eventId, event.id));
if (existing.length > 0) return res.json({ received: true }); // already processed
// Process event, then insert into processedWebhookEvents
```

### Event Handlers

**`payment_intent.succeeded`:**
1. Look up order by `metadata.orderId` or `stripePaymentIntentId`
2. Update order status to "paid", set `paymentStatus = "paid"`
3. Record `stripePaymentIntentId` on order
4. Calculate and record affiliate commission (if affiliate code present)
5. Record coupon redemption (if coupon used)
6. Decrement inventory
7. Send order confirmation email
8. Check VIP eligibility and auto-promote if qualified
9. Mark abandoned cart as recovered (if applicable)

**`payment_intent.payment_failed`:**
1. Record in `failed_payments` table
2. Queue recovery email

**`charge.refunded`:**
1. Sync refund status from Stripe
2. Update order `paymentStatus`
3. Reverse affiliate commission if applicable

**`refund.updated`:**
1. Sync refund status changes (pending → succeeded/failed)

**`account.updated` (Connect):**
1. Sync affiliate payout account status (charges_enabled, payouts_enabled, details_submitted)

### Webhook Failure Tracking
On any webhook processing error:
```typescript
await db.insert(webhookFailures).values({
  source: "stripe",
  eventType: event.type,
  eventId: event.id,
  errorMessage: error.message,
  payload: event,
});
```

---

## 8. COUPON SYSTEM {#8-coupons}

### Validation Endpoint
```
POST /api/coupons/validate
Body: { code, cartSubtotal, cartItems[], customerId?, email? }
Response: {
  valid: boolean,
  reason?: string, // "expired", "usage_limit_reached", "min_order_not_met", etc.
  coupon: { code, discountType, discountValue },
  discountAmount: number, // cents
  newSubtotal: number
}
```

### Server-Side Validation Rules
1. Normalize code: `trim().toUpperCase()`
2. Check coupon exists and `status = "active"`
3. Check `startsAt` / `expiresAt` date window
4. Check `usageLimitTotal` vs `timesUsed`
5. Check `usageLimitPerCustomer` vs customer's redemption count
6. Check `minOrderSubtotal` vs cart subtotal
7. Calculate discount amount:
   - Percent: `Math.floor(subtotal × discountValue / 100)`
   - Fixed: `discountValue` (but never more than subtotal)
8. Apply `maxDiscountAmount` cap for percent coupons
9. Check stacking rules against active VIP discount or affiliate commission

### Friends & Family Codes
- Codes prefixed with `FF` (e.g., `FF-SARAH-2024`)
- Linked to an affiliate with `isFriendsFamily = true`
- Higher commission and discount rates (configurable in affiliate settings)
- Always takes priority in the commission chain

### Coupon Analytics
Track per-coupon performance:
- Total redemptions, unique customers
- Total discount given vs total revenue generated
- Net revenue impact
- Auto-expire underperforming coupons (optional setting)

---

## 9. AFFILIATE PROGRAM {#9-affiliates}

### Signup Flow (Invite-Only)
1. Admin creates invite with unique code, optional email/name, max uses
2. Prospect visits `/become-affiliate?code=INVITE_CODE`
3. 5-step onboarding wizard:
   - Step 1: Verify invite code
   - Step 2: Create customer account (or login)
   - Step 3: Phone verification (Twilio Verify API)
   - Step 4: Sign affiliate agreement
   - Step 5: Profile setup (bio, website, social handles)
4. Affiliate record created with `status = "pending"`
5. Admin approves → `status = "active"`

### Referral Tracking
**Cookie-based attribution:**
```
POST /api/affiliate/track   { affiliateCode, landingUrl, referrer, utm* }
→ Sets HTTP-only cookie "affiliate" with { affiliateId, sessionId, expiresAt }
→ Cookie duration from affiliateSettings.cookieDuration (default 30 days)
→ First-touch wins: existing unexpired cookie is not overwritten
```

**Coupon-based attribution:**
When a coupon has `affiliateId` set, the affiliate is credited even without a cookie.

### Commission Calculation
On `payment_intent.succeeded`:
1. Check for affiliate cookie on the order OR affiliate-linked coupon
2. Run fraud checks:
   - Self-referral detection (affiliate's email matches customer email or customer ID)
   - Coupon abuse patterns
3. Determine commission rate (priority chain: affiliate custom > product-level > FF > global)
4. Create `affiliateReferral` with `status = "pending"`
5. After `commissionApprovalDays`, auto-approve (or admin manually approves)

### Payout Flow
1. Affiliate requests payout from portal (must meet `minPayoutAmount`)
2. If Stripe Connect configured:
   - Affiliate onboards via Stripe Express account
   - Admin approves payout → `stripeService.createTransfer()`
   - Idempotency key: `payout-{payoutId}`
3. If manual: Admin marks payout as paid with notes

### Affiliate Portal (Customer-Facing)
```
GET /api/affiliate-portal/dashboard    → stats, recent referrals, earnings
GET /api/affiliate-portal/referrals    → paginated referral history
GET /api/affiliate-portal/payouts      → payout history
POST /api/affiliate-portal/request-payout  → request payout
GET /api/affiliate-portal/links        → get referral link + QR code
POST /api/affiliate-portal/connect/onboard  → start Stripe Connect onboarding
```

### Admin Affiliate Management
```
GET    /api/admin/affiliates           → list all affiliates with stats
PATCH  /api/admin/affiliates/:id/status → approve/suspend/deactivate
PATCH  /api/admin/affiliates/:id/commission → set custom commission rates
GET    /api/admin/affiliates/:id/referrals → referral details
POST   /api/admin/affiliates/invites   → create invite code
GET    /api/admin/affiliates/invites   → list invites
POST   /api/admin/affiliates/payouts/:id/process → process payout
```

---

## 10. SHIPPING & FULFILLMENT {#10-shipping}

### Admin Endpoints
```
GET    /api/admin/shipping/zones       → list zones
POST   /api/admin/shipping/zones       → create zone
PATCH  /api/admin/shipping/zones/:id   → update zone
DELETE /api/admin/shipping/zones/:id   → delete zone
GET    /api/admin/shipping/rates       → list rates
POST   /api/admin/shipping/rates       → create rate
POST   /api/admin/orders/:id/shipment  → add tracking info to order
```

### Zone Matching
Zones match by country + state. A "default" zone catches unmatched addresses. Rates within a zone can have min/max order amount thresholds (e.g., "Free shipping over $100").

---

## 11. REFUND SYSTEM {#11-refunds}

### Admin Endpoint
```
POST /api/admin/orders/:id/refund
Body: { amount, reason, reasonCode }
```

### Server Flow
1. Validate `reasonCode` against allowed values
2. Compute `refundableAmount = totalAmount - (processed + pending refunds)`
3. Reject if `amount > refundableAmount` (over-refund protection)
4. Create Stripe refund with idempotency key: `refund-{orderId}-{timestamp}`
5. Create `refund` record with `source = "stripe"`, `stripeRefundId`
6. Update order `paymentStatus` using `computePaymentStatus()`
7. Reverse affiliate commission if applicable

### Webhook Sync
`charge.refunded` and `refund.updated` events sync refund status from Stripe as source of truth.

---

## 12. INVENTORY TRACKING {#12-inventory}

### Auto-Decrement
On `payment_intent.succeeded`, for each order item:
```typescript
await db.update(inventory)
  .set({ quantity: sql`quantity - ${item.quantity}` })
  .where(eq(inventory.productId, item.productId));

await db.insert(inventoryLedger).values({
  productId: item.productId,
  quantity: -item.quantity,
  reason: `Order #${order.id}`,
  orderId: order.id,
});
```

### Low Stock Alerts
Background job checks `inventory.quantity <= lowStockThreshold` and triggers admin notifications.

---

## 13. UPSELL & CROSS-SELL SYSTEM {#13-upsells}

### Types
- **Cart upsells:** Show related products when adding to cart
- **Post-purchase upsells:** Time-limited offers after checkout (one-click add)
- **Email upsells:** Follow-up product recommendations

### Post-Purchase Flow
1. On order success, check for applicable `upsellRules` (type = "post_purchase")
2. Create `postPurchaseOffer` with discounted price and expiration
3. Display on order success page with countdown timer
4. If accepted: create additional charge, add item to order
5. Track impressions, clicks, conversions in `upsellEvents`

### Admin Configuration
```
GET    /api/admin/upsells/relationships  → product relationships
POST   /api/admin/upsells/relationships  → create relationship
DELETE /api/admin/upsells/relationships/:id
GET    /api/admin/upsells/rules          → upsell rules
POST   /api/admin/upsells/rules          → create rule
PATCH  /api/admin/upsells/rules/:id      → update rule
GET    /api/admin/upsells/analytics      → conversion metrics
```

---

## 14. VIP PROGRAM {#14-vip}

### Auto-Promotion
After each paid order, check eligibility:
```typescript
async checkVipEligibility(customerId) {
  const settings = await getVipSettings();
  const paidOrders = orders.filter(o => ["paid","shipped","delivered"].includes(o.status));
  const lifetimeSpend = sum(paidOrders.totalAmount);
  const orderCount = paidOrders.length;

  if (lifetimeSpend >= settings.lifetimeSpendThreshold) return { eligible: true, reason: "lifetime_spend" };
  if (orderCount >= settings.orderCountThreshold) return { eligible: true, reason: "order_count" };
  return { eligible: false };
}
```

### Benefits
- Free shipping (waive shipping cost at checkout)
- Exclusive discount percentage (applied automatically or via special code)
- Priority support (ticket auto-escalation)
- Early access to new products

### Admin Endpoints
```
GET    /api/admin/vip/settings           → get VIP config
PUT    /api/admin/vip/settings           → update thresholds and benefits
GET    /api/admin/vip/customers          → list VIP customers
POST   /api/admin/vip/customers/:id/promote → manual VIP promotion
POST   /api/admin/vip/customers/:id/revoke  → revoke VIP status
```

---

## 15. CHECKOUT RECOVERY {#15-recovery}

### Abandoned Cart Detection
1. Frontend periodically posts cart state: `POST /api/recovery/cart-activity { sessionId, cartData, cartValue, email? }`
2. Background job runs every 15 minutes:
   - Find carts with `lastActivityAt < now - 60 minutes` and no `abandonedAt`
   - Mark as abandoned
   - If email is available, send recovery email (max 2, 24h apart)
3. When order is placed, mark matching cart as recovered

### Failed Payment Recovery
1. On `payment_intent.payment_failed` webhook, create `failedPayment` record
2. Send recovery email with link to retry checkout
3. Track recovery events (email sent, opened, clicked, recovered)

### Admin Dashboard
```
GET /api/admin/recovery/analytics       → aggregate recovery stats
GET /api/admin/recovery/abandoned-carts → list with details
GET /api/admin/recovery/failed-payments → list with details
```

---

## 16. REVENUE GUARDRAILS & ALERTS {#16-revenue}

### Alert Types
- **Refund rate:** Percentage of orders refunded exceeds threshold
- **Affiliate commission:** Total commission exceeds percentage of revenue
- **AOV drop:** Average order value drops below threshold
- **Webhook failures:** Count of unresolved webhook failures

### Background Job
Runs hourly:
1. Compute metrics for each alert type over the comparison period
2. Compare against thresholds
3. If exceeded, create `revenueAlert` record
4. Optionally send email alert to admins

### Admin Endpoints
```
GET    /api/admin/revenue/dashboard      → revenue overview metrics
GET    /api/admin/alerts                 → list active alerts
PATCH  /api/admin/alerts/:id/acknowledge → acknowledge alert
GET    /api/admin/alerts/thresholds      → get alert thresholds
PUT    /api/admin/alerts/thresholds      → update thresholds
```

---

## 17. SUPPORT TICKETS {#17-support}

### Customer Endpoints
```
POST /api/customer/support/tickets       → create ticket
GET  /api/customer/support/tickets       → list own tickets
GET  /api/customer/support/tickets/:id   → ticket detail
POST /api/customer/support/tickets/:id/reply → add customer reply
```

### Admin Endpoints
```
GET    /api/admin/support/tickets        → list all tickets (filterable by status, priority)
PATCH  /api/admin/support/tickets/:id    → update status, priority, assignment
POST   /api/admin/support/tickets/:id/note → add admin note
POST   /api/admin/support/tickets/:id/reply → reply to customer (sends email)
```

### Email Threading (Optional: Mailgun)
- Outbound admin replies set `Reply-To: support+ticket-{id}@{domain}`
- Mailgun inbound webhook at `/api/webhooks/mailgun/inbound` parses reply, strips quoted text, appends to `customerReplies`

---

## 18. BACKGROUND JOBS {#18-jobs}

Lightweight in-process job runner (no Redis/Bull required):

```typescript
class JobRunner {
  private jobs: Map<string, { fn: () => Promise<any>; intervalMs: number; timer?: NodeJS.Timer }>;

  register(name: string, fn: () => Promise<any>, intervalMs: number);
  start();  // Start all registered jobs
  stop();   // Clear all timers

  private async runJob(name: string) {
    // Check for duplicate running job (select from jobRuns where status=running)
    // Insert jobRun with status=running
    // Execute fn()
    // Update jobRun with status=completed/failed, durationMs
  }
}
```

### Registered Jobs
| Job Name | Interval | Purpose |
|---|---|---|
| `commission-auto-approve` | 1 hour | Approve pending commissions past approval window |
| `abandoned-cart-detection` | 15 min | Mark inactive carts as abandoned, send recovery emails |
| `recovery-email-sender` | 30 min | Send recovery emails for abandoned carts + failed payments |
| `revenue-alert-check` | 1 hour | Evaluate alert thresholds and create alerts |
| `vip-auto-promote` | 1 hour | Check new VIP eligibility after orders |
| `daily-metrics-snapshot` | 24 hours | Aggregate daily metrics |
| `coupon-auto-expire` | 6 hours | Expire underperforming coupons |
| `webhook-failure-monitor` | 1 hour | Check for unresolved webhook failures |

---

## 19. ADMIN PAGES TO ADD {#19-admin-pages}

Add these pages to the existing admin layout/sidebar:

| Page | Route | Description |
|---|---|---|
| Products | `/admin/products` | CRUD products with image upload, pricing, SEO, sale config, per-product affiliate settings |
| Orders | `/admin/orders` | List/filter/search orders, view detail, update status, add shipment tracking, issue refunds |
| Customers | `/admin/customers` | Search/filter customers, view purchase history, add notes/tags, merge duplicates, VIP status, disable accounts |
| Affiliates | `/admin/affiliates` | List affiliates, approve/suspend, view referrals, manage invites, process payouts, custom commission rates |
| Coupons | `/admin/coupons` | Create/edit coupons, view redemptions, analytics, stacking rules |
| Shipping | `/admin/shipping` | Configure zones and rates |
| Upsells | `/admin/upsells` | Configure product relationships and upsell rules, view conversion analytics |
| VIP Program | `/admin/vip` | Configure thresholds and benefits, manage VIP customers |
| Recovery | `/admin/recovery` | View abandoned carts and failed payments, recovery analytics |
| Revenue | `/admin/revenue` | Revenue dashboard with charts and key metrics |
| Alerts | `/admin/alerts` | Active alerts, threshold configuration, acknowledge/resolve |
| Reports | `/admin/reports` | Daily/weekly/monthly revenue, order, and customer reports |
| E-Commerce Settings | `/admin/ecommerce-settings` | Stripe configuration (test/live keys, webhook secret), tax settings, checkout options |

---

## 20. CUSTOMER-FACING PAGES {#20-customer-pages}

| Page | Route | Description |
|---|---|---|
| Shop | `/shop` | Product grid showing active/published products |
| Product Detail | `/products/:slug` | Full product page with images, features, add-to-cart, upsells |
| Cart | (drawer/sidebar) | Cart contents with quantity controls, coupon input |
| Checkout | `/checkout` | Shipping address (Stripe AddressElement), coupon, tax calc, payment |
| Order Success | `/order-success` | Confirmation, post-purchase upsell offers |
| Order Status | `/order-status/:id` | Public order tracking (email verification) |
| My Account | `/my-account` | Order history, profile, support tickets |
| Affiliate Portal | `/affiliate-portal` | Dashboard, referral stats, payout requests, Stripe Connect |
| Become Affiliate | `/become-affiliate` | 5-step onboarding wizard (invite-only) |

---

## IMPLEMENTATION NOTES

### Security Checklist
- [ ] All Stripe keys encrypted in DB (AES-256-GCM)
- [ ] Webhook signature verification on every event
- [ ] Webhook idempotency via processed_webhook_events
- [ ] Server-side coupon validation (never trust frontend)
- [ ] Self-referral blocking in affiliate commission calculation
- [ ] Over-refund protection (refundable amount check)
- [ ] Rate limiting on auth endpoints and affiliate tracking
- [ ] Customer session tokens use HMAC-SHA256
- [ ] Admin RBAC middleware on all admin routes
- [ ] IP logging on orders for fraud detection
- [ ] Audit logging on sensitive admin actions

### Money Rules
- All prices in **cents** (integer), never floating-point
- All calculations use integer math: `Math.floor(subtotal * percent / 100)`
- Display formatting: `(amount / 100).toFixed(2)` only at the UI layer
- Stripe expects amounts in cents
- Tax amounts come from Stripe Tax API (authoritative)

### Idempotency Patterns
- Webhook events: check `processedWebhookEvents` before processing
- Stripe refunds: idempotency key `refund-{orderId}-{timestamp}`
- Stripe transfers: idempotency key `payout-{payoutId}`
- Commission calculation: in-memory Map with 5-minute TTL

### Error Handling
- Use custom error classes: `NotFoundError`, `ValidationError`, `ConflictError`
- Centralized error handler middleware maps error types to HTTP status codes
- Webhook errors are logged to `webhookFailures` table and return 200 (to prevent Stripe retries)
- All async route handlers wrapped in try/catch with `next(error)`
