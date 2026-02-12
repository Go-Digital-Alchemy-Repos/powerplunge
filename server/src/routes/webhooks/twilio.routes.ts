import { Router, Request, Response } from "express";
import { storage } from "../../../storage";
import crypto from "crypto";

const router = Router();

function validateTwilioSignature(req: Request, authToken: string): boolean {
  try {
    const signature = req.headers["x-twilio-signature"] as string;
    if (!signature) return false;

    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers.host || "";
    const url = `${protocol}://${host}${req.originalUrl}`;

    const params = req.body || {};
    const sortedKeys = Object.keys(params).sort();
    let dataString = url;
    for (const key of sortedKeys) {
      dataString += key + params[key];
    }

    const computed = crypto
      .createHmac("sha1", authToken)
      .update(Buffer.from(dataString, "utf-8"))
      .digest("base64");

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computed),
    );
  } catch (err) {
    console.error("[TWILIO_WEBHOOK] Signature validation error:", err);
    return false;
  }
}

router.post("/status", async (req: Request, res: Response) => {
  try {
    const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;

    if (!MessageSid || !MessageStatus) {
      return res.status(400).send("Missing required fields");
    }

    let authToken: string | null = null;
    try {
      const { smsService } = await import("../../../src/services/sms.service");
      authToken = await smsService.getAuthToken();
    } catch (err) {
      console.error("[TWILIO_WEBHOOK] Failed to retrieve auth token for signature validation:", err);
      return res.status(500).send("Internal error");
    }

    if (!authToken) {
      console.error("[TWILIO_WEBHOOK] No auth token available, rejecting webhook");
      return res.status(503).send("Service unavailable");
    }

    const isValid = validateTwilioSignature(req, authToken);
    if (!isValid) {
      console.warn(`[TWILIO_WEBHOOK] Invalid signature for MessageSid=${MessageSid}`);
      return res.status(403).send("Invalid signature");
    }

    const { affiliateInviteVerifications } = await import("@shared/schema");
    const { db } = await import("../../../db");
    const { eq } = await import("drizzle-orm");

    const [verification] = await db
      .select()
      .from(affiliateInviteVerifications)
      .where(eq(affiliateInviteVerifications.twilioMessageSid, MessageSid))
      .limit(1);

    if (verification) {
      await storage.updateAffiliateInviteVerification(verification.id, {
        deliveryStatus: MessageStatus,
      });

      if (MessageStatus === "failed" || MessageStatus === "undelivered") {
        console.error(
          `[TWILIO_WEBHOOK] Message delivery failed: SID=${MessageSid} status=${MessageStatus} error=${ErrorCode} ${ErrorMessage || ""}`
        );
      }
    }

    res.status(200).send("OK");
  } catch (error: any) {
    console.error("[TWILIO_WEBHOOK] Error processing status callback:", error);
    res.status(500).send("Error");
  }
});

export default router;
