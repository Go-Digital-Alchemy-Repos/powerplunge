import { Router, Request, Response } from "express";
import { affiliateCommissionService } from "../../services/affiliate-commission.service";
import { affiliatePayoutService } from "../../services/affiliate-payout.service";
import { db } from "../../../db";
import { storage } from "../../../storage";
import { affiliates, affiliatePayouts, affiliateReferrals, affiliateSettings, affiliateAgreements, affiliateClicks, affiliatePayoutAccounts, affiliateInvites, affiliateInviteUsages, customers } from "@shared/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import {
  payoutRequestSchema,
  adminPayoutSchema,
  approvePayoutSchema,
  rejectPayoutSchema,
  commissionIdSchema,
  affiliateIdSchema,
  voidCommissionSchema,
  bulkApproveSchema,
  limitQuerySchema,
  runPayoutBatchSchema,
} from "../../validation/affiliate.validation";
import { z } from "zod";

const router = Router();

function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: () => void) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: result.error.errors[0]?.message || "Invalid request body",
          details: result.error.errors,
        },
      });
    }
    req.body = result.data;
    next();
  };
}

function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: () => void) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: result.error.errors[0]?.message || "Invalid path parameters",
          details: result.error.errors,
        },
      });
    }
    next();
  };
}

async function createAuditLog(
  actor: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, any>
) {
  try {
    await storage.createAuditLog({
      actor,
      action,
      entityType,
      entityId,
      metadata,
    });
  } catch (error) {
    console.error("[AUDIT] Failed to create audit log:", error);
  }
}

// Get affiliate leaderboard
router.get("/leaderboard", async (req: Request, res: Response) => {
  try {
    const { limit } = limitQuerySchema.parse(req.query);
    const leaderboard = await affiliateCommissionService.getLeaderboard(limit);
    res.json(leaderboard);
  } catch (error: any) {
    console.error("Failed to get leaderboard:", error);
    res.status(500).json({ error: { code: "LEADERBOARD_ERROR", message: error.message } });
  }
});

// Get affiliate profile with full details
router.get("/:affiliateId/profile", validateParams(affiliateIdSchema), async (req: Request, res: Response) => {
  try {
    const { affiliateId } = req.params;

    const [affiliate] = await db
      .select({
        id: affiliates.id,
        affiliateCode: affiliates.affiliateCode,
        status: affiliates.status,
        totalEarnings: affiliates.totalEarnings,
        pendingBalance: affiliates.pendingBalance,
        paidBalance: affiliates.paidBalance,
        totalReferrals: affiliates.totalReferrals,
        totalSales: affiliates.totalSales,
        paypalEmail: affiliates.paypalEmail,
        createdAt: affiliates.createdAt,
        customerName: customers.name,
        customerEmail: customers.email,
      })
      .from(affiliates)
      .innerJoin(customers, eq(affiliates.customerId, customers.id))
      .where(eq(affiliates.id, affiliateId));

    if (!affiliate) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Affiliate not found" } });
    }

    // Fetch payout account info for Stripe Connect status
    const payoutAccount = await storage.getAffiliatePayoutAccountByAffiliateId(affiliateId);
    const payoutAccountSummary = payoutAccount
      ? {
          payoutsEnabled: payoutAccount.payoutsEnabled,
          detailsSubmitted: payoutAccount.detailsSubmitted,
          country: payoutAccount.country,
          currency: payoutAccount.currency,
          connectStatus: payoutAccount.payoutsEnabled ? "active" : 
                         payoutAccount.detailsSubmitted ? "pending" : "incomplete",
        }
      : null;

    res.json({
      ...affiliate,
      approvedBalance: affiliate.totalEarnings - affiliate.pendingBalance - affiliate.paidBalance,
      createdAt: affiliate.createdAt.toISOString(),
      payoutAccount: payoutAccountSummary,
    });
  } catch (error: any) {
    console.error("Failed to get affiliate profile:", error);
    res.status(500).json({ error: { code: "PROFILE_ERROR", message: error.message } });
  }
});

// Get commissions for an affiliate
router.get("/:affiliateId/commissions", validateParams(affiliateIdSchema), async (req: Request, res: Response) => {
  try {
    const { affiliateId } = req.params;
    const commissions = await affiliateCommissionService.getAffiliateCommissions(affiliateId);
    res.json(commissions);
  } catch (error: any) {
    console.error("Failed to get commissions:", error);
    res.status(500).json({ error: { code: "COMMISSIONS_ERROR", message: error.message } });
  }
});

