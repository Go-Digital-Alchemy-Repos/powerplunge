import { emailService } from "../integrations/mailgun/EmailService";
import { storage } from "../../storage";
import crypto from "crypto";
import type { Order, OrderItem, Customer } from "@shared/schema";
import Stripe from "stripe";

// Configurable order fulfillment estimates
const ORDER_ESTIMATES = {
  processingDaysMin: 5,
  processingDaysMax: 7,
  shippingDaysMin: 10,
  shippingDaysMax: 14,
};

// Default support email if not configured
const DEFAULT_SUPPORT_EMAIL = "support@powerplunge.com";
const COMPANY_WEBSITE = "https://powerplunge.com";

interface OrderWithItems extends Order {
  items: OrderItem[];
  customer: Customer;
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

import { getOrderStatusLabel, getOrderStatusSubtext, getOrderStatusColor } from "@shared/orderStatus";

function getBaseUrl(): string {
  // Production: Use REPLIT_DOMAINS (set during deployment)
  if (process.env.REPLIT_DOMAINS) {
    return `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`;
  }
  // Development: Use REPLIT_DEV_DOMAIN
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  // Fallback for legacy deployments
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    return `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  }
  return "https://your-domain.replit.app";
}

class CustomerEmailService {
  private async getCompanyInfo() {
    const settings = await storage.getSiteSettings();
    return {
      name: settings?.companyName || "Power Plunge",
      supportEmail: settings?.supportEmail || settings?.replyToEmail || DEFAULT_SUPPORT_EMAIL,
      supportPhone: settings?.supportPhone,
    };
  }

  private async getPaymentMethodInfo(stripePaymentIntentId: string | null): Promise<{ brand: string; last4: string } | null> {
    if (!stripePaymentIntentId || !process.env.STRIPE_SECRET_KEY_LIVE) {
      return null;
    }
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_LIVE);
      const paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentIntentId, {
        expand: ['payment_method'],
      });
      const paymentMethod = paymentIntent.payment_method;
      if (paymentMethod && typeof paymentMethod === 'object' && paymentMethod.card) {
        return {
          brand: paymentMethod.card.brand?.charAt(0).toUpperCase() + paymentMethod.card.brand?.slice(1) || 'Card',
          last4: paymentMethod.card.last4 || '****',
        };
      }
    } catch (error) {
      console.error("Failed to retrieve payment method info:", error);
    }
    return null;
  }

  async sendOrderConfirmation(orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const order = await storage.getOrder(orderId);
      if (!order) {
        return { success: false, error: "Order not found" };
      }

      const customer = await storage.getCustomer(order.customerId);
      if (!customer) {
        return { success: false, error: "Customer not found" };
      }

      const items = await storage.getOrderItems(orderId);
      const company = await this.getCompanyInfo();
      const baseUrl = getBaseUrl();
      
      // Try to get payment method info from Stripe
      const paymentInfo = await this.getPaymentMethodInfo(order.stripePaymentIntentId);
      
      // Build payment method display
      const paymentMethodHtml = paymentInfo ? `
          <div style="margin-bottom: 12px;">
            <span style="color: #6b7280; font-size: 14px;">Payment Method: </span>
            <span style="color: #111827; font-size: 14px;">${paymentInfo.brand} •••• ${paymentInfo.last4}</span>
          </div>` : '';

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); padding: 32px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Order Confirmed!</h1>
        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Thank you for your purchase</p>
      </div>

      <!-- Content -->
      <div style="padding: 32px;">
        <p style="margin: 0 0 16px; color: #374151; font-size: 16px;">Hi ${customer.name},</p>
        <p style="margin: 0 0 24px; color: #374151; font-size: 16px;">Thanks for your purchase! Your order has been successfully received and is now being processed. Here's a summary:</p>

        <!-- Order Details -->
        <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <div style="margin-bottom: 12px;">
            <span style="color: #6b7280; font-size: 14px;">Order Number: </span>
            <span style="color: #111827; font-weight: 600; font-size: 14px;">#${order.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div style="margin-bottom: 12px;">
            <span style="color: #6b7280; font-size: 14px;">Order Date: </span>
            <span style="color: #111827; font-size: 14px;">${new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
          </div>
          <div style="margin-bottom: 12px;">
            <span style="color: #6b7280; font-size: 14px;">Status: </span>
            <span style="color: #059669; font-weight: 600; font-size: 14px;">${getOrderStatusLabel(order.status)}</span>
            <span style="color: #6b7280; font-size: 13px; display: block; margin-top: 4px;">Your order is being prepared. You'll receive another email when it ships.</span>
          </div>${paymentMethodHtml}
        </div>

        <!-- Order Items -->
        <h3 style="margin: 0 0 16px; color: #111827; font-size: 16px; font-weight: 600;">Items Ordered</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          ${items.map(item => `
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #374151;">
                ${item.productName}
                <span style="color: #6b7280; font-size: 14px;"> × ${item.quantity}</span>
              </td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right; color: #111827; font-weight: 500;">
                ${formatCurrency(item.unitPrice * item.quantity)}
              </td>
            </tr>
          `).join("")}
          <tr>
            <td style="padding: 16px 0 0; font-weight: 600; color: #111827; font-size: 16px;">Total</td>
            <td style="padding: 16px 0 0; text-align: right; font-weight: 700; color: #111827; font-size: 18px;">${formatCurrency(order.totalAmount)}</td>
          </tr>
        </table>

        <!-- Shipping Address -->
        <h3 style="margin: 0 0 12px; color: #111827; font-size: 16px; font-weight: 600;">Shipping Address</h3>
        <p style="margin: 0 0 24px; color: #374151; font-size: 14px; line-height: 1.6;">
          ${customer.name}<br>
          ${customer.address || ""}<br>
          ${customer.city ? `${customer.city}, ${customer.state || ""} ${customer.zipCode || ""}` : ""}<br>
          ${customer.country || "USA"}
        </p>

        <!-- Estimated Timeline -->
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <h4 style="margin: 0 0 8px; color: #065f46; font-size: 14px; font-weight: 600;">Estimated Timeline</h4>
          <p style="margin: 0; color: #047857; font-size: 13px; line-height: 1.5;">
            Processing time: ${ORDER_ESTIMATES.processingDaysMin}–${ORDER_ESTIMATES.processingDaysMax} business days<br>
            Delivery estimate: ${ORDER_ESTIMATES.shippingDaysMin}–${ORDER_ESTIMATES.shippingDaysMax} business days after shipment
          </p>
        </div>

        <!-- View Order Button -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="${baseUrl}/track-order" style="display: inline-block; background: #0891b2; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">View Order Details & Tracking</a>
        </div>

        <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; text-align: center;">
          Questions about your order? Contact us at <a href="mailto:${company.supportEmail}" style="color: #0891b2; text-decoration: none;">${company.supportEmail}</a>
        </p>
      </div>

      <!-- Footer -->
      <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0 0 8px; color: #374151; font-size: 13px; font-weight: 500;">Power Plunge™</p>
        <p style="margin: 0 0 8px;"><a href="${COMPANY_WEBSITE}" style="color: #0891b2; text-decoration: none; font-size: 12px;">${COMPANY_WEBSITE.replace('https://', '')}</a></p>
        <p style="margin: 0; color: #9ca3af; font-size: 11px;">&copy; ${new Date().getFullYear()} ${company.name}. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
      `;

      const result = await emailService.sendEmail({
        to: customer.email,
        subject: `Order Confirmed - #${order.id.slice(0, 8).toUpperCase()}`,
        html,
      });

      return result;
    } catch (error: any) {
      console.error("Failed to send order confirmation email:", error);
      return { success: false, error: error.message };
    }
  }

  async sendOrderStatusUpdate(orderId: string, newStatus: string): Promise<{ success: boolean; error?: string }> {
    try {
      const order = await storage.getOrder(orderId);
      if (!order) {
        return { success: false, error: "Order not found" };
      }

      const customer = await storage.getCustomer(order.customerId);
      if (!customer) {
        return { success: false, error: "Customer not found" };
      }

      const company = await this.getCompanyInfo();
      const baseUrl = getBaseUrl();
      const statusLabel = getOrderStatusLabel(newStatus);

      const statusSubtext = getOrderStatusSubtext(newStatus);
      const statusColor = getOrderStatusColor(newStatus);
      
      const statusMessages: Record<string, { title: string; message: string }> = {
        pending: {
          title: "Order Received",
          message: statusSubtext,
        },
        paid: {
          title: "Order Confirmed!",
          message: statusSubtext,
        },
        shipped: {
          title: "Your Order Has Shipped!",
          message: statusSubtext,
        },
        delivered: {
          title: "Your Order Has Been Delivered!",
          message: statusSubtext,
        },
        cancelled: {
          title: "Order Cancelled",
          message: statusSubtext,
        },
      };

      const statusInfo = statusMessages[newStatus] || {
        title: `Order Status Updated`,
        message: statusSubtext || `Your order status has been updated to: ${statusLabel}`,
      };

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <!-- Header -->
      <div style="background: ${statusColor}; padding: 32px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">${statusInfo.title}</h1>
      </div>

      <!-- Content -->
      <div style="padding: 32px;">
        <p style="margin: 0 0 24px; color: #374151; font-size: 16px;">Hi ${customer.name},</p>
        <p style="margin: 0 0 24px; color: #374151; font-size: 16px;">${statusInfo.message}</p>

        <!-- Order Details -->
        <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <div style="margin-bottom: 12px;">
            <span style="color: #6b7280; font-size: 14px;">Order Number:</span>
            <span style="color: #111827; font-weight: 600; font-size: 14px; margin-left: 8px;">#${order.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div>
            <span style="color: #6b7280; font-size: 14px;">Status:</span>
            <span style="color: ${statusColor}; font-weight: 600; font-size: 14px; margin-left: 8px;">${statusLabel}</span>
          </div>
        </div>

        <!-- Track Order Button -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="${baseUrl}/track-order" style="display: inline-block; background: #0891b2; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">View Order Details</a>
        </div>

        <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; text-align: center;">
          Questions? Contact us at ${company.supportEmail || "support@example.com"}
        </p>
      </div>

      <!-- Footer -->
      <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; color: #6b7280; font-size: 12px;">&copy; ${new Date().getFullYear()} ${company.name}. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
      `;

      const result = await emailService.sendEmail({
        to: customer.email,
        subject: `${statusInfo.title} - Order #${order.id.slice(0, 8).toUpperCase()}`,
        html,
      });

      return result;
    } catch (error: any) {
      console.error("Failed to send order status update email:", error);
      return { success: false, error: error.message };
    }
  }

  async sendMagicLinkEmail(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const customer = await storage.getCustomerByEmail(email);
      if (!customer) {
        return { success: true };
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await storage.createMagicLinkToken({
        customerId: customer.id,
        email: customer.email,
        token,
        expiresAt,
        used: false,
      });

      const company = await this.getCompanyInfo();
      const baseUrl = getBaseUrl();
      const magicLink = `${baseUrl}/track-order?token=${token}`;

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); padding: 32px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Access Your Orders</h1>
      </div>

      <!-- Content -->
      <div style="padding: 32px;">
        <p style="margin: 0 0 24px; color: #374151; font-size: 16px;">Hi ${customer.name},</p>
        <p style="margin: 0 0 24px; color: #374151; font-size: 16px;">Click the button below to securely access your order history. This link will expire in 15 minutes.</p>

        <!-- Magic Link Button -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="${magicLink}" style="display: inline-block; background: #0891b2; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">View My Orders</a>
        </div>

        <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; text-align: center;">
          If you didn't request this link, you can safely ignore this email.
        </p>

        <div style="margin-top: 24px; padding: 16px; background: #fef3c7; border-radius: 6px;">
          <p style="margin: 0; color: #92400e; font-size: 13px;">
            <strong>Security tip:</strong> Never share this link with anyone. Our team will never ask for your login link.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; color: #6b7280; font-size: 12px;">&copy; ${new Date().getFullYear()} ${company.name}. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
      `;

      const result = await emailService.sendEmail({
        to: email,
        subject: `Access Your Orders - ${company.name}`,
        html,
      });

      return result;
    } catch (error: any) {
      console.error("Failed to send magic link email:", error);
      return { success: false, error: error.message };
    }
  }

  async verifyMagicLinkToken(token: string): Promise<{ valid: boolean; customerId?: string; error?: string }> {
    try {
      const tokenRecord = await storage.getMagicLinkToken(token);

      if (!tokenRecord) {
        return { valid: false, error: "Invalid or expired link" };
      }

      if (tokenRecord.used) {
        return { valid: false, error: "This link has already been used" };
      }

      if (new Date() > tokenRecord.expiresAt) {
        return { valid: false, error: "This link has expired" };
      }

      await storage.markMagicLinkTokenUsed(token);

      return { valid: true, customerId: tokenRecord.customerId };
    } catch (error: any) {
      console.error("Failed to verify magic link token:", error);
      return { valid: false, error: error.message };
    }
  }
}

export const customerEmailService = new CustomerEmailService();
