import { Router, Request, Response } from "express";
import crypto from "crypto";
import { db } from "../../../db";
import { supportTickets, customers, siteSettings } from "@shared/schema";
import { eq } from "drizzle-orm";
import { notificationService } from "../../services/notification.service";

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
  return process.env.MAILGUN_WEBHOOK_SIGNING_KEY || null;
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

    const recipient = req.body?.recipient || req.body?.To || "";
    const senderEmail = req.body?.sender || req.body?.from || req.body?.From || "";
    const strippedText = req.body?.["stripped-text"] || req.body?.["body-plain"] || "";
    const subject = req.body?.subject || req.body?.Subject || "";

    const ticketId = extractTicketId(recipient);
    if (!ticketId) {
      console.warn(`[MAILGUN INBOUND] Could not extract ticket ID from: ${recipient}`);
      return res.status(200).json({ message: "ok" });
    }

    const replyText = stripQuotedText(strippedText);
    if (!replyText || replyText.length < 1) {
      console.warn(`[MAILGUN INBOUND] Empty reply for ticket ${ticketId}`);
      return res.status(200).json({ message: "ok" });
    }

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

    const emailFromAddress = senderEmail.replace(/.*<(.+)>.*/, "$1").trim().toLowerCase();
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
            text: replyText,
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

    console.log(
      `[MAILGUN INBOUND] Reply added to ticket ${ticketId} from ${emailFromAddress} (${replyText.length} chars)`
    );

    res.status(200).json({ message: "ok" });
  } catch (error) {
    console.error("[MAILGUN INBOUND] Error processing inbound email:", error);
    res.status(200).json({ message: "ok" });
  }
});

export default router;
