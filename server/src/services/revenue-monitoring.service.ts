import { db } from "../../db";
import { 
  revenueAlerts, 
  revenueAlertThresholds, 
  webhookFailures,
  orders,
  refunds,
  affiliatePayouts,
  adminUsers,
  adminNotificationPrefs,
  InsertRevenueAlert,
  InsertWebhookFailure,
  RevenueAlert,
  RevenueAlertThreshold
} from "@shared/schema";
import { eq, and, gte, sql, count, sum, desc, isNull } from "drizzle-orm";
import { emailService } from "../integrations/mailgun";

export interface AlertCheckResult {
  triggered: boolean;
  alert?: InsertRevenueAlert;
  currentValue: number;
  thresholdValue: number;
}

export interface MonitoringMetrics {
  refundRate: number;
  affiliateCommissionRate: number;
  averageOrderValue: number;
  webhookFailureCount: number;
}

const DEFAULT_THRESHOLDS = [
  { alertType: "refund_rate", thresholdValue: 5, comparisonPeriod: "7d" }, // 5% refund rate
  { alertType: "affiliate_commission", thresholdValue: 15, comparisonPeriod: "30d" }, // 15% of revenue
  { alertType: "aov_drop", thresholdValue: 20, comparisonPeriod: "7d" }, // 20% drop
  { alertType: "webhook_failure", thresholdValue: 5, comparisonPeriod: "24h" }, // 5 failures in 24h
];

