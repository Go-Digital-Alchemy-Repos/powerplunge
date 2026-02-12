import { storage } from "./storage";
import { db } from "./db";
import { adminUsers, products } from "@shared/schema";
import { eq, asc, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { slugify } from "./src/utils/slugify";

export async function ensureSuperAdmin() {
  const allAdmins = await db.select().from(adminUsers).orderBy(asc(adminUsers.createdAt));
  if (allAdmins.length === 0) return;

  const hasSuperAdmin = allAdmins.some((a) => a.role === "super_admin");
  if (hasSuperAdmin) return;

  const oldest = allAdmins[0];
  await db
    .update(adminUsers)
    .set({ role: "super_admin" })
    .where(eq(adminUsers.id, oldest.id));

  console.log(
    `[SUPER-ADMIN] Promoted "${oldest.email}" to super_admin (first admin account)`
  );
}

const TEST_ADMIN_USERS = [
  {
    email: "admin@test.com",
    password: "testpass123",
    firstName: "Test",
    lastName: "Admin",
    name: "Test Admin",
    role: "admin",
  },
  {
    email: "manager@test.com",
    password: "testpass123",
    firstName: "Test",
    lastName: "Manager",
    name: "Test Manager",
    role: "store_manager",
  },
  {
    email: "fulfillment@test.com",
    password: "testpass123",
    firstName: "Test",
    lastName: "Fulfillment",
    name: "Test Fulfillment",
    role: "fulfillment",
  },
];

export async function seedTestAdminUsers() {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.log("Seeding test admin users (dev only)...");

  for (const testUser of TEST_ADMIN_USERS) {
    const existing = await storage.getAdminUserByEmail(testUser.email);
    if (existing) {
      continue;
    }

    const hashedPassword = await bcrypt.hash(testUser.password, 12);
    await storage.createAdminUser({
      email: testUser.email,
      password: hashedPassword,
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      name: testUser.name,
      role: testUser.role,
    });
    console.log(`  Created test user: ${testUser.email} (${testUser.role})`);
  }
}

const firstNames = ["John", "Sarah", "Michael", "Emily", "David", "Jessica", "Chris", "Amanda", "James", "Ashley"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];
const cities = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "Austin"];
const states = ["NY", "CA", "IL", "TX", "AZ", "PA", "TX", "CA", "TX", "TX"];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePhone(): string {
  return `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
}

function generateZip(): string {
  return String(Math.floor(Math.random() * 90000) + 10000);
}

function generateAddress(): string {
  const num = Math.floor(Math.random() * 9000) + 100;
  const streets = ["Main St", "Oak Ave", "Maple Dr", "Park Blvd", "Lake Rd", "Hill St", "River Way", "Forest Ln"];
  return `${num} ${randomElement(streets)}`;
}

// Ensure CMS pages and featured product exist - runs independently
export async function ensureCmsDefaults() {
  console.log("Ensuring CMS defaults exist...");
  
  const products = await storage.getActiveProducts();
  if (products.length > 0) {
    const product = products[0];
    
    // Create default CMS pages if they don't exist
    await seedDefaultCmsPages(product);
    
    // Migrate existing pages to have correct button configurations
    await migrateButtonConfigurations(product.id);
    
    // Set featured product if not already set
    const siteSettings = await storage.getSiteSettings();
    if (!siteSettings?.featuredProductId) {
      console.log("Setting featured product...");
      await storage.updateSiteSettings({ featuredProductId: product.id });
    }
  }
}

// Migrate existing CMS pages to ensure buttons have proper addToCart configuration
async function migrateButtonConfigurations(productId: string) {
  const homePage = await storage.getHomePage();
  const contentJson = homePage?.contentJson as { blocks?: any[] } | null;
  if (!contentJson?.blocks) return;
  
  let updated = false;
  const blocks = contentJson.blocks.map((block: any) => {
    // Update hero blocks
    if (block.type === 'hero' && block.data) {
      if (!block.data.primaryButtonAction && (block.data.primaryButtonText || block.data.ctaText)) {
        block.data.primaryButtonAction = 'addToCart';
        block.data.productId = productId;
        updated = true;
      }
    }
    
    // Update CTA blocks
    if (block.type === 'cta' && block.data) {
      if (!block.data.buttonAction && block.data.buttonText) {
        block.data.buttonAction = 'addToCart';
        block.data.productId = productId;
        updated = true;
      }
    }
    
    return block;
  });
  
  if (updated && homePage) {
    console.log("Migrating button configurations to addToCart...");
    await storage.updatePage(homePage.id, {
      contentJson: { ...contentJson, blocks }
    });
  }
}

export async function backfillProductSlugs() {
  try {
    const productsWithoutSlug = await db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(isNull(products.urlSlug));

    if (productsWithoutSlug.length === 0) return;

    const existingSlugs = new Set(
      (await db.select({ slug: products.urlSlug }).from(products))
        .map(r => r.slug)
        .filter(Boolean)
    );

    for (const p of productsWithoutSlug) {
      let base = slugify(p.name);
      let slug = base;
      let counter = 1;
      while (existingSlugs.has(slug)) {
        slug = `${base}-${counter}`;
        counter++;
      }
      existingSlugs.add(slug);
      await db.update(products).set({ urlSlug: slug }).where(eq(products.id, p.id));
      console.log(`[SLUG-BACKFILL] "${p.name}" → ${slug}`);
    }
  } catch (err) {
    console.error("[SLUG-BACKFILL] Error:", err);
  }
}

export async function seedDatabase() {
  console.log("Starting database seed...");

  // Always ensure CMS defaults exist, even for existing databases
  await ensureCmsDefaults();

  // Check if we already have data
  const existingCustomers = await storage.getCustomers();
  if (existingCustomers.length > 0) {
    console.log("Database already has customer data, skipping full seed.");
    return;
  }

  // Get existing product
  const products = await storage.getActiveProducts();
  if (products.length === 0) {
    console.log("No products found, creating default product...");
    await storage.createProduct({
      name: "Power Plunge™ Portable Cold Plunge Tub",
      tagline: "Transform your recovery routine with ice-cold immersion therapy",
      description: "The Power Plunge™ Portable Cold Plunge Tub is engineered for athletes, wellness enthusiasts, and anyone seeking the proven benefits of cold water therapy.",
      price: 149900,
      images: [
        "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800",
        "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800",
      ],
      features: [
        "Reaches 30°F (-1°C) in under 2 hours",
        "Medical-grade insulation maintains temperature for 24+ hours",
        "Built-in filtration and UV sanitation system",
        "Compact design fits any space",
        "Easy drain and refill system",
      ],
      included: [
        "Power Plunge™ Cold Plunge Tub",
        "Insulated Cover",
        "Filtration System",
        "Water Treatment Kit",
        "Quick Start Guide",
      ],
      active: true,
    });
  }

  const product = (await storage.getActiveProducts())[0];

  // Create sample customers
  console.log("Creating sample customers...");
  const customerData = [];
  for (let i = 0; i < 25; i++) {
    const firstName = randomElement(firstNames);
    const lastName = randomElement(lastNames);
    const cityIndex = Math.floor(Math.random() * cities.length);
    
    customerData.push({
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
      name: `${firstName} ${lastName}`,
      phone: generatePhone(),
      address: generateAddress(),
      city: cities[cityIndex],
      state: states[cityIndex],
      zipCode: generateZip(),
      country: "USA",
    });
  }

  const createdCustomers = [];
  for (const data of customerData) {
    const customer = await storage.createCustomer(data);
    createdCustomers.push(customer);
  }

  // Create sample orders with various statuses
  console.log("Creating sample orders...");
  const orderStatuses = ["pending", "paid", "shipped", "delivered", "cancelled"];
  const statusWeights = [0.1, 0.2, 0.2, 0.4, 0.1];
  
  function weightedRandomStatus(): string {
    const rand = Math.random();
    let cumulative = 0;
    for (let i = 0; i < orderStatuses.length; i++) {
      cumulative += statusWeights[i];
      if (rand < cumulative) return orderStatuses[i];
    }
    return "delivered";
  }

  const createdOrders = [];
  for (let i = 0; i < 50; i++) {
    const customer = randomElement(createdCustomers);
    const quantity = Math.random() > 0.9 ? 2 : 1;
    const totalAmount = product.price * quantity;
    const status = weightedRandomStatus();
    
    const daysAgo = Math.floor(Math.random() * 90);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);

    const order = await storage.createOrder({
      customerId: customer.id,
      status,
      totalAmount,
      notes: Math.random() > 0.7 ? "Customer requested gift wrap" : undefined,
    });

    await storage.createOrderItem({
      orderId: order.id,
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: product.price,
    });

    createdOrders.push(order);
  }

  // Create sample affiliates
  console.log("Creating sample affiliates...");
  const affiliateCustomers = createdCustomers.slice(0, 5);
  
  for (let i = 0; i < affiliateCustomers.length; i++) {
    const customer = affiliateCustomers[i];
    const affiliateCode = `AFF${String(i + 1).padStart(3, "0")}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    const affiliate = await storage.createAffiliate({
      customerId: customer.id,
      affiliateCode,
      status: i < 4 ? "active" : "pending",
      totalEarnings: Math.floor(Math.random() * 50000),
      pendingBalance: Math.floor(Math.random() * 15000),
      paidBalance: Math.floor(Math.random() * 35000),
      totalReferrals: Math.floor(Math.random() * 10),
      totalSales: Math.floor(Math.random() * 15),
      paypalEmail: customer.email,
    });

    // Create agreement for active affiliates
    if (affiliate.status === "active") {
      await storage.createAffiliateAgreement({
        affiliateId: affiliate.id,
        agreementText: "Standard Affiliate Agreement v1.0",
        signatureName: customer.name,
        signatureIp: "192.168.1." + Math.floor(Math.random() * 255),
      });
    }

    // Create some referrals for active affiliates
    if (affiliate.status === "active" && createdOrders.length > 0) {
      const numReferrals = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < numReferrals && j < createdOrders.length; j++) {
        const order = createdOrders[j * 5 + i];
        if (order && order.status === "paid" || order?.status === "delivered") {
          try {
            await storage.createAffiliateReferral({
              affiliateId: affiliate.id,
              orderId: order.id,
              orderAmount: order.totalAmount,
              commissionRate: 10,
              commissionAmount: Math.round(order.totalAmount * 0.1),
              status: "approved",
            });
          } catch (e) {
            // Skip if duplicate
          }
        }
      }
    }
  }

  // Create sample coupons
  console.log("Creating sample coupons...");
  await storage.createCoupon({
    code: "WELCOME10",
    description: "10% off for new customers",
    type: "percentage",
    value: 10,
    perCustomerLimit: 1,
    active: true,
  });

  await storage.createCoupon({
    code: "SAVE50",
    description: "$50 off any order",
    type: "fixed",
    value: 5000,
    minOrderAmount: 10000,
    active: true,
  });

  await storage.createCoupon({
    code: "VIP20",
    description: "20% off for VIP members",
    type: "percentage",
    value: 20,
    maxRedemptions: 100,
    active: true,
  });

  await storage.createCoupon({
    code: "EXPIRED2024",
    description: "Expired promo code",
    type: "percentage",
    value: 15,
    endDate: new Date("2024-12-31"),
    active: false,
  });

  // Create default shipping zone
  console.log("Creating shipping configuration...");
  const usaZone = await storage.createShippingZone({
    name: "United States",
    countries: ["USA"],
    active: true,
  });

  await storage.createShippingRate({
    zoneId: usaZone.id,
    name: "Standard Shipping",
    description: "Delivery in 5-7 business days",
    price: 0,
    minOrderAmount: 0,
    estimatedDays: "5-7 business days",
    active: true,
  });

  await storage.createShippingRate({
    zoneId: usaZone.id,
    name: "Express Shipping",
    description: "Delivery in 2-3 business days",
    price: 4999,
    estimatedDays: "2-3 business days",
    active: true,
  });

  // Create sample pages
  console.log("Creating sample pages...");
  await storage.createPage({
    title: "About Us",
    slug: "about",
    content: `<h1>About Power Plunge</h1>
<p>Founded in 2024, Power Plunge is dedicated to bringing the benefits of cold water therapy to everyone. Our mission is to help people recover faster, feel better, and perform at their best.</p>
<h2>Our Story</h2>
<p>What started as a personal journey into cold therapy has grown into a mission to share the transformative benefits of cold water immersion with the world.</p>
<h2>Why Cold Therapy?</h2>
<ul>
<li>Reduces inflammation and muscle soreness</li>
<li>Improves circulation and immune function</li>
<li>Enhances mental clarity and mood</li>
<li>Accelerates recovery after workouts</li>
</ul>`,
    status: "published",
    showInNav: true,
    navOrder: 1,
  });

  await storage.createPage({
    title: "FAQ",
    slug: "faq",
    content: `<h1>Frequently Asked Questions</h1>
<h3>How cold does the Power Plunge get?</h3>
<p>The Power Plunge can reach temperatures as low as 30°F (-1°C), which is optimal for cold therapy benefits.</p>
<h3>How long should I stay in the cold plunge?</h3>
<p>We recommend starting with 2-3 minutes and gradually increasing to 10-15 minutes as your body adapts.</p>
<h3>Is cold therapy safe?</h3>
<p>Cold therapy is generally safe for healthy adults. Consult with your doctor if you have any heart conditions or health concerns.</p>
<h3>How do I maintain the water?</h3>
<p>Our built-in filtration and UV sanitation system keeps water clean. We recommend changing water every 2-4 weeks depending on usage.</p>`,
    status: "published",
    showInNav: true,
    navOrder: 2,
  });

  await storage.createPage({
    title: "Contact",
    slug: "contact",
    content: `<h1>Contact Us</h1>
<p>Have questions? We're here to help!</p>
<p><strong>Email:</strong> support@powerplunge.com</p>
<p><strong>Phone:</strong> 1-800-PLUNGE1</p>
<p><strong>Hours:</strong> Monday-Friday, 9am-5pm EST</p>`,
    status: "published",
    showInNav: true,
    navOrder: 3,
  });

  // Create default email templates
  console.log("Creating email templates...");
  await storage.createEmailTemplate({
    name: "order_confirmation",
    key: "order_confirmation",
    subject: "Order Confirmed - Power Plunge #{{orderId}}",
    bodyHtml: `<h1>Thank you for your order!</h1>
<p>Hi {{customerName}},</p>
<p>We've received your order and are getting it ready for shipment.</p>
<p><strong>Order #:</strong> {{orderId}}</p>
<p><strong>Total:</strong> {{orderTotal}}</p>
<p>We'll send you another email when your order ships.</p>
<p>Best,<br>The Power Plunge Team</p>`,
    isEnabled: true,
  });

  await storage.createEmailTemplate({
    name: "shipping_notification",
    key: "shipping_notification",
    subject: "Your Power Plunge Order Has Shipped!",
    bodyHtml: `<h1>Your order is on its way!</h1>
<p>Hi {{customerName}},</p>
<p>Great news! Your Power Plunge order has shipped.</p>
<p><strong>Tracking Number:</strong> {{trackingNumber}}</p>
<p><strong>Carrier:</strong> {{carrier}}</p>
<p>Click here to track your package: <a href="{{trackingUrl}}">Track Order</a></p>
<p>Best,<br>The Power Plunge Team</p>`,
    isEnabled: true,
  });

  // Initialize theme settings
  console.log("Initializing theme settings...");
  await storage.updateThemeSettings({
    primaryColor: "#67e8f9",
    secondaryColor: "#1e293b",
    accentColor: "#0ea5e9",
    backgroundColor: "#0f172a",
    textColor: "#f8fafc",
    headingFont: "Space Grotesk",
    bodyFont: "Inter",
    heroTitle: "Transform Your Recovery",
    heroSubtitle: "Experience the power of cold therapy",
    footerText: "© 2026 Power Plunge. All rights reserved.",
  });

  // Initialize inventory for product
  console.log("Setting up inventory...");
  await storage.createInventory({
    productId: product.id,
    quantity: 50,
    lowStockThreshold: 10,
    trackInventory: true,
    allowBackorders: false,
  });

  // Seed baseline documentation
  await seedBaselineDocs();

  console.log("Database seed completed successfully!");
  console.log(`Created ${createdCustomers.length} customers`);
  console.log(`Created ${createdOrders.length} orders`);
  console.log("Created 5 affiliates with agreements and referrals");
  console.log("Created 4 coupon codes");
  console.log("Created shipping zones and rates");
  console.log("Created sample pages (About, FAQ, Contact)");
  console.log("Created email templates");
  console.log("Created baseline documentation");
}

