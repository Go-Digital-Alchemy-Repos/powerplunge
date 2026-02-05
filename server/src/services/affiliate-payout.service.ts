import { storage } from "../../storage";
import { db } from "../../db";
import { stripeService } from "../integrations/stripe/StripeService";
import { affiliatePayouts, affiliateReferrals, affiliates } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { Affiliate, AffiliatePayoutAccount, AffiliateReferral, AffiliatePayout } from "@shared/schema";
import { errorAlertingService } from "./error-alerting.service";

interface EligibleAffiliate {
  affiliate: Affiliate;
  payoutAccount: AffiliatePayoutAccount;
  referrals: AffiliateReferral[];
  totalAmount: number;
}

interface PayoutResult {
  affiliateId: string;
  affiliateCode: string;
  amount: number;
  status: "paid" | "failed" | "skipped" | "already_paid";
  stripeTransferId?: string;
  error?: string;
  payoutId?: string;
}

interface PayoutBatchSummary {
  batchId: string;
  periodStart: string;
  periodEnd: string;
  dryRun: boolean;
  timestamp: string;
  totalAffiliates: number;
  eligibleAffiliates: number;
  successfulPayouts: number;
  failedPayouts: number;
  skippedPayouts: number;
  alreadyPaidPayouts: number;
  totalAmountPaid: number;
  minimumPayout: number;
  results: PayoutResult[];
}

interface IneligibleAffiliate {
  affiliateId: string;
  affiliateCode: string;
  reason: string;
  pendingAmount: number;
}

interface PayoutMetadata {
  referralIds: string[];
  referralAmounts: Record<string, number>;
  createdAmount: number;
  periodStart: string;
  periodEnd: string;
}

function getWeekPeriod(): { batchId: string; periodStart: Date; periodEnd: Date } {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const startOfWeek = new Date(now);
  startOfWeek.setUTCDate(now.getUTCDate() - dayOfWeek);
  startOfWeek.setUTCHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
  endOfWeek.setUTCHours(23, 59, 59, 999);
  
  const year = startOfWeek.getUTCFullYear();
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const days = Math.floor((startOfWeek.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + startOfYear.getUTCDay() + 1) / 7);
  
  return {
    batchId: `BATCH-${year}-W${week.toString().padStart(2, "0")}`,
    periodStart: startOfWeek,
    periodEnd: endOfWeek,
  };
}

class AffiliatePayoutService {
  async getApprovedUnpaidReferrals(affiliateId: string): Promise<AffiliateReferral[]> {
    const referrals = await storage.getAffiliateReferrals(affiliateId);
    return referrals.filter(
      (r) => r.status === "approved" && !r.paidAt
    );
  }

  async computeEligiblePayouts(minimumPayout: number): Promise<{
    eligible: EligibleAffiliate[];
    ineligible: IneligibleAffiliate[];
  }> {
    const allAffiliates = await storage.getAffiliates();
    const activeAffiliates = allAffiliates.filter((a) => a.status === "active");

    const eligible: EligibleAffiliate[] = [];
    const ineligible: IneligibleAffiliate[] = [];

    for (const affiliate of activeAffiliates) {
      const payoutAccount = await storage.getAffiliatePayoutAccountByAffiliateId(affiliate.id);
      const referrals = await this.getApprovedUnpaidReferrals(affiliate.id);
      const totalAmount = referrals.reduce((sum, r) => sum + r.commissionAmount, 0);

      if (totalAmount === 0) {
        continue;
      }

      if (!payoutAccount) {
        ineligible.push({
          affiliateId: affiliate.id,
          affiliateCode: affiliate.affiliateCode,
          reason: "No payout account connected",
          pendingAmount: totalAmount,
        });
        continue;
      }

      if (!payoutAccount.payoutsEnabled) {
        ineligible.push({
          affiliateId: affiliate.id,
          affiliateCode: affiliate.affiliateCode,
          reason: "Stripe payouts not enabled",
          pendingAmount: totalAmount,
        });
        continue;
      }

      if (!payoutAccount.detailsSubmitted) {
        ineligible.push({
          affiliateId: affiliate.id,
          affiliateCode: affiliate.affiliateCode,
          reason: "Stripe account details not submitted",
          pendingAmount: totalAmount,
        });
        continue;
      }

      if (payoutAccount.country !== "US") {
        ineligible.push({
          affiliateId: affiliate.id,
          affiliateCode: affiliate.affiliateCode,
          reason: `Country ${payoutAccount.country} not supported (US only)`,
          pendingAmount: totalAmount,
        });
        continue;
      }

      if (payoutAccount.currency !== "usd") {
        ineligible.push({
          affiliateId: affiliate.id,
          affiliateCode: affiliate.affiliateCode,
          reason: `Currency ${payoutAccount.currency} not supported (USD only)`,
          pendingAmount: totalAmount,
        });
        continue;
      }

      if (totalAmount < minimumPayout) {
        ineligible.push({
          affiliateId: affiliate.id,
          affiliateCode: affiliate.affiliateCode,
          reason: `Below minimum payout ($${(minimumPayout / 100).toFixed(2)})`,
          pendingAmount: totalAmount,
        });
        continue;
      }

      eligible.push({
        affiliate,
        payoutAccount,
        referrals,
        totalAmount,
      });
    }

    return { eligible, ineligible };
  }

