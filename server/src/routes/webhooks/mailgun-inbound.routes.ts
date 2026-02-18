import { Router, Request, Response } from "express";
import crypto from "crypto";
import { db } from "../../../db";
import { supportTickets, customers, siteSettings, emailSettings } from "@shared/schema";
import { eq } from "drizzle-orm";
import { notificationService } from "../../services/notification.service";
import { sendNewTicketAdminNotification, sendTicketConfirmationToCustomer, logEmail } from "../../services/support-email.service";

const router = Router();

function verifyMailgunSignature(
  signingKey: string,
  timestamp: string,
  token: string,
  signature: string
): boolean {
  try {
    const encodedToken = crypto
      .createHmac("sha256", signingKey)
      .update(timestamp + token)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(encodedToken)
    );
  } catch {
    return false;
  }
}

function extractTicketId(recipient: string): string | null {
  const match = recipient.match(/support\+(?:dev)?ticket-([a-f0-9-]+)@/i);
  return match ? match[1] : null;
}

function extractSenderName(sender: string): string | null {
  const match = sender.match(/^(.+?)\s*<.+>/);
  if (match) {
    return match[1].replace(/^["']|["']$/g, "").trim() || null;
  }
  return null;
}

function extractEmailAddress(raw: string): string {
  const angleMatch = raw.match(/<([^>]+)>/);
  if (angleMatch) return angleMatch[1].trim().toLowerCase();
  return raw.trim().toLowerCase();
}

function decodeCafEnvelope(email: string): string | null {
  const cafMatch = email.match(/^info\+caf_=(.+)@/i);
  if (!cafMatch) return null;
  const encoded = cafMatch[1];
  const lastEquals = encoded.lastIndexOf("=");
  if (lastEquals === -1) return null;
  const user = encoded.substring(0, lastEquals);
  const domain = encoded.substring(lastEquals + 1);
  return `${user}@${domain}`.toLowerCase();
}

function resolveRealSender(body: Record<string, any>): { email: string; name: string | null } {
  const fromHeader = body?.From || body?.from || "";
  const senderField = body?.sender || "";

  const fromEmail = fromHeader ? extractEmailAddress(fromHeader) : "";
  const fromName = fromHeader ? extractSenderName(fromHeader) : null;

  const senderEmail = senderField ? extractEmailAddress(senderField) : "";

  if (fromEmail && fromEmail.includes("@") && !fromEmail.startsWith("info+caf_")) {
    return { email: fromEmail, name: fromName };
  }

  const decoded = decodeCafEnvelope(senderEmail) || decodeCafEnvelope(fromEmail);
  if (decoded) {
    return { email: decoded, name: fromName };
  }

  if (senderEmail && senderEmail.includes("@") && !senderEmail.startsWith("info+caf_")) {
    return { email: senderEmail, name: fromName || extractSenderName(senderField) };
  }

  return { email: fromEmail || senderEmail, name: fromName };
}

function stripQuotedText(text: string): string {
  const lines = text.split("\n");
  const cleaned: string[] = [];

  for (const line of lines) {
    if (/^>/.test(line)) break;
    if (/^On .+ wrote:$/.test(line.trim())) break;
    if (/^-{2,}\s*Original Message\s*-{2,}$/i.test(line.trim())) break;
    if (/^-{2,}\s*Forwarded message\s*-{2,}$/i.test(line.trim())) break;
    if (/^From:.*@/.test(line.trim())) break;
    if (/^Sent from my (iPhone|iPad|Android|Galaxy)/i.test(line.trim())) {
      cleaned.push(line);
      break;
    }
    cleaned.push(line);
  }

  return cleaned.join("\n").trim();
}

async function getMailgunSigningKey(): Promise<string | null> {
  if (process.env.MAILGUN_WEBHOOK_SIGNING_KEY) {
    return process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
  }

  try {
    const { decrypt } = await import("../../utils/encryption");
    const settings = await db.query.emailSettings.findFirst();
    if (settings?.mailgunWebhookSigningKeyEncrypted) {
      return decrypt(settings.mailgunWebhookSigningKeyEncrypted);
    }
  } catch (err) {
    console.error("[MAILGUN INBOUND] Failed to decrypt webhook signing key:", err);
  }
  return null;
}

async function isInboundRepliesEnabled(): Promise<boolean> {
  const settings = await db.query.siteSettings.findFirst({
    where: eq(siteSettings.id, "main"),
  });
  return settings?.supportInboundRepliesEnabled ?? false;
}

router.post("/inbound", async (req: Request, res: Response) => {
  try {
    if (!(await isInboundRepliesEnabled())) {
      console.log("[MAILGUN INBOUND] Inbound replies disabled, ignoring");
      return res.status(200).json({ message: "ok" });
    }

    const timestamp = req.body?.timestamp;
    const token = req.body?.token;
    const signature = req.body?.signature;

    if (!timestamp || !token || !signature) {
      console.warn("[MAILGUN INBOUND] Missing signature fields, ignoring request");
      return res.status(200).json({ message: "ok" });
    }

    const signingKey = await getMailgunSigningKey();
    if (!signingKey) {
      console.error("[MAILGUN INBOUND] No MAILGUN_WEBHOOK_SIGNING_KEY configured, cannot verify inbound emails");
      return res.status(200).json({ message: "ok" });
    }

    if (!verifyMailgunSignature(signingKey, timestamp, token, signature)) {
      console.warn("[MAILGUN INBOUND] Invalid signature, ignoring request");
      return res.status(200).json({ message: "ok" });
    }

    const recipientRaw = req.body?.recipient || req.body?.To || "";
    const strippedText = req.body?.["stripped-text"] || req.body?.["body-plain"] || "";
    const subject = req.body?.subject || req.body?.Subject || "";

    const { email: emailFromAddress, name: senderName } = resolveRealSender(req.body);
    if (!emailFromAddress || !emailFromAddress.includes("@")) {
      console.warn("[MAILGUN INBOUND] Missing or invalid sender email, ignoring");
      return res.status(200).json({ message: "ok" });
    }
    console.log(`[MAILGUN INBOUND] Resolved sender: ${emailFromAddress} (name: ${senderName || "unknown"})`);

    const messageText = stripQuotedText(strippedText);
    if (!messageText || messageText.length < 1) {
      console.warn(`[MAILGUN INBOUND] Empty message from ${emailFromAddress}`);
      return res.status(200).json({ message: "ok" });
    }

    const recipients = recipientRaw.split(",").map((r: string) => r.trim());
    let ticketId: string | null = null;
    for (const r of recipients) {
      ticketId = extractTicketId(r);
      if (ticketId) break;
    }

    if (ticketId) {
      const ticket = await db.query.supportTickets.findFirst({
        where: eq(supportTickets.id, ticketId),
      });

      if (!ticket) {
        console.warn(`[MAILGUN INBOUND] Ticket not found: ${ticketId}`);
        return res.status(200).json({ message: "ok" });
      }

      if (ticket.status === "closed") {
        console.log(`[MAILGUN INBOUND] Ticket ${ticketId} is closed, ignoring reply`);
        return res.status(200).json({ message: "ok" });
      }

      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, ticket.customerId),
      });

      if (customer?.email && customer.email.toLowerCase() !== emailFromAddress) {
        console.warn(
          `[MAILGUN INBOUND] Sender ${emailFromAddress} does not match ticket customer ${customer.email} for ticket ${ticketId}`
        );
        return res.status(200).json({ message: "ok" });
      }

      const existingReplies = Array.isArray(ticket.customerReplies) ? ticket.customerReplies : [];
      await db
        .update(supportTickets)
        .set({
          customerReplies: [
            ...existingReplies,
            {
              text: messageText,
              customerName: customer?.name || emailFromAddress,
              createdAt: new Date().toISOString(),
            },
          ],
          status: ticket.status === "resolved" ? "open" : ticket.status,
          updatedAt: new Date(),
        })
        .where(eq(supportTickets.id, ticketId));

      notificationService
        .notifyAdminsOfCustomerReply({
          id: ticket.id,
          subject: ticket.subject,
          customerName: customer?.name || emailFromAddress,
        })
        .catch((err) => console.error("Failed to create inbound reply notification:", err));

      await logEmail({
        ticketId,
        direction: "inbound",
        fromAddress: emailFromAddress,
        toAddress: recipientRaw,
        subject: subject || "(reply)",
        textBody: messageText,
        emailType: "inbound_reply",
        status: "success",
      }).catch(() => {});

      console.log(
        `[MAILGUN INBOUND] Reply added to ticket ${ticketId} from ${emailFromAddress} (${messageText.length} chars)`
      );
    } else {
      let customer = await db.query.customers.findFirst({
        where: eq(customers.email, emailFromAddress),
      });

      if (!customer) {
        const [newCustomer] = await db.insert(customers).values({
          email: emailFromAddress,
          name: senderName || emailFromAddress,
        }).returning();
        customer = newCustomer;
        console.log(`[MAILGUN INBOUND] Created new customer ${customer.id} for ${emailFromAddress}`);
      }

      const ticketSubject = subject?.trim() || "Email inquiry";

      const [ticket] = await db.insert(supportTickets).values({
        customerId: customer.id,
        subject: ticketSubject,
        message: messageText,
        type: "general",
      }).returning();

      const ticketData = {
        ticketId: ticket.id,
        customerId: customer.id,
        customerName: customer.name || emailFromAddress,
        customerEmail: emailFromAddress,
        subject: ticketSubject,
        message: messageText,
        type: "general",
      };
      sendNewTicketAdminNotification(ticketData).catch(() => {});
      sendTicketConfirmationToCustomer(ticketData).catch(() => {});

      await logEmail({
        ticketId: ticket.id,
        direction: "inbound",
        fromAddress: emailFromAddress,
        toAddress: recipientRaw,
        subject: ticketSubject,
        textBody: messageText,
        emailType: "inbound_new_ticket",
        status: "success",
      }).catch(() => {});

      console.log(
        `[MAILGUN INBOUND] New ticket ${ticket.id} created from ${emailFromAddress}: "${ticketSubject}" (${messageText.length} chars)`
      );
    }

    res.status(200).json({ message: "ok" });
  } catch (error) {
    console.error("[MAILGUN INBOUND] Error processing inbound email:", error);
    res.status(200).json({ message: "ok" });
  }
});

export default router;
