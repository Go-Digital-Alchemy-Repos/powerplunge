import { emailService, type EmailOptions } from "../integrations/mailgun/EmailService";
import { db } from "../../db";
import { siteSettings, emailSettings, customers } from "@shared/schema";
import { eq } from "drizzle-orm";

interface TicketData {
  ticketId: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  message: string;
  type: string;
}

async function isRegisteredCustomer(customerId?: string): Promise<boolean> {
  if (!customerId) return false;
  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, customerId),
    columns: { passwordHash: true, userId: true },
  });
  if (!customer) return false;
  return !!(customer.passwordHash || customer.userId);
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
    fromEmail: settings?.supportFromEmail || "",
    slaHours: settings?.supportSlaHours ?? 24,
    companyName: settings?.companyName || "Power Plunge",
    supportEmail: settings?.supportEmail || "",
    inboundRepliesEnabled: settings?.supportInboundRepliesEnabled ?? false,
  };
}

async function getMailgunDomain(): Promise<string | null> {
  const settings = await db.query.emailSettings.findFirst();
  return settings?.mailgunDomain || null;
}

function getTicketPrefix(): string {
  return process.env.NODE_ENV === "production" ? "ticket" : "devticket";
}

function buildTicketReplyToAddress(ticketId: string, domain: string): string {
  return `support+${getTicketPrefix()}-${ticketId}@${domain}`;
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

    const result = await emailService.sendEmail({
      to: emails,
      subject: `New Support Ticket: ${ticket.subject}`,
      ...(settings.fromEmail ? { from: settings.fromEmail } : {}),
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
    if (result.success) {
      console.log(`[SUPPORT EMAIL] Admin notification sent to: ${emails.join(", ")}`);
    } else {
      console.error(`[SUPPORT EMAIL] Admin notification failed: ${result.error}`);
    }
  } catch (error) {
    console.error("[SUPPORT EMAIL] Failed to send admin notification:", error);
  }
}

interface AdminReplyData {
  ticketId: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  replyText: string;
  adminName: string;
}

interface StatusChangeData {
  ticketId: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  newStatus: string;
}

const statusLabels: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

export async function sendAdminReplyToCustomer(data: AdminReplyData): Promise<void> {
  try {
    const settings = await getSupportSettings();
    if (!settings.notifyOnReply) return;

    const baseUrl = getBaseUrl();
    const registered = await isRegisteredCustomer(data.customerId);

    let replyTo: string | undefined;
    if (settings.inboundRepliesEnabled) {
      const domain = await getMailgunDomain();
      if (domain) {
        replyTo = buildTicketReplyToAddress(data.ticketId, domain);
      }
    }

    let replyInstructions: string;
    let portalButtonHtml: string;

    if (registered) {
      replyInstructions = replyTo
        ? `You can reply directly to this email or click the button below to view your full conversation.`
        : `Click the button below to view your full conversation and respond.`;
      portalButtonHtml = `
            <div style="margin-top: 24px; text-align: center;">
              <a href="${baseUrl}/my-account?tab=support" style="display: inline-block; padding: 10px 24px; background: #0891b2; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">View in Dashboard</a>
            </div>`;
    } else {
      replyInstructions = replyTo
        ? `Simply reply to this email to continue the conversation.`
        : `If you have additional questions, please contact us again through our website.`;
      portalButtonHtml = "";
    }

    const result = await emailService.sendEmail({
      to: data.customerEmail,
      subject: `Re: ${data.subject}`,
      ...(settings.fromEmail ? { from: settings.fromEmail } : {}),
      ...(replyTo ? { replyTo } : {}),
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; border-radius: 8px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #0c4a6e 0%, #164e63 100%); padding: 24px; text-align: center;">
            <h1 style="margin: 0; color: #67e8f9; font-size: 20px;">${settings.companyName} Support</h1>
          </div>
          <div style="padding: 24px;">
            <p style="color: #e5e5e5; margin-bottom: 8px;">Hi ${data.customerName},</p>
            <p style="color: #d4d4d4; margin-bottom: 16px;">You have a new response from our support team regarding your ticket:</p>
            <div style="margin-bottom: 16px; padding: 16px; background: #1a1a1a; border-radius: 6px; border-left: 3px solid #67e8f9;">
              <p style="margin: 0 0 8px 0; color: #a3a3a3; font-size: 13px; font-weight: 600;">${data.adminName}</p>
              <p style="margin: 0; color: #e5e5e5; white-space: pre-wrap; line-height: 1.6;">${data.replyText}</p>
            </div>
            <div style="padding: 12px; background: #1a1a1a; border-radius: 6px;">
              <p style="margin: 0 0 4px 0; color: #a3a3a3; font-size: 13px;">Reference: #${data.ticketId.slice(0, 8)}</p>
              <p style="margin: 0; color: #a3a3a3; font-size: 13px;">Subject: ${data.subject}</p>
            </div>${portalButtonHtml}
            <p style="margin-top: 16px; color: #a3a3a3; font-size: 13px;">${replyInstructions}</p>
          </div>
        </div>
      `,
    });
    if (result.success) {
      console.log(`[SUPPORT EMAIL] Admin reply sent to customer: ${data.customerEmail}`);
    } else {
      console.error(`[SUPPORT EMAIL] Admin reply email failed: ${result.error}`);
    }
  } catch (error) {
    console.error("[SUPPORT EMAIL] Failed to send admin reply email:", error);
  }
}

export async function sendStatusChangeToCustomer(data: StatusChangeData): Promise<void> {
  try {
    const settings = await getSupportSettings();
    if (!settings.notifyOnReply) return;

    const baseUrl = getBaseUrl();
    const statusLabel = statusLabels[data.newStatus] || data.newStatus;
    const registered = await isRegisteredCustomer(data.customerId);

    const portalButtonHtml = registered
      ? `
            <div style="margin-top: 24px; text-align: center;">
              <a href="${baseUrl}/my-account?tab=support" style="display: inline-block; padding: 10px 24px; background: #0891b2; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">View in Dashboard</a>
            </div>`
      : "";

    const result = await emailService.sendEmail({
      to: data.customerEmail,
      subject: `Ticket Update: ${data.subject} - ${statusLabel}`,
      ...(settings.fromEmail ? { from: settings.fromEmail } : {}),
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; border-radius: 8px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #0c4a6e 0%, #164e63 100%); padding: 24px; text-align: center;">
            <h1 style="margin: 0; color: #67e8f9; font-size: 20px;">${settings.companyName} Support</h1>
          </div>
          <div style="padding: 24px;">
            <p style="color: #e5e5e5; margin-bottom: 8px;">Hi ${data.customerName},</p>
            <p style="color: #d4d4d4; margin-bottom: 16px;">The status of your support ticket has been updated:</p>
            <div style="margin-bottom: 16px; padding: 16px; background: #1a1a1a; border-radius: 6px; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #a3a3a3; font-size: 13px;">New Status</p>
              <p style="margin: 0; color: #67e8f9; font-size: 18px; font-weight: 600;">${statusLabel}</p>
            </div>
            <div style="padding: 12px; background: #1a1a1a; border-radius: 6px;">
              <p style="margin: 0 0 4px 0; color: #a3a3a3; font-size: 13px;">Reference: #${data.ticketId.slice(0, 8)}</p>
              <p style="margin: 0; color: #a3a3a3; font-size: 13px;">Subject: ${data.subject}</p>
            </div>${portalButtonHtml}
          </div>
        </div>
      `,
    });
    if (result.success) {
      console.log(`[SUPPORT EMAIL] Status change email sent to customer: ${data.customerEmail}`);
    } else {
      console.error(`[SUPPORT EMAIL] Status change email failed: ${result.error}`);
    }
  } catch (error) {
    console.error("[SUPPORT EMAIL] Failed to send status change email:", error);
  }
}

export async function sendTicketConfirmationToCustomer(ticket: TicketData): Promise<void> {
  try {
    const settings = await getSupportSettings();
    if (!settings.autoReplyEnabled) return;

    const baseUrl = getBaseUrl();
    const registered = await isRegisteredCustomer(ticket.customerId);

    let autoReplyBody = settings.autoReplyMessage ||
      `Thank you for contacting ${settings.companyName}. We've received your message and will respond within {{sla_hours}} hours.`;

    autoReplyBody = autoReplyBody.replace(/\{\{sla_hours\}\}/g, String(settings.slaHours));

    const portalButtonHtml = registered
      ? `
            <div style="margin-top: 20px; text-align: center;">
              <a href="${baseUrl}/my-account?tab=support" style="display: inline-block; padding: 10px 24px; background: #0891b2; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">View in Dashboard</a>
            </div>`
      : "";

    const followUpText = registered
      ? `If you have additional details, simply reply to this email or view your ticket in your account dashboard.`
      : `If you have additional details, simply reply to this email.`;

    const result = await emailService.sendEmail({
      to: ticket.customerEmail,
      subject: `Re: ${ticket.subject} - We've received your message`,
      ...(settings.fromEmail ? { from: settings.fromEmail } : {}),
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
            </div>${portalButtonHtml}
            <p style="margin-top: 16px; color: #a3a3a3; font-size: 13px;">${followUpText}</p>
          </div>
        </div>
      `,
    });
    if (result.success) {
      console.log(`[SUPPORT EMAIL] Customer confirmation sent to: ${ticket.customerEmail}`);
    } else {
      console.error(`[SUPPORT EMAIL] Customer confirmation failed: ${result.error}`);
    }
  } catch (error) {
    console.error("[SUPPORT EMAIL] Failed to send customer confirmation:", error);
  }
}
