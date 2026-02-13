import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, decimal, jsonb, real, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Admin users for CMS access
// Roles:
// - admin: Full access to all features
// - store_manager: Full access except team management
// - fulfillment: Order management only (view orders, update status, add tracking)
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  name: text("name").notNull(), // Legacy field: stores "firstName lastName" for backwards compatibility
  phone: text("phone").default(""),
  role: text("role").notNull().default("admin"), // admin, store_manager, fulfillment
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({ id: true, createdAt: true });
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;

// Password reset tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({ id: true, createdAt: true });
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Products
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  tagline: text("tagline"),
  description: text("description"),
  price: integer("price").notNull(), // stored in cents
  primaryImage: text("primary_image"),
  secondaryImages: text("secondary_images").array().notNull().default(sql`ARRAY[]::text[]`),
  images: text("images").array().notNull().default(sql`ARRAY[]::text[]`), // legacy, kept for compatibility
  features: text("features").array().notNull().default(sql`ARRAY[]::text[]`),
  included: text("included").array().notNull().default(sql`ARRAY[]::text[]`),
  active: boolean("active").notNull().default(true),
  status: text("status").notNull().default("published"), // draft, published
  sku: text("sku"),
  tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
  // Sale pricing
  salePrice: integer("sale_price"), // in cents
  discountType: text("discount_type").notNull().default("NONE"), // NONE, FIXED, PERCENT
  discountValue: integer("discount_value"), // cents for FIXED, percentage for PERCENT
  saleStartAt: timestamp("sale_start_at"),
  saleEndAt: timestamp("sale_end_at"),
  // SEO fields
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  metaKeywords: text("meta_keywords"),
  urlSlug: text("url_slug"),
  canonicalUrl: text("canonical_url"),
  robotsIndex: boolean("robots_index").notNull().default(true),
  robotsFollow: boolean("robots_follow").notNull().default(true),
  ogTitle: text("og_title"),
  ogDescription: text("og_description"),
  ogImage: text("og_image"),
  // Affiliate per-product settings
  affiliateEnabled: boolean("affiliate_enabled").notNull().default(true),
  affiliateUseGlobalSettings: boolean("affiliate_use_global_settings").notNull().default(true),
  affiliateCommissionType: text("affiliate_commission_type"), // PERCENT or FIXED, nullable when global used
  affiliateCommissionValue: integer("affiliate_commission_value"), // percent points or cents, nullable
  affiliateDiscountType: text("affiliate_discount_type"), // PERCENT or FIXED, nullable when global used
  affiliateDiscountValue: integer("affiliate_discount_value"), // percent points or cents, nullable
});

export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Customers
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"), // Link to authenticated user (optional for guest checkout)
  email: text("email").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  country: text("country").default("USA"),
  isDisabled: boolean("is_disabled").default(false),
  passwordHash: text("password_hash"), // For email/password login
  sessionInvalidatedAt: timestamp("session_invalidated_at"), // For force logout
  mergedIntoCustomerId: varchar("merged_into_customer_id"), // Set when this record was merged into another customer
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

// Orders
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  status: text("status").notNull().default("pending"), // pending, paid, shipped, delivered, cancelled
  totalAmount: integer("total_amount").notNull(), // in cents (subtotal + tax)
  subtotalAmount: integer("subtotal_amount"), // in cents (before tax)
  taxAmount: integer("tax_amount"), // in cents (sales tax)
  stripeTaxCalculationId: text("stripe_tax_calculation_id"), // Stripe Tax calculation ID for compliance
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeSessionId: text("stripe_session_id"),
  affiliateCode: text("affiliate_code"), // referral tracking
  isManualOrder: boolean("is_manual_order").default(false), // for admin-created orders
  notes: text("notes"),
  customerIp: text("customer_ip"), // IP address for fraud detection
  shippingName: text("shipping_name"),
  shippingCompany: text("shipping_company"),
  shippingAddress: text("shipping_address"),
  shippingLine2: text("shipping_line2"),
  shippingCity: text("shipping_city"),
  shippingState: text("shipping_state"),
  shippingZip: text("shipping_zip"),
  shippingCountry: text("shipping_country").default("US"),
  billingSameAsShipping: boolean("billing_same_as_shipping").default(true),
  billingName: text("billing_name"),
  billingCompany: text("billing_company"),
  billingAddress: text("billing_address"),
  billingLine2: text("billing_line2"),
  billingCity: text("billing_city"),
  billingState: text("billing_state"),
  billingZip: text("billing_zip"),
  billingCountry: text("billing_country").default("US"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  items: many(orderItems),
}));

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Order Items
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(), // in cents
});

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

