import { storage } from "../../storage";
import crypto from "crypto";
import type { AffiliateClick, InsertAffiliateClick } from "@shared/schema";

const IP_HASH_SALT = process.env.IP_HASH_SALT || "power-plunge-affiliate-salt";

interface TrackClickInput {
  affiliateCode: string;
  landingUrl?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  userAgent?: string;
  ipAddress?: string;
}

interface TrackClickResult {
  success: boolean;
  sessionId?: string;
  affiliateId?: string;
  error?: string;
}

interface AffiliateCookieData {
  affiliateId: string;
  sessionId: string;
  expiresAt: number;
}

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(`${IP_HASH_SALT}:${ip}`).digest("hex");
}

function generateSessionId(): string {
  return crypto.randomBytes(16).toString("hex");
}

async function resolveAffiliateCode(code: string): Promise<{ baseCode: string; isFriendsFamily: boolean }> {
  const upper = code.toUpperCase();
  const exactAffiliate = await storage.getAffiliateByCode(upper);
  if (exactAffiliate) {
    return { baseCode: upper, isFriendsFamily: false };
  }
  if (upper.startsWith("FF") && upper.length > 2) {
    return { baseCode: upper.substring(2), isFriendsFamily: true };
  }
  return { baseCode: upper, isFriendsFamily: false };
}

class AffiliateTrackingService {
  async trackClick(input: TrackClickInput): Promise<TrackClickResult> {
    const resolved = await resolveAffiliateCode(input.affiliateCode);
    const affiliate = await storage.getAffiliateByCode(resolved.baseCode);
    if (!affiliate) {
      return { success: false, error: "Invalid affiliate code" };
    }

    if (affiliate.status !== "active") {
      return { success: false, error: "Affiliate not active" };
    }

    const sessionId = generateSessionId();
    const ipHash = input.ipAddress ? hashIp(input.ipAddress) : null;

    const clickData: InsertAffiliateClick = {
      affiliateId: affiliate.id,
      sessionId,
      landingUrl: input.landingUrl || null,
      referrer: input.referrer || null,
      utmSource: input.utmSource || null,
      utmMedium: input.utmMedium || null,
      utmCampaign: input.utmCampaign || null,
      utmContent: input.utmContent || null,
      utmTerm: input.utmTerm || null,
      ipHash,
      userAgent: input.userAgent || null,
    };

    const { db } = await import("../../db");
    const { affiliates: affiliatesTable, affiliateClicks: clicksTable } = await import("@shared/schema");
    const { eq, sql } = await import("drizzle-orm");

    await db.transaction(async (tx) => {
      await tx.insert(clicksTable).values(clickData);
      await tx.update(affiliatesTable)
        .set({ totalClicks: sql`${affiliatesTable.totalClicks} + 1` })
        .where(eq(affiliatesTable.id, affiliate.id));
    });

    return {
      success: true,
      sessionId,
      affiliateId: affiliate.id,
    };
  }

  parseCookie(cookieValue: string | undefined): AffiliateCookieData | null {
    if (!cookieValue) return null;
    try {
      const decoded = Buffer.from(cookieValue, "base64").toString("utf8");
      const data = JSON.parse(decoded);
      if (data.affiliateId && data.sessionId && data.expiresAt) {
        return data as AffiliateCookieData;
      }
      return null;
    } catch {
      return null;
    }
  }

  createCookieValue(affiliateId: string, sessionId: string, durationDays: number): string {
    const expiresAt = Date.now() + durationDays * 24 * 60 * 60 * 1000;
    const data: AffiliateCookieData = { affiliateId, sessionId, expiresAt };
    return Buffer.from(JSON.stringify(data)).toString("base64");
  }

  isCookieExpired(cookieData: AffiliateCookieData): boolean {
    return Date.now() > cookieData.expiresAt;
  }

  async getAffiliateStats(affiliateId: string): Promise<{
    totalClicks: number;
    totalConversions: number;
    conversionRate: number;
  }> {
    const totalClicks = await storage.countAffiliateClicks(affiliateId);
    const referrals = await storage.getAffiliateReferrals(affiliateId);
    const totalConversions = referrals.length;
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    return {
      totalClicks,
      totalConversions,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  }

  async getClickBySession(sessionId: string): Promise<AffiliateClick | undefined> {
    return storage.getAffiliateClickBySessionId(sessionId);
  }
}

export const affiliateTrackingService = new AffiliateTrackingService();