// Get referred customers for an affiliate
router.get("/:affiliateId/referred-customers", validateParams(affiliateIdSchema), async (req: Request, res: Response) => {
  try {
    const { affiliateId } = req.params;
    const referredCustomers = await affiliateCommissionService.getReferredCustomers(affiliateId);
    res.json(referredCustomers);
  } catch (error: any) {
    console.error("Failed to get referred customers:", error);
    res.status(500).json({ error: { code: "CUSTOMERS_ERROR", message: error.message } });
  }
});

// Approve a commission (admin)
router.post(
  "/commissions/:commissionId/approve",
  validateParams(commissionIdSchema),
  async (req: Request, res: Response) => {
    try {
      const { commissionId } = req.params;
      const adminId = (req.session as any)?.adminId || "system";

      const result = await affiliateCommissionService.approveCommission(commissionId);

      if (!result.success) {
        return res.status(400).json({ error: { code: "APPROVE_FAILED", message: result.error } });
      }

      // Audit log
      await createAuditLog(
        adminId,
        "commission.approved",
        "affiliate_referral",
        commissionId,
        { approvedBy: adminId }
      );

      res.json({ success: true });
    } catch (error: any) {
      console.error("Failed to approve commission:", error);
      res.status(500).json({ error: { code: "APPROVE_ERROR", message: error.message } });
    }
  }
);

// Void a commission (admin)
router.post(
  "/commissions/:commissionId/void",
  validateParams(commissionIdSchema),
  validateBody(voidCommissionSchema),
  async (req: Request, res: Response) => {
    try {
      const { commissionId } = req.params;
      const { reason } = req.body;
      const adminId = (req.session as any)?.adminId || "system";

      const result = await affiliateCommissionService.voidCommission(commissionId, reason);

      if (!result.success) {
        return res.status(400).json({ error: { code: "VOID_FAILED", message: result.error } });
      }

      // Audit log
      await createAuditLog(
        adminId,
        "commission.voided",
        "affiliate_referral",
        commissionId,
        { voidedBy: adminId, reason: reason || "No reason provided" }
      );

      res.json({ success: true });
    } catch (error: any) {
      console.error("Failed to void commission:", error);
      res.status(500).json({ error: { code: "VOID_ERROR", message: error.message } });
    }
  }
);

// Get flagged commissions for review queue (admin)
router.get("/commissions/flagged", async (req: Request, res: Response) => {
  try {
    const flaggedCommissions = await affiliateCommissionService.getFlaggedCommissions();
    res.json(flaggedCommissions);
  } catch (error: any) {
    console.error("Failed to get flagged commissions:", error);
    res.status(500).json({ error: { code: "FLAGGED_ERROR", message: error.message } });
  }
});

// Review flagged commission - approve (admin)
router.post(
  "/commissions/:commissionId/review-approve",
  validateParams(commissionIdSchema),
  validateBody(z.object({ notes: z.string().max(500).optional() })),
  async (req: Request, res: Response) => {
    try {
      const { commissionId } = req.params;
      const { notes } = req.body;
      const adminId = (req.session as any)?.adminId || "system";

      const result = await affiliateCommissionService.approveCommission(commissionId, adminId, notes);

      if (!result.success) {
        return res.status(400).json({ error: { code: "REVIEW_APPROVE_FAILED", message: result.error } });
      }

      await createAuditLog(
        adminId,
        "commission.review_approved",
        "affiliate_referral",
        commissionId,
        { reviewedBy: adminId, notes }
      );

      res.json({ success: true });
    } catch (error: any) {
      console.error("Failed to review-approve commission:", error);
      res.status(500).json({ error: { code: "REVIEW_APPROVE_ERROR", message: error.message } });
    }
  }
);

// Review flagged commission - void (admin)
router.post(
  "/commissions/:commissionId/review-void",
  validateParams(commissionIdSchema),
  validateBody(z.object({ notes: z.string().min(1, "Reason is required").max(500) })),
  async (req: Request, res: Response) => {
    try {
      const { commissionId } = req.params;
      const { notes } = req.body;
      const adminId = (req.session as any)?.adminId || "system";

      const result = await affiliateCommissionService.voidCommission(commissionId, notes, adminId);

      if (!result.success) {
        return res.status(400).json({ error: { code: "REVIEW_VOID_FAILED", message: result.error } });
      }

      await createAuditLog(
        adminId,
        "commission.review_voided",
        "affiliate_referral",
        commissionId,
        { reviewedBy: adminId, notes }
      );

      res.json({ success: true });
    } catch (error: any) {
      console.error("Failed to review-void commission:", error);
      res.status(500).json({ error: { code: "REVIEW_VOID_ERROR", message: error.message } });
    }
  }
);