// Site Settings for CMS
export const siteSettings = pgTable("site_settings", {
  id: varchar("id").primaryKey().default("main"),
  orderNotificationEmail: text("order_notification_email"),
  companyName: text("company_name").default("Power Plunge"),
  companyTagline: text("company_tagline").default("Mind + Body + Spirit"),
  companyAddress: text("company_address"),
  companyPhone: text("company_phone"),
  logoUrl: text("logo_url"),
  adminIconUrl: text("admin_icon_url"),
  faviconUrl: text("favicon_url"),
  // Email settings
  fromEmail: text("from_email"),
  replyToEmail: text("reply_to_email"),
  supportEmail: text("support_email"),
  supportPhone: text("support_phone"),
  managerNotificationEmails: text("manager_notification_emails"), // comma-separated
  // Featured product for homepage/shop
  featuredProductId: varchar("featured_product_id"),
  // CMS active theme
  activeThemeId: text("active_theme_id").default("arctic-default"),
  // CMS site preset config (nav, footer, SEO, CTA defaults)
  activePresetId: varchar("active_preset_id"),
  navPreset: jsonb("nav_preset"),
  footerPreset: jsonb("footer_preset"),
  seoDefaults: jsonb("seo_defaults"),
  globalCtaDefaults: jsonb("global_cta_defaults"),
  blogPageId: varchar("blog_page_id"),
  gaMeasurementId: text("ga_measurement_id"),
  privacyPolicy: text("privacy_policy"),
  termsAndConditions: text("terms_and_conditions"),
  consentSettings: jsonb("consent_settings"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSiteSettingsSchema = createInsertSchema(siteSettings);
export type InsertSiteSettings = z.infer<typeof insertSiteSettingsSchema>;
export type SiteSettings = typeof siteSettings.$inferSelect;

// Email Provider Settings (Mailgun)
export const emailSettings = pgTable("email_settings", {
  id: varchar("id").primaryKey().default("main"),
  provider: text("provider").notNull().default("none"), // none, mailgun
  mailgunDomain: text("mailgun_domain"),
  mailgunFromName: text("mailgun_from_name"),
  mailgunFromEmail: text("mailgun_from_email"),
  mailgunReplyTo: text("mailgun_reply_to"),
  mailgunApiKeyEncrypted: text("mailgun_api_key_encrypted"),
  mailgunRegion: text("mailgun_region").default("us"), // us, eu
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedByUserId: varchar("updated_by_user_id"),
});

export const insertEmailSettingsSchema = createInsertSchema(emailSettings).omit({ updatedAt: true });
export type InsertEmailSettings = z.infer<typeof insertEmailSettingsSchema>;
export type EmailSettings = typeof emailSettings.$inferSelect;

// Integration Settings (Stripe, OpenAI, Cloudflare R2, etc.)
export const integrationSettings = pgTable("integration_settings", {
  id: varchar("id").primaryKey().default("main"),
  stripePublishableKey: text("stripe_publishable_key"),
  stripeSecretKeyEncrypted: text("stripe_secret_key_encrypted"),
  stripeWebhookSecretEncrypted: text("stripe_webhook_secret_encrypted"),
  stripeConnectWebhookSecretEncrypted: text("stripe_connect_webhook_secret_encrypted"),
  stripeMode: text("stripe_mode").default("test"), // test, live (legacy)
  stripeConfigured: boolean("stripe_configured").default(false),
  stripeActiveMode: text("stripe_active_mode").default("test"), // "test" or "live" - which mode is used for checkout
  stripePublishableKeyTest: text("stripe_publishable_key_test"),
  stripeSecretKeyTestEncrypted: text("stripe_secret_key_test_encrypted"),
  stripeWebhookSecretTestEncrypted: text("stripe_webhook_secret_test_encrypted"),
  stripePublishableKeyLive: text("stripe_publishable_key_live"),
  stripeSecretKeyLiveEncrypted: text("stripe_secret_key_live_encrypted"),
  stripeWebhookSecretLiveEncrypted: text("stripe_webhook_secret_live_encrypted"),
  // OpenAI integration for AI-powered features (SEO recommendations, etc.)
  openaiApiKeyEncrypted: text("openai_api_key_encrypted"),
  openaiConfigured: boolean("openai_configured").default(false),
  // Cloudflare R2 storage integration
  r2AccountId: text("r2_account_id"),
  r2AccessKeyIdEncrypted: text("r2_access_key_id_encrypted"),
  r2SecretAccessKeyEncrypted: text("r2_secret_access_key_encrypted"),
  r2BucketName: text("r2_bucket_name"),
  r2PublicUrl: text("r2_public_url"),
  r2Configured: boolean("r2_configured").default(false),
  // TikTok Shop integration
  tiktokShopConfigured: boolean("tiktok_shop_configured").default(false),
  tiktokShopId: text("tiktok_shop_id"),
  tiktokAppKey: text("tiktok_app_key"),
  tiktokAppSecretEncrypted: text("tiktok_app_secret_encrypted"),
  tiktokAccessTokenEncrypted: text("tiktok_access_token_encrypted"),
  tiktokRefreshTokenEncrypted: text("tiktok_refresh_token_encrypted"),
  // Instagram Shop integration
  instagramShopConfigured: boolean("instagram_shop_configured").default(false),
  instagramBusinessAccountId: text("instagram_business_account_id"),
  instagramCatalogId: text("instagram_catalog_id"),
  instagramAccessTokenEncrypted: text("instagram_access_token_encrypted"),
  // Pinterest Shopping integration
  pinterestShoppingConfigured: boolean("pinterest_shopping_configured").default(false),
  pinterestMerchantId: text("pinterest_merchant_id"),
  pinterestCatalogId: text("pinterest_catalog_id"),
  pinterestClientId: text("pinterest_client_id"),
  pinterestClientSecretEncrypted: text("pinterest_client_secret_encrypted"),
  pinterestAccessTokenEncrypted: text("pinterest_access_token_encrypted"),
  pinterestRefreshTokenEncrypted: text("pinterest_refresh_token_encrypted"),
  pinterestLastSyncAt: timestamp("pinterest_last_sync_at"),
  pinterestLastSyncStatus: text("pinterest_last_sync_status").default("never"),
  // YouTube Shopping integration
  youtubeShoppingConfigured: boolean("youtube_shopping_configured").default(false),
  youtubeChannelId: text("youtube_channel_id"),
  youtubeMerchantId: text("youtube_merchant_id"),
  youtubeClientId: text("youtube_client_id"),
  youtubeClientSecretEncrypted: text("youtube_client_secret_encrypted"),
  youtubeAccessTokenEncrypted: text("youtube_access_token_encrypted"),
  youtubeRefreshTokenEncrypted: text("youtube_refresh_token_encrypted"),
  youtubeLastSyncAt: timestamp("youtube_last_sync_at"),
  youtubeLastSyncStatus: text("youtube_last_sync_status").default("never"),
  // Snapchat Shopping integration
  snapchatShoppingConfigured: boolean("snapchat_shopping_configured").default(false),
  snapchatAccountId: text("snapchat_account_id"),
  snapchatCatalogId: text("snapchat_catalog_id"),
  snapchatClientId: text("snapchat_client_id"),
  snapchatClientSecretEncrypted: text("snapchat_client_secret_encrypted"),
  snapchatAccessTokenEncrypted: text("snapchat_access_token_encrypted"),
  snapchatRefreshTokenEncrypted: text("snapchat_refresh_token_encrypted"),
  snapchatLastSyncAt: timestamp("snapchat_last_sync_at"),
  snapchatLastSyncStatus: text("snapchat_last_sync_status").default("never"),
  // X Shopping integration
  xShoppingConfigured: boolean("x_shopping_configured").default(false),
  xAccountId: text("x_account_id"),
  xCatalogId: text("x_catalog_id"),
  xClientId: text("x_client_id"),
  xClientSecretEncrypted: text("x_client_secret_encrypted"),
  xAccessTokenEncrypted: text("x_access_token_encrypted"),
  xRefreshTokenEncrypted: text("x_refresh_token_encrypted"),
  xLastSyncAt: timestamp("x_last_sync_at"),
  xLastSyncStatus: text("x_last_sync_status").default("never"),
  // Mailchimp integration
  mailchimpConfigured: boolean("mailchimp_configured").default(false),
  mailchimpApiKeyEncrypted: text("mailchimp_api_key_encrypted"),
  mailchimpServerPrefix: text("mailchimp_server_prefix"),
  mailchimpAudienceId: text("mailchimp_audience_id"),
  mailchimpLastSyncAt: timestamp("mailchimp_last_sync_at"),
  mailchimpLastSyncStatus: text("mailchimp_last_sync_status").default("never"),
  // Google Places integration (for auto-fetching reviews)
  googlePlacesConfigured: boolean("google_places_configured").default(false),
  googlePlacesApiKeyEncrypted: text("google_places_api_key_encrypted"),
  googlePlacesId: text("google_places_id"),
  // Google Analytics 4 Data API integration
  ga4Configured: boolean("ga4_configured").default(false),
  ga4PropertyId: text("ga4_property_id"),
  ga4ServiceAccountEmail: text("ga4_service_account_email"),
  ga4ServiceAccountPrivateKeyEncrypted: text("ga4_service_account_private_key_encrypted"),
  // Twilio SMS integration (for affiliate invite phone verification)
  twilioEnabled: boolean("twilio_enabled").default(false),
  twilioAccountSid: text("twilio_account_sid"),
  twilioAuthTokenEncrypted: text("twilio_auth_token_encrypted"),
  twilioPhoneNumber: text("twilio_phone_number"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedByUserId: varchar("updated_by_user_id"),
});

export const insertIntegrationSettingsSchema = createInsertSchema(integrationSettings).omit({ updatedAt: true });
export type InsertIntegrationSettings = z.infer<typeof insertIntegrationSettingsSchema>;
export type IntegrationSettings = typeof integrationSettings.$inferSelect;

// Affiliate Program Settings
export const affiliateSettings = pgTable("affiliate_settings", {
  id: varchar("id").primaryKey().default("main"),
  commissionRate: integer("commission_rate").notNull().default(10), // legacy percentage field
  customerDiscountPercent: integer("customer_discount_percent").notNull().default(0), // legacy percentage field
  defaultCommissionType: text("default_commission_type").notNull().default("PERCENT"), // PERCENT or FIXED
  defaultCommissionValue: integer("default_commission_value").notNull().default(10), // percent points or cents
  defaultDiscountType: text("default_discount_type").notNull().default("PERCENT"), // PERCENT or FIXED
  defaultDiscountValue: integer("default_discount_value").notNull().default(0), // percent points or cents
  minimumPayout: integer("minimum_payout").notNull().default(5000), // in cents ($50)
  cookieDuration: integer("cookie_duration").notNull().default(30), // days
  approvalDays: integer("approval_days").notNull().default(14), // days before auto-approval
  agreementText: text("agreement_text").notNull().default(""),
  programActive: boolean("program_active").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAffiliateSettingsSchema = createInsertSchema(affiliateSettings).omit({ updatedAt: true });
export type InsertAffiliateSettings = z.infer<typeof insertAffiliateSettingsSchema>;
export type AffiliateSettings = typeof affiliateSettings.$inferSelect;

// Affiliates (customers who have become affiliates)
export const affiliates = pgTable("affiliates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id).unique(),
  affiliateCode: text("affiliate_code").notNull().unique(), // unique code for referral links
  status: text("status").notNull().default("pending"), // pending, active, suspended
  totalEarnings: integer("total_earnings").notNull().default(0), // in cents
  pendingBalance: integer("pending_balance").notNull().default(0), // in cents
  paidBalance: integer("paid_balance").notNull().default(0), // in cents
  totalReferrals: integer("total_referrals").notNull().default(0),
  totalClicks: integer("total_clicks").notNull().default(0),
  totalSales: integer("total_sales").notNull().default(0), // in cents
  paypalEmail: text("paypal_email"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const affiliatesRelations = relations(affiliates, ({ one, many }) => ({
  customer: one(customers, {
    fields: [affiliates.customerId],
    references: [customers.id],
  }),
  agreements: many(affiliateAgreements),
  referrals: many(affiliateReferrals),
  payouts: many(affiliatePayouts),
  clicks: many(affiliateClicks),
  payoutAccount: one(affiliatePayoutAccounts),
}));

export const insertAffiliateSchema = createInsertSchema(affiliates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAffiliate = z.infer<typeof insertAffiliateSchema>;
export type Affiliate = typeof affiliates.$inferSelect;

// Signed Affiliate Agreements
export const affiliateAgreements = pgTable("affiliate_agreements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliates.id),
  agreementText: text("agreement_text").notNull(), // snapshot of agreement at signing
  signatureName: text("signature_name").notNull(), // typed signature
  signatureIp: text("signature_ip"),
  signedAt: timestamp("signed_at").notNull().defaultNow(),
});

export const affiliateAgreementsRelations = relations(affiliateAgreements, ({ one }) => ({
  affiliate: one(affiliates, {
    fields: [affiliateAgreements.affiliateId],
    references: [affiliates.id],
  }),
}));

export const insertAffiliateAgreementSchema = createInsertSchema(affiliateAgreements).omit({ id: true, signedAt: true });
export type InsertAffiliateAgreement = z.infer<typeof insertAffiliateAgreementSchema>;
export type AffiliateAgreement = typeof affiliateAgreements.$inferSelect;

// Affiliate Clicks (track affiliate link clicks for attribution)
export const affiliateClicks = pgTable("affiliate_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliates.id),
  sessionId: text("session_id"),
  landingUrl: text("landing_url"),
  referrer: text("referrer"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  utmTerm: text("utm_term"),
  ipHash: text("ip_hash"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const affiliateClicksRelations = relations(affiliateClicks, ({ one }) => ({
  affiliate: one(affiliates, {
    fields: [affiliateClicks.affiliateId],
    references: [affiliates.id],
  }),
}));

export const insertAffiliateClickSchema = createInsertSchema(affiliateClicks).omit({ id: true, createdAt: true });
export type InsertAffiliateClick = z.infer<typeof insertAffiliateClickSchema>;
export type AffiliateClick = typeof affiliateClicks.$inferSelect;

// Affiliate Referrals (track which orders came from affiliates - serves as commission ledger)
export const affiliateReferrals = pgTable("affiliate_referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliates.id),
  orderId: varchar("order_id").notNull().references(() => orders.id).unique(), // unique prevents double-counting
  orderAmount: integer("order_amount").notNull(), // in cents
  commissionRate: integer("commission_rate").notNull(), // percentage at time of sale
  commissionAmount: integer("commission_amount").notNull(), // in cents
  status: text("status").notNull().default("pending"), // pending, approved, paid, void, flagged
  approvedAt: timestamp("approved_at"), // when commission was approved
  paidAt: timestamp("paid_at"), // when commission was paid out
  attributedClickId: varchar("attributed_click_id").references(() => affiliateClicks.id), // link to the click that led to this referral
  attributionType: text("attribution_type").default("cookie"), // cookie, coupon, direct
  flagReason: text("flag_reason"), // self_referral, coupon_abuse, suspicious_pattern
  flagDetails: text("flag_details"), // additional context about the flag
  flaggedAt: timestamp("flagged_at"), // when the commission was flagged
  reviewedBy: varchar("reviewed_by").references(() => adminUsers.id), // admin who reviewed
  reviewedAt: timestamp("reviewed_at"), // when reviewed
  reviewNotes: text("review_notes"), // admin notes on review decision
  customerIp: text("customer_ip"), // IP address of customer for fraud detection
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const affiliateReferralsRelations = relations(affiliateReferrals, ({ one }) => ({
  affiliate: one(affiliates, {
    fields: [affiliateReferrals.affiliateId],
    references: [affiliates.id],
  }),
  order: one(orders, {
    fields: [affiliateReferrals.orderId],
    references: [orders.id],
  }),
  click: one(affiliateClicks, {
    fields: [affiliateReferrals.attributedClickId],
    references: [affiliateClicks.id],
  }),
}));

export const insertAffiliateReferralSchema = createInsertSchema(affiliateReferrals).omit({ id: true, createdAt: true });
export type InsertAffiliateReferral = z.infer<typeof insertAffiliateReferralSchema>;
export type AffiliateReferral = typeof affiliateReferrals.$inferSelect;

// Affiliate Payouts
export const affiliatePayouts = pgTable("affiliate_payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliates.id),
  amount: integer("amount").notNull(), // in cents
  paymentMethod: text("payment_method").notNull().default("paypal"),
  paymentDetails: text("payment_details"), // email or other details
  status: text("status").notNull().default("pending"), // pending, approved, paid, rejected
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
  processedBy: varchar("processed_by").references(() => adminUsers.id),
  notes: text("notes"),
  stripeTransferId: text("stripe_transfer_id"), // Stripe transfer ID for payout
  payoutBatchId: text("payout_batch_id"), // batch ID for grouped payouts
});

export const affiliatePayoutsRelations = relations(affiliatePayouts, ({ one }) => ({
  affiliate: one(affiliates, {
    fields: [affiliatePayouts.affiliateId],
    references: [affiliates.id],
  }),
  processor: one(adminUsers, {
    fields: [affiliatePayouts.processedBy],
    references: [adminUsers.id],
  }),
}));

export const insertAffiliatePayoutSchema = createInsertSchema(affiliatePayouts).omit({ id: true, requestedAt: true, processedAt: true });
export type InsertAffiliatePayout = z.infer<typeof insertAffiliatePayoutSchema>;
export type AffiliatePayout = typeof affiliatePayouts.$inferSelect;

// Affiliate Payout Accounts (Stripe Connect accounts for affiliates)
export const affiliatePayoutAccounts = pgTable("affiliate_payout_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliates.id).unique(),
  stripeAccountId: text("stripe_account_id").notNull(), // Stripe Connect account ID
  payoutsEnabled: boolean("payouts_enabled").notNull().default(false),
  chargesEnabled: boolean("charges_enabled").notNull().default(false),
  detailsSubmitted: boolean("details_submitted").notNull().default(false),
  requirements: jsonb("requirements"), // Stripe onboarding requirements
  country: text("country").notNull().default("US"),
  currency: text("currency").notNull().default("usd"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const affiliatePayoutAccountsRelations = relations(affiliatePayoutAccounts, ({ one }) => ({
  affiliate: one(affiliates, {
    fields: [affiliatePayoutAccounts.affiliateId],
    references: [affiliates.id],
  }),
}));

export const insertAffiliatePayoutAccountSchema = createInsertSchema(affiliatePayoutAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAffiliatePayoutAccount = z.infer<typeof insertAffiliatePayoutAccountSchema>;
export type AffiliatePayoutAccount = typeof affiliatePayoutAccounts.$inferSelect;

// Affiliate Invites (for public signup and targeted invitations)
export const affiliateInvites = pgTable("affiliate_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inviteCode: text("invite_code").notNull().unique(), // unique code for invite link
  targetEmail: text("target_email"), // optional: if set, only this email can use the invite
  targetPhone: text("target_phone"), // optional: if set, recipient must verify this phone number via SMS
  targetName: text("target_name"), // optional: pre-fill name for targeted invite
  createdByAdminId: varchar("created_by_admin_id").references(() => adminUsers.id),
  usedByAffiliateId: varchar("used_by_affiliate_id").references(() => affiliates.id), // set when invite is used
  usedAt: timestamp("used_at"), // when invite was used
  expiresAt: timestamp("expires_at"), // optional expiration
  maxUses: integer("max_uses").default(1), // for generic invites, how many times it can be used
  timesUsed: integer("times_used").notNull().default(0),
  notes: text("notes"), // admin notes about this invite
  phoneVerified: boolean("phone_verified").notNull().default(false), // tracks if phone was verified for this invite
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const phoneVerificationCodes = pgTable("phone_verification_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inviteCode: text("invite_code").notNull(),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").notNull().default(false),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const affiliateInviteVerifications = pgTable("affiliate_invite_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inviteId: varchar("invite_id").notNull().references(() => affiliateInvites.id),
  phone: text("phone").notNull(),
  sessionNonce: text("session_nonce").notNull(),
  status: text("status").notNull().default("pending"),
  twilioVerifySid: text("twilio_verify_sid"),
  verificationToken: text("verification_token"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const affiliateInviteVerificationsRelations = relations(affiliateInviteVerifications, ({ one }) => ({
  invite: one(affiliateInvites, {
    fields: [affiliateInviteVerifications.inviteId],
    references: [affiliateInvites.id],
  }),
}));

export const affiliateInvitesRelations = relations(affiliateInvites, ({ one }) => ({
  createdByAdmin: one(adminUsers, {
    fields: [affiliateInvites.createdByAdminId],
    references: [adminUsers.id],
  }),
  usedByAffiliate: one(affiliates, {
    fields: [affiliateInvites.usedByAffiliateId],
    references: [affiliates.id],
  }),
}));

export const insertAffiliateInviteSchema = createInsertSchema(affiliateInvites).omit({ id: true, createdAt: true, timesUsed: true });
export type InsertAffiliateInvite = z.infer<typeof insertAffiliateInviteSchema>;
export type AffiliateInvite = typeof affiliateInvites.$inferSelect;

export const affiliateInviteUsages = pgTable("affiliate_invite_usages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inviteId: varchar("invite_id").notNull().references(() => affiliateInvites.id),
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliates.id),
  redeemedAt: timestamp("redeemed_at").notNull().defaultNow(),
  metadata: text("metadata"),
});

export const affiliateInviteUsagesRelations = relations(affiliateInviteUsages, ({ one }) => ({
  invite: one(affiliateInvites, {
    fields: [affiliateInviteUsages.inviteId],
    references: [affiliateInvites.id],
  }),
  affiliate: one(affiliates, {
    fields: [affiliateInviteUsages.affiliateId],
    references: [affiliates.id],
  }),
}));

export const insertAffiliateInviteUsageSchema = createInsertSchema(affiliateInviteUsages).omit({ id: true, redeemedAt: true });
export type InsertAffiliateInviteUsage = z.infer<typeof insertAffiliateInviteUsageSchema>;
export type AffiliateInviteUsage = typeof affiliateInviteUsages.$inferSelect;

export const insertPhoneVerificationCodeSchema = createInsertSchema(phoneVerificationCodes).omit({ id: true, createdAt: true });
export type InsertPhoneVerificationCode = z.infer<typeof insertPhoneVerificationCodeSchema>;
export type PhoneVerificationCode = typeof phoneVerificationCodes.$inferSelect;

export const insertAffiliateInviteVerificationSchema = createInsertSchema(affiliateInviteVerifications).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAffiliateInviteVerification = z.infer<typeof insertAffiliateInviteVerificationSchema>;
export type AffiliateInviteVerification = typeof affiliateInviteVerifications.$inferSelect;

// Product Categories
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  parentId: varchar("parent_id"),
  image: text("image"),
  sortOrder: integer("sort_order").default(0),
  active: boolean("active").notNull().default(true),
});

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Product to Category mapping
export const productCategories = pgTable("product_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id),
  categoryId: varchar("category_id").notNull().references(() => categories.id),
});

// Coupon Codes
export const coupons = pgTable("coupons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  description: text("description"),
  type: text("type").notNull().default("percentage"), // percentage, fixed, freeShipping
  value: integer("value").notNull(), // percentage (0-100) or cents for fixed
  minOrderAmount: integer("min_order_amount"), // minimum order in cents
  maxDiscountAmount: integer("max_discount_amount"), // cap on discount in cents
  maxRedemptions: integer("max_redemptions"), // total uses allowed
  perCustomerLimit: integer("per_customer_limit").default(1), // uses per customer
  timesUsed: integer("times_used").notNull().default(0),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  active: boolean("active").notNull().default(true),
  // Stacking rules
  blockAffiliateCommission: boolean("block_affiliate_commission").default(false), // No affiliate payout when used
  blockVipDiscount: boolean("block_vip_discount").default(false), // Cannot stack with VIP discounts
  minMarginPercent: integer("min_margin_percent").default(0), // Minimum margin required (0-100)
  // Auto-expire settings
  autoExpireEnabled: boolean("auto_expire_enabled").default(false), // Auto-disable underperformers
  autoExpireThreshold: integer("auto_expire_threshold").default(0), // Min net revenue in cents to stay active
  autoExpireAfterDays: integer("auto_expire_after_days").default(30), // Days to evaluate performance
  autoExpiredAt: timestamp("auto_expired_at"), // When coupon was auto-disabled
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCouponSchema = createInsertSchema(coupons).omit({ id: true, timesUsed: true, createdAt: true });
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type Coupon = typeof coupons.$inferSelect;

// Coupon Redemptions (audit trail)
export const couponRedemptions = pgTable("coupon_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  couponId: varchar("coupon_id").notNull().references(() => coupons.id),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  discountAmount: integer("discount_amount").notNull(), // in cents
  orderSubtotal: integer("order_subtotal").default(0), // Order subtotal before discount
  orderTotal: integer("order_total").default(0), // Order total after discount
  netRevenue: integer("net_revenue").default(0), // orderTotal - discountAmount (for quick analytics)
  affiliateCode: text("affiliate_code"), // Track if affiliate was also used
  affiliateCommissionBlocked: boolean("affiliate_commission_blocked").default(false), // If commission was blocked
  redeemedAt: timestamp("redeemed_at").notNull().defaultNow(),
});

export const insertCouponRedemptionSchema = createInsertSchema(couponRedemptions).omit({ id: true, redeemedAt: true });
export type InsertCouponRedemption = z.infer<typeof insertCouponRedemptionSchema>;
export type CouponRedemption = typeof couponRedemptions.$inferSelect;

// Order Refunds
export const refunds = pgTable("refunds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  amount: integer("amount").notNull(), // in cents
  reason: text("reason"),
  type: text("type").notNull().default("full"), // full, partial
  stripeRefundId: text("stripe_refund_id"),
  status: text("status").notNull().default("pending"), // pending, approved, processed, rejected
  processedBy: varchar("processed_by").references(() => adminUsers.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const insertRefundSchema = createInsertSchema(refunds).omit({ id: true, createdAt: true, processedAt: true });
export type InsertRefund = z.infer<typeof insertRefundSchema>;
export type Refund = typeof refunds.$inferSelect;

// Shipping Zones
export const shippingZones = pgTable("shipping_zones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  countries: text("countries").array().notNull().default(sql`ARRAY['USA']::text[]`),
  states: text("states").array(),
  active: boolean("active").notNull().default(true),
});

export const insertShippingZoneSchema = createInsertSchema(shippingZones).omit({ id: true });
export type InsertShippingZone = z.infer<typeof insertShippingZoneSchema>;
export type ShippingZone = typeof shippingZones.$inferSelect;

// Shipping Rates
export const shippingRates = pgTable("shipping_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  zoneId: varchar("zone_id").notNull().references(() => shippingZones.id),
  name: text("name").notNull(), // e.g., "Standard", "Express"
  description: text("description"),
  price: integer("price").notNull(), // in cents
  minOrderAmount: integer("min_order_amount"), // free shipping threshold
  estimatedDays: text("estimated_days"), // e.g., "3-5 business days"
  active: boolean("active").notNull().default(true),
});

export const insertShippingRateSchema = createInsertSchema(shippingRates).omit({ id: true });
export type InsertShippingRate = z.infer<typeof insertShippingRateSchema>;
export type ShippingRate = typeof shippingRates.$inferSelect;

// Order Shipments (tracking)
export const shipments = pgTable("shipments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  carrier: text("carrier"), // e.g., "UPS", "FedEx", "USPS"
  trackingNumber: text("tracking_number"),
  trackingUrl: text("tracking_url"),
  status: text("status").notNull().default("pending"), // pending, shipped, in_transit, delivered
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  shippedByAdminId: varchar("shipped_by_admin_id").references(() => adminUsers.id),
  internalNotes: text("internal_notes"), // admin-only notes
  shippedEmailSentAt: timestamp("shipped_email_sent_at"), // for idempotency
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertShipmentSchema = createInsertSchema(shipments).omit({ id: true, createdAt: true });
export type InsertShipment = z.infer<typeof insertShipmentSchema>;
export type Shipment = typeof shipments.$inferSelect;

// Custom Pages (CMS) - Block-based page builder
export const pages = pgTable("pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content"), // HTML content (legacy, kept for backward compatibility)
  contentJson: jsonb("content_json"), // Block-based JSON content for page builder
  pageType: text("page_type").notNull().default("page"), // home | shop | landing | page
  isHome: boolean("is_home").notNull().default(false), // Only one page can be true
  isShop: boolean("is_shop").notNull().default(false), // Only one page can be true
  template: text("template"), // Optional template: default | hero-left | hero-center | etc.
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  metaKeywords: text("meta_keywords"),
  canonicalUrl: text("canonical_url"),
  ogTitle: text("og_title"),
  ogDescription: text("og_description"),
  ogImage: text("og_image"),
  twitterCard: text("twitter_card").default("summary_large_image"),
  twitterTitle: text("twitter_title"),
  twitterDescription: text("twitter_description"),
  twitterImage: text("twitter_image"),
  robots: text("robots").default("index, follow"),
  jsonLd: jsonb("json_ld"), // JSON-LD structured data for SEO
  featuredImage: text("featured_image"), // OG image for social sharing
  status: text("status").notNull().default("draft"), // draft, published, scheduled
  scheduledAt: timestamp("scheduled_at"),
  sidebarId: varchar("sidebar_id").references(() => sidebars.id, { onDelete: "set null" }),
  showInNav: boolean("show_in_nav").default(false),
  navOrder: integer("nav_order").default(0),
  customCss: text("custom_css"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPageSchema = createInsertSchema(pages).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPage = z.infer<typeof insertPageSchema>;
export type Page = typeof pages.$inferSelect;

// Saved Sections (Reusable Block Groups)
export const savedSections = pgTable("saved_sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").default("general"), // general, hero, content, product, testimonial, cta
  blocks: jsonb("blocks").notNull(), // Array of block objects
  thumbnail: text("thumbnail"), // Optional preview image
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by"), // Admin user ID who created it
});

export const insertSavedSectionSchema = createInsertSchema(savedSections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSavedSection = z.infer<typeof insertSavedSectionSchema>;
export type SavedSection = typeof savedSections.$inferSelect;

// Site Presets - Full site look + structure definitions
export const sitePresets = pgTable("site_presets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  tags: jsonb("tags"), // string[]
  previewImage: text("preview_image"),
  config: jsonb("config").notNull(), // Full SitePreset config (themePackId, nav, footer, seo, etc.)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSitePresetDbSchema = createInsertSchema(sitePresets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSitePresetDb = z.infer<typeof insertSitePresetDbSchema>;
export type SitePresetDb = typeof sitePresets.$inferSelect;

// Preset Apply History - Snapshots for rollback
export const presetApplyHistory = pgTable("preset_apply_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  presetId: varchar("preset_id").notNull(),
  presetName: text("preset_name").notNull(),
  snapshot: jsonb("snapshot").notNull(), // Previous siteSettings + home page reference
  notes: text("notes"), // Optional admin notes for the apply action
  appliedBy: text("applied_by"), // Admin email
  appliedAt: timestamp("applied_at").notNull().defaultNow(),
  rolledBack: boolean("rolled_back").notNull().default(false),
  rolledBackAt: timestamp("rolled_back_at"),
});

export const insertPresetApplyHistorySchema = createInsertSchema(presetApplyHistory).omit({
  id: true,
  appliedAt: true,
  rolledBack: true,
  rolledBackAt: true,
});
export type InsertPresetApplyHistory = z.infer<typeof insertPresetApplyHistorySchema>;
export type PresetApplyHistory = typeof presetApplyHistory.$inferSelect;

// Media Library - Centralized media asset management
export const mediaLibrary = pgTable("media_library", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(), // Original filename
  storagePath: text("storage_path").notNull().unique(), // R2/storage path
  publicUrl: text("public_url").notNull(), // Full public URL
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(), // Size in bytes
  width: integer("width"), // Image width in pixels
  height: integer("height"), // Image height in pixels
  // SEO and metadata
  title: text("title"), // Display title
  altText: text("alt_text"), // Alt text for accessibility and SEO
  caption: text("caption"), // Image caption
  description: text("description"), // Detailed description
  tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`), // Categorization tags
  // Usage tracking
  usageCount: integer("usage_count").notNull().default(0), // How many times used
  usedIn: jsonb("used_in").default(sql`'[]'::jsonb`), // Array of {type, id, field} references
  // Organization
  folder: text("folder").default("uploads"), // Virtual folder path
  // Audit
  uploadedBy: varchar("uploaded_by"), // Admin user ID
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMediaLibrarySchema = createInsertSchema(mediaLibrary).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMediaLibrary = z.infer<typeof insertMediaLibrarySchema>;
export type MediaLibrary = typeof mediaLibrary.$inferSelect;

// Page Builder Block Schema
export const pageBlockSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.record(z.any()),
  settings: z.object({
    visibility: z.enum(['all', 'desktop', 'mobile']).optional(),
    className: z.string().optional(),
    anchor: z.string().optional(),
  }).optional(),
});

export const pageContentJsonSchema = z.object({
  version: z.number().default(1),
  blocks: z.array(pageBlockSchema),
});

export type PageBlock = z.infer<typeof pageBlockSchema>;
export type PageContentJson = z.infer<typeof pageContentJsonSchema>;

// Page type enum for validation
export const pageTypeEnum = z.enum(['home', 'shop', 'landing', 'page']);
export type PageType = z.infer<typeof pageTypeEnum>;

// Validation helper for contentJson - validates structure if provided
export function validateContentJson(data: unknown): { valid: boolean; error?: string } {
  if (data === null || data === undefined) return { valid: true };
  const result = pageContentJsonSchema.safeParse(data);
  if (!result.success) {
    return { valid: false, error: result.error.message };
  }
  return { valid: true };
}

// Validation helper for pageType - validates enum if provided
export function validatePageType(data: unknown): { valid: boolean; error?: string } {
  if (data === null || data === undefined) return { valid: true };
  const result = pageTypeEnum.safeParse(data);
  if (!result.success) {
    return { valid: false, error: "pageType must be one of: home, shop, landing, page" };
  }
  return { valid: true };
}

// Email Templates
export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(), // e.g., "NEW_ORDER_TO_MANAGERS", "THANK_YOU_ORDER_CONFIRMATION"
  name: text("name").notNull(), // human-readable name
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(), // HTML with merge tags
  bodyText: text("body_text"), // plain text fallback
  isEnabled: boolean("is_enabled").notNull().default(true),
  updatedByAdminId: varchar("updated_by_admin_id").references(() => adminUsers.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;

// Email Events (audit trail for sent emails)
export const emailEvents = pgTable("email_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateKey: text("template_key").notNull(),
  orderId: varchar("order_id").references(() => orders.id),
  toEmail: text("to_email").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull().default("queued"), // queued, sent, failed
  providerMessageId: text("provider_message_id"),
  errorMessage: text("error_message"),
  payloadJson: jsonb("payload_json"), // store rendered merge values for debugging
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertEmailEventSchema = createInsertSchema(emailEvents).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEmailEvent = z.infer<typeof insertEmailEventSchema>;
export type EmailEvent = typeof emailEvents.$inferSelect;

// Audit Log
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actor: text("actor"), // admin email or "system"
  action: text("action").notNull(), // e.g., "order.created", "product.updated"
  entityType: text("entity_type"), // e.g., "order", "product"
  entityId: varchar("entity_id"),
  metadata: jsonb("metadata"), // additional context
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// Processed Webhook Events (for idempotency)
export const processedWebhookEvents = pgTable("processed_webhook_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: text("event_id").notNull().unique(), // Stripe event ID (evt_xxx)
  eventType: text("event_type").notNull(), // e.g., "payment_intent.succeeded"
  source: text("source").notNull().default("stripe"), // stripe, stripe_connect
  processedAt: timestamp("processed_at").notNull().defaultNow(),
  metadata: jsonb("metadata"), // optional extra context
});

export const insertProcessedWebhookEventSchema = createInsertSchema(processedWebhookEvents).omit({ id: true, processedAt: true });
export type InsertProcessedWebhookEvent = z.infer<typeof insertProcessedWebhookEventSchema>;
export type ProcessedWebhookEvent = typeof processedWebhookEvents.$inferSelect;

// Customer Notes
export const customerNotes = pgTable("customer_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  note: text("note").notNull(),
  createdBy: varchar("created_by").references(() => adminUsers.id),
  createdByAdminName: text("created_by_admin_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCustomerNoteSchema = createInsertSchema(customerNotes).omit({ id: true, createdAt: true });
export type InsertCustomerNote = z.infer<typeof insertCustomerNoteSchema>;
export type CustomerNote = typeof customerNotes.$inferSelect;

// Theme Settings
export const themeSettings = pgTable("theme_settings", {
  id: varchar("id").primaryKey().default("main"),
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  primaryColor: text("primary_color").default("#67e8f9"),
  secondaryColor: text("secondary_color").default("#1e293b"),
  accentColor: text("accent_color").default("#0ea5e9"),
  backgroundColor: text("background_color").default("#0f172a"),
  textColor: text("text_color").default("#f8fafc"),
  headingFont: text("heading_font").default("Space Grotesk"),
  bodyFont: text("body_font").default("Inter"),
  heroTitle: text("hero_title"),
  heroSubtitle: text("hero_subtitle"),
  heroImage: text("hero_image"),
  footerText: text("footer_text"),
  socialLinks: jsonb("social_links"), // { facebook, twitter, instagram, youtube }
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertThemeSettingsSchema = createInsertSchema(themeSettings).omit({ updatedAt: true });
export type InsertThemeSettings = z.infer<typeof insertThemeSettingsSchema>;
export type ThemeSettings = typeof themeSettings.$inferSelect;

// Daily Metrics (for reports)
export const dailyMetrics = pgTable("daily_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(),
  totalOrders: integer("total_orders").notNull().default(0),
  totalRevenue: integer("total_revenue").notNull().default(0), // in cents
  newCustomers: integer("new_customers").notNull().default(0),
  pageViews: integer("page_views").notNull().default(0),
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }),
  averageOrderValue: integer("average_order_value").default(0), // in cents
});

export const insertDailyMetricsSchema = createInsertSchema(dailyMetrics).omit({ id: true });
export type InsertDailyMetrics = z.infer<typeof insertDailyMetricsSchema>;
export type DailyMetrics = typeof dailyMetrics.$inferSelect;

// Inventory (product stock tracking)
export const inventory = pgTable("inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id).unique(),
  quantity: integer("quantity").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").default(10),
  trackInventory: boolean("track_inventory").notNull().default(true),
  allowBackorders: boolean("allow_backorders").default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true, updatedAt: true });
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type Inventory = typeof inventory.$inferSelect;

// Inventory Ledger (stock movement history)
export const inventoryLedger = pgTable("inventory_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(), // positive = add, negative = subtract
  reason: text("reason"), // e.g., "Order #123", "Manual adjustment", "Restock"
  orderId: varchar("order_id").references(() => orders.id),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertInventoryLedgerSchema = createInsertSchema(inventoryLedger).omit({ id: true, createdAt: true });
export type InsertInventoryLedger = z.infer<typeof insertInventoryLedgerSchema>;
export type InventoryLedger = typeof inventoryLedger.$inferSelect;

// Docs Library (internal documentation)
export const docs = pgTable("docs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  category: text("category").notNull().default("general"), // architecture, integrations, features, data-model, deployment, security, troubleshooting
  tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
  status: text("status").notNull().default("draft"), // draft, published
  content: text("content").notNull().default(""),
  sortOrder: integer("sort_order").default(0),
  parentId: varchar("parent_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedByUserId: varchar("updated_by_user_id"),
});

export const insertDocSchema = createInsertSchema(docs).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDoc = z.infer<typeof insertDocSchema>;
export type Doc = typeof docs.$inferSelect;

// Doc versions (history)
export const docVersions = pgTable("doc_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  docId: varchar("doc_id").notNull().references(() => docs.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdByUserId: varchar("created_by_user_id"),
});

export const insertDocVersionSchema = createInsertSchema(docVersions).omit({ id: true, createdAt: true });
export type InsertDocVersion = z.infer<typeof insertDocVersionSchema>;
export type DocVersion = typeof docVersions.$inferSelect;

// Customer Tags (admin-assigned tags like VIP, Wholesale, High Value)
export const customerTags = pgTable("customer_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  tag: text("tag").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdByAdminId: varchar("created_by_admin_id").references(() => adminUsers.id),
});

export const customerTagsRelations = relations(customerTags, ({ one }) => ({
  customer: one(customers, {
    fields: [customerTags.customerId],
    references: [customers.id],
  }),
  createdBy: one(adminUsers, {
    fields: [customerTags.createdByAdminId],
    references: [adminUsers.id],
  }),
}));

export const insertCustomerTagSchema = createInsertSchema(customerTags).omit({ id: true, createdAt: true });
export type InsertCustomerTag = z.infer<typeof insertCustomerTagSchema>;
export type CustomerTag = typeof customerTags.$inferSelect;

// Admin Audit Logs (track admin actions for security)
export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").references(() => adminUsers.id),
  action: text("action").notNull(), // e.g., "password_reset", "disable_account", "add_note"
  targetType: text("target_type").notNull(), // e.g., "customer", "order", "affiliate"
  targetId: varchar("target_id").notNull(),
  details: jsonb("details"), // additional context (no secrets)
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const adminAuditLogsRelations = relations(adminAuditLogs, ({ one }) => ({
  admin: one(adminUsers, {
    fields: [adminAuditLogs.adminId],
    references: [adminUsers.id],
  }),
}));

export const insertAdminAuditLogSchema = createInsertSchema(adminAuditLogs).omit({ id: true, createdAt: true });
export type InsertAdminAuditLog = z.infer<typeof insertAdminAuditLogSchema>;
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;

// ==================== UPSELL & CROSS-SELL ====================

// Product Relationships (for upsells, cross-sells, frequently bought together)
export const productRelationships = pgTable("product_relationships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  relatedProductId: varchar("related_product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  relationshipType: text("relationship_type").notNull(), // "upsell", "cross_sell", "frequently_bought_together", "accessory"
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProductRelationshipSchema = createInsertSchema(productRelationships).omit({ id: true, createdAt: true });
export type InsertProductRelationship = z.infer<typeof insertProductRelationshipSchema>;
export type ProductRelationship = typeof productRelationships.$inferSelect;

// Upsell Rules (admin-configurable upsell behavior per product)
export const upsellRules = pgTable("upsell_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  upsellType: text("upsell_type").notNull(), // "cart", "post_purchase", "email"
  discountType: text("discount_type").default("none"), // "none", "percent", "fixed"
  discountValue: integer("discount_value").default(0), // percentage or cents
  headline: text("headline"), // e.g., "Add this before it ships!"
  description: text("description"),
  expirationMinutes: integer("expiration_minutes").default(1440), // 24 hours default for post-purchase
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUpsellRuleSchema = createInsertSchema(upsellRules).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUpsellRule = z.infer<typeof insertUpsellRuleSchema>;
export type UpsellRule = typeof upsellRules.$inferSelect;

// Upsell Impressions/Clicks (for analytics)
export const upsellEvents = pgTable("upsell_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id),
  customerId: varchar("customer_id").references(() => customers.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  upsellProductId: varchar("upsell_product_id").notNull().references(() => products.id),
  upsellType: text("upsell_type").notNull(), // "cart", "post_purchase", "email"
  eventType: text("event_type").notNull(), // "impression", "click", "conversion"
  revenue: integer("revenue").default(0), // cents, only for conversions
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUpsellEventSchema = createInsertSchema(upsellEvents).omit({ id: true, createdAt: true });
export type InsertUpsellEvent = z.infer<typeof insertUpsellEventSchema>;
export type UpsellEvent = typeof upsellEvents.$inferSelect;

// Post-Purchase Upsell Offers (one-click add to order)
export const postPurchaseOffers = pgTable("post_purchase_offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: varchar("product_id").notNull().references(() => products.id),
  originalPrice: integer("original_price").notNull(),
  discountedPrice: integer("discounted_price").notNull(),
  status: text("status").notNull().default("pending"), // "pending", "accepted", "declined", "expired"
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPostPurchaseOfferSchema = createInsertSchema(postPurchaseOffers).omit({ id: true, createdAt: true });
export type InsertPostPurchaseOffer = z.infer<typeof insertPostPurchaseOfferSchema>;
export type PostPurchaseOffer = typeof postPurchaseOffers.$inferSelect;

// ==================== VIP PROGRAM ====================

// VIP Settings (configurable thresholds and benefits)
export const vipSettings = pgTable("vip_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  lifetimeSpendThreshold: integer("lifetime_spend_threshold").default(100000), // $1000 in cents
  orderCountThreshold: integer("order_count_threshold").default(3),
  autoPromote: boolean("auto_promote").default(true), // auto-flag based on thresholds
  freeShippingEnabled: boolean("free_shipping_enabled").default(true),
  freeShippingThreshold: integer("free_shipping_threshold").default(0), // $0 for VIPs
  exclusiveDiscountPercent: integer("exclusive_discount_percent").default(10),
  prioritySupportEnabled: boolean("priority_support_enabled").default(true),
  earlyAccessEnabled: boolean("early_access_enabled").default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertVipSettingsSchema = createInsertSchema(vipSettings).omit({ id: true, updatedAt: true });
export type InsertVipSettings = z.infer<typeof insertVipSettingsSchema>;
export type VipSettings = typeof vipSettings.$inferSelect;

// VIP Customer Status (tracks VIP history and reason)
export const vipCustomers = pgTable("vip_customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().unique().references(() => customers.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("active"), // "active", "inactive", "revoked"
  reason: text("reason").notNull(), // "lifetime_spend", "order_count", "manual"
  lifetimeSpendAtPromotion: integer("lifetime_spend_at_promotion").default(0),
  orderCountAtPromotion: integer("order_count_at_promotion").default(0),
  promotedAt: timestamp("promoted_at").notNull().defaultNow(),
  promotedByAdminId: varchar("promoted_by_admin_id").references(() => adminUsers.id),
  revokedAt: timestamp("revoked_at"),
  revokedByAdminId: varchar("revoked_by_admin_id").references(() => adminUsers.id),
  revokeReason: text("revoke_reason"),
  notes: text("notes"),
});

export const vipCustomersRelations = relations(vipCustomers, ({ one }) => ({
  customer: one(customers, {
    fields: [vipCustomers.customerId],
    references: [customers.id],
  }),
  promotedBy: one(adminUsers, {
    fields: [vipCustomers.promotedByAdminId],
    references: [adminUsers.id],
  }),
  revokedBy: one(adminUsers, {
    fields: [vipCustomers.revokedByAdminId],
    references: [adminUsers.id],
  }),
}));

export const insertVipCustomerSchema = createInsertSchema(vipCustomers).omit({ id: true, promotedAt: true });
export type InsertVipCustomer = z.infer<typeof insertVipCustomerSchema>;
export type VipCustomer = typeof vipCustomers.$inferSelect;

// VIP Activity Log (track VIP benefits used)
export const vipActivityLog = pgTable("vip_activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  activityType: text("activity_type").notNull(), // "free_shipping", "exclusive_discount", "early_access", "priority_support"
  orderId: varchar("order_id").references(() => orders.id),
  savedAmount: integer("saved_amount").default(0), // cents saved due to VIP benefit
  details: jsonb("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVipActivityLogSchema = createInsertSchema(vipActivityLog).omit({ id: true, createdAt: true });
export type InsertVipActivityLog = z.infer<typeof insertVipActivityLogSchema>;
export type VipActivityLog = typeof vipActivityLog.$inferSelect;

// Coupon Stacking Rules - prevent incompatible discount combinations
export const couponStackingRules = pgTable("coupon_stacking_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  couponId: varchar("coupon_id").notNull().references(() => coupons.id, { onDelete: "cascade" }),
  blockedCouponId: varchar("blocked_coupon_id").references(() => coupons.id, { onDelete: "cascade" }),
  blockAffiliateCommission: boolean("block_affiliate_commission").default(false), // Prevent affiliate commission when this coupon is used
  blockVipDiscount: boolean("block_vip_discount").default(false), // Prevent stacking with VIP discount
  minMarginPercent: integer("min_margin_percent").default(0), // Minimum margin required (0-100)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCouponStackingRuleSchema = createInsertSchema(couponStackingRules).omit({ id: true, createdAt: true });
export type InsertCouponStackingRule = z.infer<typeof insertCouponStackingRuleSchema>;
export type CouponStackingRule = typeof couponStackingRules.$inferSelect;

// Abandoned Carts - track cart sessions for recovery
export const abandonedCarts = pgTable("abandoned_carts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  customerId: varchar("customer_id").references(() => customers.id),
  email: text("email"),
  cartData: jsonb("cart_data").notNull(), // { items: [...], couponCode, subtotal }
  cartValue: integer("cart_value").notNull(), // Total in cents
  couponCode: text("coupon_code"),
  affiliateCode: text("affiliate_code"),
  lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),
  abandonedAt: timestamp("abandoned_at"), // Set when cart is deemed abandoned (e.g., 1 hour of inactivity)
  recoveryEmailSent: integer("recovery_email_sent").default(0), // Count of recovery emails sent (max 2)
  recoveryEmailSentAt: timestamp("recovery_email_sent_at"),
  recoveredAt: timestamp("recovered_at"), // When order was completed
  recoveredOrderId: varchar("recovered_order_id").references(() => orders.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAbandonedCartSchema = createInsertSchema(abandonedCarts).omit({ id: true, createdAt: true });
export type InsertAbandonedCart = z.infer<typeof insertAbandonedCartSchema>;
export type AbandonedCart = typeof abandonedCarts.$inferSelect;

// Failed Payments - track failed Stripe payment attempts for recovery
export const failedPayments = pgTable("failed_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  customerId: varchar("customer_id").references(() => customers.id),
  email: text("email").notNull(),
  paymentIntentId: text("payment_intent_id"),
  amount: integer("amount").notNull(), // in cents
  failureReason: text("failure_reason"),
  failureCode: text("failure_code"), // Stripe error code
  recoveryEmailSent: integer("recovery_email_sent").default(0), // Count of recovery emails sent
  recoveryEmailSentAt: timestamp("recovery_email_sent_at"),
  recoveredAt: timestamp("recovered_at"), // When payment succeeded
  expiredAt: timestamp("expired_at"), // When we stop trying to recover
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFailedPaymentSchema = createInsertSchema(failedPayments).omit({ id: true, createdAt: true });
export type InsertFailedPayment = z.infer<typeof insertFailedPaymentSchema>;
export type FailedPayment = typeof failedPayments.$inferSelect;

// Recovery Analytics - aggregate recovery metrics
export const recoveryEvents = pgTable("recovery_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(), // "abandoned_cart", "failed_payment"
  sourceId: varchar("source_id").notNull(), // abandonedCartId or failedPaymentId
  action: text("action").notNull(), // "email_sent", "email_opened", "link_clicked", "recovered", "expired"
  orderId: varchar("order_id").references(() => orders.id),
  revenueRecovered: integer("revenue_recovered").default(0), // cents
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRecoveryEventSchema = createInsertSchema(recoveryEvents).omit({ id: true, createdAt: true });
export type InsertRecoveryEvent = z.infer<typeof insertRecoveryEventSchema>;
export type RecoveryEvent = typeof recoveryEvents.$inferSelect;

// Revenue Alert Thresholds - configurable guardrails
export const revenueAlertThresholds = pgTable("revenue_alert_thresholds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  alertType: text("alert_type").notNull(), // "refund_rate", "affiliate_commission", "aov_drop", "webhook_failure"
  thresholdValue: real("threshold_value").notNull(), // Percentage or count depending on type
  comparisonPeriod: text("comparison_period").default("7d"), // "24h", "7d", "30d"
  enabled: boolean("enabled").default(true),
  emailAlertEnabled: boolean("email_alert_enabled").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRevenueAlertThresholdSchema = createInsertSchema(revenueAlertThresholds).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRevenueAlertThreshold = z.infer<typeof insertRevenueAlertThresholdSchema>;
export type RevenueAlertThreshold = typeof revenueAlertThresholds.$inferSelect;

// Revenue Alerts - triggered alerts
export const revenueAlerts = pgTable("revenue_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  alertType: text("alert_type").notNull(), // "refund_rate", "affiliate_commission", "aov_drop", "webhook_failure"
  severity: text("severity").notNull().default("warning"), // "info", "warning", "critical"
  title: text("title").notNull(),
  message: text("message").notNull(),
  currentValue: real("current_value").notNull(), // The value that triggered the alert
  thresholdValue: real("threshold_value").notNull(), // The threshold that was exceeded
  metadata: jsonb("metadata"), // Additional context
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: varchar("acknowledged_by").references(() => adminUsers.id),
  resolvedAt: timestamp("resolved_at"),
  emailSentAt: timestamp("email_sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRevenueAlertSchema = createInsertSchema(revenueAlerts).omit({ id: true, createdAt: true });
export type InsertRevenueAlert = z.infer<typeof insertRevenueAlertSchema>;
export type RevenueAlert = typeof revenueAlerts.$inferSelect;

// Webhook Failures - track failed Stripe webhooks for monitoring
export const webhookFailures = pgTable("webhook_failures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: text("provider").notNull().default("stripe"), // "stripe", "sendgrid", etc.
  eventType: text("event_type").notNull(), // e.g., "payment_intent.succeeded"
  eventId: text("event_id"), // External event ID
  errorMessage: text("error_message"),
  errorCode: text("error_code"),
  payload: jsonb("payload"), // Original payload for debugging
  retryCount: integer("retry_count").default(0),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWebhookFailureSchema = createInsertSchema(webhookFailures).omit({ id: true, createdAt: true });
export type InsertWebhookFailure = z.infer<typeof insertWebhookFailureSchema>;
export type WebhookFailure = typeof webhookFailures.$inferSelect;

// Admin Notification Preferences
export const adminNotificationPrefs = pgTable("admin_notification_prefs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminUserId: varchar("admin_user_id").notNull().references(() => adminUsers.id),
  receiveEmailAlerts: boolean("receive_email_alerts").default(false),
  alertTypes: jsonb("alert_types").default(sql`'["refund_rate", "affiliate_commission", "aov_drop", "webhook_failure"]'::jsonb`), // Which alert types to receive
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAdminNotificationPrefSchema = createInsertSchema(adminNotificationPrefs).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAdminNotificationPref = z.infer<typeof insertAdminNotificationPrefSchema>;
export type AdminNotificationPref = typeof adminNotificationPrefs.$inferSelect;

// Background Job Runs - track scheduled task executions
export const jobRuns = pgTable("job_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobName: text("job_name").notNull(), // e.g., "affiliate_payout", "commission_approval"
  runKey: text("run_key").notNull().unique(), // Unique key to prevent duplicates (e.g., "affiliate_payout:2026-W05")
  status: text("status").notNull().default("running"), // running, completed, failed
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  durationMs: integer("duration_ms"),
  result: jsonb("result"), // Success/failure details
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertJobRunSchema = createInsertSchema(jobRuns).omit({ id: true, createdAt: true });
export type InsertJobRun = z.infer<typeof insertJobRunSchema>;
export type JobRun = typeof jobRuns.$inferSelect;

// A/B Testing - Experiments (DEPRECATED: Feature removed, tables retained for historical data)
export const experiments = pgTable("experiments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().default("checkout"), // checkout, post_purchase
  variants: jsonb("variants").notNull().default(sql`'["control", "variant_a"]'::jsonb`), // Array of variant names
  trafficSplit: jsonb("traffic_split").notNull().default(sql`'{"control": 50, "variant_a": 50}'::jsonb`), // Percentage per variant
  active: boolean("active").notNull().default(true),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertExperimentSchema = createInsertSchema(experiments).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertExperiment = z.infer<typeof insertExperimentSchema>;
export type Experiment = typeof experiments.$inferSelect;

// A/B Testing - User Assignments (DEPRECATED: Feature removed, tables retained for historical data)
export const experimentAssignments = pgTable("experiment_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  experimentId: varchar("experiment_id").notNull().references(() => experiments.id),
  sessionId: text("session_id").notNull(), // Browser session or user ID
  variant: text("variant").notNull(), // The variant assigned
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
});

export const insertExperimentAssignmentSchema = createInsertSchema(experimentAssignments).omit({ id: true, assignedAt: true });
export type InsertExperimentAssignment = z.infer<typeof insertExperimentAssignmentSchema>;
export type ExperimentAssignment = typeof experimentAssignments.$inferSelect;

// A/B Testing - Conversions (DEPRECATED: Feature removed, tables retained for historical data)
export const experimentConversions = pgTable("experiment_conversions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  experimentId: varchar("experiment_id").notNull().references(() => experiments.id),
  sessionId: text("session_id").notNull(),
  variant: text("variant").notNull(),
  conversionType: text("conversion_type").notNull(), // purchase, upsell_accepted, upsell_declined
  orderId: varchar("order_id"),
  revenue: integer("revenue"), // in cents
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertExperimentConversionSchema = createInsertSchema(experimentConversions).omit({ id: true, createdAt: true });
export type InsertExperimentConversion = z.infer<typeof insertExperimentConversionSchema>;
export type ExperimentConversion = typeof experimentConversions.$inferSelect;

// Support Tickets for customer service and returns
export const supportTickets = pgTable("support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  orderId: varchar("order_id").references(() => orders.id), // optional - for order-related issues
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("general"), // general, return, refund, shipping, technical
  status: text("status").notNull().default("open"), // open, in_progress, resolved, closed
  priority: text("priority").notNull().default("normal"), // low, normal, high, urgent
  adminNotes: jsonb("admin_notes").$type<Array<{ text: string; adminId: string; adminName: string; createdAt: string }>>().default([]),
  resolvedBy: varchar("resolved_by").references(() => adminUsers.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({ id: true, createdAt: true, updatedAt: true, resolvedAt: true, resolvedBy: true, adminNotes: true });
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;

// Customer Magic Link Tokens (for passwordless order tracking login)
export const customerMagicLinkTokens = pgTable("customer_magic_link_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCustomerMagicLinkTokenSchema = createInsertSchema(customerMagicLinkTokens).omit({ id: true, createdAt: true });
export type InsertCustomerMagicLinkToken = z.infer<typeof insertCustomerMagicLinkTokenSchema>;
export type CustomerMagicLinkToken = typeof customerMagicLinkTokens.$inferSelect;

// Theme Packs — bundled theme tokens, component variants, and block style defaults
export const themePacks = pgTable("theme_packs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  themeTokens: jsonb("theme_tokens").notNull().default({}),
  componentVariants: jsonb("component_variants").notNull().default({}),
  blockStyleDefaults: jsonb("block_style_defaults").notNull().default({}),
  previewImage: text("preview_image"),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const themeTokensSchema = z.object({
  bg: z.string().optional(),
  bgCard: z.string().optional(),
  bgElevated: z.string().optional(),
  text: z.string().optional(),
  textMuted: z.string().optional(),
  primary: z.string().optional(),
  primaryHover: z.string().optional(),
  primaryMuted: z.string().optional(),
  accent: z.string().optional(),
  border: z.string().optional(),
  success: z.string().optional(),
  error: z.string().optional(),
  warning: z.string().optional(),
  radius: z.string().optional(),
  font: z.string().optional(),
}).passthrough();

export const componentVariantSchema = z.object({
  variant: z.string().optional(),
  size: z.string().optional(),
  rounded: z.string().optional(),
  styles: z.record(z.string(), z.string()).optional(),
}).passthrough();

export const componentVariantsSchema = z.record(
  z.string(),
  componentVariantSchema,
);

export const blockStyleDefaultSchema = z.object({
  padding: z.string().optional(),
  margin: z.string().optional(),
  background: z.string().optional(),
  borderRadius: z.string().optional(),
  styles: z.record(z.string(), z.string()).optional(),
}).passthrough();

export const blockStyleDefaultsSchema = z.record(
  z.string(),
  blockStyleDefaultSchema,
);

export const insertThemePackSchema = createInsertSchema(themePacks, {
  themeTokens: () => themeTokensSchema,
  componentVariants: () => componentVariantsSchema,
  blockStyleDefaults: () => blockStyleDefaultsSchema,
}).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertThemePack = z.infer<typeof insertThemePackSchema>;
export type ThemePack = typeof themePacks.$inferSelect;

// ==================== CMS: Blog Posts ====================
export const cmsPosts = pgTable("cms_v2_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  body: text("body").notNull().default(""),
  excerpt: text("excerpt"),
  featuredImage: text("featured_image"),
  authorName: text("author_name"),
  authorId: varchar("author_id").references(() => adminUsers.id),
  tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
  category: text("category"),
  status: text("status").notNull().default("draft"),
  publishedAt: timestamp("published_at"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  ogImage: text("og_image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCmsPostSchema = createInsertSchema(cmsPosts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCmsPost = z.infer<typeof insertCmsPostSchema>;
export type CmsPost = typeof cmsPosts.$inferSelect;

// ==================== CMS: Navigation Menus ====================
export const menuItemSchema: z.ZodType<any> = z.object({
  id: z.string(),
  type: z.enum(["page", "post", "external", "label"]).default("external"),
  label: z.string(),
  href: z.string().optional().default(""),
  url: z.string().optional().default(""),
  pageId: z.string().optional(),
  pageSlug: z.string().optional(),
  postId: z.string().optional(),
  postSlug: z.string().optional(),
  target: z.enum(["_self", "_blank"]).default("_self"),
  order: z.number().default(0),
  children: z.lazy((): z.ZodTypeAny => z.array(menuItemSchema)).default([]),
});
export type MenuItem = z.infer<typeof menuItemSchema>;

export const cmsMenus = pgTable("cms_v2_menus", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  location: text("location").notNull().default("header"),
  items: jsonb("items").notNull().default(sql`'[]'::jsonb`),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCmsMenuSchema = createInsertSchema(cmsMenus).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCmsMenu = z.infer<typeof insertCmsMenuSchema>;
export type CmsMenu = typeof cmsMenus.$inferSelect;

// ==================== Blog Posts Data Model ====================

export const postCategories = pgTable("post_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPostCategorySchema = createInsertSchema(postCategories).omit({ id: true, createdAt: true });
export type InsertPostCategory = z.infer<typeof insertPostCategorySchema>;
export type PostCategory = typeof postCategories.$inferSelect;

export const postTags = pgTable("post_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPostTagSchema = createInsertSchema(postTags).omit({ id: true, createdAt: true });
export type InsertPostTag = z.infer<typeof insertPostTagSchema>;
export type PostTag = typeof postTags.$inferSelect;

export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt"),
  contentJson: jsonb("content_json"),
  legacyHtml: text("legacy_html"),
  status: text("status").notNull().default("draft"),
  publishedAt: timestamp("published_at"),
  scheduledAt: timestamp("scheduled_at"),
  authorId: varchar("author_id").references(() => adminUsers.id),
  coverImageId: varchar("cover_image_id").references(() => mediaLibrary.id),
  ogImageId: varchar("og_image_id").references(() => mediaLibrary.id),
  readingTimeMinutes: integer("reading_time_minutes"),
  canonicalUrl: text("canonical_url"),
  featured: boolean("featured").notNull().default(false),
  allowIndex: boolean("allow_index").notNull().default(true),
  allowFollow: boolean("allow_follow").notNull().default(true),
  sidebarId: varchar("sidebar_id").references(() => sidebars.id, { onDelete: "set null" }),
  customCss: text("custom_css"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPostSchema = createInsertSchema(posts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;

export const postCategoryMap = pgTable("post_category_map", {
  postId: varchar("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id").notNull().references(() => postCategories.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.postId, table.categoryId] })]);

export const postTagMap = pgTable("post_tag_map", {
  postId: varchar("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  tagId: varchar("tag_id").notNull().references(() => postTags.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.postId, table.tagId] })]);

export const postRevisions = pgTable("post_revisions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  snapshotJson: jsonb("snapshot_json").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdByUserId: varchar("created_by_user_id").references(() => adminUsers.id),
});

export const insertPostRevisionSchema = createInsertSchema(postRevisions).omit({ id: true, createdAt: true });
export type InsertPostRevision = z.infer<typeof insertPostRevisionSchema>;
export type PostRevision = typeof postRevisions.$inferSelect;

export const postSettings = pgTable("post_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postsPerPage: integer("posts_per_page").notNull().default(12),
  blogTitle: text("blog_title").notNull().default("Blog"),
  blogDescription: text("blog_description"),
  defaultOgImageId: varchar("default_og_image_id").references(() => mediaLibrary.id),
  rssEnabled: boolean("rss_enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPostSettingsSchema = createInsertSchema(postSettings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPostSettings = z.infer<typeof insertPostSettingsSchema>;
export type PostSettings = typeof postSettings.$inferSelect;

// Sidebars & Widgets
export const sidebars = pgTable("sidebars", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  location: text("location"), // "post_left" | "page_left" | null (unassigned)
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSidebarSchema = createInsertSchema(sidebars).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSidebar = z.infer<typeof insertSidebarSchema>;
export type Sidebar = typeof sidebars.$inferSelect;

export const sidebarWidgets = pgTable("sidebar_widgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sidebarId: varchar("sidebar_id").notNull().references(() => sidebars.id, { onDelete: "cascade" }),
  widgetType: text("widget_type").notNull(),
  title: text("title").notNull(),
  settings: jsonb("settings").notNull().default({}),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSidebarWidgetSchema = createInsertSchema(sidebarWidgets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSidebarWidget = z.infer<typeof insertSidebarWidgetSchema>;
export type SidebarWidget = typeof sidebarWidgets.$inferSelect;
