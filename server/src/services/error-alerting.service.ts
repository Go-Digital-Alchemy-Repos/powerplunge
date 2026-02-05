import { db } from "../../db";
import { adminUsers, webhookFailures, InsertWebhookFailure } from "@shared/schema";
import { eq, gte, count } from "drizzle-orm";
import { emailService } from "../integrations/mailgun";

export type ErrorSeverity = "critical" | "warning" | "info";
export type ErrorCategory = "payment_failure" | "webhook_failure" | "payout_error" | "system_error";

export interface ErrorAlertOptions {
  category: ErrorCategory;
  severity: ErrorSeverity;
  title: string;
  message: string;
  details?: Record<string, any>;
  shouldEmail?: boolean;
}

interface RateLimitEntry {
  count: number;
  lastSent: Date;
}

/**
 * Centralized error alerting service for sending admin notifications.
 * 
 * Note: Rate limiting uses in-memory storage. In multi-process deployments
 * or after server restarts, rate limit counters reset. For high-availability
 * scenarios, consider using Redis or database-backed rate limiting.
 */
class ErrorAlertingService {
  private rateLimitCache: Map<string, RateLimitEntry> = new Map();
  private readonly RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  private readonly MAX_EMAILS_PER_WINDOW = 3;

  async alert(options: ErrorAlertOptions): Promise<void> {
    const { category, severity, title, message, details, shouldEmail = true } = options;
    
    const logPrefix = `[ERROR-ALERT][${category.toUpperCase()}][${severity.toUpperCase()}]`;
    console.error(`${logPrefix} ${title}: ${message}`, details ? JSON.stringify(details) : "");

    if (category === "webhook_failure" && details) {
      await this.logWebhookFailure(details);
    }

    if (shouldEmail && (severity === "critical" || severity === "warning")) {
      const shouldSend = this.checkRateLimit(category);
      if (shouldSend) {
        await this.sendAlertEmail(options);
      } else {
        console.log(`${logPrefix} Email rate limited, skipping notification`);
      }
    }
  }

  private checkRateLimit(category: ErrorCategory): boolean {
    const now = new Date();
    const key = category;
    const entry = this.rateLimitCache.get(key);

    if (!entry) {
      this.rateLimitCache.set(key, { count: 1, lastSent: now });
      return true;
    }

    const timeSinceFirst = now.getTime() - entry.lastSent.getTime();
    if (timeSinceFirst > this.RATE_LIMIT_WINDOW_MS) {
      this.rateLimitCache.set(key, { count: 1, lastSent: now });
      return true;
    }

    if (entry.count < this.MAX_EMAILS_PER_WINDOW) {
      entry.count++;
      return true;
    }

    return false;
  }

  private async logWebhookFailure(details: Record<string, any>): Promise<void> {
    try {
      const failure: InsertWebhookFailure = {
        provider: details.provider || "stripe",
        eventType: details.eventType || "unknown",
        eventId: details.eventId,
        errorMessage: details.errorMessage,
        errorCode: details.errorCode,
        payload: details.payload,
      };
      await db.insert(webhookFailures).values(failure);
    } catch (error) {
      console.error("[ERROR-ALERT] Failed to log webhook failure to database:", error);
    }
  }

  private async sendAlertEmail(options: ErrorAlertOptions): Promise<void> {
    try {
      const admins = await db.select()
        .from(adminUsers)
        .where(eq(adminUsers.role, "admin"));
      
      if (admins.length === 0) return;

      const adminEmails = admins
        .filter(admin => admin.email)
        .map(admin => admin.email)
        .filter((email): email is string => !!email);
      
      if (adminEmails.length === 0) return;

      const severityEmoji = options.severity === "critical" ? "🚨" : options.severity === "warning" ? "⚠️" : "ℹ️";
      const categoryLabel = this.getCategoryLabel(options.category);
      const subject = `${severityEmoji} ${categoryLabel}: ${options.title}`;
      
      const baseUrl = process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
        : process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : process.env.REPL_SLUG 
            ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` 
            : 'https://your-domain.replit.app';
      const dashboardUrl = `${baseUrl}/admin/alerts`;
      
      const detailsHtml = options.details ? `
        <div style="background: #1e293b; padding: 12px; border-radius: 4px; margin: 16px 0; font-family: monospace; font-size: 12px; overflow-x: auto;">
          <pre style="margin: 0; color: #94a3b8; white-space: pre-wrap;">${JSON.stringify(options.details, null, 2)}</pre>
        </div>
      ` : "";

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #fff; padding: 24px; border-radius: 8px;">
          <div style="border-left: 4px solid ${options.severity === 'critical' ? '#ef4444' : '#f59e0b'}; padding-left: 16px; margin-bottom: 20px;">
            <h2 style="color: ${options.severity === 'critical' ? '#ef4444' : '#f59e0b'}; margin: 0 0 8px 0;">
              ${severityEmoji} ${options.title}
            </h2>
            <span style="color: #64748b; font-size: 12px; text-transform: uppercase;">${categoryLabel}</span>
          </div>
          
          <p style="color: #cbd5e1; line-height: 1.6; margin-bottom: 16px;">${options.message}</p>
          
          ${detailsHtml}
          
          <div style="background: #1e293b; padding: 16px; border-radius: 4px; margin: 16px 0;">
            <p style="margin: 8px 0;"><strong style="color: #67e8f9;">Severity:</strong> <span style="color: ${options.severity === 'critical' ? '#ef4444' : '#f59e0b'}">${options.severity.toUpperCase()}</span></p>
            <p style="margin: 8px 0;"><strong style="color: #67e8f9;">Category:</strong> ${categoryLabel}</p>
            <p style="margin: 8px 0;"><strong style="color: #67e8f9;">Time:</strong> ${new Date().toISOString()}</p>
          </div>
          
          <a href="${dashboardUrl}" style="display: inline-block; background: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
            View Admin Dashboard
          </a>
          
          <hr style="border: none; border-top: 1px solid #334155; margin: 24px 0;">
          <p style="color: #475569; font-size: 12px;">
            This is an automated error alert from Power Plunge. You are receiving this because you are an admin.
          </p>
        </div>
      `;

      const result = await emailService.sendEmail({
        to: adminEmails,
        subject,
        html,
      });

      if (result.success) {
        console.log(`[ERROR-ALERT] Email sent to ${adminEmails.length} admin(s): ${subject}`);
      } else {
        console.error(`[ERROR-ALERT] Failed to send email: ${result.error}`);
      }
    } catch (error) {
      console.error("[ERROR-ALERT] Failed to send alert email:", error);
    }
  }