async function seedDefaultCmsPages(product: { id: string; name: string }) {
  // Check if home page already exists
  const existingHome = await storage.getHomePage();
  if (!existingHome) {
    console.log("Creating default home page...");
    await storage.createPage({
      title: "Home",
      slug: "home",
      pageType: "home",
      isHome: true,
      status: "published",
      contentJson: {
        version: 1,
        blocks: [
          {
            id: "hero-1",
            type: "hero",
            data: {
              badge: "Mind + Body + Spirit",
              title: "Cold. Consistent. Powerful.",
              subtitle: "Skip the ice bags and inconsistency. The Power Plunge™ Portable Tub delivers reliable, professional-level cold therapy whenever you need it.",
              ctaText: "Order Now",
              ctaLink: "#product",
            },
            settings: {
              background: "gradient",
              padding: "xl",
            }
          },
          {
            id: "stats-1",
            type: "statsBar",
            data: {
              stats: [
                { icon: "snowflake", label: "Ice Cold", value: "Down to 30°F" },
                { icon: "timer", label: "No Ice Required", value: "Always Ready" },
                { icon: "truck", label: "Free Shipping", value: "Continental US" },
                { icon: "award", label: "Warranty", value: "2 Year Coverage" },
              ]
            },
            settings: {
              padding: "lg",
            }
          },
          {
            id: "features-1",
            type: "featureList",
            data: {
              title: "Why Choose Power Plunge™?",
              subtitle: "Whether you're optimizing recovery, reducing inflammation, or building mental resilience, Power Plunge gives you reliable cold exposure—on demand.",
              features: [
                {
                  icon: "thermometer",
                  title: "Consistent Cold, No Ice Required",
                  description: "Achieves and maintains temperatures as low as 30°F using a powerful 1HP chiller."
                },
                {
                  icon: "shield",
                  title: "Premium Insulation & Thermal Lid",
                  description: "High-density insulated walls and a thermal locking lid retain cold longer."
                },
                {
                  icon: "zap",
                  title: "Portable & Space-Efficient",
                  description: "Designed for easy setup, relocation, and use in homes, gyms, or training facilities."
                },
                {
                  icon: "check",
                  title: "Clean Water, Low Maintenance",
                  description: "Built-in filtration system keeps water cleaner between sessions."
                },
                {
                  icon: "check",
                  title: "Simple Digital Controls",
                  description: "Set and monitor temperature with intuitive digital controls."
                },
                {
                  icon: "check",
                  title: "Quiet, Professional Operation",
                  description: "Engineered for smooth, quiet performance—ideal for residential and commercial use."
                }
              ],
              columns: 3
            },
            settings: {
              padding: "xl",
            }
          },
          {
            id: "product-1",
            type: "featuredProduct",
            data: {
              title: "The Complete System",
              titleHighlight: "System",
              subtitle: "Everything you need for professional-grade cold therapy at home.",
            },
            settings: {
              padding: "xl",
            }
          },
          {
            id: "perfect-for-1",
            type: "iconGrid",
            data: {
              title: "Perfect For",
              titleHighlight: "For",
              columns: 5,
              items: [
                { icon: "heart", title: "Athletes" },
                { icon: "dumbbell", title: "Fitness Enthusiasts" },
                { icon: "building", title: "Gyms & Studios" },
                { icon: "sparkles", title: "Wellness Centers" },
                { icon: "zap", title: "Biohackers" },
              ]
            },
            settings: {
              padding: "xl",
            }
          },
          {
            id: "cta-1",
            type: "cta",
            data: {
              title: "Ready to Transform Your Recovery?",
              subtitle: "Join thousands of athletes and wellness enthusiasts who trust Power Plunge.",
              primaryButton: "Order Now",
              primaryLink: "#product",
            },
            settings: {
              padding: "xl",
            }
          }
        ]
      }
    });
  }

  // Check if shop page already exists
  const existingShop = await storage.getShopPage();
  if (!existingShop) {
    console.log("Creating default shop page...");
    await storage.createPage({
      title: "Shop",
      slug: "shop",
      pageType: "shop",
      isShop: true,
      status: "published",
      contentJson: {
        version: 1,
        blocks: [
          {
            id: "hero-shop",
            type: "hero",
            data: {
              title: "Shop Cold Plunge Tubs",
              subtitle: "Browse our collection of premium cold therapy products designed for peak recovery.",
            },
            settings: {
              padding: "lg",
              alignment: "center",
            }
          },
          {
            id: "products-grid",
            type: "productGrid",
            data: {
              title: "Our Products",
              mode: "all",
              columns: 3,
            },
            settings: {
              padding: "lg",
            }
          }
        ]
      }
    });
  }
}

