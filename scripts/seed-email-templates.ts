/**
 * Seed Email Templates to Production
 * 
 * This script seeds the default email templates to the database.
 * Run with: npx tsx scripts/seed-email-templates.ts
 */

import { db } from "../server/db";
import { emailTemplates } from "../shared/schema";
import { sql } from "drizzle-orm";

const DEFAULT_TEMPLATES = [
  {
    key: "ABANDONED_CART",
    name: "Abandoned Cart Reminder",
    subject: "You Left Something Behind!",
    bodyHtml: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n<h1 style="color: #0891b2;">Did You Forget Something?</h1>\n<p>Hi {{CUSTOMER_NAME}},</p>\n<p>We noticed you left items in your cart. Your cold plunge equipment is waiting for you!</p>\n{{CART_ITEMS_HTML}}\n<p style="margin: 30px 0;"><a href="{{CART_URL}}" style="background: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Complete Your Purchase</a></p>\n<p>If you have any questions, contact us at {{SUPPORT_EMAIL}}.</p>\n<p>Thank you,<br>{{COMPANY_NAME}}</p>\n</div>',
    bodyText: 'Did You Forget Something?\n\nHi {{CUSTOMER_NAME}},\n\nWe noticed you left items in your cart.\n\nComplete your purchase: {{CART_URL}}\n\nQuestions? Contact {{SUPPORT_EMAIL}}',
    isEnabled: true,
  },
  {
    key: "NEW_ORDER_ADMIN",
    name: "New Order Notification (Admin)",
    subject: "New Order Received - #{{ORDER_NUMBER}}",
    bodyHtml: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n<h1 style="color: #0891b2;">New Order Received</h1>\n<p>A new order has been placed on your store.</p>\n<h2>Order Details</h2>\n<p><strong>Order Number:</strong> {{ORDER_NUMBER}}</p>\n<p><strong>Date:</strong> {{ORDER_DATE}}</p>\n<p><strong>Total:</strong> ${{ORDER_TOTAL}}</p>\n<h2>Customer Information</h2>\n<p><strong>Name:</strong> {{CUSTOMER_NAME}}</p>\n<p><strong>Email:</strong> {{CUSTOMER_EMAIL}}</p>\n<p><strong>Phone:</strong> {{CUSTOMER_PHONE}}</p>\n<h2>Shipping Address</h2>\n{{SHIPPING_ADDRESS}}\n<h2>Items Ordered</h2>\n{{ORDER_ITEMS_HTML}}\n<p style="margin-top: 20px;"><a href="{{ADMIN_ORDER_URL}}" style="background: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View Order in Admin</a></p>\n</div>',
    bodyText: 'New Order Received\n\nOrder Number: {{ORDER_NUMBER}}\nDate: {{ORDER_DATE}}\nTotal: ${{ORDER_TOTAL}}\n\nCustomer: {{CUSTOMER_NAME}}\nEmail: {{CUSTOMER_EMAIL}}\nPhone: {{CUSTOMER_PHONE}}\n\n{{ORDER_ITEMS_TEXT}}',
    isEnabled: true,
  },
  {
    key: "ORDER_CANCELLED",
    name: "Order Cancelled",
    subject: "Your Order Has Been Cancelled - #{{ORDER_NUMBER}}",
    bodyHtml: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n<h1 style="color: #dc2626;">Order Cancelled</h1>\n<p>Hi {{CUSTOMER_NAME}},</p>\n<p>Your order #{{ORDER_NUMBER}} has been cancelled.</p>\n<h2>Order Details</h2>\n<p><strong>Order Number:</strong> {{ORDER_NUMBER}}</p>\n<p><strong>Order Date:</strong> {{ORDER_DATE}}</p>\n<p><strong>Order Total:</strong> ${{ORDER_TOTAL}}</p>\n<p>If you did not request this cancellation or have any questions, please contact us at {{SUPPORT_EMAIL}}.</p>\n<p>Thank you,<br>{{COMPANY_NAME}}</p>\n</div>',
    bodyText: 'Order Cancelled\n\nHi {{CUSTOMER_NAME}},\n\nYour order #{{ORDER_NUMBER}} has been cancelled.\n\nOrder Date: {{ORDER_DATE}}\nTotal: ${{ORDER_TOTAL}}\n\nQuestions? Contact {{SUPPORT_EMAIL}}',
    isEnabled: true,
  },
  {
    key: "ORDER_CONFIRMATION",
    name: "Order Confirmation (Customer)",
    subject: "Thank You for Your Order - #{{ORDER_NUMBER}}",
    bodyHtml: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n<h1 style="color: #0891b2;">Thank You for Your Order!</h1>\n<p>Hi {{CUSTOMER_NAME}},</p>\n<p>We have received your order and it is being processed. Here are your order details:</p>\n<h2>Order Summary</h2>\n<p><strong>Order Number:</strong> {{ORDER_NUMBER}}</p>\n<p><strong>Order Date:</strong> {{ORDER_DATE}}</p>\n<p><strong>Order Total:</strong> ${{ORDER_TOTAL}}</p>\n<h2>Items Ordered</h2>\n{{ORDER_ITEMS_HTML}}\n<h2>Shipping Address</h2>\n{{SHIPPING_ADDRESS}}\n<p style="margin-top: 20px;">If you have any questions, please contact us at {{SUPPORT_EMAIL}}.</p>\n<p>Thank you for shopping with {{COMPANY_NAME}}!</p>\n</div>',
    bodyText: 'Thank You for Your Order!\n\nHi {{CUSTOMER_NAME}},\n\nOrder Number: {{ORDER_NUMBER}}\nOrder Date: {{ORDER_DATE}}\nTotal: ${{ORDER_TOTAL}}\n\n{{ORDER_ITEMS_TEXT}}\n\nQuestions? Contact {{SUPPORT_EMAIL}}',
    isEnabled: true,
  },
  {
    key: "ORDER_DELIVERED",
    name: "Order Delivered",
    subject: "Your Order Has Been Delivered - #{{ORDER_NUMBER}}",
    bodyHtml: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n<h1 style="color: #0891b2;">Your Order Has Been Delivered!</h1>\n<p>Hi {{CUSTOMER_NAME}},</p>\n<p>Your order has been delivered. We hope you love your purchase!</p>\n<h2>Order Details</h2>\n<p><strong>Order Number:</strong> {{ORDER_NUMBER}}</p>\n{{ORDER_ITEMS_HTML}}\n<p style="margin-top: 20px;">If you have any questions or need assistance, please contact us at {{SUPPORT_EMAIL}}.</p>\n<p>Thank you for shopping with {{COMPANY_NAME}}!</p>\n</div>',
    bodyText: 'Your Order Has Been Delivered!\n\nHi {{CUSTOMER_NAME}},\n\nOrder Number: {{ORDER_NUMBER}}\n\n{{ORDER_ITEMS_TEXT}}\n\nQuestions? Contact {{SUPPORT_EMAIL}}',
    isEnabled: true,
  },
  {
    key: "ORDER_SHIPPED",
    name: "Order Shipped",
    subject: "Your Order Has Shipped - #{{ORDER_NUMBER}}",
    bodyHtml: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n<h1 style="color: #0891b2;">Your Order Has Shipped!</h1>\n<p>Hi {{CUSTOMER_NAME}},</p>\n<p>Great news! Your order is on its way.</p>\n<h2>Tracking Information</h2>\n<p><strong>Order Number:</strong> {{ORDER_NUMBER}}</p>\n<p><strong>Carrier:</strong> {{CARRIER}}</p>\n<p><strong>Tracking Number:</strong> {{TRACKING_NUMBER}}</p>\n<p style="margin-top: 20px;"><a href="{{TRACKING_URL}}" style="background: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Track Your Package</a></p>\n<h2>Shipping Address</h2>\n{{SHIPPING_ADDRESS}}\n<p style="margin-top: 20px;">Thank you for shopping with {{COMPANY_NAME}}!</p>\n</div>',
    bodyText: 'Your Order Has Shipped!\n\nHi {{CUSTOMER_NAME}},\n\nOrder Number: {{ORDER_NUMBER}}\nCarrier: {{CARRIER}}\nTracking Number: {{TRACKING_NUMBER}}\nTrack at: {{TRACKING_URL}}\n\nThank you for shopping with {{COMPANY_NAME}}!',
    isEnabled: true,
  },
  {
    key: "PASSWORD_RESET",
    name: "Password Reset",
    subject: "Reset Your Password - {{COMPANY_NAME}}",
    bodyHtml: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n<h1 style="color: #0891b2;">Reset Your Password</h1>\n<p>Hi {{CUSTOMER_NAME}},</p>\n<p>You requested to reset your password. Click the button below to set a new password:</p>\n<p style="margin: 30px 0;"><a href="{{RESET_URL}}" style="background: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Reset Password</a></p>\n<p>If you did not request this, please ignore this email. Your password will remain unchanged.</p>\n<p>This link will expire in 24 hours.</p>\n<p>Thank you,<br>{{COMPANY_NAME}}</p>\n</div>',
    bodyText: 'Reset Your Password\n\nHi {{CUSTOMER_NAME}},\n\nYou requested to reset your password. Visit this link to set a new password:\n{{RESET_URL}}\n\nIf you did not request this, please ignore this email.\n\nThank you,\n{{COMPANY_NAME}}',
    isEnabled: true,
  },
  {
    key: "PAYMENT_FAILED",
    name: "Payment Failed",
    subject: "Payment Failed for Your Order",
    bodyHtml: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n<h1 style="color: #dc2626;">Payment Failed</h1>\n<p>Hi {{CUSTOMER_NAME}},</p>\n<p>Unfortunately, we were unable to process your payment. Please update your payment information and try again.</p>\n<p><strong>Error:</strong> {{ERROR_MESSAGE}}</p>\n<p style="margin: 30px 0;"><a href="{{CHECKOUT_URL}}" style="background: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Update Payment</a></p>\n<p>If you continue to experience issues, please contact us at {{SUPPORT_EMAIL}}.</p>\n<p>Thank you,<br>{{COMPANY_NAME}}</p>\n</div>',
    bodyText: 'Payment Failed\n\nHi {{CUSTOMER_NAME}},\n\nWe were unable to process your payment.\n\nError: {{ERROR_MESSAGE}}\n\nPlease update your payment: {{CHECKOUT_URL}}\n\nQuestions? Contact {{SUPPORT_EMAIL}}',
    isEnabled: true,
  },
  {
    key: "REFUND_ISSUED",
    name: "Refund Issued",
    subject: "Refund Issued for Order #{{ORDER_NUMBER}}",
    bodyHtml: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n<h1 style="color: #0891b2;">Refund Issued</h1>\n<p>Hi {{CUSTOMER_NAME}},</p>\n<p>We have issued a refund for your order #{{ORDER_NUMBER}}.</p>\n<h2>Refund Details</h2>\n<p><strong>Order Number:</strong> {{ORDER_NUMBER}}</p>\n<p><strong>Refund Amount:</strong> ${{REFUND_AMOUNT}}</p>\n<p>Please allow 5-10 business days for the refund to appear on your statement.</p>\n<p>If you have any questions, please contact us at {{SUPPORT_EMAIL}}.</p>\n<p>Thank you,<br>{{COMPANY_NAME}}</p>\n</div>',
    bodyText: 'Refund Issued\n\nHi {{CUSTOMER_NAME}},\n\nWe have issued a refund for order #{{ORDER_NUMBER}}.\n\nRefund Amount: ${{REFUND_AMOUNT}}\n\nPlease allow 5-10 business days for the refund to appear.\n\nQuestions? Contact {{SUPPORT_EMAIL}}',
    isEnabled: true,
  },
  {
    key: "WELCOME_EMAIL",
    name: "Welcome Email",
    subject: "Welcome to {{COMPANY_NAME}}!",
    bodyHtml: '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">\n<h1 style="color: #0891b2;">Welcome to {{COMPANY_NAME}}!</h1>\n<p>Hi {{CUSTOMER_NAME}},</p>\n<p>Thank you for creating an account with us. We are excited to have you!</p>\n<p>With your account, you can:</p>\n<ul>\n<li>Track your orders</li>\n<li>Save your shipping addresses</li>\n<li>View order history</li>\n<li>Access exclusive member deals</li>\n</ul>\n<p style="margin-top: 20px;"><a href="{{SHOP_URL}}" style="background: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Start Shopping</a></p>\n<p>If you have any questions, contact us at {{SUPPORT_EMAIL}}.</p>\n<p>Thank you,<br>{{COMPANY_NAME}}</p>\n</div>',
    bodyText: 'Welcome to {{COMPANY_NAME}}!\n\nHi {{CUSTOMER_NAME}},\n\nThank you for creating an account with us.\n\nIf you have any questions, contact us at {{SUPPORT_EMAIL}}.',
    isEnabled: true,
  },
];

async function seedEmailTemplates() {
  console.log("Starting email template seeding...\n");

  for (const template of DEFAULT_TEMPLATES) {
    try {
      const existing = await db.execute(
        sql`SELECT id FROM email_templates WHERE key = ${template.key}`
      );

      if (existing.rows.length > 0) {
        console.log(`⏭️  Template "${template.key}" already exists, skipping...`);
        continue;
      }

      await db.insert(emailTemplates).values(template);
      console.log(`✅ Created template: ${template.key}`);
    } catch (error) {
      console.error(`❌ Failed to create template ${template.key}:`, error);
    }
  }

  console.log("\nEmail template seeding complete!");
  process.exit(0);
}

seedEmailTemplates().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