export class RevenueMonitoringService {
  async initializeDefaultThresholds(): Promise<void> {
    for (const threshold of DEFAULT_THRESHOLDS) {
      const existing = await db.select()
        .from(revenueAlertThresholds)
        .where(eq(revenueAlertThresholds.alertType, threshold.alertType))
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(revenueAlertThresholds).values(threshold);
      }
    }
  }

  async getThresholds(): Promise<RevenueAlertThreshold[]> {
    return db.select().from(revenueAlertThresholds);
  }

  async updateThreshold(id: string, updates: Partial<RevenueAlertThreshold>): Promise<RevenueAlertThreshold | null> {
    const [updated] = await db.update(revenueAlertThresholds)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(revenueAlertThresholds.id, id))
      .returning();
    return updated || null;
  }

  private getPeriodDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case "24h": return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case "7d": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "30d": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }

  async checkRefundRate(threshold: RevenueAlertThreshold): Promise<AlertCheckResult> {
    const periodStart = this.getPeriodDate(threshold.comparisonPeriod || "7d");
    
    const [orderStats] = await db.select({
      totalOrders: count(),
      totalRevenue: sum(orders.totalAmount),
    }).from(orders).where(gte(orders.createdAt, periodStart));

    const [refundStats] = await db.select({
      totalRefunds: count(),
      refundedAmount: sum(refunds.amount),
    }).from(refunds).where(gte(refunds.createdAt, periodStart));

    const totalOrders = Number(orderStats?.totalOrders || 0);
    const totalRefunds = Number(refundStats?.totalRefunds || 0);
    const refundRate = totalOrders > 0 ? (totalRefunds / totalOrders) * 100 : 0;

    const triggered = refundRate > threshold.thresholdValue;
    
    return {
      triggered,
      currentValue: refundRate,
      thresholdValue: threshold.thresholdValue,
      alert: triggered ? {
        alertType: "refund_rate",
        severity: refundRate > threshold.thresholdValue * 2 ? "critical" : "warning",
        title: "High Refund Rate Detected",
        message: `Refund rate is ${refundRate.toFixed(1)}% (threshold: ${threshold.thresholdValue}%). ${totalRefunds} refunds out of ${totalOrders} orders in the last ${threshold.comparisonPeriod}.`,
        currentValue: refundRate,
        thresholdValue: threshold.thresholdValue,
        metadata: { totalOrders, totalRefunds, period: threshold.comparisonPeriod },
      } : undefined,
    };
  }

  async checkAffiliateCommission(threshold: RevenueAlertThreshold): Promise<AlertCheckResult> {
    const periodStart = this.getPeriodDate(threshold.comparisonPeriod || "30d");
    
    const [orderStats] = await db.select({
      totalRevenue: sum(orders.totalAmount),
    }).from(orders).where(gte(orders.createdAt, periodStart));

    const [payoutStats] = await db.select({
      totalPayouts: sum(affiliatePayouts.amount),
    }).from(affiliatePayouts).where(gte(affiliatePayouts.requestedAt, periodStart));

    const totalRevenue = Number(orderStats?.totalRevenue || 0);
    const totalPayouts = Number(payoutStats?.totalPayouts || 0);
    const commissionRate = totalRevenue > 0 ? (totalPayouts / totalRevenue) * 100 : 0;

    const triggered = commissionRate > threshold.thresholdValue;
    
    return {
      triggered,
      currentValue: commissionRate,
      thresholdValue: threshold.thresholdValue,
      alert: triggered ? {
        alertType: "affiliate_commission",
        severity: commissionRate > threshold.thresholdValue * 1.5 ? "critical" : "warning",
        title: "Affiliate Commissions Exceeding Threshold",
        message: `Affiliate commissions are ${commissionRate.toFixed(1)}% of revenue (threshold: ${threshold.thresholdValue}%). Total payouts: $${(totalPayouts / 100).toFixed(2)} on $${(totalRevenue / 100).toFixed(2)} revenue.`,
        currentValue: commissionRate,
        thresholdValue: threshold.thresholdValue,
        metadata: { totalRevenue, totalPayouts, period: threshold.comparisonPeriod },
      } : undefined,
    };
  }

  async checkAOVDrop(threshold: RevenueAlertThreshold): Promise<AlertCheckResult> {
    const currentPeriodStart = this.getPeriodDate(threshold.comparisonPeriod || "7d");
    const previousPeriodStart = new Date(currentPeriodStart.getTime() - (new Date().getTime() - currentPeriodStart.getTime()));

    const [currentStats] = await db.select({
      orderCount: count(),
      totalRevenue: sum(orders.totalAmount),
    }).from(orders).where(gte(orders.createdAt, currentPeriodStart));

    const [previousStats] = await db.select({
      orderCount: count(),
      totalRevenue: sum(orders.totalAmount),
    }).from(orders).where(
      and(
        gte(orders.createdAt, previousPeriodStart),
        sql`${orders.createdAt} < ${currentPeriodStart}`
      )
    );

    const currentAOV = Number(currentStats?.orderCount || 0) > 0 
      ? Number(currentStats?.totalRevenue || 0) / Number(currentStats?.orderCount || 1)
      : 0;
    const previousAOV = Number(previousStats?.orderCount || 0) > 0 
      ? Number(previousStats?.totalRevenue || 0) / Number(previousStats?.orderCount || 1)
      : 0;

    const dropPercent = previousAOV > 0 ? ((previousAOV - currentAOV) / previousAOV) * 100 : 0;
    const triggered = dropPercent > threshold.thresholdValue;
    
    return {
      triggered,
      currentValue: dropPercent,
      thresholdValue: threshold.thresholdValue,
      alert: triggered ? {
        alertType: "aov_drop",
        severity: dropPercent > threshold.thresholdValue * 2 ? "critical" : "warning",
        title: "Average Order Value Dropped Significantly",
        message: `AOV dropped ${dropPercent.toFixed(1)}% compared to the previous period (threshold: ${threshold.thresholdValue}%). Current AOV: $${(currentAOV / 100).toFixed(2)}, Previous: $${(previousAOV / 100).toFixed(2)}.`,
        currentValue: dropPercent,
        thresholdValue: threshold.thresholdValue,
        metadata: { currentAOV, previousAOV, period: threshold.comparisonPeriod },
      } : undefined,
    };
  }

  async checkWebhookFailures(threshold: RevenueAlertThreshold): Promise<AlertCheckResult> {
    const periodStart = this.getPeriodDate(threshold.comparisonPeriod || "24h");
    
    const [stats] = await db.select({
      failureCount: count(),
    }).from(webhookFailures).where(
      and(
        gte(webhookFailures.createdAt, periodStart),
        isNull(webhookFailures.resolvedAt)
      )
    );

    const failureCount = Number(stats?.failureCount || 0);
    const triggered = failureCount >= threshold.thresholdValue;
    
    return {
      triggered,
      currentValue: failureCount,
      thresholdValue: threshold.thresholdValue,
      alert: triggered ? {
        alertType: "webhook_failure",
        severity: failureCount >= threshold.thresholdValue * 2 ? "critical" : "warning",
        title: "Webhook Failures Detected",
        message: `${failureCount} webhook failures in the last ${threshold.comparisonPeriod} (threshold: ${threshold.thresholdValue}). Check integration health immediately.`,
        currentValue: failureCount,
        thresholdValue: threshold.thresholdValue,
        metadata: { failureCount, period: threshold.comparisonPeriod },
      } : undefined,
    };
  }

  async runAllChecks(): Promise<{ alerts: RevenueAlert[], metrics: MonitoringMetrics }> {
    await this.initializeDefaultThresholds();
    const thresholds = await this.getThresholds();
    const alerts: RevenueAlert[] = [];
    const metrics: MonitoringMetrics = {
      refundRate: 0,
      affiliateCommissionRate: 0,
      averageOrderValue: 0,
      webhookFailureCount: 0,
    };

    for (const threshold of thresholds) {
      if (!threshold.enabled) continue;

      let result: AlertCheckResult | null = null;

      switch (threshold.alertType) {
        case "refund_rate":
          result = await this.checkRefundRate(threshold);
          metrics.refundRate = result.currentValue;
          break;
        case "affiliate_commission":
          result = await this.checkAffiliateCommission(threshold);
          metrics.affiliateCommissionRate = result.currentValue;
          break;
        case "aov_drop":
          result = await this.checkAOVDrop(threshold);
          break;
        case "webhook_failure":
          result = await this.checkWebhookFailures(threshold);
          metrics.webhookFailureCount = result.currentValue;
          break;
      }

      if (result?.triggered && result.alert) {
        const recentAlert = await db.select()
          .from(revenueAlerts)
          .where(
            and(
              eq(revenueAlerts.alertType, threshold.alertType),
              isNull(revenueAlerts.acknowledgedAt),
              gte(revenueAlerts.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
            )
          )
          .limit(1);

        if (recentAlert.length === 0) {
          const [newAlert] = await db.insert(revenueAlerts).values(result.alert).returning();
          alerts.push(newAlert);
          
          if (threshold.emailAlertEnabled) {
            await this.sendAlertEmail(newAlert);
          }
        }
      }
    }

    return { alerts, metrics };
  }

  async sendAlertEmail(alert: RevenueAlert): Promise<void> {
    try {
      const admins = await db.select()
        .from(adminUsers)
        .where(eq(adminUsers.role, "admin"));
      
      if (admins.length === 0) return;

      const adminEmails = admins
        .filter(admin => admin.email)
        .map(admin => admin.email);
      
      if (adminEmails.length === 0) return;

      const severityEmoji = alert.severity === "critical" ? "🚨" : alert.severity === "warning" ? "⚠️" : "ℹ️";
      const subject = `${severityEmoji} Revenue Alert: ${alert.title}`;
      const baseUrl = process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
        : process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : process.env.REPL_SLUG 
            ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` 
            : 'https://your-domain.replit.app';
      const dashboardUrl = `${baseUrl}/admin/alerts`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1e293b; color: #fff; padding: 20px; border-radius: 8px;">
          <h2 style="color: ${alert.severity === 'critical' ? '#ef4444' : '#f59e0b'}; margin-bottom: 16px;">
            ${severityEmoji} ${alert.title}
          </h2>
          <p style="color: #cbd5e1; line-height: 1.6;">${alert.message}</p>
          <div style="background: #334155; padding: 16px; border-radius: 4px; margin: 16px 0;">
            <p style="margin: 8px 0;"><strong style="color: #67e8f9;">Severity:</strong> ${alert.severity.toUpperCase()}</p>
            <p style="margin: 8px 0;"><strong style="color: #67e8f9;">Current Value:</strong> ${alert.currentValue.toFixed(1)}</p>
            <p style="margin: 8px 0;"><strong style="color: #67e8f9;">Threshold:</strong> ${alert.thresholdValue}</p>
          </div>
          <a href="${dashboardUrl}" style="display: inline-block; background: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
            View in Dashboard
          </a>
          <hr style="border: none; border-top: 1px solid #475569; margin: 24px 0;">
          <p style="color: #64748b; font-size: 12px;">
            This is an automated alert from Power Plunge Revenue Guardrails.
          </p>
        </div>
      `;

      const result = await emailService.sendEmail({
        to: adminEmails,
        subject,
        html,
      });

      if (result.success) {
        console.log(`[Revenue Alert] Email sent to ${adminEmails.length} admin(s): ${subject}`);
        await db.update(revenueAlerts)
          .set({ emailSentAt: new Date() })
          .where(eq(revenueAlerts.id, alert.id));
      } else {
        console.error(`[Revenue Alert] Failed to send email: ${result.error}`);
      }
    } catch (error) {
      console.error("Failed to send alert email:", error);
    }
  }

  async logWebhookFailure(failure: InsertWebhookFailure): Promise<void> {
    await db.insert(webhookFailures).values(failure);
  }

  async getActiveAlerts(): Promise<RevenueAlert[]> {
    return db.select()
      .from(revenueAlerts)
      .where(isNull(revenueAlerts.acknowledgedAt))
      .orderBy(desc(revenueAlerts.createdAt));
  }

  async getAllAlerts(limit = 50): Promise<RevenueAlert[]> {
    return db.select()
      .from(revenueAlerts)
      .orderBy(desc(revenueAlerts.createdAt))
      .limit(limit);
  }

  async acknowledgeAlert(alertId: string, adminId: string): Promise<RevenueAlert | null> {
    const [updated] = await db.update(revenueAlerts)
      .set({ acknowledgedAt: new Date(), acknowledgedBy: adminId })
      .where(eq(revenueAlerts.id, alertId))
      .returning();
    return updated || null;
  }

  async resolveAlert(alertId: string): Promise<RevenueAlert | null> {
    const [updated] = await db.update(revenueAlerts)
      .set({ resolvedAt: new Date() })
      .where(eq(revenueAlerts.id, alertId))
      .returning();
    return updated || null;
  }

  async getWebhookFailures(limit = 50): Promise<any[]> {
    return db.select()
      .from(webhookFailures)
      .orderBy(desc(webhookFailures.createdAt))
      .limit(limit);
  }

  async getAlertStats(): Promise<{
    activeCount: number;
    criticalCount: number;
    todayCount: number;
    resolvedToday: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [activeStats] = await db.select({
      count: count(),
    }).from(revenueAlerts).where(isNull(revenueAlerts.acknowledgedAt));

    const [criticalStats] = await db.select({
      count: count(),
    }).from(revenueAlerts).where(
      and(
        isNull(revenueAlerts.acknowledgedAt),
        eq(revenueAlerts.severity, "critical")
      )
    );

    const [todayStats] = await db.select({
      count: count(),
    }).from(revenueAlerts).where(gte(revenueAlerts.createdAt, today));

    const [resolvedStats] = await db.select({
      count: count(),
    }).from(revenueAlerts).where(
      and(
        gte(revenueAlerts.resolvedAt, today),
        sql`${revenueAlerts.resolvedAt} IS NOT NULL`
      )
    );

    return {
      activeCount: Number(activeStats?.count || 0),
      criticalCount: Number(criticalStats?.count || 0),
      todayCount: Number(todayStats?.count || 0),
      resolvedToday: Number(resolvedStats?.count || 0),
    };
  }
}

export const revenueMonitoringService = new RevenueMonitoringService();