  private getCategoryLabel(category: ErrorCategory): string {
    switch (category) {
      case "payment_failure": return "Payment Failure";
      case "webhook_failure": return "Webhook Failure";
      case "payout_error": return "Payout Error";
      case "system_error": return "System Error";
      default: return "Error Alert";
    }
  }

  async alertPaymentFailure(params: {
    orderId?: string;
    customerId?: string;
    email?: string;
    amount?: number;
    errorMessage: string;
    errorCode?: string;
    paymentIntentId?: string;
  }): Promise<void> {
    await this.alert({
      category: "payment_failure",
      severity: "critical",
      title: "Payment Processing Failed",
      message: `A payment attempt failed for ${params.email || "unknown customer"}. Amount: $${((params.amount || 0) / 100).toFixed(2)}. Error: ${params.errorMessage}`,
      details: params,
    });
  }

  async alertWebhookFailure(params: {
    provider: string;
    eventType: string;
    eventId?: string;
    errorMessage: string;
    errorCode?: string;
    payload?: any;
  }): Promise<void> {
    await this.alert({
      category: "webhook_failure",
      severity: "warning",
      title: `${params.provider} Webhook Failed`,
      message: `Failed to process ${params.eventType} event from ${params.provider}. Error: ${params.errorMessage}`,
      details: params,
    });
  }

  async alertPayoutBatchError(params: {
    batchId: string;
    totalPayouts: number;
    failedCount: number;
    totalAmount: number;
    errors: string[];
  }): Promise<void> {
    // Guard against division by zero
    const safeTotal = Math.max(params.totalPayouts, 1);
    const severity = params.failedCount > safeTotal * 0.5 ? "critical" : "warning";
    const successRate = params.totalPayouts > 0 
      ? `${(((params.totalPayouts - params.failedCount) / params.totalPayouts) * 100).toFixed(1)}%`
      : "N/A";
    
    await this.alert({
      category: "payout_error",
      severity,
      title: "Affiliate Payout Batch Errors",
      message: `Payout batch ${params.batchId} completed with ${params.failedCount} failures out of ${params.totalPayouts} payouts. Total amount affected: $${(params.totalAmount / 100).toFixed(2)}`,
      details: {
        batchId: params.batchId,
        totalPayouts: params.totalPayouts,
        failedCount: params.failedCount,
        successRate,
        errors: params.errors.slice(0, 10),
        errorCount: params.errors.length,
      },
    });
  }

  async alertSystemError(params: {
    component: string;
    operation: string;
    errorMessage: string;
    errorStack?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.alert({
      category: "system_error",
      severity: "critical",
      title: `System Error: ${params.component}`,
      message: `An error occurred in ${params.component} during ${params.operation}: ${params.errorMessage}`,
      details: {
        component: params.component,
        operation: params.operation,
        errorMessage: params.errorMessage,
        stack: params.errorStack?.slice(0, 500),
        ...params.metadata,
      },
    });
  }

  async getRecentErrorCount(category: ErrorCategory, hoursBack: number = 24): Promise<number> {
    if (category === "webhook_failure") {
      const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
      const [result] = await db.select({ count: count() })
        .from(webhookFailures)
        .where(gte(webhookFailures.createdAt, since));
      return result?.count || 0;
    }
    return 0;
  }
}

export const errorAlertingService = new ErrorAlertingService();
