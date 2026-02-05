import { Router, Request, Response } from "express";
import { affiliateTrackingService } from "../../services/affiliate-tracking.service";
import { storage } from "../../../storage";
import { affiliateTrackLimiter } from "../../middleware/rate-limiter";

const router = Router();

router.post("/track", affiliateTrackLimiter, async (req: Request, res: Response) => {
  try {
    const {
      affiliateCode,
      landingUrl,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      userAgent,
    } = req.body;

    if (!affiliateCode) {
      return res.status(400).json({ error: "affiliateCode is required" });
    }

    const clientIp = req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() 
      || req.socket.remoteAddress 
      || undefined;

    const result = await affiliateTrackingService.trackClick({
      affiliateCode,
      landingUrl,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      userAgent: userAgent || req.headers["user-agent"],
      ipAddress: clientIp,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    const settings = await storage.getAffiliateSettings();
    const cookieDuration = settings?.cookieDuration ?? 30;

    const existingCookie = req.cookies?.affiliate;
    const existingData = affiliateTrackingService.parseCookie(existingCookie);

    if (!existingData || affiliateTrackingService.isCookieExpired(existingData)) {
      const cookieValue = affiliateTrackingService.createCookieValue(
        result.affiliateId!,
        result.sessionId!,
        cookieDuration
      );
      
      res.cookie("affiliate", cookieValue, {
        maxAge: cookieDuration * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
    }

    res.json({
      success: true,
      sessionId: result.sessionId,
    });
  } catch (error: any) {
    console.error("Affiliate tracking error:", error);
    res.status(500).json({ error: "Failed to track affiliate click" });
  }
});

export default router;
