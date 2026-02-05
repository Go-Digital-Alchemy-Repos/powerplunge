import { jobRunner, type JobDefinition, type JobResult } from "./job-runner";
import { affiliatePayoutService } from "./affiliate-payout.service";
import { affiliateCommissionService } from "./affiliate-commission.service";
import { db } from "../db";
import { orders, customers, dailyMetrics } from "@shared/schema";
import { eq, gte, lte, and, sql } from "drizzle-orm";

function getDateKey(date: Date = new Date()): string {
  return date.toISOString().split("T")[0];
}

function getWeekKey(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + startOfYear.getUTCDay() + 1) / 7);
  return `${year}-W${week.toString().padStart(2, "0")}`;
}

const affiliatePayoutJob: JobDefinition = {
  name: "affiliate_payout",
  description: "Process weekly affiliate payouts via Stripe Connect",
  schedule: "weekly",
  getRunKey: () => `affiliate_payout:${getWeekKey()}`,
  handler: async (): Promise<JobResult> => {
    try {
      const result = await affiliatePayoutService.runPayoutBatch({
        dryRun: false,
      });

      return {
        success: true,
        message: `Processed ${result.successfulPayouts} payouts, ${result.failedPayouts} failed`,
        data: {
          batchId: result.batchId,
          totalPaid: result.totalAmountPaid,
          successful: result.successfulPayouts,
          failed: result.failedPayouts,
          skipped: result.skippedPayouts,
        },
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },
};

const commissionApprovalJob: JobDefinition = {
  name: "commission_approval",
  description: "Auto-approve pending commissions after configured days",
  schedule: "daily",
  getRunKey: () => `commission_approval:${getDateKey()}`,
  handler: async (): Promise<JobResult> => {
    try {
      const result = await affiliateCommissionService.autoApproveCommissions();

      if (result.errors.length > 0) {
        return {
          success: false,
          message: `Approved ${result.approved} commissions with ${result.errors.length} errors`,
          data: { approved: result.approved, errors: result.errors },
        };
      }

      return {
        success: true,
        message: `Approved ${result.approved} commissions`,
        data: { approved: result.approved },
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },
};

const metricsAggregationJob: JobDefinition = {
  name: "metrics_aggregation",
  description: "Aggregate daily metrics for reporting",
  schedule: "daily",
  getRunKey: () => `metrics_aggregation:${getDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000))}`,
  handler: async (): Promise<JobResult> => {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);

      const [orderStats] = await db
        .select({
          count: sql<number>`count(*)::int`,
          revenue: sql<number>`coalesce(sum(total_amount), 0)::int`,
          avgOrderValue: sql<number>`coalesce(avg(total_amount), 0)::int`,
        })
        .from(orders)
        .where(
          and(
            gte(orders.createdAt, yesterday),
            lte(orders.createdAt, endOfYesterday)
          )
        );

      const [customerStats] = await db
        .select({
          newCustomers: sql<number>`count(*)::int`,
        })
        .from(customers)
        .where(
          and(
            gte(customers.createdAt, yesterday),
            lte(customers.createdAt, endOfYesterday)
          )
        );

      const existing = await db
        .select({ id: dailyMetrics.id })
        .from(dailyMetrics)
        .where(eq(dailyMetrics.date, yesterday))
        .limit(1);

      if (existing.length > 0) {
        await db.update(dailyMetrics)
          .set({
            totalOrders: orderStats?.count || 0,
            totalRevenue: orderStats?.revenue || 0,
            newCustomers: customerStats?.newCustomers || 0,
            averageOrderValue: orderStats?.avgOrderValue || 0,
          })
          .where(eq(dailyMetrics.id, existing[0].id));
      } else {
        await db.insert(dailyMetrics).values({
          date: yesterday,
          totalOrders: orderStats?.count || 0,
          totalRevenue: orderStats?.revenue || 0,
          newCustomers: customerStats?.newCustomers || 0,
          averageOrderValue: orderStats?.avgOrderValue || 0,
          pageViews: 0,
          conversionRate: "0",
        });
      }

      return {
        success: true,
        message: `Aggregated metrics for ${getDateKey(yesterday)}`,
        data: {
          date: getDateKey(yesterday),
          orders: orderStats?.count || 0,
          revenue: orderStats?.revenue || 0,
          newCustomers: customerStats?.newCustomers || 0,
        },
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },
};

const recoveryEmailJob: JobDefinition = {
  name: "recovery_emails",
  description: "Send recovery emails for abandoned carts and failed payments (runs hourly)",
  schedule: "hourly",
  getRunKey: () => {
    const now = new Date();
    const hour = now.getUTCHours().toString().padStart(2, "0");
    return `recovery_emails:${getDateKey()}-${hour}`;
  },
  handler: async (): Promise<JobResult> => {
    try {
      const { checkoutRecoveryService } = await import("./checkout-recovery.service");
      const result = await checkoutRecoveryService.runRecoveryEmailJob();

      const totalSent = result.abandonedCarts.sent + result.failedPayments.sent;
      const totalErrors = result.abandonedCarts.errors.length + result.failedPayments.errors.length;

      if (totalErrors > 0) {
        return {
          success: false,
          message: `Sent ${totalSent} recovery emails with ${totalErrors} errors`,
          data: {
            abandonedCartsSent: result.abandonedCarts.sent,
            failedPaymentsSent: result.failedPayments.sent,
            errors: [...result.abandonedCarts.errors, ...result.failedPayments.errors].slice(0, 5),
          },
        };
      }

      return {
        success: true,
        message: `Sent ${totalSent} recovery emails`,
        data: {
          abandonedCartsSent: result.abandonedCarts.sent,
          failedPaymentsSent: result.failedPayments.sent,
        },
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },
};

export function registerScheduledJobs(): void {
  console.log("[SCHEDULED-JOBS] Registering background jobs...");
  
  jobRunner.register(affiliatePayoutJob);
  jobRunner.register(commissionApprovalJob);
  jobRunner.register(metricsAggregationJob);
  jobRunner.register(recoveryEmailJob);
  
  console.log("[SCHEDULED-JOBS] All jobs registered");
}

export function startScheduledJobs(): void {
  registerScheduledJobs();
  jobRunner.start();
}