async function seedBaselineDocs() {
  console.log("Seeding baseline documentation...");
  
  const existingDocs = await storage.getDocs();
  if (existingDocs.length > 0) {
    console.log("Documentation already exists, skipping...");
    return;
  }

  const baselineDocs = [
    {
      title: "Platform Overview",
      slug: "platform-overview",
      category: "architecture",
      status: "published",
      sortOrder: 1,
      content: `# Platform Overview

Welcome to the Power Plunge e-commerce platform documentation.

## Technology Stack

- **Frontend**: React with TypeScript, Vite, TailwindCSS, shadcn/ui
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Payments**: Stripe (embedded checkout)
- **Authentication**: Replit Auth (OIDC-based)

## Core Features

1. **E-commerce Storefront** - Product display, cart, and checkout
2. **Payment Processing** - Stripe embedded payment form
3. **Admin Dashboard** - Full management interface
4. **Affiliate Program** - Referral tracking and payouts
5. **Email System** - Template-based notifications
6. **Inventory Management** - Stock tracking and alerts

## Architecture Principles

- Server-side rendering for SEO
- RESTful API design
- Secure session management
- Responsive mobile-first design
`,
      tags: ["overview", "architecture"],
    },
    {
      title: "Database Schema",
      slug: "database-schema",
      category: "data-model",
      status: "published",
      sortOrder: 1,
      content: `# Database Schema

## Core Tables

### Products
Stores product information including pricing, images, and features.

### Customers  
Customer information linked to orders and affiliates.

### Orders
Order records with status tracking and payment info.

### Order Items
Individual line items within orders.

## Supporting Tables

### Admin Users
Admin and store manager accounts with bcrypt-hashed passwords.

### Affiliates
Affiliate program participants with referral codes.

### Coupons
Discount codes with usage limits and expiration.

### Shipping Zones/Rates
Geographic shipping configuration.

## Relationships

- Orders belong to Customers
- Order Items belong to Orders and Products
- Affiliates link to Customers
- Referrals link Affiliates to Orders
`,
      tags: ["database", "schema", "drizzle"],
    },
    {
      title: "Stripe Integration",
      slug: "stripe-integration",
      category: "integrations",
      status: "published",
      sortOrder: 1,
      content: `# Stripe Integration

## Overview

Payment processing uses Stripe's embedded checkout experience with PaymentIntents.

## Configuration

Required environment variables:
- \`STRIPE_SECRET_KEY\` - Server-side API key
- \`STRIPE_PUBLISHABLE_KEY\` - Client-side API key

## Payment Flow

1. Customer fills cart and proceeds to checkout
2. Frontend creates PaymentIntent via \`/api/create-payment-intent\`
3. Stripe Elements form collects card details
4. Payment confirmation via \`/api/confirm-payment\`
5. Order status updated and confirmation email sent

## Webhooks

The platform handles Stripe webhooks for:
- \`payment_intent.succeeded\`
- \`payment_intent.payment_failed\`

## Testing

Use Stripe test mode with test card numbers:
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002
`,
      tags: ["stripe", "payments", "checkout"],
    },
    {
      title: "Admin Authentication",
      slug: "admin-authentication",
      category: "security",
      status: "published",
      sortOrder: 1,
      content: `# Admin Authentication

## Overview

Admin users authenticate via email/password with session-based auth.

## User Roles

- **Admin**: Full system access
- **Store Manager**: Limited to orders, products, and customers

## Security Features

- Passwords hashed with bcrypt (12 rounds)
- Session stored server-side
- Password reset via secure tokens
- Token expiration (1 hour)

## Login Flow

1. Admin enters credentials at \`/admin\`
2. Server validates against bcrypt hash
3. Session created with adminId
4. Redirect to dashboard

## Password Reset

1. Request reset at \`/admin/forgot-password\`
2. Token generated and stored (1 hour expiry)
3. Reset link provided (would email in production)
4. New password set at \`/admin/reset-password\`
`,
      tags: ["auth", "security", "admin"],
    },
    {
      title: "Deployment Guide",
      slug: "deployment-guide",
      category: "deployment",
      status: "published",
      sortOrder: 1,
      content: `# Deployment Guide

## Replit Deployment

1. Click "Deploy" button in Replit
2. Configure custom domain (optional)
3. Set production environment variables

## Required Secrets

Set these in Replit Secrets:
- \`STRIPE_SECRET_KEY\`
- \`STRIPE_PUBLISHABLE_KEY\`
- \`SESSION_SECRET\`

## Database

PostgreSQL is automatically provisioned via Replit.
Connection string available in \`DATABASE_URL\`.

## Health Checks

The application binds to port 5000 and responds to health checks automatically.

## Scaling

Replit handles auto-scaling based on traffic. The application is stateless (sessions in database) for horizontal scaling.
`,
      tags: ["deployment", "production", "hosting"],
    },
    {
      title: "Troubleshooting",
      slug: "troubleshooting",
      category: "troubleshooting",
      status: "published",
      sortOrder: 1,
      content: `# Troubleshooting

## Common Issues

### Payment Not Processing

1. Check Stripe keys are configured
2. Verify test mode vs live mode
3. Check browser console for errors
4. Review Stripe dashboard for failures

### Admin Login Failed

1. Verify admin user exists in database
2. Check password was hashed correctly
3. Clear cookies and retry
4. Check session configuration

### Database Connection Errors

1. Verify DATABASE_URL is set
2. Check PostgreSQL is running
3. Run \`npm run db:push\` to sync schema

### Cart Not Saving

1. Check browser local storage
2. Verify product IDs are valid
3. Clear cart and re-add items

## Logs

Check server logs in Replit for detailed error messages.
Use browser DevTools Network tab for API issues.
`,
      tags: ["debugging", "errors", "support"],
    },
  ];

  for (const doc of baselineDocs) {
    await storage.createDoc(doc);
  }
}
