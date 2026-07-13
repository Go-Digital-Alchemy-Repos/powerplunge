import { storage } from "../../storage";
import { isEmailOutboxEnabled } from "../testing/email-outbox";

export async function sendOrderNotification(orderId: string) {
  try {
    const settings = await storage.getSiteSettings();
    const order = await storage.getOrder(orderId);
    if (!order) return;

    const customer = await storage.getCustomer(order.customerId);
    const items = await storage.getOrderItems(orderId);

    const { customerEmailService } = await import("./customer-email.service");
    const customerEmailResult = await customerEmailService.sendOrderConfirmation(orderId);
    if (customerEmailResult.success) {
      console.log(`Order confirmation email sent to customer for order ${orderId}`);
    } else {
      console.log(`Failed to send customer confirmation email: ${customerEmailResult.error}`);
    }

    const allAdminUsers = await storage.getAdminUsers();
    const fulfillmentEmails = allAdminUsers
      .filter(u => u.role === "fulfillment")
      .map(u => u.email);

    const recipientSet = new Set<string>(fulfillmentEmails);
    if (settings?.orderNotificationEmail) {
      recipientSet.add(settings.orderNotificationEmail);
    }

    const recipients = Array.from(recipientSet);
    if (recipients.length === 0) {
      console.log("No fulfillment team members or admin notification email configured — skipping order notification");
      return;
    }

    const companyName = settings?.companyName || "Power Plunge";
    let baseUrl = (process.env.PUBLIC_SITE_URL || process.env.E2E_BASE_URL || "").replace(/\/+$/, "");
    if (!baseUrl) {
      if (process.env.REPLIT_DOMAINS) {
        baseUrl = `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`;
      } else if (process.env.REPLIT_DEV_DOMAIN) {
        baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
      } else if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
        baseUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      } else {
        baseUrl = "https://your-domain.replit.app";
      }
    }

    const adminOrderUrl = `${baseUrl}/admin/orders`;
    const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const orderTime = new Date(order.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;
    const isFreeOrder = !!order.isManualOrder && !order.stripePaymentIntentId;
    const formatOrderTotal = isFreeOrder ? "$0.00" : formatCents(order.totalAmount);

    const itemsHtml = items.map(item => `
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 14px;">${item.productName}</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #374151; font-size: 14px;">${item.quantity}</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #111827; font-weight: 500; font-size: 14px;">${isFreeOrder ? "$0.00" : formatCents(item.unitPrice * item.quantity)}</td>
          </tr>`).join("");

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
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">New Order Received</h1>
        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Order #${order.id.slice(0, 8).toUpperCase()} needs fulfillment</p>
      </div>

      <!-- Content -->
      <div style="padding: 32px;">
        <!-- Order Summary -->
        <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px; color: #111827; font-size: 16px; font-weight: 600;">Order Summary</h3>
          <div style="margin-bottom: 8px;">
            <span style="color: #6b7280; font-size: 14px;">Order Number: </span>
            <span style="color: #111827; font-weight: 600; font-size: 14px;">#${order.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div style="margin-bottom: 8px;">
            <span style="color: #6b7280; font-size: 14px;">Date: </span>
            <span style="color: #111827; font-size: 14px;">${orderDate} at ${orderTime}</span>
          </div>
          <div>
            <span style="color: #6b7280; font-size: 14px;">Total: </span>
            <span style="color: #111827; font-weight: 700; font-size: 16px;">${formatOrderTotal}</span>
          </div>
        </div>

        <!-- Items to Pack -->
        <h3 style="margin: 0 0 16px; color: #111827; font-size: 16px; font-weight: 600;">Items to Pack</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 10px 16px; text-align: left; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">Product</th>
              <th style="padding: 10px 16px; text-align: center; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">Qty</th>
              <th style="padding: 10px 16px; text-align: right; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 16px; font-weight: 600; color: #111827; font-size: 16px; border-top: 2px solid #e5e7eb;">Order Total</td>
              <td style="padding: 16px; text-align: right; font-weight: 700; color: #111827; font-size: 18px; border-top: 2px solid #e5e7eb;">${formatOrderTotal}</td>
            </tr>
          </tfoot>
        </table>

        <!-- Ship To -->
        <h3 style="margin: 0 0 12px; color: #111827; font-size: 16px; font-weight: 600;">Ship To</h3>
        <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0; color: #111827; font-weight: 600; font-size: 14px;">${customer?.name || "N/A"}</p>
          ${customer?.address ? `<p style="margin: 4px 0 0; color: #374151; font-size: 14px;">${customer.address}</p>` : ""}
          ${customer?.city ? `<p style="margin: 4px 0 0; color: #374151; font-size: 14px;">${customer.city}${customer?.state ? `, ${customer.state}` : ""} ${customer?.zipCode || ""}</p>` : ""}
          ${customer?.country && customer.country !== "US" ? `<p style="margin: 4px 0 0; color: #374151; font-size: 14px;">${customer.country}</p>` : ""}
        </div>

        <!-- Customer Contact -->
        <h3 style="margin: 0 0 12px; color: #111827; font-size: 16px; font-weight: 600;">Customer Contact</h3>
        <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          ${customer?.email ? `<div style="margin-bottom: 8px;"><span style="color: #6b7280; font-size: 14px;">Email: </span><a href="mailto:${customer.email}" style="color: #0891b2; text-decoration: none; font-size: 14px;">${customer.email}</a></div>` : ""}
          ${customer?.phone ? `<div><span style="color: #6b7280; font-size: 14px;">Phone: </span><a href="tel:${customer.phone}" style="color: #0891b2; text-decoration: none; font-size: 14px;">${customer.phone}</a></div>` : ""}
        </div>

        <!-- View in Admin Button -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="${adminOrderUrl}" style="display: inline-block; background: #0891b2; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">View Order in Admin</a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0 0 8px; color: #374151; font-size: 13px; font-weight: 500;">${companyName}</p>
        <p style="margin: 0; color: #9ca3af; font-size: 11px;">This is an internal fulfillment notification. Do not forward to customers.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const subject = `New Order #${order.id.slice(0, 8).toUpperCase()} — ${formatOrderTotal} — ${customer?.name || "Unknown"}`;

    if (!isEmailOutboxEnabled() && process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
      const formData = (await import("form-data")).default;
      const Mailgun = (await import("mailgun.js")).default;
      const mailgun = new Mailgun(formData);
      const mg = mailgun.client({ username: "api", key: process.env.MAILGUN_API_KEY });
      await mg.messages.create(process.env.MAILGUN_DOMAIN, {
        from: `${companyName} Orders <orders@${process.env.MAILGUN_DOMAIN}>`,
        to: recipients,
        subject,
        html,
      });

      console.log(`Order notification email sent via Mailgun to: ${recipients.join(", ")}`);
    } else if (isEmailOutboxEnabled()) {
      const { emailService } = await import("../integrations/mailgun/EmailService");
      const result = await emailService.sendEmail({
        to: recipients,
        subject,
        html,
      });
      if (!result.success) {
        console.log(`Failed to send fulfillment notification email: ${result.error}`);
      }
    } else {
      console.log("Mailgun not configured, skipping admin email notification");
      console.log(`Order ${orderId} notification would be sent to: ${recipients.join(", ")}`);
    }
  } catch (error) {
    console.error("Failed to send order notification:", error);
  }
}