  async runPayoutBatch(params: {
    dryRun?: boolean;
    adminUserId?: string;
  }): Promise<PayoutBatchSummary> {
    const { dryRun = false, adminUserId } = params;
    const { batchId, periodStart, periodEnd } = getWeekPeriod();
    const timestamp = new Date().toISOString();

    const settings = await storage.getAffiliateSettings();
    const minimumPayout = settings?.minimumPayout ?? 5000;

    const { eligible, ineligible } = await this.computeEligiblePayouts(minimumPayout);

    const results: PayoutResult[] = [];
    let successfulPayouts = 0;
    let failedPayouts = 0;
    let skippedPayouts = 0;
    let alreadyPaidPayouts = 0;
    let totalAmountPaid = 0;

    for (const item of eligible) {
      const { affiliate, payoutAccount, referrals, totalAmount } = item;
      const idempotencyKey = `payout-${batchId}-${affiliate.id}`;

      if (dryRun) {
        const existingPayout = await this.findExistingPeriodPayout(affiliate.id, batchId);
        if (existingPayout?.status === "paid") {
          results.push({
            affiliateId: affiliate.id,
            affiliateCode: affiliate.affiliateCode,
            amount: existingPayout.amount,
            status: "already_paid",
            stripeTransferId: existingPayout.stripeTransferId || undefined,
            payoutId: existingPayout.id,
          });
          alreadyPaidPayouts++;
        } else {
          results.push({
            affiliateId: affiliate.id,
            affiliateCode: affiliate.affiliateCode,
            amount: totalAmount,
            status: "skipped",
          });
          skippedPayouts++;
        }
        continue;
      }

      try {
        const existingPayout = await this.findExistingPeriodPayout(affiliate.id, batchId);
        
        if (existingPayout?.status === "paid") {
          results.push({
            affiliateId: affiliate.id,
            affiliateCode: affiliate.affiliateCode,
            amount: existingPayout.amount,
            status: "already_paid",
            stripeTransferId: existingPayout.stripeTransferId || undefined,
            payoutId: existingPayout.id,
          });
          alreadyPaidPayouts++;
          continue;
        }

        let payoutRecord: AffiliatePayout;
        let referralIdsToMark: string[];
        let payoutAmount: number;
        
        if (existingPayout && existingPayout.status === "pending") {
          payoutRecord = existingPayout;
          const metadata = this.parsePayoutMetadata(existingPayout.notes || "");
          if (!metadata || !metadata.referralIds.length) {
            results.push({
              affiliateId: affiliate.id,
              affiliateCode: affiliate.affiliateCode,
              amount: totalAmount,
              status: "failed",
              error: "Pending payout has invalid metadata - manual intervention required",
            });
            failedPayouts++;
            continue;
          }
          referralIdsToMark = metadata.referralIds;
          payoutAmount = metadata.createdAmount;
        } else {
          const referralIds = referrals.map(r => r.id);
          const referralAmounts: Record<string, number> = {};
          referrals.forEach(r => { referralAmounts[r.id] = r.commissionAmount; });
          
          const metadata: PayoutMetadata = {
            referralIds,
            referralAmounts,
            createdAmount: totalAmount,
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
          };

          const [newPayout] = await db
            .insert(affiliatePayouts)
            .values({
              affiliateId: affiliate.id,
              amount: totalAmount,
              paymentMethod: "stripe_connect",
              paymentDetails: payoutAccount.stripeAccountId,
              status: "pending",
              payoutBatchId: batchId,
              notes: JSON.stringify(metadata),
            })
            .returning();
          
          payoutRecord = newPayout;
          referralIdsToMark = referralIds;
          payoutAmount = totalAmount;
        }

        let transfer;
        try {
          transfer = await stripeService.createTransfer({
            amount: payoutAmount,
            currency: "usd",
            destination: payoutAccount.stripeAccountId,
            metadata: {
              payoutId: payoutRecord.id,
              affiliateId: affiliate.id,
              batchId,
              periodStart: periodStart.toISOString(),
              periodEnd: periodEnd.toISOString(),
            },
            idempotencyKey,
          });
        } catch (stripeError: any) {
          results.push({
            affiliateId: affiliate.id,
            affiliateCode: affiliate.affiliateCode,
            amount: payoutAmount,
            status: "failed",
            error: `Stripe transfer failed: ${stripeError.message}`,
            payoutId: payoutRecord.id,
          });
          failedPayouts++;
          continue;
        }

        await db.transaction(async (tx) => {
          await tx
            .update(affiliatePayouts)
            .set({
              status: "paid",
              stripeTransferId: transfer.id,
              processedBy: adminUserId,
            })
            .where(eq(affiliatePayouts.id, payoutRecord.id));

          const paidAt = new Date();
          for (const referralId of referralIdsToMark) {
            await tx
              .update(affiliateReferrals)
              .set({
                status: "paid",
                paidAt,
              })
              .where(eq(affiliateReferrals.id, referralId));
          }

          const currentAffiliate = await storage.getAffiliate(affiliate.id);
          if (currentAffiliate) {
            const newPaidBalance = currentAffiliate.paidBalance + payoutAmount;
            const newPendingBalance = Math.max(0, currentAffiliate.pendingBalance - payoutAmount);
            await tx
              .update(affiliates)
              .set({
                paidBalance: newPaidBalance,
                pendingBalance: newPendingBalance,
              })
              .where(eq(affiliates.id, affiliate.id));
          }
        });

        results.push({
          affiliateId: affiliate.id,
          affiliateCode: affiliate.affiliateCode,
          amount: payoutAmount,
          status: "paid",
          stripeTransferId: transfer.id,
          payoutId: payoutRecord.id,
        });
        successfulPayouts++;
        totalAmountPaid += payoutAmount;
      } catch (error: any) {
        results.push({
          affiliateId: affiliate.id,
          affiliateCode: affiliate.affiliateCode,
          amount: totalAmount,
          status: "failed",
          error: error.message || "Unknown error",
        });
        failedPayouts++;
      }
    }

    for (const item of ineligible) {
      results.push({
        affiliateId: item.affiliateId,
        affiliateCode: item.affiliateCode,
        amount: item.pendingAmount,
        status: "skipped",
        error: item.reason,
      });
      skippedPayouts++;
    }

    const summary: PayoutBatchSummary = {
      batchId,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      dryRun,
      timestamp,
      totalAffiliates: eligible.length + ineligible.length,
      eligibleAffiliates: eligible.length,
      successfulPayouts,
      failedPayouts,
      skippedPayouts,
      alreadyPaidPayouts,
      totalAmountPaid,
      minimumPayout,
      results,
    };

    if (!dryRun && adminUserId && (successfulPayouts > 0 || failedPayouts > 0)) {
      await storage.createAuditLog({
        actor: adminUserId,
        action: "affiliate_payout_batch",
        entityType: "affiliate",
        entityId: batchId,
        metadata: {
          batchId,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          totalAffiliates: summary.totalAffiliates,
          eligibleAffiliates: summary.eligibleAffiliates,
          successfulPayouts: summary.successfulPayouts,
          failedPayouts: summary.failedPayouts,
          skippedPayouts: summary.skippedPayouts,
          alreadyPaidPayouts: summary.alreadyPaidPayouts,
          totalAmountPaid: summary.totalAmountPaid,
          minimumPayout: summary.minimumPayout,
        },
      });
    }

    // Send admin alert if there were payout failures
    if (!dryRun && failedPayouts > 0) {
      const failedErrors = results
        .filter((r) => r.status === "failed" && r.error)
        .map((r) => `${r.affiliateCode}: ${r.error}`);

      const failedAmount = results
        .filter((r) => r.status === "failed")
        .reduce((sum, r) => sum + r.amount, 0);

      await errorAlertingService.alertPayoutBatchError({
        batchId,
        totalPayouts: eligible.length,
        failedCount: failedPayouts,
        totalAmount: failedAmount,
        errors: failedErrors,
      });
    }

    return summary;
  }

  private async findExistingPeriodPayout(affiliateId: string, batchId: string) {
    const payouts = await storage.getAffiliatePayouts(affiliateId);
    return payouts.find((p) => p.payoutBatchId === batchId);
  }

  private parsePayoutMetadata(notes: string): PayoutMetadata | null {
    try {
      const parsed = JSON.parse(notes);
      if (parsed.referralIds && Array.isArray(parsed.referralIds) && parsed.createdAmount) {
        return parsed as PayoutMetadata;
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const affiliatePayoutService = new AffiliatePayoutService();