// Bulk approve commissions (admin)
router.post(
  "/commissions/bulk-approve",
  validateBody(bulkApproveSchema),
  async (req: Request, res: Response) => {
    try {
      const { commissionIds } = req.body;
      const adminId = (req.session as any)?.adminId || "system";

      const results = await Promise.all(
        commissionIds.map((id: string) => affiliateCommissionService.approveCommission(id))
      );

      const approved = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      // Audit log for bulk action
      await createAuditLog(
        adminId,
        "commission.bulk_approved",
        "affiliate_referral",
        "bulk",
        { commissionIds, approved, failed, adminId }
      );

      res.json({ approved, failed });
    } catch (error: any) {
      console.error("Failed to bulk approve:", error);
      res.status(500).json({ error: { code: "BULK_APPROVE_ERROR", message: error.message } });
    }
  }
);

// Trigger auto-approval of old commissions
router.post("/commissions/auto-approve", async (req: Request, res: Response) => {
  try {
    const result = await affiliateCommissionService.autoApproveCommissions();

    if (result.approved > 0) {
      await createAuditLog(
        "system",
        "commission.auto_approved",
        "affiliate_referral",
        "auto",
        { approved: result.approved, errors: result.errors }
      );
    }

    res.json(result);
  } catch (error: any) {
    console.error("Failed to auto-approve:", error);
    res.status(500).json({ error: { code: "AUTO_APPROVE_ERROR", message: error.message } });
  }
});

const payoutIdSchema = z.object({
  payoutId: z.string().uuid("Invalid payout ID"),
});

function validatePayoutIdParam(req: Request, res: Response, next: () => void) {
  const result = payoutIdSchema.safeParse(req.params);
  if (!result.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: result.error.errors[0]?.message || "Invalid payout ID",
      },
    });
  }
  next();
}

// Admin: Approve a payout request
router.post(
  "/payouts/:payoutId/approve",
  validatePayoutIdParam,
  async (req: Request, res: Response) => {
    try {
      const { payoutId } = req.params;

      const adminId = (req.session as any)?.adminId || "system";

      const payout = await storage.getAffiliatePayout(payoutId);
      if (!payout) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Payout not found" } });
      }
      if (payout.status !== "pending") {
        return res.status(400).json({
          error: { code: "INVALID_STATUS", message: `Cannot approve payout with status: ${payout.status}` },
        });
      }

      await storage.updateAffiliatePayout(payoutId, {
        status: "approved",
        processedBy: adminId,
      });

      await createAuditLog(adminId, "payout.approved", "affiliate_payout", payoutId, {
        affiliateId: payout.affiliateId,
        amount: payout.amount,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Failed to approve payout:", error);
      res.status(500).json({ error: { code: "APPROVE_PAYOUT_ERROR", message: error.message } });
    }
  }
);

// Admin: Reject a payout request
router.post(
  "/payouts/:payoutId/reject",
  validatePayoutIdParam,
  validateBody(z.object({ reason: z.string().min(1).max(500) })),
  async (req: Request, res: Response) => {
    try {
      const { payoutId } = req.params;
      const { reason } = req.body;
      const adminId = (req.session as any)?.adminId || "system";

      const payout = await storage.getAffiliatePayout(payoutId);
      if (!payout) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Payout not found" } });
      }
      if (payout.status !== "pending" && payout.status !== "approved") {
        return res.status(400).json({
          error: { code: "INVALID_STATUS", message: `Cannot reject payout with status: ${payout.status}` },
        });
      }

      await storage.updateAffiliatePayout(payoutId, {
        status: "rejected",
        processedBy: adminId,
        notes: JSON.stringify({ rejectionReason: reason, originalNotes: payout.notes }),
      });

      await createAuditLog(adminId, "payout.rejected", "affiliate_payout", payoutId, {
        affiliateId: payout.affiliateId,
        amount: payout.amount,
        reason,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Failed to reject payout:", error);
      res.status(500).json({ error: { code: "REJECT_PAYOUT_ERROR", message: error.message } });
    }
  }
);

// Admin: Process a payout (mark as paid, update referrals, prevent negative balance)
router.post(
  "/payouts/:payoutId/process",
  validatePayoutIdParam,
  async (req: Request, res: Response) => {
    try {
      const { payoutId } = req.params;
      const adminId = (req.session as any)?.adminId || "system";

      const payout = await storage.getAffiliatePayout(payoutId);
      if (!payout) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Payout not found" } });
      }
      if (payout.status !== "approved") {
        return res.status(400).json({
          error: { code: "INVALID_STATUS", message: `Can only process approved payouts. Current status: ${payout.status}` },
        });
      }

      const affiliate = await storage.getAffiliate(payout.affiliateId);
      if (!affiliate) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Affiliate not found" } });
      }

      // Calculate current approved balance to prevent negative
      const approvedBalance = affiliate.totalEarnings - affiliate.pendingBalance - affiliate.paidBalance;
      if (approvedBalance < payout.amount) {
        return res.status(400).json({
          error: {
            code: "INSUFFICIENT_BALANCE",
            message: `Approved balance ($${(approvedBalance / 100).toFixed(2)}) is less than payout amount ($${(payout.amount / 100).toFixed(2)})`,
          },
        });
      }

      // Parse referral IDs from notes
      let referralIds: string[] = [];
      try {
        const notes = JSON.parse(payout.notes || "{}");
        referralIds = notes.referralIds || [];
      } catch {
        // Fallback: get all approved unpaid referrals
        const approvedReferrals = await affiliatePayoutService.getApprovedUnpaidReferrals(payout.affiliateId);
        referralIds = approvedReferrals.slice(0, Math.ceil(payout.amount / 100)).map((r) => r.id);
      }

      // Transaction: update payout, referrals, and affiliate balance
      await db.transaction(async (tx) => {
        // Mark payout as paid
        await tx
          .update(affiliatePayouts)
          .set({
            status: "paid",
            processedAt: new Date(),
            processedBy: adminId,
          })
          .where(eq(affiliatePayouts.id, payoutId));

        // Mark referrals as paid
        if (referralIds.length > 0) {
          await tx
            .update(affiliateReferrals)
            .set({
              status: "paid",
              paidAt: new Date(),
            })
            .where(
              and(
                inArray(affiliateReferrals.id, referralIds),
                eq(affiliateReferrals.status, "approved")
              )
            );
        }

        // Update affiliate balance (prevent negative via Math.max)
        const newPaidBalance = affiliate.paidBalance + payout.amount;
        await tx
          .update(affiliates)
          .set({
            paidBalance: newPaidBalance,
            updatedAt: new Date(),
          })
          .where(eq(affiliates.id, payout.affiliateId));
      });

      await createAuditLog(adminId, "payout.paid", "affiliate_payout", payoutId, {
        affiliateId: payout.affiliateId,
        amount: payout.amount,
        referralCount: referralIds.length,
      });

      res.json({ success: true, amount: payout.amount });
    } catch (error: any) {
      console.error("Failed to process payout:", error);
      res.status(500).json({ error: { code: "PROCESS_PAYOUT_ERROR", message: error.message } });
    }
  }
);

