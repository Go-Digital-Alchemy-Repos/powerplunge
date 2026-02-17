import { emailService } from "../integrations/mailgun/EmailService";
import { db } from "../../db";
import { siteSettings } from "@shared/schema";
import { eq } from "drizzle-orm";

interface TicketData {
  ticketId: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  message: string;
  type: string;
}

async function getSupportSettings() {
  const settings = await db.query.siteSettings.findFirst({
    where: eq(siteSettings.id, "main"),
  });
  return {
    notifyEmails: settings?.supportNotifyEmails || "",
    notifyOnNew: settings?.supportNotifyOnNew ?? true,
    notifyOnReply: settings?.supportNotifyOnReply ?? true,
    autoReplyEnabled: settings?.supportAutoReplyEnabled ?? true,
    autoReplyMessage: settings?.supportAutoReplyMessage || "",
    slaHours: settings?.supportSlaHours ?? 24,
    companyName: settings?.companyName || "Power Plunge",
    supportEmail: settings?.supportEmail || "",
  };
}

function getBaseUrl(): string {
  if (process.env.REPLIT_DOMAINS) {
    return `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return "https://your-domain.replit.app";
}

const typeLabels: Record<string, string> = {
  general: "General Inquiry",
  return: "Return Request",
  refund: "Refund Request",
  shipping: "Shipping Question",
  technical: "Technical Support",
};

export async function sendNewTicketAdminNotification(ticket: TicketData): Promise<void> {
  try {
    const settings = await getSupportSettings();
    if (!settings.notifyOnNew || !settings.notifyEmails) return;

    const emails = settings.notifyEmails
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    if (emails.length === 0) return;

    const baseUrl = getBaseUrl();

    await emailService.sendEmail({
      to: emails,
      subject: `New Support Ticket: ${ticket.subject}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; border-radius: 8px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #0c4a6e 0%, #164e63 100%); padding: 24px; text-align: center;">
            <h1 style="margin: 0; color: #67e8f9; font-size: 20px;">New Support Ticket</h1>
          </div>
          <div style="padding: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #a3a3a3;">Ticket ID</td><td style="padding: 8px 0; color: #e5e5e5;">#${ticket.ticketId.slice(0, 8)}</td></tr>
              <tr><td style="padding: 8px 0; color: #a3a3a3;">Customer</td><td style="padding: 8px 0; color: #e5e5e5;">${ticket.customerName}</td></tr>
              <tr><td style="padding: 8px 0; color: #a3a3a3;">Email</td><td style="padding: 8px 0; color: #e5e5e5;">${ticket.customerEmail}</td></tr>
              <tr><td style="padding: 8px 0; color: #a3a3a3;">Type</td><td style="padding: 8px 0; color: #e5e5e5;">${typeLabels[ticket.type] || ticket.type}</td></tr>
              <tr><td style="padding: 8px 0; color: #a3a3a3;">Subject</td><td style="padding: 8px 0; color: #e5e5e5; font-weight: 600;">${ticket.subject}</td></tr>
            </table>
            <div style="margin-top: 16px; padding: 16px; background: #1a1a1a; border-radius: 6px; border-left: 3px solid #67e8f9;">
              <p style="margin: 0; color: #d4d4d4; white-space: pre-wrap;">${ticket.message}</p>
            </div>
            <div style="margin-top: 24px; text-align: center;">
              <a href="${baseUrl}/admin/support" style="display: inline-block; padding: 10px 24px; background: #0891b2; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">View in Dashboard</a>
            </div>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error("[SUPPORT EMAIL] Failed to send admin notification:", error);
  }
}

export async function sendTicketConfirmationToCustomer(ticket: TicketData): Promise<void> {
  try {
    const settings = await getSupportSettings();
    if (!settings.autoReplyEnabled) return;

    let autoReplyBody = settings.autoReplyMessage ||
      `Thank you for contacting ${settings.companyName}. We've received your message and will respond within {{sla_hours}} hours.`;

    autoReplyBody = autoReplyBody.replace(/\{\{sla_hours\}\}/g, String(settings.slaHours));

    await emailService.sendEmail({
      to: ticket.customerEmail,
      subject: `Re: ${ticket.subject} - We've received your message`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; border-radius: 8px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #0c4a6e 0%, #164e63 100%); padding: 24px; text-align: center;">
            <h1 style="margin: 0; color: #67e8f9; font-size: 20px;">${settings.companyName}</h1>
          </div>
          <div style="padding: 24px;">
            <p style="color: #e5e5e5; margin-bottom: 8px;">Hi ${ticket.customerName},</p>
            <p style="color: #d4d4d4; line-height: 1.6;">${autoReplyBody}</p>
            <div style="margin-top: 16px; padding: 12px; background: #1a1a1a; border-radius: 6px;">
              <p style="margin: 0 0 4px 0; color: #a3a3a3; font-size: 13px;">Reference: #${ticket.ticketId.slice(0, 8)}</p>
              <p style="margin: 0; color: #a3a3a3; font-size: 13px;">Subject: ${ticket.subject}</p>
            </div>
            <p style="margin-top: 16px; color: #a3a3a3; font-size: 13px;">If you have additional details, simply reply to this email or visit our contact page.</p>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error("[SUPPORT EMAIL] Failed to send customer confirmation:", error);
  }
}
