import {
  adminUsers, type AdminUser, type InsertAdminUser,
  passwordResetTokens, type PasswordResetToken, type InsertPasswordResetToken,
  products, type Product, type InsertProduct,
  customers, type Customer, type InsertCustomer,
  orders, type Order, type InsertOrder,
  orderItems, type OrderItem, type InsertOrderItem,
  siteSettings, type SiteSettings, type InsertSiteSettings,
  affiliateSettings, type AffiliateSettings, type InsertAffiliateSettings,
  affiliates, type Affiliate, type InsertAffiliate,
  affiliateAgreements, type AffiliateAgreement, type InsertAffiliateAgreement,
  affiliateReferrals, type AffiliateReferral, type InsertAffiliateReferral,
  affiliatePayouts, type AffiliatePayout, type InsertAffiliatePayout,
  affiliatePayoutAccounts, type AffiliatePayoutAccount, type InsertAffiliatePayoutAccount,
  affiliateClicks, type AffiliateClick, type InsertAffiliateClick,
  affiliateInvites, type AffiliateInvite, type InsertAffiliateInvite,
  affiliateInviteUsages, type AffiliateInviteUsage, type InsertAffiliateInviteUsage,
  phoneVerificationCodes, type PhoneVerificationCode, type InsertPhoneVerificationCode,
  affiliateInviteVerifications, type AffiliateInviteVerification, type InsertAffiliateInviteVerification,
  categories, type Category, type InsertCategory,
  coupons, type Coupon, type InsertCoupon,
  couponRedemptions, type CouponRedemption, type InsertCouponRedemption,
  refunds, type Refund, type InsertRefund,
  shippingZones, type ShippingZone, type InsertShippingZone,
  shippingRates, type ShippingRate, type InsertShippingRate,
  shipments, type Shipment, type InsertShipment,
  pages, type Page, type InsertPage,
  savedSections, type SavedSection, type InsertSavedSection,
  mediaLibrary, type MediaLibrary, type InsertMediaLibrary,
  emailTemplates, type EmailTemplate, type InsertEmailTemplate,
  emailEvents, type EmailEvent, type InsertEmailEvent,
  auditLogs, type AuditLog, type InsertAuditLog,
  processedWebhookEvents, type ProcessedWebhookEvent, type InsertProcessedWebhookEvent,
  customerNotes, type CustomerNote, type InsertCustomerNote,
  themeSettings, type ThemeSettings, type InsertThemeSettings,
  dailyMetrics, type DailyMetrics, type InsertDailyMetrics,
  inventory, type Inventory, type InsertInventory,
  inventoryLedger, type InventoryLedger, type InsertInventoryLedger,
  docs, type Doc, type InsertDoc,
  docVersions, type DocVersion, type InsertDocVersion,
  emailSettings, type EmailSettings, type InsertEmailSettings,
  integrationSettings, type IntegrationSettings, type InsertIntegrationSettings,
  metaCapiEvents, type MetaCapiEvent, type InsertMetaCapiEvent,
  customerTags, type CustomerTag, type InsertCustomerTag,
  adminAuditLogs, type AdminAuditLog, type InsertAdminAuditLog,
  productRelationships, type ProductRelationship, type InsertProductRelationship,
  upsellRules, type UpsellRule, type InsertUpsellRule,
  upsellEvents, type UpsellEvent, type InsertUpsellEvent,
  postPurchaseOffers, type PostPurchaseOffer, type InsertPostPurchaseOffer,
  vipSettings, type VipSettings, type InsertVipSettings,
  vipCustomers, type VipCustomer, type InsertVipCustomer,
  vipActivityLog, type VipActivityLog, type InsertVipActivityLog,
  customerMagicLinkTokens, type CustomerMagicLinkToken, type InsertCustomerMagicLinkToken,
} from "@shared/schema";
import { users, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "./db";
import { eq, desc, and, or, sql, gte, lte, count, sum, inArray, ne, like, isNull } from "drizzle-orm";

export interface IStorage {
  // Users (Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  updateUser(id: string, user: Partial<UpsertUser>): Promise<User | undefined>;

  // Admin Users
  getAdminUser(id: string): Promise<AdminUser | undefined>;
  getAdminUserByEmail(email: string): Promise<AdminUser | undefined>;
  getAdminUsers(): Promise<AdminUser[]>;
  createAdminUser(user: InsertAdminUser): Promise<AdminUser>;
  updateAdminUser(id: string, user: Partial<InsertAdminUser>): Promise<AdminUser | undefined>;
  deleteAdminUser(id: string): Promise<void>;

  // Password Reset Tokens
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(token: string): Promise<void>;
  deleteCustomer(id: string): Promise<void>;

  // Customers (for admin)
  getCustomers(): Promise<Customer[]>;

  // Products
  getProducts(): Promise<Product[]>;
  getActiveProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductBySlug(slug: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<void>;

  // Customers
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomersByIds(ids: string[]): Promise<Customer[]>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  getCustomerByUserId(userId: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;

  // Orders
  getOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrdersByCustomerId(customerId: string): Promise<Order[]>;
  getOrdersByCustomerIds(customerIds: string[]): Promise<Order[]>;
  getOrderByStripeSession(sessionId: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined>;
  deleteOrder(id: string): Promise<boolean>;
  deleteOrders(ids: string[]): Promise<number>;

  // Order Items
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  getAllOrderItems(): Promise<OrderItem[]>;
  getOrderItemsByOrderIds(orderIds: string[]): Promise<OrderItem[]>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;

  // Site Settings
  getSiteSettings(): Promise<SiteSettings | undefined>;
  updateSiteSettings(settings: Partial<InsertSiteSettings>): Promise<SiteSettings>;

  // Affiliate Settings
  getAffiliateSettings(): Promise<AffiliateSettings | undefined>;
  updateAffiliateSettings(settings: Partial<InsertAffiliateSettings>): Promise<AffiliateSettings>;

  // Affiliates
  getAffiliates(): Promise<Affiliate[]>;
  getAffiliate(id: string): Promise<Affiliate | undefined>;
  getAffiliateByCustomerId(customerId: string): Promise<Affiliate | undefined>;
  getAffiliateByCode(code: string): Promise<Affiliate | undefined>;
  createAffiliate(affiliate: InsertAffiliate): Promise<Affiliate>;
  updateAffiliate(id: string, affiliate: Partial<InsertAffiliate>): Promise<Affiliate | undefined>;

  // Affiliate Agreements
  getAffiliateAgreements(affiliateId: string): Promise<AffiliateAgreement[]>;
  getAffiliateAgreement(id: string): Promise<AffiliateAgreement | undefined>;
  createAffiliateAgreement(agreement: InsertAffiliateAgreement): Promise<AffiliateAgreement>;

  // Affiliate Referrals
  getAffiliateReferrals(affiliateId: string): Promise<AffiliateReferral[]>;
  getAffiliateReferralCounts(): Promise<Array<{ affiliateId: string; count: number }>>;
  getAffiliateReferralByOrderId(orderId: string): Promise<AffiliateReferral | undefined>;
  createAffiliateReferral(referral: InsertAffiliateReferral): Promise<AffiliateReferral>;
  updateAffiliateReferral(id: string, referral: Partial<InsertAffiliateReferral>): Promise<AffiliateReferral | undefined>;

  // Affiliate Payouts
  getAffiliatePayouts(affiliateId?: string): Promise<AffiliatePayout[]>;
  getAffiliatePayoutsByBatchId(batchId: string): Promise<AffiliatePayout[]>;
  getAffiliatePayout(id: string): Promise<AffiliatePayout | undefined>;
  createAffiliatePayout(payout: InsertAffiliatePayout): Promise<AffiliatePayout>;
  updateAffiliatePayout(id: string, payout: Partial<InsertAffiliatePayout>): Promise<AffiliatePayout | undefined>;

  // Affiliate Payout Accounts (Stripe Connect)
  getAffiliatePayoutAccountByAffiliateId(affiliateId: string): Promise<AffiliatePayoutAccount | undefined>;
  getAffiliatePayoutAccountByStripeAccountId(stripeAccountId: string): Promise<AffiliatePayoutAccount | undefined>;
  createAffiliatePayoutAccount(account: InsertAffiliatePayoutAccount): Promise<AffiliatePayoutAccount>;
  updateAffiliatePayoutAccount(id: string, account: Partial<InsertAffiliatePayoutAccount>): Promise<AffiliatePayoutAccount | undefined>;

  // Affiliate Clicks
  getAffiliateClicks(affiliateId: string): Promise<AffiliateClick[]>;
  getAffiliateClick(id: string): Promise<AffiliateClick | undefined>;
  getAffiliateClickBySessionId(sessionId: string): Promise<AffiliateClick | undefined>;
  createAffiliateClick(click: InsertAffiliateClick): Promise<AffiliateClick>;
  countAffiliateClicks(affiliateId: string): Promise<number>;

  // Affiliate Invites
  getAffiliateInvites(): Promise<AffiliateInvite[]>;
  getAffiliateInvite(id: string): Promise<AffiliateInvite | undefined>;
  getAffiliateInviteByCode(code: string): Promise<AffiliateInvite | undefined>;
  createAffiliateInvite(invite: InsertAffiliateInvite): Promise<AffiliateInvite>;
  updateAffiliateInvite(id: string, invite: Partial<InsertAffiliateInvite>): Promise<AffiliateInvite | undefined>;
  deleteAffiliateInvite(id: string): Promise<void>;
  incrementAffiliateInviteUsage(id: string): Promise<void>;

  redeemAffiliateInvite(inviteId: string, affiliateId: string, metadata?: string): Promise<{ success: boolean; invite?: AffiliateInvite; error?: string }>;
  createAffiliateInviteUsage(usage: InsertAffiliateInviteUsage): Promise<AffiliateInviteUsage>;

  // Phone Verification Codes (legacy)
  createPhoneVerificationCode(data: InsertPhoneVerificationCode): Promise<PhoneVerificationCode>;
  getPhoneVerificationCode(inviteCode: string, phone: string): Promise<PhoneVerificationCode | undefined>;
  markPhoneVerificationCodeVerified(id: string): Promise<void>;
  incrementPhoneVerificationAttempts(id: string): Promise<void>;
  invalidatePhoneVerificationCodes(inviteCode: string, phone: string): Promise<void>;
  countRecentPhoneVerificationCodes(inviteCode: string, minutesAgo: number): Promise<number>;

  // Affiliate Invite Verifications (Twilio Verify model)
  createAffiliateInviteVerification(data: InsertAffiliateInviteVerification): Promise<AffiliateInviteVerification>;
  getVerifiedVerificationForInvite(inviteId: string, phone: string): Promise<AffiliateInviteVerification | undefined>;
  getVerificationByToken(token: string): Promise<AffiliateInviteVerification | undefined>;
  getPendingVerificationForInvite(inviteId: string, phone: string, sessionNonce: string): Promise<AffiliateInviteVerification | undefined>;
  updateAffiliateInviteVerification(id: string, data: Partial<AffiliateInviteVerification>): Promise<AffiliateInviteVerification | undefined>;
  invalidatePendingVerifications(inviteId: string, phone: string): Promise<void>;
  countDailyVerificationsForPhone(phone: string): Promise<number>;
  countRecentVerificationsForInvite(inviteId: string, minutesAgo: number): Promise<number>;

  // Categories
  getCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<void>;

  // Coupons
  getCoupons(): Promise<Coupon[]>;
  getCoupon(id: string): Promise<Coupon | undefined>;
  getCouponByCode(code: string): Promise<Coupon | undefined>;
  createCoupon(coupon: InsertCoupon): Promise<Coupon>;
  updateCoupon(id: string, coupon: Partial<InsertCoupon>): Promise<Coupon | undefined>;
  deleteCoupon(id: string): Promise<void>;
  incrementCouponUsage(id: string): Promise<void>;

  // Coupon Redemptions
  getCouponRedemptions(couponId: string): Promise<CouponRedemption[]>;
  getCustomerCouponRedemptions(customerId: string, couponId: string): Promise<CouponRedemption[]>;
  createCouponRedemption(redemption: InsertCouponRedemption): Promise<CouponRedemption>;

  // Refunds
  getRefunds(): Promise<Refund[]>;
  getRefund(id: string): Promise<Refund | undefined>;
  getRefundsByOrderId(orderId: string): Promise<Refund[]>;
  getRefundByStripeRefundId(stripeRefundId: string): Promise<Refund | undefined>;
  createRefund(refund: InsertRefund): Promise<Refund>;
  updateRefund(id: string, refund: Partial<InsertRefund>): Promise<Refund | undefined>;

  // Order lookups
  getOrderByPaymentIntentId(paymentIntentId: string): Promise<Order | undefined>;

  // Shipping Zones
  getShippingZones(): Promise<ShippingZone[]>;
  getShippingZone(id: string): Promise<ShippingZone | undefined>;
  createShippingZone(zone: InsertShippingZone): Promise<ShippingZone>;
  updateShippingZone(id: string, zone: Partial<InsertShippingZone>): Promise<ShippingZone | undefined>;
  deleteShippingZone(id: string): Promise<void>;

  // Shipping Rates
  getShippingRates(zoneId?: string): Promise<ShippingRate[]>;
  getShippingRate(id: string): Promise<ShippingRate | undefined>;
  createShippingRate(rate: InsertShippingRate): Promise<ShippingRate>;
  updateShippingRate(id: string, rate: Partial<InsertShippingRate>): Promise<ShippingRate | undefined>;
  deleteShippingRate(id: string): Promise<void>;

  // Shipments
  getShipments(orderId?: string): Promise<Shipment[]>;
  getShipmentsByOrderIds(orderIds: string[]): Promise<Shipment[]>;
  getShipment(id: string): Promise<Shipment | undefined>;
  createShipment(shipment: InsertShipment): Promise<Shipment>;
  updateShipment(id: string, shipment: Partial<InsertShipment>): Promise<Shipment | undefined>;

  // Pages
  getPages(): Promise<Page[]>;
  getPublishedPages(): Promise<Page[]>;
  getPage(id: string): Promise<Page | undefined>;
  getPageBySlug(slug: string): Promise<Page | undefined>;
  getHomePage(): Promise<Page | undefined>;
  getShopPage(): Promise<Page | undefined>;
  getPagesByType(pageType: string): Promise<Page[]>;
  createPage(page: InsertPage): Promise<Page>;
  updatePage(id: string, page: Partial<InsertPage>): Promise<Page | undefined>;
  deletePage(id: string): Promise<void>;
  setHomePage(id: string): Promise<Page | undefined>;
  setShopPage(id: string): Promise<Page | undefined>;

  // Saved Sections (Reusable Block Groups)
  getSavedSections(): Promise<SavedSection[]>;
  getSavedSection(id: string): Promise<SavedSection | undefined>;
  getSavedSectionsByCategory(category: string): Promise<SavedSection[]>;
  createSavedSection(section: InsertSavedSection): Promise<SavedSection>;
  updateSavedSection(id: string, section: Partial<InsertSavedSection>): Promise<SavedSection | undefined>;
  deleteSavedSection(id: string): Promise<void>;

  // Media Library
  getMediaItems(filters?: { folder?: string; mimeType?: string; search?: string; tags?: string[] }): Promise<MediaLibrary[]>;
  getMediaItem(id: string): Promise<MediaLibrary | undefined>;
  getMediaItemByPath(storagePath: string): Promise<MediaLibrary | undefined>;
  createMediaItem(item: InsertMediaLibrary): Promise<MediaLibrary>;
  updateMediaItem(id: string, item: Partial<InsertMediaLibrary>): Promise<MediaLibrary | undefined>;
  deleteMediaItem(id: string): Promise<void>;
  incrementMediaUsage(id: string, usedIn: { type: string; id: string; field: string }): Promise<MediaLibrary | undefined>;
  decrementMediaUsage(id: string, usedIn: { type: string; id: string; field: string }): Promise<MediaLibrary | undefined>;

  // Email Templates
  getEmailTemplates(): Promise<EmailTemplate[]>;
  getEmailTemplate(id: string): Promise<EmailTemplate | undefined>;
  getEmailTemplateByKey(key: string): Promise<EmailTemplate | undefined>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: string, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined>;

  // Email Events
  getEmailEvents(orderId?: string, limit?: number): Promise<EmailEvent[]>;
  createEmailEvent(event: InsertEmailEvent): Promise<EmailEvent>;
  updateEmailEvent(id: string, event: Partial<InsertEmailEvent>): Promise<EmailEvent | undefined>;

  // Audit Logs
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // Processed Webhook Events (for idempotency)
  getProcessedWebhookEvent(eventId: string): Promise<ProcessedWebhookEvent | undefined>;
  createProcessedWebhookEvent(event: InsertProcessedWebhookEvent): Promise<ProcessedWebhookEvent>;

  // Meta CAPI outbox
  createMetaCapiEvent(event: InsertMetaCapiEvent): Promise<MetaCapiEvent>;
  getMetaCapiEventByEventKey(eventKey: string): Promise<MetaCapiEvent | undefined>;
  claimDueMetaCapiEvents(limit: number, lockToken: string): Promise<MetaCapiEvent[]>;
  updateMetaCapiEvent(id: string, data: Partial<InsertMetaCapiEvent>): Promise<MetaCapiEvent | undefined>;
  getMetaCapiQueueStats(): Promise<{
    queued: number;
    retry: number;
    processing: number;
    failed: number;
    sent: number;
    oldestQueuedAt: Date | null;
    lastSentAt: Date | null;
  }>;

  // Customer Notes
  getCustomerNotes(customerId: string): Promise<CustomerNote[]>;
  createCustomerNote(note: InsertCustomerNote): Promise<CustomerNote>;
  deleteCustomerNote(id: string): Promise<void>;

  // Customer Tags
  getCustomerTags(customerId: string): Promise<CustomerTag[]>;
  createCustomerTag(tag: InsertCustomerTag): Promise<CustomerTag>;
  deleteCustomerTag(id: string): Promise<void>;
  setCustomerTags(customerId: string, tags: string[], adminId?: string): Promise<CustomerTag[]>;

  // Admin Audit Logs
  createAdminAuditLog(log: InsertAdminAuditLog): Promise<AdminAuditLog>;
  getAuditLogsForTarget(targetType: string, targetId: string): Promise<AdminAuditLog[]>;

  // Customer Profile (aggregated data)
  getCustomerProfile(customerId: string): Promise<{
    customer: Customer;
    orderCount: number;
    totalSpent: number;
    lastOrderDate: Date | null;
    avgOrderValue: number;
    isAffiliate: boolean;
    affiliateEarnings: number;
    refundCount: number;
    tags: string[];
  } | null>;

  // Theme Settings
  getThemeSettings(): Promise<ThemeSettings | undefined>;
  updateThemeSettings(settings: Partial<InsertThemeSettings>): Promise<ThemeSettings>;

  // Daily Metrics
  getDailyMetrics(startDate: Date, endDate: Date): Promise<DailyMetrics[]>;
  createDailyMetrics(metrics: InsertDailyMetrics): Promise<DailyMetrics>;
  updateDailyMetrics(id: string, metrics: Partial<InsertDailyMetrics>): Promise<DailyMetrics | undefined>;

  // Inventory
  getInventory(productId: string): Promise<Inventory | undefined>;
  getAllInventory(): Promise<Inventory[]>;
  createInventory(inv: InsertInventory): Promise<Inventory>;
  updateInventory(productId: string, inv: Partial<InsertInventory>): Promise<Inventory | undefined>;

  // Inventory Ledger
  getInventoryLedger(productId: string): Promise<InventoryLedger[]>;
  createInventoryLedger(entry: InsertInventoryLedger): Promise<InventoryLedger>;

  // Dashboard Stats
  getDashboardStats(): Promise<{
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    averageOrderValue: number;
    recentOrders: Order[];
    topProducts: { productId: string; productName: string; totalSold: number; revenue: number }[];
  }>;

  // Docs Library
  getDocs(filters?: { category?: string; status?: string; search?: string }): Promise<Doc[]>;
  getDoc(id: string): Promise<Doc | undefined>;
  getDocBySlug(slug: string): Promise<Doc | undefined>;
  createDoc(doc: InsertDoc): Promise<Doc>;
  updateDoc(id: string, doc: Partial<InsertDoc>): Promise<Doc | undefined>;
  deleteDoc(id: string): Promise<void>;
  publishDoc(id: string, publish: boolean): Promise<Doc | undefined>;

  // Doc Versions
  getDocVersions(docId: string): Promise<DocVersion[]>;
  createDocVersion(version: InsertDocVersion): Promise<DocVersion>;
  restoreDocVersion(docId: string, versionId: string): Promise<Doc | undefined>;

  // Email Settings
  getEmailSettings(): Promise<EmailSettings | undefined>;
  updateEmailSettings(settings: Partial<InsertEmailSettings>): Promise<EmailSettings>;

  // Integration Settings (Stripe, etc.)
  getIntegrationSettings(): Promise<IntegrationSettings | undefined>;
  updateIntegrationSettings(settings: Partial<InsertIntegrationSettings>): Promise<IntegrationSettings>;

  // Customer Magic Link Tokens
  createMagicLinkToken(data: InsertCustomerMagicLinkToken): Promise<CustomerMagicLinkToken>;
  getMagicLinkToken(token: string): Promise<CustomerMagicLinkToken | undefined>;
  markMagicLinkTokenUsed(token: string): Promise<void>;
  deleteExpiredMagicLinkTokens(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users (Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set({
      ...userData,
      updatedAt: new Date(),
    }).where(eq(users.id, id)).returning();
    return updated || undefined;
  }

  // Admin Users
  async getAdminUser(id: string): Promise<AdminUser | undefined> {
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
    return user || undefined;
  }

  async getAdminUserByEmail(email: string): Promise<AdminUser | undefined> {
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return user || undefined;
  }

  async createAdminUser(user: InsertAdminUser): Promise<AdminUser> {
    const [newUser] = await db.insert(adminUsers).values(user).returning();
    return newUser;
  }

  async getAdminUsers(): Promise<AdminUser[]> {
    return db.select().from(adminUsers);
  }

  async updateAdminUser(id: string, user: Partial<InsertAdminUser>): Promise<AdminUser | undefined> {
    const [updated] = await db.update(adminUsers).set(user).where(eq(adminUsers.id, id)).returning();
    return updated || undefined;
  }

  async deleteAdminUser(id: string): Promise<void> {
    await db.delete(adminUsers).where(eq(adminUsers.id, id));
  }

  // Password Reset Tokens
  async createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [newToken] = await db.insert(passwordResetTokens).values(token).returning();
    return newToken;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [result] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    return result || undefined;
  }

  async markPasswordResetTokenUsed(token: string): Promise<void> {
    await db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.token, token));
  }

  async deleteCustomer(id: string): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }

  // Customers (for admin)
  async getCustomers(): Promise<Customer[]> {
    return db.select().from(customers);
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return db.select().from(products);
  }

  async getActiveProducts(): Promise<Product[]> {
    return db.select().from(products).where(eq(products.active, true));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.urlSlug, slug));
    return product || undefined;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db.update(products).set(product).where(eq(products.id, id)).returning();
    return updated || undefined;
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  // Customers
  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async getCustomersByIds(ids: string[]): Promise<Customer[]> {
    if (ids.length === 0) return [];
    return db.select().from(customers).where(inArray(customers.id, ids));
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    const normalizedEmail = email.trim().toLowerCase();
    const [customer] = await db.select().from(customers).where(sql`LOWER(TRIM(${customers.email})) = ${normalizedEmail}`);
    return customer || undefined;
  }

  async getCustomerByUserId(userId: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers)
      .where(and(eq(customers.userId, userId), isNull(customers.mergedIntoCustomerId)));
    return customer || undefined;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const normalizedData = {
      ...customer,
      email: customer.email.trim().toLowerCase(),
    };
    const [newCustomer] = await db.insert(customers).values(normalizedData).returning();
    return newCustomer;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const updateData = { ...customer };
    if (updateData.email) {
      updateData.email = updateData.email.trim().toLowerCase();
    }
    const [updated] = await db.update(customers).set(updateData).where(eq(customers.id, id)).returning();
    return updated || undefined;
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrdersByCustomerId(customerId: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.createdAt));
  }

  async getOrdersByCustomerIds(customerIds: string[]): Promise<Order[]> {
    if (customerIds.length === 0) return [];
    return db.select().from(orders).where(inArray(orders.customerId, customerIds));
  }

  async getOrderByStripeSession(sessionId: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.stripeSessionId, sessionId));
    return order || undefined;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined> {
    const [updated] = await db.update(orders).set({ ...order, updatedAt: new Date() }).where(eq(orders.id, id)).returning();
    return updated || undefined;
  }

  async deleteOrder(id: string): Promise<boolean> {
    const deleted = await this.deleteOrders([id]);
    return deleted > 0;
  }

  async deleteOrders(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const idsArray = sql`ARRAY[${sql.join(ids.map(id => sql`${id}`), sql`, `)}]::varchar[]`;
    return await db.transaction(async (tx) => {
      await tx.delete(orderItems).where(inArray(orderItems.orderId, ids));
      await tx.delete(shipments).where(inArray(shipments.orderId, ids));
      await tx.delete(affiliateReferrals).where(inArray(affiliateReferrals.orderId, ids));
      await tx.delete(couponRedemptions).where(inArray(couponRedemptions.orderId, ids));
      await tx.delete(refunds).where(inArray(refunds.orderId, ids));
      await tx.execute(sql`DELETE FROM failed_payments WHERE order_id = ANY(${idsArray})`);
      await tx.execute(sql`UPDATE email_events SET order_id = NULL WHERE order_id = ANY(${idsArray})`);
      await tx.execute(sql`UPDATE inventory_ledger SET order_id = NULL WHERE order_id = ANY(${idsArray})`);
      await tx.execute(sql`UPDATE upsell_events SET order_id = NULL WHERE order_id = ANY(${idsArray})`);
      await tx.execute(sql`UPDATE vip_activity_log SET order_id = NULL WHERE order_id = ANY(${idsArray})`);
      await tx.execute(sql`UPDATE recovery_events SET order_id = NULL WHERE order_id = ANY(${idsArray})`);
      await tx.execute(sql`UPDATE support_tickets SET order_id = NULL WHERE order_id = ANY(${idsArray})`);
      await tx.execute(sql`UPDATE abandoned_carts SET recovered_order_id = NULL WHERE recovered_order_id = ANY(${idsArray})`);
      await tx.execute(sql`DELETE FROM meta_capi_events WHERE order_id = ANY(${idsArray})`);
      const result = await tx.delete(orders).where(inArray(orders.id, ids)).returning();
      return result.length;
    });
  }

  // Order Items
  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async getAllOrderItems(): Promise<OrderItem[]> {
    return db.select().from(orderItems);
  }

  async getOrderItemsByOrderIds(orderIds: string[]): Promise<OrderItem[]> {
    if (orderIds.length === 0) return [];
    return db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));
  }

  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const [newItem] = await db.insert(orderItems).values(item).returning();
    return newItem;
  }

  // Site Settings
  async getSiteSettings(): Promise<SiteSettings | undefined> {
    const [settings] = await db.select().from(siteSettings).where(eq(siteSettings.id, "main"));
    return settings || undefined;
  }

  async updateSiteSettings(settings: Partial<InsertSiteSettings>): Promise<SiteSettings> {
    const existing = await this.getSiteSettings();
    if (existing) {
      const [updated] = await db.update(siteSettings).set(settings).where(eq(siteSettings.id, "main")).returning();
      return updated;
    } else {
      const [created] = await db.insert(siteSettings).values({ id: "main", ...settings }).returning();
      return created;
    }
  }

  // Affiliate Settings
  async getAffiliateSettings(): Promise<AffiliateSettings | undefined> {
    const [settings] = await db.select().from(affiliateSettings).where(eq(affiliateSettings.id, "main"));
    return settings || undefined;
  }

  async updateAffiliateSettings(settings: Partial<InsertAffiliateSettings>): Promise<AffiliateSettings> {
    const existing = await this.getAffiliateSettings();
    if (existing) {
      const [updated] = await db.update(affiliateSettings).set({ ...settings, updatedAt: new Date() }).where(eq(affiliateSettings.id, "main")).returning();
      return updated;
    } else {
      const [created] = await db.insert(affiliateSettings).values({ id: "main", ...settings }).returning();
      return created;
    }
  }

  // Affiliates
  async getAffiliates(): Promise<Affiliate[]> {
    return db.select().from(affiliates).orderBy(desc(affiliates.createdAt));
  }

  async getAffiliate(id: string): Promise<Affiliate | undefined> {
    const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.id, id));
    return affiliate || undefined;
  }

  async getAffiliateByCustomerId(customerId: string): Promise<Affiliate | undefined> {
    const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.customerId, customerId));
    return affiliate || undefined;
  }

  async getAffiliateByCode(code: string): Promise<Affiliate | undefined> {
    const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.affiliateCode, code));
    return affiliate || undefined;
  }

  async createAffiliate(affiliate: InsertAffiliate): Promise<Affiliate> {
    const [newAffiliate] = await db.insert(affiliates).values(affiliate).returning();
    return newAffiliate;
  }

  async updateAffiliate(id: string, affiliate: Partial<InsertAffiliate>): Promise<Affiliate | undefined> {
    const [updated] = await db.update(affiliates).set({ ...affiliate, updatedAt: new Date() }).where(eq(affiliates.id, id)).returning();
    return updated || undefined;
  }

  // Affiliate Agreements
  async getAffiliateAgreements(affiliateId: string): Promise<AffiliateAgreement[]> {
    return db.select().from(affiliateAgreements).where(eq(affiliateAgreements.affiliateId, affiliateId)).orderBy(desc(affiliateAgreements.signedAt));
  }

  async getAffiliateAgreement(id: string): Promise<AffiliateAgreement | undefined> {
    const [agreement] = await db.select().from(affiliateAgreements).where(eq(affiliateAgreements.id, id));
    return agreement || undefined;
  }

  async createAffiliateAgreement(agreement: InsertAffiliateAgreement): Promise<AffiliateAgreement> {
    const [newAgreement] = await db.insert(affiliateAgreements).values(agreement).returning();
    return newAgreement;
  }

  // Affiliate Referrals
  async getAffiliateReferrals(affiliateId: string): Promise<AffiliateReferral[]> {
    return db.select().from(affiliateReferrals).where(eq(affiliateReferrals.affiliateId, affiliateId)).orderBy(desc(affiliateReferrals.createdAt));
  }

  async getAffiliateReferralCounts(): Promise<Array<{ affiliateId: string; count: number }>> {
    const rows = await db
      .select({
        affiliateId: affiliateReferrals.affiliateId,
        count: sql<number>`count(*)::int`,
      })
      .from(affiliateReferrals)
      .groupBy(affiliateReferrals.affiliateId);
    return rows;
  }

  async getAffiliateReferralByOrderId(orderId: string): Promise<AffiliateReferral | undefined> {
    const [referral] = await db.select().from(affiliateReferrals).where(eq(affiliateReferrals.orderId, orderId));
    return referral || undefined;
  }

  async createAffiliateReferral(referral: InsertAffiliateReferral): Promise<AffiliateReferral> {
    const [newReferral] = await db.insert(affiliateReferrals).values(referral).returning();
    return newReferral;
  }

  async updateAffiliateReferral(id: string, referral: Partial<InsertAffiliateReferral>): Promise<AffiliateReferral | undefined> {
    const [updated] = await db.update(affiliateReferrals).set(referral).where(eq(affiliateReferrals.id, id)).returning();
    return updated || undefined;
  }

  // Affiliate Payouts
  async getAffiliatePayouts(affiliateId?: string): Promise<AffiliatePayout[]> {
    if (affiliateId) {
      return db.select().from(affiliatePayouts).where(eq(affiliatePayouts.affiliateId, affiliateId)).orderBy(desc(affiliatePayouts.requestedAt));
    }
    return db.select().from(affiliatePayouts).orderBy(desc(affiliatePayouts.requestedAt));
  }

  async getAffiliatePayout(id: string): Promise<AffiliatePayout | undefined> {
    const [payout] = await db.select().from(affiliatePayouts).where(eq(affiliatePayouts.id, id));
    return payout || undefined;
  }

  async getAffiliatePayoutsByBatchId(batchId: string): Promise<AffiliatePayout[]> {
    return db.select().from(affiliatePayouts).where(eq(affiliatePayouts.payoutBatchId, batchId)).orderBy(desc(affiliatePayouts.requestedAt));
  }

  async createAffiliatePayout(payout: InsertAffiliatePayout): Promise<AffiliatePayout> {
    const [newPayout] = await db.insert(affiliatePayouts).values(payout).returning();
    return newPayout;
  }

  async updateAffiliatePayout(id: string, payout: Partial<InsertAffiliatePayout>): Promise<AffiliatePayout | undefined> {
    const [updated] = await db.update(affiliatePayouts).set(payout).where(eq(affiliatePayouts.id, id)).returning();
    return updated || undefined;
  }

  // Affiliate Payout Accounts (Stripe Connect)
  async getAffiliatePayoutAccountByAffiliateId(affiliateId: string): Promise<AffiliatePayoutAccount | undefined> {
    const [account] = await db.select().from(affiliatePayoutAccounts).where(eq(affiliatePayoutAccounts.affiliateId, affiliateId));
    return account || undefined;
  }

  async getAffiliatePayoutAccountByStripeAccountId(stripeAccountId: string): Promise<AffiliatePayoutAccount | undefined> {
    const [account] = await db.select().from(affiliatePayoutAccounts).where(eq(affiliatePayoutAccounts.stripeAccountId, stripeAccountId));
    return account || undefined;
  }

  async createAffiliatePayoutAccount(account: InsertAffiliatePayoutAccount): Promise<AffiliatePayoutAccount> {
    const [newAccount] = await db.insert(affiliatePayoutAccounts).values(account).returning();
    return newAccount;
  }

  async updateAffiliatePayoutAccount(id: string, account: Partial<InsertAffiliatePayoutAccount>): Promise<AffiliatePayoutAccount | undefined> {
    const [updated] = await db.update(affiliatePayoutAccounts)
      .set({ ...account, updatedAt: new Date() })
      .where(eq(affiliatePayoutAccounts.id, id))
      .returning();
    return updated || undefined;
  }

  // Affiliate Clicks
  async getAffiliateClicks(affiliateId: string): Promise<AffiliateClick[]> {
    return db.select().from(affiliateClicks)
      .where(eq(affiliateClicks.affiliateId, affiliateId))
      .orderBy(desc(affiliateClicks.createdAt));
  }

  async getAffiliateClick(id: string): Promise<AffiliateClick | undefined> {
    const [click] = await db.select().from(affiliateClicks).where(eq(affiliateClicks.id, id));
    return click || undefined;
  }

  async getAffiliateClickBySessionId(sessionId: string): Promise<AffiliateClick | undefined> {
    const [click] = await db.select().from(affiliateClicks).where(eq(affiliateClicks.sessionId, sessionId));
    return click || undefined;
  }

  async createAffiliateClick(click: InsertAffiliateClick): Promise<AffiliateClick> {
    const [newClick] = await db.insert(affiliateClicks).values(click).returning();
    return newClick;
  }

  async countAffiliateClicks(affiliateId: string): Promise<number> {
    const result = await db.select({ count: count() }).from(affiliateClicks)
      .where(eq(affiliateClicks.affiliateId, affiliateId));
    return result[0]?.count ?? 0;
  }

  // Affiliate Invites
  async getAffiliateInvites(): Promise<AffiliateInvite[]> {
    return db.select().from(affiliateInvites).orderBy(desc(affiliateInvites.createdAt));
  }

  async getAffiliateInvite(id: string): Promise<AffiliateInvite | undefined> {
    const [invite] = await db.select().from(affiliateInvites).where(eq(affiliateInvites.id, id));
    return invite || undefined;
  }

  async getAffiliateInviteByCode(code: string): Promise<AffiliateInvite | undefined> {
    const [invite] = await db.select().from(affiliateInvites).where(eq(affiliateInvites.inviteCode, code));
    return invite || undefined;
  }

  async createAffiliateInvite(invite: InsertAffiliateInvite): Promise<AffiliateInvite> {
    const [newInvite] = await db.insert(affiliateInvites).values(invite).returning();
    return newInvite;
  }

  async updateAffiliateInvite(id: string, invite: Partial<InsertAffiliateInvite>): Promise<AffiliateInvite | undefined> {
    const [updated] = await db.update(affiliateInvites).set(invite).where(eq(affiliateInvites.id, id)).returning();
    return updated || undefined;
  }

  async deleteAffiliateInvite(id: string): Promise<void> {
    await db.delete(affiliateInvites).where(eq(affiliateInvites.id, id));
  }

  async incrementAffiliateInviteUsage(id: string): Promise<void> {
    await db.update(affiliateInvites).set({
      timesUsed: sql`${affiliateInvites.timesUsed} + 1`,
    }).where(eq(affiliateInvites.id, id));
  }

  async redeemAffiliateInvite(inviteId: string, affiliateId: string, metadata?: string): Promise<{ success: boolean; invite?: AffiliateInvite; error?: string }> {
    return await db.transaction(async (tx) => {
      const result = await tx.update(affiliateInvites)
        .set({
          timesUsed: sql`${affiliateInvites.timesUsed} + 1`,
          usedByAffiliateId: affiliateId,
          usedAt: new Date(),
        })
        .where(
          and(
            eq(affiliateInvites.id, inviteId),
            or(
              sql`${affiliateInvites.maxUses} IS NULL`,
              sql`${affiliateInvites.timesUsed} < ${affiliateInvites.maxUses}`
            ),
            or(
              sql`${affiliateInvites.expiresAt} IS NULL`,
              sql`${affiliateInvites.expiresAt} > NOW()`
            )
          )
        )
        .returning();

      if (result.length === 0) {
        return { success: false, error: "Invite is no longer available (expired or usage limit reached)" };
      }

      await tx.insert(affiliateInviteUsages).values({
        inviteId,
        affiliateId,
        metadata: metadata || null,
      });

      return { success: true, invite: result[0] };
    });
  }

  async createAffiliateInviteUsage(usage: InsertAffiliateInviteUsage): Promise<AffiliateInviteUsage> {
    const [record] = await db.insert(affiliateInviteUsages).values(usage).returning();
    return record;
  }

  async createPhoneVerificationCode(data: InsertPhoneVerificationCode): Promise<PhoneVerificationCode> {
    const [code] = await db.insert(phoneVerificationCodes).values(data).returning();
    return code;
  }

  async getPhoneVerificationCode(inviteCode: string, phone: string): Promise<PhoneVerificationCode | undefined> {
    const [code] = await db
      .select()
      .from(phoneVerificationCodes)
      .where(and(
        eq(phoneVerificationCodes.inviteCode, inviteCode),
        eq(phoneVerificationCodes.phone, phone),
        eq(phoneVerificationCodes.verified, false),
      ))
      .orderBy(desc(phoneVerificationCodes.createdAt))
      .limit(1);
    return code || undefined;
  }

  async markPhoneVerificationCodeVerified(id: string): Promise<void> {
    await db.update(phoneVerificationCodes).set({ verified: true }).where(eq(phoneVerificationCodes.id, id));
  }

  async incrementPhoneVerificationAttempts(id: string): Promise<void> {
    await db.update(phoneVerificationCodes).set({
      attempts: sql`${phoneVerificationCodes.attempts} + 1`,
    }).where(eq(phoneVerificationCodes.id, id));
  }

  async invalidatePhoneVerificationCodes(inviteCode: string, phone: string): Promise<void> {
    await db.update(phoneVerificationCodes).set({ verified: true }).where(
      and(
        eq(phoneVerificationCodes.inviteCode, inviteCode),
        eq(phoneVerificationCodes.phone, phone),
        eq(phoneVerificationCodes.verified, false),
      )
    );
  }

  async countRecentPhoneVerificationCodes(inviteCode: string, minutesAgo: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setMinutes(cutoff.getMinutes() - minutesAgo);
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(phoneVerificationCodes)
      .where(and(
        eq(phoneVerificationCodes.inviteCode, inviteCode),
        sql`${phoneVerificationCodes.createdAt} > ${cutoff}`,
      ));
    return Number(result[0]?.count || 0);
  }

  // Affiliate Invite Verifications (new per-attempt model)
  async createAffiliateInviteVerification(data: InsertAffiliateInviteVerification): Promise<AffiliateInviteVerification> {
    const [record] = await db.insert(affiliateInviteVerifications).values(data).returning();
    return record;
  }

  async getVerifiedVerificationForInvite(inviteId: string, phone: string): Promise<AffiliateInviteVerification | undefined> {
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
    const [record] = await db
      .select()
      .from(affiliateInviteVerifications)
      .where(and(
        eq(affiliateInviteVerifications.inviteId, inviteId),
        eq(affiliateInviteVerifications.phone, phone),
        eq(affiliateInviteVerifications.status, "verified"),
        sql`${affiliateInviteVerifications.updatedAt} > ${thirtyMinutesAgo}`,
      ))
      .orderBy(desc(affiliateInviteVerifications.updatedAt))
      .limit(1);
    return record || undefined;
  }

  async getVerificationByToken(token: string): Promise<AffiliateInviteVerification | undefined> {
    const [record] = await db
      .select()
      .from(affiliateInviteVerifications)
      .where(and(
        eq(affiliateInviteVerifications.verificationToken, token),
        eq(affiliateInviteVerifications.status, "verified"),
      ))
      .limit(1);
    return record || undefined;
  }

  async getPendingVerificationForInvite(inviteId: string, phone: string, sessionNonce: string): Promise<AffiliateInviteVerification | undefined> {
    const [record] = await db
      .select()
      .from(affiliateInviteVerifications)
      .where(and(
        eq(affiliateInviteVerifications.inviteId, inviteId),
        eq(affiliateInviteVerifications.phone, phone),
        eq(affiliateInviteVerifications.sessionNonce, sessionNonce),
        eq(affiliateInviteVerifications.status, "pending"),
      ))
      .orderBy(desc(affiliateInviteVerifications.createdAt))
      .limit(1);
    return record || undefined;
  }

  async updateAffiliateInviteVerification(id: string, data: Partial<AffiliateInviteVerification>): Promise<AffiliateInviteVerification | undefined> {
    const [updated] = await db
      .update(affiliateInviteVerifications)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(affiliateInviteVerifications.id, id))
      .returning();
    return updated || undefined;
  }

  async invalidatePendingVerifications(inviteId: string, phone: string): Promise<void> {
    await db
      .update(affiliateInviteVerifications)
      .set({ status: "expired", updatedAt: new Date() })
      .where(and(
        eq(affiliateInviteVerifications.inviteId, inviteId),
        eq(affiliateInviteVerifications.phone, phone),
        eq(affiliateInviteVerifications.status, "pending"),
      ));
  }

  async countDailyVerificationsForPhone(phone: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(affiliateInviteVerifications)
      .where(and(
        eq(affiliateInviteVerifications.phone, phone),
        sql`${affiliateInviteVerifications.createdAt} > ${startOfDay}`,
      ));
    return Number(result[0]?.count || 0);
  }

  async countRecentVerificationsForInvite(inviteId: string, minutesAgo: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setMinutes(cutoff.getMinutes() - minutesAgo);
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(affiliateInviteVerifications)
      .where(and(
        eq(affiliateInviteVerifications.inviteId, inviteId),
        sql`${affiliateInviteVerifications.createdAt} > ${cutoff}`,
      ));
    return Number(result[0]?.count || 0);
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return db.select().from(categories).orderBy(categories.sortOrder);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.slug, slug));
    return category || undefined;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updated] = await db.update(categories).set(category).where(eq(categories.id, id)).returning();
    return updated || undefined;
  }

  async deleteCategory(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Coupons
  async getCoupons(): Promise<Coupon[]> {
    return db.select().from(coupons).orderBy(desc(coupons.createdAt));
  }

  async getCoupon(id: string): Promise<Coupon | undefined> {
    const [coupon] = await db.select().from(coupons).where(eq(coupons.id, id));
    return coupon || undefined;
  }

  async getCouponByCode(code: string): Promise<Coupon | undefined> {
    const [coupon] = await db.select().from(coupons).where(eq(coupons.code, code.toUpperCase()));
    return coupon || undefined;
  }

  async createCoupon(coupon: InsertCoupon): Promise<Coupon> {
    const [newCoupon] = await db.insert(coupons).values({ ...coupon, code: coupon.code.toUpperCase() }).returning();
    return newCoupon;
  }

  async updateCoupon(id: string, coupon: Partial<InsertCoupon>): Promise<Coupon | undefined> {
    const updateData = coupon.code ? { ...coupon, code: coupon.code.toUpperCase() } : coupon;
    const [updated] = await db.update(coupons).set(updateData).where(eq(coupons.id, id)).returning();
    return updated || undefined;
  }

  async deleteCoupon(id: string): Promise<void> {
    await db.delete(coupons).where(eq(coupons.id, id));
  }

  async incrementCouponUsage(id: string): Promise<void> {
    await db.update(coupons).set({ timesUsed: sql`${coupons.timesUsed} + 1` }).where(eq(coupons.id, id));
  }

  // Coupon Redemptions
  async getCouponRedemptions(couponId: string): Promise<CouponRedemption[]> {
    return db.select().from(couponRedemptions).where(eq(couponRedemptions.couponId, couponId)).orderBy(desc(couponRedemptions.redeemedAt));
  }

  async getCustomerCouponRedemptions(customerId: string, couponId: string): Promise<CouponRedemption[]> {
    return db.select().from(couponRedemptions).where(and(eq(couponRedemptions.customerId, customerId), eq(couponRedemptions.couponId, couponId)));
  }

  async createCouponRedemption(redemption: InsertCouponRedemption): Promise<CouponRedemption> {
    const [newRedemption] = await db.insert(couponRedemptions).values(redemption).returning();
    return newRedemption;
  }

  // Refunds
  async getRefunds(): Promise<Refund[]> {
    return db.select().from(refunds).orderBy(desc(refunds.createdAt));
  }

  async getRefund(id: string): Promise<Refund | undefined> {
    const [refund] = await db.select().from(refunds).where(eq(refunds.id, id));
    return refund || undefined;
  }

  async getRefundsByOrderId(orderId: string): Promise<Refund[]> {
    return db.select().from(refunds).where(eq(refunds.orderId, orderId));
  }

  async getRefundByStripeRefundId(stripeRefundId: string): Promise<Refund | undefined> {
    const [refund] = await db.select().from(refunds).where(eq(refunds.stripeRefundId, stripeRefundId));
    return refund || undefined;
  }

  async createRefund(refund: InsertRefund): Promise<Refund> {
    const [newRefund] = await db.insert(refunds).values(refund).returning();
    return newRefund;
  }

  async updateRefund(id: string, refund: Partial<InsertRefund>): Promise<Refund | undefined> {
    const [updated] = await db.update(refunds).set(refund).where(eq(refunds.id, id)).returning();
    return updated || undefined;
  }

  // Order lookups
  async getOrderByPaymentIntentId(paymentIntentId: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.stripePaymentIntentId, paymentIntentId));
    return order || undefined;
  }

  // Shipping Zones
  async getShippingZones(): Promise<ShippingZone[]> {
    return db.select().from(shippingZones);
  }

  async getShippingZone(id: string): Promise<ShippingZone | undefined> {
    const [zone] = await db.select().from(shippingZones).where(eq(shippingZones.id, id));
    return zone || undefined;
  }

  async createShippingZone(zone: InsertShippingZone): Promise<ShippingZone> {
    const [newZone] = await db.insert(shippingZones).values(zone).returning();
    return newZone;
  }

  async updateShippingZone(id: string, zone: Partial<InsertShippingZone>): Promise<ShippingZone | undefined> {
    const [updated] = await db.update(shippingZones).set(zone).where(eq(shippingZones.id, id)).returning();
    return updated || undefined;
  }

  async deleteShippingZone(id: string): Promise<void> {
    await db.delete(shippingZones).where(eq(shippingZones.id, id));
  }

  // Shipping Rates
  async getShippingRates(zoneId?: string): Promise<ShippingRate[]> {
    if (zoneId) {
      return db.select().from(shippingRates).where(eq(shippingRates.zoneId, zoneId));
    }
    return db.select().from(shippingRates);
  }

  async getShippingRate(id: string): Promise<ShippingRate | undefined> {
    const [rate] = await db.select().from(shippingRates).where(eq(shippingRates.id, id));
    return rate || undefined;
  }

  async createShippingRate(rate: InsertShippingRate): Promise<ShippingRate> {
    const [newRate] = await db.insert(shippingRates).values(rate).returning();
    return newRate;
  }

  async updateShippingRate(id: string, rate: Partial<InsertShippingRate>): Promise<ShippingRate | undefined> {
    const [updated] = await db.update(shippingRates).set(rate).where(eq(shippingRates.id, id)).returning();
    return updated || undefined;
  }

  async deleteShippingRate(id: string): Promise<void> {
    await db.delete(shippingRates).where(eq(shippingRates.id, id));
  }

  // Shipments
  async getShipments(orderId?: string): Promise<Shipment[]> {
    if (orderId) {
      return db.select().from(shipments).where(eq(shipments.orderId, orderId)).orderBy(desc(shipments.createdAt));
    }
    return db.select().from(shipments).orderBy(desc(shipments.createdAt));
  }

  async getShipmentsByOrderIds(orderIds: string[]): Promise<Shipment[]> {
    if (orderIds.length === 0) return [];
    return db.select().from(shipments).where(inArray(shipments.orderId, orderIds)).orderBy(desc(shipments.createdAt));
  }

  async getShipment(id: string): Promise<Shipment | undefined> {
    const [shipment] = await db.select().from(shipments).where(eq(shipments.id, id));
    return shipment || undefined;
  }

  async createShipment(shipment: InsertShipment): Promise<Shipment> {
    const [newShipment] = await db.insert(shipments).values(shipment).returning();
    return newShipment;
  }

  async updateShipment(id: string, shipment: Partial<InsertShipment>): Promise<Shipment | undefined> {
    const [updated] = await db.update(shipments).set(shipment).where(eq(shipments.id, id)).returning();
    return updated || undefined;
  }

  // Pages
  async getPages(): Promise<Page[]> {
    return db.select().from(pages).orderBy(pages.navOrder);
  }

  async getPublishedPages(): Promise<Page[]> {
    return db.select().from(pages).where(eq(pages.status, "published")).orderBy(pages.navOrder);
  }

  async getPage(id: string): Promise<Page | undefined> {
    const [page] = await db.select().from(pages).where(eq(pages.id, id));
    return page || undefined;
  }

  async getPageBySlug(slug: string): Promise<Page | undefined> {
    const [page] = await db.select().from(pages).where(eq(pages.slug, slug));
    return page || undefined;
  }

  async getHomePage(): Promise<Page | undefined> {
    const [page] = await db.select().from(pages).where(eq(pages.isHome, true));
    return page || undefined;
  }

  async getShopPage(): Promise<Page | undefined> {
    const [page] = await db.select().from(pages).where(eq(pages.isShop, true));
    return page || undefined;
  }

  async getPagesByType(pageType: string): Promise<Page[]> {
    return db.select().from(pages).where(eq(pages.pageType, pageType)).orderBy(pages.navOrder);
  }

  async createPage(page: InsertPage): Promise<Page> {
    return await db.transaction(async (tx) => {
      // Enforce uniqueness: only one page can be isHome=true
      if (page.isHome) {
        await tx.update(pages).set({ isHome: false }).where(eq(pages.isHome, true));
      }
      // Enforce uniqueness: only one page can be isShop=true
      if (page.isShop) {
        await tx.update(pages).set({ isShop: false }).where(eq(pages.isShop, true));
      }
      const [newPage] = await tx.insert(pages).values(page).returning();
      return newPage;
    });
  }

  async updatePage(id: string, page: Partial<InsertPage>): Promise<Page | undefined> {
    return await db.transaction(async (tx) => {
      // Enforce uniqueness: only one page can be isHome=true
      if (page.isHome === true) {
        await tx.update(pages).set({ isHome: false }).where(and(eq(pages.isHome, true), ne(pages.id, id)));
      }
      // Enforce uniqueness: only one page can be isShop=true
      if (page.isShop === true) {
        await tx.update(pages).set({ isShop: false }).where(and(eq(pages.isShop, true), ne(pages.id, id)));
      }
      const [updated] = await tx.update(pages).set({ ...page, updatedAt: new Date() }).where(eq(pages.id, id)).returning();
      return updated || undefined;
    });
  }

  async deletePage(id: string): Promise<void> {
    await db.delete(pages).where(eq(pages.id, id));
  }

  async setHomePage(id: string): Promise<Page | undefined> {
    return await db.transaction(async (tx) => {
      // Clear any existing home page
      await tx.update(pages).set({ isHome: false }).where(eq(pages.isHome, true));
      // Set the new home page
      const [updated] = await tx.update(pages).set({ isHome: true, updatedAt: new Date() }).where(eq(pages.id, id)).returning();
      return updated || undefined;
    });
  }

  async setShopPage(id: string): Promise<Page | undefined> {
    return await db.transaction(async (tx) => {
      // Clear any existing shop page
      await tx.update(pages).set({ isShop: false }).where(eq(pages.isShop, true));
      // Set the new shop page
      const [updated] = await tx.update(pages).set({ isShop: true, updatedAt: new Date() }).where(eq(pages.id, id)).returning();
      return updated || undefined;
    });
  }

  // Saved Sections (Reusable Block Groups)
  async getSavedSections(): Promise<SavedSection[]> {
    return db.select().from(savedSections).orderBy(desc(savedSections.createdAt));
  }

  async getSavedSection(id: string): Promise<SavedSection | undefined> {
    const [section] = await db.select().from(savedSections).where(eq(savedSections.id, id));
    return section || undefined;
  }

  async getSavedSectionsByCategory(category: string): Promise<SavedSection[]> {
    return db.select().from(savedSections).where(eq(savedSections.category, category)).orderBy(desc(savedSections.createdAt));
  }

  async createSavedSection(section: InsertSavedSection): Promise<SavedSection> {
    const [created] = await db.insert(savedSections).values(section).returning();
    return created;
  }

  async updateSavedSection(id: string, section: Partial<InsertSavedSection>): Promise<SavedSection | undefined> {
    const [updated] = await db.update(savedSections).set({ ...section, updatedAt: new Date() }).where(eq(savedSections.id, id)).returning();
    return updated || undefined;
  }

  async deleteSavedSection(id: string): Promise<void> {
    await db.delete(savedSections).where(eq(savedSections.id, id));
  }

  // Media Library
  async getMediaItems(filters?: { folder?: string; mimeType?: string; search?: string; tags?: string[] }): Promise<MediaLibrary[]> {
    let query = db.select().from(mediaLibrary);
    const conditions: any[] = [];

    if (filters?.folder) {
      conditions.push(eq(mediaLibrary.folder, filters.folder));
    }
    if (filters?.mimeType) {
      conditions.push(like(mediaLibrary.mimeType, `${filters.mimeType}%`));
    }
    if (filters?.search) {
      const searchTerm = `%${filters.search.toLowerCase()}%`;
      conditions.push(
        or(
          like(sql`LOWER(${mediaLibrary.filename})`, searchTerm),
          like(sql`LOWER(${mediaLibrary.title})`, searchTerm),
          like(sql`LOWER(${mediaLibrary.altText})`, searchTerm),
          like(sql`LOWER(${mediaLibrary.description})`, searchTerm)
        )
      );
    }

    if (conditions.length > 0) {
      return db.select().from(mediaLibrary).where(and(...conditions)).orderBy(desc(mediaLibrary.createdAt));
    }
    return db.select().from(mediaLibrary).orderBy(desc(mediaLibrary.createdAt));
  }

  async getMediaItem(id: string): Promise<MediaLibrary | undefined> {
    const [item] = await db.select().from(mediaLibrary).where(eq(mediaLibrary.id, id));
    return item || undefined;
  }

  async getMediaItemByPath(storagePath: string): Promise<MediaLibrary | undefined> {
    const [item] = await db.select().from(mediaLibrary).where(eq(mediaLibrary.storagePath, storagePath));
    return item || undefined;
  }

  async createMediaItem(item: InsertMediaLibrary): Promise<MediaLibrary> {
    const [created] = await db.insert(mediaLibrary).values(item).returning();
    return created;
  }

  async updateMediaItem(id: string, item: Partial<InsertMediaLibrary>): Promise<MediaLibrary | undefined> {
    const [updated] = await db.update(mediaLibrary).set({ ...item, updatedAt: new Date() }).where(eq(mediaLibrary.id, id)).returning();
    return updated || undefined;
  }

  async deleteMediaItem(id: string): Promise<void> {
    await db.delete(mediaLibrary).where(eq(mediaLibrary.id, id));
  }

  async incrementMediaUsage(id: string, usedIn: { type: string; id: string; field: string }): Promise<MediaLibrary | undefined> {
    const item = await this.getMediaItem(id);
    if (!item) return undefined;

    const currentUsedIn = (item.usedIn as any[]) || [];
    const alreadyExists = currentUsedIn.some(
      u => u.type === usedIn.type && u.id === usedIn.id && u.field === usedIn.field
    );

    if (!alreadyExists) {
      const newUsedIn = [...currentUsedIn, usedIn];
      return this.updateMediaItem(id, {
        usageCount: item.usageCount + 1,
        usedIn: newUsedIn as any,
      });
    }
    return item;
  }

  async decrementMediaUsage(id: string, usedIn: { type: string; id: string; field: string }): Promise<MediaLibrary | undefined> {
    const item = await this.getMediaItem(id);
    if (!item) return undefined;

    const currentUsedIn = (item.usedIn as any[]) || [];
    const newUsedIn = currentUsedIn.filter(
      u => !(u.type === usedIn.type && u.id === usedIn.id && u.field === usedIn.field)
    );

    return this.updateMediaItem(id, {
      usageCount: Math.max(0, item.usageCount - 1),
      usedIn: newUsedIn as any,
    });
  }

  // Email Templates
  async getEmailTemplates(): Promise<EmailTemplate[]> {
    return db.select().from(emailTemplates);
  }

  async getEmailTemplate(id: string): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
    return template || undefined;
  }

  async getEmailTemplateByKey(key: string): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.key, key));
    return template || undefined;
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const [newTemplate] = await db.insert(emailTemplates).values(template).returning();
    return newTemplate;
  }

  async updateEmailTemplate(id: string, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined> {
    const [updated] = await db.update(emailTemplates).set({ ...template, updatedAt: new Date() }).where(eq(emailTemplates.id, id)).returning();
    return updated || undefined;
  }

  // Email Events
  async getEmailEvents(orderId?: string, limit: number = 100): Promise<EmailEvent[]> {
    if (orderId) {
      return db.select().from(emailEvents).where(eq(emailEvents.orderId, orderId)).orderBy(desc(emailEvents.createdAt)).limit(limit);
    }
    return db.select().from(emailEvents).orderBy(desc(emailEvents.createdAt)).limit(limit);
  }

  async createEmailEvent(event: InsertEmailEvent): Promise<EmailEvent> {
    const [newEvent] = await db.insert(emailEvents).values(event).returning();
    return newEvent;
  }

  async updateEmailEvent(id: string, event: Partial<InsertEmailEvent>): Promise<EmailEvent | undefined> {
    const [updated] = await db.update(emailEvents).set({ ...event, updatedAt: new Date() }).where(eq(emailEvents.id, id)).returning();
    return updated || undefined;
  }

  // Audit Logs
  async getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  // Processed Webhook Events (for idempotency)
  async getProcessedWebhookEvent(eventId: string): Promise<ProcessedWebhookEvent | undefined> {
    const [event] = await db.select().from(processedWebhookEvents).where(eq(processedWebhookEvents.eventId, eventId));
    return event || undefined;
  }

  async createProcessedWebhookEvent(event: InsertProcessedWebhookEvent): Promise<ProcessedWebhookEvent> {
    const [newEvent] = await db.insert(processedWebhookEvents).values(event).returning();
    return newEvent;
  }

  // Meta CAPI outbox
  async createMetaCapiEvent(event: InsertMetaCapiEvent): Promise<MetaCapiEvent> {
    const [created] = await db.insert(metaCapiEvents).values(event).returning();
    return created;
  }

  async getMetaCapiEventByEventKey(eventKey: string): Promise<MetaCapiEvent | undefined> {
    const [event] = await db.select().from(metaCapiEvents).where(eq(metaCapiEvents.eventKey, eventKey));
    return event || undefined;
  }

  async claimDueMetaCapiEvents(limit: number, lockToken: string): Promise<MetaCapiEvent[]> {
    const candidates = await db
      .select()
      .from(metaCapiEvents)
      .where(
        and(
          inArray(metaCapiEvents.status, ["queued", "retry"]),
          lte(metaCapiEvents.nextAttemptAt, new Date()),
        ),
      )
      .orderBy(metaCapiEvents.createdAt)
      .limit(limit);

    const claimed: MetaCapiEvent[] = [];
    for (const candidate of candidates) {
      const [updated] = await db
        .update(metaCapiEvents)
        .set({
          status: "processing",
          lockedAt: new Date(),
          lockToken,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(metaCapiEvents.id, candidate.id),
            inArray(metaCapiEvents.status, ["queued", "retry"]),
          ),
        )
        .returning();
      if (updated) claimed.push(updated);
    }
    return claimed;
  }

  async updateMetaCapiEvent(id: string, data: Partial<InsertMetaCapiEvent>): Promise<MetaCapiEvent | undefined> {
    const [updated] = await db
      .update(metaCapiEvents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(metaCapiEvents.id, id))
      .returning();
    return updated || undefined;
  }

  async getMetaCapiQueueStats(): Promise<{
    queued: number;
    retry: number;
    processing: number;
    failed: number;
    sent: number;
    oldestQueuedAt: Date | null;
    lastSentAt: Date | null;
  }> {
    const result = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'queued')::int AS queued,
        COUNT(*) FILTER (WHERE status = 'retry')::int AS retry,
        COUNT(*) FILTER (WHERE status = 'processing')::int AS processing,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
        COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
        MIN(created_at) FILTER (WHERE status IN ('queued','retry')) AS oldest_queued_at,
        MAX(sent_at) AS last_sent_at
      FROM meta_capi_events
    `);

    const row = (result.rows?.[0] || {}) as any;
    return {
      queued: Number(row.queued || 0),
      retry: Number(row.retry || 0),
      processing: Number(row.processing || 0),
      failed: Number(row.failed || 0),
      sent: Number(row.sent || 0),
      oldestQueuedAt: row.oldest_queued_at ? new Date(row.oldest_queued_at) : null,
      lastSentAt: row.last_sent_at ? new Date(row.last_sent_at) : null,
    };
  }

  // Customer Notes
  async getCustomerNotes(customerId: string): Promise<CustomerNote[]> {
    return db.select().from(customerNotes).where(eq(customerNotes.customerId, customerId)).orderBy(desc(customerNotes.createdAt));
  }

  async createCustomerNote(note: InsertCustomerNote): Promise<CustomerNote> {
    const [newNote] = await db.insert(customerNotes).values(note).returning();
    return newNote;
  }

  async deleteCustomerNote(id: string): Promise<void> {
    await db.delete(customerNotes).where(eq(customerNotes.id, id));
  }

  // Customer Tags
  async getCustomerTags(customerId: string): Promise<CustomerTag[]> {
    return db.select().from(customerTags).where(eq(customerTags.customerId, customerId)).orderBy(desc(customerTags.createdAt));
  }

  async createCustomerTag(tag: InsertCustomerTag): Promise<CustomerTag> {
    const [newTag] = await db.insert(customerTags).values(tag).returning();
    return newTag;
  }

  async deleteCustomerTag(id: string): Promise<void> {
    await db.delete(customerTags).where(eq(customerTags.id, id));
  }

  async setCustomerTags(customerId: string, tags: string[], adminId?: string): Promise<CustomerTag[]> {
    await db.delete(customerTags).where(eq(customerTags.customerId, customerId));
    if (tags.length === 0) return [];
    const newTags = await db.insert(customerTags).values(
      tags.map(tag => ({ customerId, tag, createdByAdminId: adminId }))
    ).returning();
    return newTags;
  }

  // Admin Audit Logs
  async createAdminAuditLog(log: InsertAdminAuditLog): Promise<AdminAuditLog> {
    const [newLog] = await db.insert(adminAuditLogs).values(log).returning();
    return newLog;
  }

  async getAuditLogsForTarget(targetType: string, targetId: string): Promise<AdminAuditLog[]> {
    return db.select().from(adminAuditLogs)
      .where(and(eq(adminAuditLogs.targetType, targetType), eq(adminAuditLogs.targetId, targetId)))
      .orderBy(desc(adminAuditLogs.createdAt));
  }

  // Customer Profile (aggregated data)
  async getCustomerProfile(customerId: string): Promise<{
    customer: Customer;
    orderCount: number;
    totalSpent: number;
    lastOrderDate: Date | null;
    avgOrderValue: number;
    isAffiliate: boolean;
    affiliateEarnings: number;
    refundCount: number;
    tags: string[];
  } | null> {
    const customer = await this.getCustomer(customerId);
    if (!customer) return null;

    const customerOrders = await db.select().from(orders).where(eq(orders.customerId, customerId));
    const paidOrders = customerOrders.filter(o => o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered');
    const orderCount = paidOrders.length;
    const totalSpent = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const lastOrderDate = customerOrders.length > 0 
      ? customerOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt 
      : null;
    const avgOrderValue = orderCount > 0 ? Math.round(totalSpent / orderCount) : 0;

    const affiliate = await this.getAffiliateByCustomerId(customerId);
    const isAffiliate = !!affiliate;
    const affiliateEarnings = affiliate?.totalEarnings || 0;

    const customerRefunds = await db.select().from(refunds)
      .where(sql`${refunds.orderId} IN (SELECT id FROM orders WHERE customer_id = ${customerId})`);
    const refundCount = customerRefunds.filter(r => r.status === 'processed').length;

    const tagsList = await this.getCustomerTags(customerId);
    const tags = tagsList.map(t => t.tag);

    return {
      customer,
      orderCount,
      totalSpent,
      lastOrderDate,
      avgOrderValue,
      isAffiliate,
      affiliateEarnings,
      refundCount,
      tags,
    };
  }

  // Theme Settings
  async getThemeSettings(): Promise<ThemeSettings | undefined> {
    const [settings] = await db.select().from(themeSettings).where(eq(themeSettings.id, "main"));
    return settings || undefined;
  }

  async updateThemeSettings(settings: Partial<InsertThemeSettings>): Promise<ThemeSettings> {
    const existing = await this.getThemeSettings();
    if (existing) {
      const [updated] = await db.update(themeSettings).set({ ...settings, updatedAt: new Date() }).where(eq(themeSettings.id, "main")).returning();
      return updated;
    } else {
      const [created] = await db.insert(themeSettings).values({ id: "main", ...settings }).returning();
      return created;
    }
  }

  // Daily Metrics
  async getDailyMetrics(startDate: Date, endDate: Date): Promise<DailyMetrics[]> {
    return db.select().from(dailyMetrics).where(and(gte(dailyMetrics.date, startDate), lte(dailyMetrics.date, endDate))).orderBy(dailyMetrics.date);
  }

  async createDailyMetrics(metrics: InsertDailyMetrics): Promise<DailyMetrics> {
    const [newMetrics] = await db.insert(dailyMetrics).values(metrics).returning();
    return newMetrics;
  }

  async updateDailyMetrics(id: string, metrics: Partial<InsertDailyMetrics>): Promise<DailyMetrics | undefined> {
    const [updated] = await db.update(dailyMetrics).set(metrics).where(eq(dailyMetrics.id, id)).returning();
    return updated || undefined;
  }

  // Inventory
  async getInventory(productId: string): Promise<Inventory | undefined> {
    const [inv] = await db.select().from(inventory).where(eq(inventory.productId, productId));
    return inv || undefined;
  }

  async getAllInventory(): Promise<Inventory[]> {
    return db.select().from(inventory);
  }

  async createInventory(inv: InsertInventory): Promise<Inventory> {
    const [newInv] = await db.insert(inventory).values(inv).returning();
    return newInv;
  }

  async updateInventory(productId: string, inv: Partial<InsertInventory>): Promise<Inventory | undefined> {
    const [updated] = await db.update(inventory).set({ ...inv, updatedAt: new Date() }).where(eq(inventory.productId, productId)).returning();
    return updated || undefined;
  }

  // Inventory Ledger
  async getInventoryLedger(productId: string): Promise<InventoryLedger[]> {
    return db.select().from(inventoryLedger).where(eq(inventoryLedger.productId, productId)).orderBy(desc(inventoryLedger.createdAt));
  }

  async createInventoryLedger(entry: InsertInventoryLedger): Promise<InventoryLedger> {
    const [newEntry] = await db.insert(inventoryLedger).values(entry).returning();
    return newEntry;
  }

  // Dashboard Stats
  async getDashboardStats(): Promise<{
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    averageOrderValue: number;
    recentOrders: Order[];
    topProducts: { productId: string; productName: string; totalSold: number; revenue: number }[];
  }> {
    // Include all revenue-generating order statuses (exclude cancelled and refunded)
    const revenueStatuses = ["pending", "paid", "processing", "shipped", "delivered"];
    const allOrders = await db.select().from(orders).where(inArray(orders.status, revenueStatuses));
    const allCustomers = await db.select().from(customers);
    const recentOrders = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(10);
    
    const totalRevenue = allOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalOrders = allOrders.length;
    const totalCustomers = allCustomers.length;
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Get top products by calculating from order items
    const allOrderItems = await db.select().from(orderItems);
    const productStats = new Map<string, { productName: string; totalSold: number; revenue: number }>();
    
    for (const item of allOrderItems) {
      const existing = productStats.get(item.productId) || { productName: item.productName, totalSold: 0, revenue: 0 };
      existing.totalSold += item.quantity;
      existing.revenue += item.quantity * item.unitPrice;
      productStats.set(item.productId, existing);
    }

    const topProducts = Array.from(productStats.entries())
      .map(([productId, stats]) => ({ productId, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalRevenue,
      totalOrders,
      totalCustomers,
      averageOrderValue,
      recentOrders,
      topProducts,
    };
  }

  // Docs Library
  async getDocs(filters?: { category?: string; status?: string; search?: string }): Promise<Doc[]> {
    let query = db.select().from(docs);
    const conditions = [];
    
    if (filters?.category) {
      conditions.push(eq(docs.category, filters.category));
    }
    if (filters?.status) {
      conditions.push(eq(docs.status, filters.status));
    }
    
    if (conditions.length > 0) {
      return db.select().from(docs).where(and(...conditions)).orderBy(docs.sortOrder, docs.title);
    }
    
    return db.select().from(docs).orderBy(docs.sortOrder, docs.title);
  }

  async getDoc(id: string): Promise<Doc | undefined> {
    const [doc] = await db.select().from(docs).where(eq(docs.id, id));
    return doc || undefined;
  }

  async getDocBySlug(slug: string): Promise<Doc | undefined> {
    const [doc] = await db.select().from(docs).where(eq(docs.slug, slug));
    return doc || undefined;
  }

  async createDoc(doc: InsertDoc): Promise<Doc> {
    const [newDoc] = await db.insert(docs).values(doc).returning();
    return newDoc;
  }

  async updateDoc(id: string, docData: Partial<InsertDoc>): Promise<Doc | undefined> {
    const [updated] = await db.update(docs).set({
      ...docData,
      updatedAt: new Date(),
    }).where(eq(docs.id, id)).returning();
    return updated || undefined;
  }

  async deleteDoc(id: string): Promise<void> {
    await db.delete(docs).where(eq(docs.id, id));
  }

  async publishDoc(id: string, publish: boolean): Promise<Doc | undefined> {
    const [updated] = await db.update(docs).set({
      status: publish ? "published" : "draft",
      updatedAt: new Date(),
    }).where(eq(docs.id, id)).returning();
    return updated || undefined;
  }

  // Doc Versions
  async getDocVersions(docId: string): Promise<DocVersion[]> {
    return db.select().from(docVersions).where(eq(docVersions.docId, docId)).orderBy(desc(docVersions.createdAt));
  }

  async createDocVersion(version: InsertDocVersion): Promise<DocVersion> {
    const [newVersion] = await db.insert(docVersions).values(version).returning();
    return newVersion;
  }

  async restoreDocVersion(docId: string, versionId: string): Promise<Doc | undefined> {
    const [version] = await db.select().from(docVersions).where(eq(docVersions.id, versionId));
    if (!version) return undefined;
    
    const [updated] = await db.update(docs).set({
      content: version.content,
      title: version.title,
      updatedAt: new Date(),
    }).where(eq(docs.id, docId)).returning();
    return updated || undefined;
  }

  // Email Settings
  async getEmailSettings(): Promise<EmailSettings | undefined> {
    const [settings] = await db.select().from(emailSettings).where(eq(emailSettings.id, "main"));
    return settings || undefined;
  }

  async updateEmailSettings(settingsData: Partial<InsertEmailSettings>): Promise<EmailSettings> {
    const existing = await this.getEmailSettings();
    
    if (existing) {
      const [updated] = await db.update(emailSettings).set({
        ...settingsData,
        updatedAt: new Date(),
      }).where(eq(emailSettings.id, "main")).returning();
      return updated;
    }
    
    const [created] = await db.insert(emailSettings).values({
      id: "main",
      ...settingsData,
    }).returning();
    return created;
  }

  // Integration Settings
  async getIntegrationSettings(): Promise<IntegrationSettings | undefined> {
    const [settings] = await db.select().from(integrationSettings).where(eq(integrationSettings.id, "main"));
    return settings || undefined;
  }

  async updateIntegrationSettings(settingsData: Partial<InsertIntegrationSettings>): Promise<IntegrationSettings> {
    const existing = await this.getIntegrationSettings();
    
    if (existing) {
      const [updated] = await db.update(integrationSettings).set({
        ...settingsData,
        updatedAt: new Date(),
      }).where(eq(integrationSettings.id, "main")).returning();
      return updated;
    }
    
    const [created] = await db.insert(integrationSettings).values({
      id: "main",
      ...settingsData,
    }).returning();
    return created;
  }

  // ==================== PRODUCT RELATIONSHIPS ====================
  async getProductRelationships(productId: string, type?: string): Promise<ProductRelationship[]> {
    if (type) {
      return db.select().from(productRelationships)
        .where(and(eq(productRelationships.productId, productId), eq(productRelationships.relationshipType, type), eq(productRelationships.isActive, true)));
    }
    return db.select().from(productRelationships)
      .where(and(eq(productRelationships.productId, productId), eq(productRelationships.isActive, true)));
  }

  async createProductRelationship(data: InsertProductRelationship): Promise<ProductRelationship> {
    const [rel] = await db.insert(productRelationships).values(data).returning();
    return rel;
  }

  async deleteProductRelationship(id: string): Promise<void> {
    await db.delete(productRelationships).where(eq(productRelationships.id, id));
  }

  async updateProductRelationship(id: string, data: Partial<InsertProductRelationship>): Promise<ProductRelationship | undefined> {
    const [updated] = await db.update(productRelationships).set(data).where(eq(productRelationships.id, id)).returning();
    return updated;
  }

  // ==================== UPSELL RULES ====================
  async getUpsellRules(productId?: string): Promise<UpsellRule[]> {
    if (productId) {
      return db.select().from(upsellRules).where(eq(upsellRules.productId, productId));
    }
    return db.select().from(upsellRules);
  }

  async getActiveUpsellRules(productId: string, upsellType: string): Promise<UpsellRule[]> {
    return db.select().from(upsellRules)
      .where(and(eq(upsellRules.productId, productId), eq(upsellRules.upsellType, upsellType), eq(upsellRules.isActive, true)));
  }

  async createUpsellRule(data: InsertUpsellRule): Promise<UpsellRule> {
    const [rule] = await db.insert(upsellRules).values(data).returning();
    return rule;
  }

  async updateUpsellRule(id: string, data: Partial<InsertUpsellRule>): Promise<UpsellRule | undefined> {
    const [updated] = await db.update(upsellRules).set({ ...data, updatedAt: new Date() }).where(eq(upsellRules.id, id)).returning();
    return updated;
  }

  async deleteUpsellRule(id: string): Promise<void> {
    await db.delete(upsellRules).where(eq(upsellRules.id, id));
  }

  // ==================== UPSELL EVENTS ====================
  async createUpsellEvent(data: InsertUpsellEvent): Promise<UpsellEvent> {
    const [event] = await db.insert(upsellEvents).values(data).returning();
    return event;
  }

  async getUpsellEvents(startDate?: Date, endDate?: Date): Promise<UpsellEvent[]> {
    if (startDate && endDate) {
      return db.select().from(upsellEvents)
        .where(and(gte(upsellEvents.createdAt, startDate), lte(upsellEvents.createdAt, endDate)))
        .orderBy(desc(upsellEvents.createdAt));
    }
    return db.select().from(upsellEvents).orderBy(desc(upsellEvents.createdAt));
  }

  // ==================== POST-PURCHASE OFFERS ====================
  async getPostPurchaseOffers(orderId: string): Promise<PostPurchaseOffer[]> {
    return db.select().from(postPurchaseOffers).where(eq(postPurchaseOffers.orderId, orderId));
  }

  async getPendingPostPurchaseOffer(orderId: string): Promise<PostPurchaseOffer | undefined> {
    const [offer] = await db.select().from(postPurchaseOffers)
      .where(and(eq(postPurchaseOffers.orderId, orderId), eq(postPurchaseOffers.status, "pending")));
    return offer;
  }

  async createPostPurchaseOffer(data: InsertPostPurchaseOffer): Promise<PostPurchaseOffer> {
    const [offer] = await db.insert(postPurchaseOffers).values(data).returning();
    return offer;
  }

  async updatePostPurchaseOffer(id: string, data: Partial<InsertPostPurchaseOffer>): Promise<PostPurchaseOffer | undefined> {
    const [updated] = await db.update(postPurchaseOffers).set(data).where(eq(postPurchaseOffers.id, id)).returning();
    return updated;
  }

  // ==================== VIP SETTINGS ====================
  async getVipSettings(): Promise<VipSettings | undefined> {
    const [settings] = await db.select().from(vipSettings).limit(1);
    return settings;
  }

  async updateVipSettings(data: Partial<InsertVipSettings>): Promise<VipSettings> {
    const existing = await this.getVipSettings();
    if (existing) {
      const [updated] = await db.update(vipSettings).set({ ...data, updatedAt: new Date() }).where(eq(vipSettings.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(vipSettings).values(data as InsertVipSettings).returning();
    return created;
  }

  // ==================== VIP CUSTOMERS ====================
  async getVipCustomers(): Promise<VipCustomer[]> {
    return db.select().from(vipCustomers).where(eq(vipCustomers.status, "active")).orderBy(desc(vipCustomers.promotedAt));
  }

  async getVipCustomer(customerId: string): Promise<VipCustomer | undefined> {
    const [vip] = await db.select().from(vipCustomers).where(eq(vipCustomers.customerId, customerId));
    return vip;
  }

  async createVipCustomer(data: InsertVipCustomer): Promise<VipCustomer> {
    const [vip] = await db.insert(vipCustomers).values(data).returning();
    return vip;
  }

  async updateVipCustomer(customerId: string, data: Partial<InsertVipCustomer>): Promise<VipCustomer | undefined> {
    const [updated] = await db.update(vipCustomers).set(data).where(eq(vipCustomers.customerId, customerId)).returning();
    return updated;
  }

  async revokeVipStatus(customerId: string, adminId: string, reason: string): Promise<VipCustomer | undefined> {
    const [updated] = await db.update(vipCustomers).set({
      status: "revoked",
      revokedAt: new Date(),
      revokedByAdminId: adminId,
      revokeReason: reason,
    }).where(eq(vipCustomers.customerId, customerId)).returning();
    return updated;
  }

  // ==================== VIP ACTIVITY LOG ====================
  async createVipActivityLog(data: InsertVipActivityLog): Promise<VipActivityLog> {
    const [log] = await db.insert(vipActivityLog).values(data).returning();
    return log;
  }

  async getVipActivityLogs(customerId: string): Promise<VipActivityLog[]> {
    return db.select().from(vipActivityLog)
      .where(eq(vipActivityLog.customerId, customerId))
      .orderBy(desc(vipActivityLog.createdAt));
  }

  // ==================== CUSTOMER MAGIC LINK TOKENS ====================
  async createMagicLinkToken(data: InsertCustomerMagicLinkToken): Promise<CustomerMagicLinkToken> {
    const [token] = await db.insert(customerMagicLinkTokens).values(data).returning();
    return token;
  }

  async getMagicLinkToken(token: string): Promise<CustomerMagicLinkToken | undefined> {
    const [result] = await db.select().from(customerMagicLinkTokens)
      .where(eq(customerMagicLinkTokens.token, token));
    return result;
  }

  async markMagicLinkTokenUsed(token: string): Promise<void> {
    await db.update(customerMagicLinkTokens)
      .set({ used: true })
      .where(eq(customerMagicLinkTokens.token, token));
  }

  async deleteExpiredMagicLinkTokens(): Promise<void> {
    await db.delete(customerMagicLinkTokens)
      .where(lte(customerMagicLinkTokens.expiresAt, new Date()));
  }
}

export const storage = new DatabaseStorage();