// Admin: Record manual payout (legacy route - now with validation)
router.post(
  "/:affiliateId/payouts",
  validateParams(affiliateIdSchema),
  validateBody(adminPayoutSchema),
  async (req: Request, res: Response) => {
    try {
      const { affiliateId } = req.params;
      const { amount, paymentMethod, paymentDetails, notes } = req.body;
      const adminId = (req.session as any)?.adminId || "system";

      const affiliate = await storage.getAffiliate(affiliateId);
      if (!affiliate) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Affiliate not found" } });
      }

      // Prevent negative balance
      const approvedBalance = affiliate.totalEarnings - affiliate.pendingBalance - affiliate.paidBalance;
      if (amount > approvedBalance) {
        return res.status(400).json({
          error: {
            code: "INSUFFICIENT_BALANCE",
            message: `Cannot pay $${(amount / 100).toFixed(2)} - only $${(approvedBalance / 100).toFixed(2)} approved`,
          },
        });
      }

      // Get approved referrals to mark as paid
      const approvedReferrals = await affiliatePayoutService.getApprovedUnpaidReferrals(affiliateId);
      let remainingAmount = amount;
      const referralIdsToMark: string[] = [];

      for (const ref of approvedReferrals) {
        if (remainingAmount <= 0) break;
        referralIdsToMark.push(ref.id);
        remainingAmount -= ref.commissionAmount;
      }

      // Transaction: create payout, mark referrals, update balance
      const [payout] = await db.transaction(async (tx) => {
        const [newPayout] = await tx
          .insert(affiliatePayouts)
          .values({
            affiliateId,
            amount,
            paymentMethod: paymentMethod || "paypal",
            paymentDetails,
            status: "paid",
            processedAt: new Date(),
            processedBy: adminId,
            notes,
          })
          .returning();

        if (referralIdsToMark.length > 0) {
          await tx
            .update(affiliateReferrals)
            .set({
              status: "paid",
              paidAt: new Date(),
            })
            .where(inArray(affiliateReferrals.id, referralIdsToMark));
        }

        await tx
          .update(affiliates)
          .set({
            paidBalance: sql`${affiliates.paidBalance} + ${amount}`,
            updatedAt: new Date(),
          })
          .where(eq(affiliates.id, affiliateId));

        return [newPayout];
      });

      await createAuditLog(adminId, "payout.manual", "affiliate_payout", payout.id, {
        affiliateId,
        amount,
        paymentMethod,
        referralCount: referralIdsToMark.length,
      });

      console.log(`[AFFILIATE] Recorded payout: $${(amount / 100).toFixed(2)} for affiliate ${affiliateId}`);
      res.json(payout);
    } catch (error: any) {
      console.error("Failed to record payout:", error);
      res.status(500).json({ error: { code: "PAYOUT_ERROR", message: error.message } });
    }
  }
);

