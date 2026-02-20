import { Router, Request, Response } from "express";
import crypto from "crypto";
import { storage } from "../../../storage";

const router = Router();

function getFirstHeader(req: Request, names: string[]): string | null {
  for (const name of names) {
    const value = req.headers[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function normalizeSignature(value: string): string {
  return value.trim().toLowerCase();
}

function safeTimingEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function verifyTikTokWebhookSignature(params: {
  appSecret: string;
  payload: string;
  signature: string | null;
  timestamp: string | null;
}): { attempted: boolean; verified: boolean; reason?: string } {
  if (!params.signature) {
    return { attempted: false, verified: false, reason: "missing signature header" };
  }

  const expectedHexRaw = crypto
    .createHmac("sha256", params.appSecret)
    .update(params.payload)
    .digest("hex")
    .toLowerCase();

  const candidates = [expectedHexRaw];
  if (params.timestamp) {
    const expectedHexTsBody = crypto
      .createHmac("sha256", params.appSecret)
      .update(`${params.timestamp}${params.payload}`)
      .digest("hex")
      .toLowerCase();
    candidates.push(expectedHexTsBody);
  }

  const provided = normalizeSignature(params.signature);
  const verified = candidates.some((candidate) => safeTimingEqual(candidate, provided));
  return {
    attempted: true,
    verified,
    reason: verified ? undefined : "signature did not match known verification patterns",
  };
}

router.post("/tiktok-shop", async (req: Request, res: Response) => {
  try {
    const strictMode = process.env.TIKTOK_WEBHOOK_STRICT_VERIFY === "true";
    const settings = await storage.getIntegrationSettings();
    const encryptedSecret = settings?.tiktokAppSecretEncrypted || null;

    const signature = getFirstHeader(req, [
      "x-tts-sign",
      "x-tts-signature",
      "x-tiktok-shop-sign",
      "x-tiktok-shop-signature",
    ]);
    const timestamp = getFirstHeader(req, ["x-tts-timestamp", "x-tiktok-shop-timestamp"]);
    const rawPayload = Buffer.isBuffer(req.rawBody)
      ? (req.rawBody as Buffer).toString("utf-8")
      : JSON.stringify(req.body || {});

    let signatureCheck: { attempted: boolean; verified: boolean; reason?: string } = {
      attempted: false,
      verified: false,
      reason: "no app secret configured",
    };

    if (encryptedSecret) {
      const { decrypt } = await import("../../utils/encryption");
      const appSecret = decrypt(encryptedSecret);
      if (appSecret) {
        signatureCheck = verifyTikTokWebhookSignature({
          appSecret,
          payload: rawPayload,
          signature,
          timestamp,
        });
      } else {
        signatureCheck = { attempted: false, verified: false, reason: "failed to decrypt app secret" };
      }
    }

    if (strictMode && (!signatureCheck.attempted || !signatureCheck.verified)) {
      return res.status(403).json({
        success: false,
        message: "Invalid TikTok webhook signature",
        reason: signatureCheck.reason || "verification failed",
      });
    }

    const payload = req.body || {};
    const eventId = String(
      payload.id ||
      payload.event_id ||
      payload.eventId ||
      payload?.data?.id ||
      payload?.data?.event_id ||
      ""
    );
    const eventType = String(payload.type || payload.event_type || payload.event || "unknown");

    if (eventId) {
      const existing = await storage.getProcessedWebhookEvent(eventId);
      if (existing) {
        return res.json({ success: true, duplicate: true, verified: signatureCheck.verified });
      }

      try {
        await storage.createProcessedWebhookEvent({
          eventId,
          eventType,
          source: "tiktok_shop",
          metadata: {
            verified: signatureCheck.verified,
            strictMode,
            timestamp,
          },
        });
      } catch (error: any) {
        if (error?.code === "23505") {
          return res.json({ success: true, duplicate: true, verified: signatureCheck.verified });
        }
        throw error;
      }
    }

    console.log("[TIKTOK_WEBHOOK] Event received", {
      eventId: eventId || null,
      eventType,
      verified: signatureCheck.verified,
      strictMode,
    });

    res.json({
      success: true,
      received: true,
      verified: signatureCheck.verified,
      strictMode,
    });
  } catch (error: any) {
    console.error("[TIKTOK_WEBHOOK] Failed to process webhook:", error?.message || error);
    res.status(500).json({ success: false, message: "Failed to process TikTok webhook" });
  }
});

export default router;
