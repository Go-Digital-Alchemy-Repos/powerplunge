import { emailService } from "./src/integrations/mailgun/EmailService";
import { storage } from "./storage";

interface ShippingEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

function getBaseUrl(): string {
  if (process.env.PUBLIC_SITE_URL) {
    return process.env.PUBLIC_SITE_URL.replace(/\/+$/, "");
  }
  if (process.env.E2E_BASE_URL) {
    return process.env.E2E_BASE_URL.replace(/\/+$/, "");
  }
  if (process.env.REPLIT_DOMAINS) {
    return `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    return `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  }
  return "https://your-domain.replit.app";
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function getCarrierTrackingUrl(carrier: string | null, trackingNumber: string | null): string | null {
  if (!trackingNumber) return null;
  
  const carrierLower = (carrier || "").toLowerCase();
  
  if (carrierLower.includes("ups")) {
    return `https://www.ups.com/track?tracknum=${trackingNumber}`;
  } else if (carrierLower.includes("fedex")) {
    return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
  } else if (carrierLower.includes("usps")) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
  } else if (carrierLower.includes("dhl")) {
    return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${trackingNumber}`;
  }
  
  return null;
}

export async function sendShippingNotification(
  order: any,
  items: any[],
  customer: any,
  shipment: any,
  adminId?: string
): Promise<ShippingEmailResult> {
  try {
    const settings = await storage.getSiteSettings();
    const companyName = settings?.companyName || "Power Plunge";
    const supportEmail = settings?.supportEmail || settings?.replyToEmail || "support@powerplunge.com";
    const baseUrl = getBaseUrl();
    
    const trackingUrl = shipment.trackingUrl || getCarrierTrackingUrl(shipment.carrier, shipment.trackingNumber);
    const carrierName = shipment.carrier || "Carrier";
    const trackingNumber = shipment.trackingNumber || "N/A";
    
    const trackingSection = trackingUrl ? `
      <div style="background: #ecfeff; border: 1px solid #a5f3fc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 12px; color: #0e7490; font-size: 16px; font-weight: 600;">Tracking Information</h4>
        <div style="margin-bottom: 8px;">
          <span style="color: #0891b2; font-size: 14px;">Carrier: </span>
          <span style="color: #0e7490; font-weight: 600; font-size: 14px;">${carrierName}</span>
        </div>
        <div style="margin-bottom: 16px;">
          <span style="color: #0891b2; font-size: 14px;">Tracking Number: </span>
          <span style="color: #0e7490; font-weight: 600; font-size: 14px;">${trackingNumber}</span>
        </div>
        <a href="${trackingUrl}" style="display: inline-block; background: #0891b2; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">Track Your Package</a>
      </div>
    ` : (trackingNumber !== "N/A" ? `
      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 12px; color: #374151; font-size: 16px; font-weight: 600;">📦 Tracking Information</h4>
        <div style="margin-bottom: 8px;">
          <span style="color: #6b7280; font-size: 14px;">Carrier: </span>
          <span style="color: #111827; font-weight: 600; font-size: 14px;">${carrierName}</span>
        </div>
        <div>
          <span style="color: #6b7280; font-size: 14px;">Tracking Number: </span>
          <span style="color: #111827; font-weight: 600; font-size: 14px;">${trackingNumber}</span>
        </div>
      </div>
    ` : "");

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
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Your Order Has Shipped!</h1>
        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Great news - your order is on its way</p>
      </div>

      <!-- Content -->
      <div style="padding: 32px;">
        <p style="margin: 0 0 16px; color: #374151; font-size: 16px;">Hi ${customer.name},</p>
        <p style="margin: 0 0 24px; color: #374151; font-size: 16px;">We're excited to let you know that your order has shipped and is on its way to you!</p>

        ${trackingSection}

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
          <div>
            <span style="color: #6b7280; font-size: 14px;">Ship Date: </span>
            <span style="color: #111827; font-size: 14px;">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
          </div>
        </div>

        <!-- Order Items -->
        <h3 style="margin: 0 0 16px; color: #111827; font-size: 16px; font-weight: 600;">Items Shipped</h3>
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
        <h3 style="margin: 0 0 12px; color: #111827; font-size: 16px; font-weight: 600;">Shipping To</h3>
        <p style="margin: 0 0 24px; color: #374151; font-size: 14px; line-height: 1.6;">
          ${customer.name}<br>
          ${customer.address || ""}<br>
          ${customer.city ? `${customer.city}, ${customer.state || ""} ${customer.zipCode || ""}` : ""}<br>
          ${customer.country || "USA"}
        </p>

        <!-- View Order Button -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="${baseUrl}/order-status/${order.id}" style="display: inline-block; background: #0891b2; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">View Order Tracking</a>
        </div>

        <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; text-align: center;">
          Questions about your order? Contact us at <a href="mailto:${supportEmail}" style="color: #0891b2; text-decoration: none;">${supportEmail}</a>
        </p>
      </div>

      <!-- Footer -->
      <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0 0 8px; color: #374151; font-size: 13px; font-weight: 500;">${companyName}™</p>
        <p style="margin: 0 0 8px;"><a href="${baseUrl}" style="color: #0891b2; text-decoration: none; font-size: 12px;">${baseUrl.replace('https://', '')}</a></p>
        <p style="margin: 0; color: #9ca3af; font-size: 11px;">&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    console.log(`[EMAIL] Sending shipping notification to ${customer.email} for order ${order.id}`);
    console.log(`[EMAIL] Tracking: ${trackingNumber}, Carrier: ${carrierName}`);
    
    const result = await emailService.sendEmail({
      to: customer.email,
      subject: `Your Order Has Shipped! - #${order.id.slice(0, 8).toUpperCase()}`,
      html,
    });

    if (result.success) {
      console.log(`[EMAIL] Shipping notification sent successfully to ${customer.email}, messageId: ${result.messageId}`);
    } else {
      console.error(`[EMAIL] Failed to send shipping notification: ${result.error}`);
    }

    return result;
  } catch (error: any) {
    console.error("[EMAIL] Failed to send shipping notification:", error);
    return { success: false, error: error.message };
  }
}