// Get payout history for an affiliate
router.get("/:affiliateId/payouts", validateParams(affiliateIdSchema), async (req: Request, res: Response) => {
  try {
    const { affiliateId } = req.params;

    const payouts = await db
      .select()
      .from(affiliatePayouts)
      .where(eq(affiliatePayouts.affiliateId, affiliateId))
      .orderBy(desc(affiliatePayouts.requestedAt));

    res.json(payouts);
  } catch (error: any) {
    console.error("Failed to get payouts:", error);
    res.status(500).json({ error: { code: "PAYOUTS_ERROR", message: error.message } });
  }
});

// Run payout batch (admin)
router.post(
  "/run-payout-batch",
  validateBody(runPayoutBatchSchema),
  async (req: Request, res: Response) => {
    try {
      const { dryRun } = req.body;
      const adminId = (req.session as any)?.adminId || "system";

      const result = await affiliatePayoutService.runPayoutBatch({
        dryRun,
        adminUserId: adminId,
      });

      res.json(result);
    } catch (error: any) {
      console.error("Failed to run payout batch:", error);
      res.status(500).json({ error: { code: "PAYOUT_BATCH_ERROR", message: error.message } });
    }
  }
);

// Admin: Permanently delete an affiliate and all related data
router.delete(
  "/:affiliateId",
  validateParams(affiliateIdSchema),
  async (req: Request, res: Response) => {
    try {
      const { affiliateId } = req.params;
      const adminId = (req.session as any)?.adminId || "system";

      const affiliate = await storage.getAffiliate(affiliateId);
      if (!affiliate) {
        return res.status(404).json({ error: { code: "NOT_FOUND", message: "Affiliate not found" } });
      }

      await db.transaction(async (tx) => {
        await tx.delete(affiliatePayouts).where(eq(affiliatePayouts.affiliateId, affiliateId));
        await tx.delete(affiliateReferrals).where(eq(affiliateReferrals.affiliateId, affiliateId));
        await tx.delete(affiliateClicks).where(eq(affiliateClicks.affiliateId, affiliateId));
        await tx.delete(affiliateAgreements).where(eq(affiliateAgreements.affiliateId, affiliateId));
        await tx.delete(affiliatePayoutAccounts).where(eq(affiliatePayoutAccounts.affiliateId, affiliateId));

        const usageRecords = await tx.select({ inviteId: affiliateInviteUsages.inviteId })
          .from(affiliateInviteUsages)
          .where(eq(affiliateInviteUsages.affiliateId, affiliateId));

        await tx.delete(affiliateInviteUsages).where(eq(affiliateInviteUsages.affiliateId, affiliateId));

        const affectedInviteIds = Array.from(new Set(usageRecords.map(r => r.inviteId)));
        for (const inviteId of affectedInviteIds) {
          await tx.update(affiliateInvites)
            .set({ timesUsed: sql`GREATEST(${affiliateInvites.timesUsed} - 1, 0)` })
            .where(eq(affiliateInvites.id, inviteId));
        }

        await tx.update(affiliateInvites)
          .set({ usedByAffiliateId: null, usedAt: null })
          .where(eq(affiliateInvites.usedByAffiliateId, affiliateId));
        await tx.delete(affiliates).where(eq(affiliates.id, affiliateId));
      });

      await createAuditLog(adminId, "affiliate.deleted", "affiliate", affiliateId, {
        affiliateCode: affiliate.affiliateCode,
        customerId: affiliate.customerId,
      });

      console.log(`[AFFILIATE] Deleted affiliate ${affiliateId} (code: ${affiliate.affiliateCode})`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Failed to delete affiliate:", error);
      res.status(500).json({ error: { code: "DELETE_ERROR", message: error.message } });
    }
  }
);

export default router;
