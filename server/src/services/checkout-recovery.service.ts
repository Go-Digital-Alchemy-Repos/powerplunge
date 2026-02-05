import { db } from "../db";
import { storage } from "../../storage";
import {
  abandonedCarts,
  failedPayments,
  recoveryEvents,
  orders,
  customers,
  InsertAbandonedCart,
  InsertFailedPayment,
  AbandonedCart,
  FailedPayment,
} from "@shared/schema";
import { eq, sql, and, gte, lte, lt, isNull, desc, isNotNull } from "drizzle-orm";

export interface RecoveryAnalytics {
  abandonedCarts: {
    total: number;
    totalValue: number;
    emailsSent: number;
    recovered: number;
    recoveredValue: number;
    conversionRate: number;
  };
  failedPayments: {
    total: number;
    totalValue: number;
    emailsSent: number;
    recovered: number;
    recoveredValue: number;
    conversionRate: number;
  };
  totalLostRevenue: number;
  totalRecoveredRevenue: number;
  overallConversionRate: number;
}

export interface AbandonedCartWithDetails extends AbandonedCart {
  customerName?: string;
  customerEmail?: string;
}

export interface FailedPaymentWithDetails extends FailedPayment {
  customerName?: string;
  orderNumber?: string;
}

class CheckoutRecoveryService {
  private readonly CART_ABANDONMENT_THRESHOLD_MINUTES = 60;
  private readonly MAX_RECOVERY_EMAILS = 2;
  private readonly RECOVERY_EMAIL_INTERVAL_HOURS = 24;

  async trackCartActivity(
    sessionId: string,
    cartData: any,
    cartValue: number,
    email?: string,
    customerId?: string,
    couponCode?: string,
    affiliateCode?: string
  ): Promise<void> {
    const existing = await db
      .select()
      .from(abandonedCarts)
      .where(
        and(
          eq(abandonedCarts.sessionId, sessionId),
          isNull(abandonedCarts.recoveredAt)
        )
      )
      .limit(1);

    const now = new Date();

    if (existing.length > 0) {
      await db
        .update(abandonedCarts)
        .set({
          cartData,
          cartValue,
          email: email || existing[0].email,
          customerId: customerId || existing[0].customerId,
          couponCode,
          affiliateCode,
          lastActivityAt: now,
          abandonedAt: null,
        })
        .where(eq(abandonedCarts.id, existing[0].id));
    } else {
      await db.insert(abandonedCarts).values({
        sessionId,
        cartData,
        cartValue,
        email,
        customerId,
        couponCode,
        affiliateCode,
        lastActivityAt: now,
      });
    }
  }

  async markCartRecovered(sessionId: string, orderId: string): Promise<void> {
    const cart = await db
      .select()
      .from(abandonedCarts)
      .where(
        and(
          eq(abandonedCarts.sessionId, sessionId),
          isNull(abandonedCarts.recoveredAt)
        )
      )
      .limit(1);

    if (cart.length === 0) return;

    await db
      .update(abandonedCarts)
      .set({
        recoveredAt: new Date(),
        recoveredOrderId: orderId,
      })
      .where(eq(abandonedCarts.id, cart[0].id));

    await this.recordRecoveryEvent(
      "abandoned_cart",
      cart[0].id,
      "recovered",
      orderId,
      cart[0].cartValue
    );
  }

  async detectAbandonedCarts(): Promise<AbandonedCart[]> {
    const thresholdTime = new Date();
    thresholdTime.setMinutes(
      thresholdTime.getMinutes() - this.CART_ABANDONMENT_THRESHOLD_MINUTES
    );

    const carts = await db
      .select()
      .from(abandonedCarts)
      .where(
        and(
          isNull(abandonedCarts.recoveredAt),
          isNull(abandonedCarts.abandonedAt),
          lt(abandonedCarts.lastActivityAt, thresholdTime),
          isNotNull(abandonedCarts.email)
        )
      );

    for (const cart of carts) {
      await db
        .update(abandonedCarts)
        .set({ abandonedAt: new Date() })
        .where(eq(abandonedCarts.id, cart.id));
    }

    return carts;
  }

  async getAbandonedCartsForRecovery(): Promise<AbandonedCart[]> {
    const now = new Date();
    const emailIntervalAgo = new Date();
    emailIntervalAgo.setHours(
      emailIntervalAgo.getHours() - this.RECOVERY_EMAIL_INTERVAL_HOURS
    );

    return await db
      .select()
      .from(abandonedCarts)
      .where(
        and(
          isNull(abandonedCarts.recoveredAt),
          isNotNull(abandonedCarts.abandonedAt),
          isNotNull(abandonedCarts.email),
          sql`${abandonedCarts.recoveryEmailSent} < ${this.MAX_RECOVERY_EMAILS}`,
          sql`(${abandonedCarts.recoveryEmailSentAt} IS NULL OR ${abandonedCarts.recoveryEmailSentAt} < ${emailIntervalAgo})`
        )
      );
  }

  async markRecoveryEmailSent(cartId: string): Promise<void> {
    await db
      .update(abandonedCarts)
      .set({
        recoveryEmailSent: sql`${abandonedCarts.recoveryEmailSent} + 1`,
        recoveryEmailSentAt: new Date(),
      })
      .where(eq(abandonedCarts.id, cartId));

    await this.recordRecoveryEvent("abandoned_cart", cartId, "email_sent");
  }

  async recordFailedPayment(
    orderId: string,
    email: string,
    amount: number,
    paymentIntentId?: string,
    failureReason?: string,
    failureCode?: string,
    customerId?: string
  ): Promise<void> {
    const existing = await db
      .select()
      .from(failedPayments)
      .where(eq(failedPayments.orderId, orderId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(failedPayments)
        .set({
          paymentIntentId,
          failureReason,
          failureCode,
        })
        .where(eq(failedPayments.id, existing[0].id));
    } else {
      await db.insert(failedPayments).values({
        orderId,
        email,
        amount,
        paymentIntentId,
        failureReason,
        failureCode,
        customerId,
      });
    }
  }

  async markPaymentRecovered(orderId: string): Promise<void> {
    const payment = await db
      .select()
      .from(failedPayments)
      .where(
        and(eq(failedPayments.orderId, orderId), isNull(failedPayments.recoveredAt))
      )
      .limit(1);

    if (payment.length === 0) return;

    await db
      .update(failedPayments)
      .set({ recoveredAt: new Date() })
      .where(eq(failedPayments.id, payment[0].id));

    await this.recordRecoveryEvent(
      "failed_payment",
      payment[0].id,
      "recovered",
      orderId,
      payment[0].amount
    );
  }

  async getFailedPaymentsForRecovery(): Promise<FailedPayment[]> {
    const emailIntervalAgo = new Date();
    emailIntervalAgo.setHours(
      emailIntervalAgo.getHours() - this.RECOVERY_EMAIL_INTERVAL_HOURS
    );

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return await db
      .select()
      .from(failedPayments)
      .where(
        and(
          isNull(failedPayments.recoveredAt),
          isNull(failedPayments.expiredAt),
          gte(failedPayments.createdAt, sevenDaysAgo),
          sql`${failedPayments.recoveryEmailSent} < ${this.MAX_RECOVERY_EMAILS}`,
          sql`(${failedPayments.recoveryEmailSentAt} IS NULL OR ${failedPayments.recoveryEmailSentAt} < ${emailIntervalAgo})`
        )
      );
  }

  async markFailedPaymentEmailSent(paymentId: string): Promise<void> {
    await db
      .update(failedPayments)
      .set({
        recoveryEmailSent: sql`${failedPayments.recoveryEmailSent} + 1`,
        recoveryEmailSentAt: new Date(),
      })
      .where(eq(failedPayments.id, paymentId));

    await this.recordRecoveryEvent("failed_payment", paymentId, "email_sent");
  }

  async expireOldRecoveries(): Promise<void> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    await db
      .update(failedPayments)
      .set({ expiredAt: new Date() })
      .where(
        and(
          isNull(failedPayments.recoveredAt),
          isNull(failedPayments.expiredAt),
          lt(failedPayments.createdAt, sevenDaysAgo)
        )
      );
  }

  async recordRecoveryEvent(
    eventType: string,
    sourceId: string,
    action: string,
    orderId?: string,
    revenueRecovered?: number,
    metadata?: any
  ): Promise<void> {
    await db.insert(recoveryEvents).values({
      eventType,
      sourceId,
      action,
      orderId,
      revenueRecovered: revenueRecovered || 0,
      metadata,
    });
  }

  async getRecoveryAnalytics(days: number = 30): Promise<RecoveryAnalytics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const abandonedCartsData = await db
      .select()
      .from(abandonedCarts)
      .where(gte(abandonedCarts.createdAt, startDate));

    const failedPaymentsData = await db
      .select()
      .from(failedPayments)
      .where(gte(failedPayments.createdAt, startDate));

    const abandonedTotal = abandonedCartsData.filter(c => c.abandonedAt).length;
    const abandonedTotalValue = abandonedCartsData
      .filter(c => c.abandonedAt)
      .reduce((sum, c) => sum + c.cartValue, 0);
    const abandonedEmailsSent = abandonedCartsData.reduce(
      (sum, c) => sum + (c.recoveryEmailSent || 0),
      0
    );
    const abandonedRecovered = abandonedCartsData.filter(c => c.recoveredAt).length;
    const abandonedRecoveredValue = abandonedCartsData
      .filter(c => c.recoveredAt)
      .reduce((sum, c) => sum + c.cartValue, 0);

    const failedTotal = failedPaymentsData.length;
    const failedTotalValue = failedPaymentsData.reduce((sum, f) => sum + f.amount, 0);
    const failedEmailsSent = failedPaymentsData.reduce(
      (sum, f) => sum + (f.recoveryEmailSent || 0),
      0
    );
    const failedRecovered = failedPaymentsData.filter(f => f.recoveredAt).length;
    const failedRecoveredValue = failedPaymentsData
      .filter(f => f.recoveredAt)
      .reduce((sum, f) => sum + f.amount, 0);

    const totalLostRevenue = abandonedTotalValue + failedTotalValue;
    const totalRecoveredRevenue = abandonedRecoveredValue + failedRecoveredValue;
    const overallConversionRate =
      (abandonedTotal + failedTotal) > 0
        ? ((abandonedRecovered + failedRecovered) / (abandonedTotal + failedTotal)) * 100
        : 0;

    return {
      abandonedCarts: {
        total: abandonedTotal,
        totalValue: abandonedTotalValue,
        emailsSent: abandonedEmailsSent,
        recovered: abandonedRecovered,
        recoveredValue: abandonedRecoveredValue,
        conversionRate: abandonedTotal > 0 ? (abandonedRecovered / abandonedTotal) * 100 : 0,
      },
      failedPayments: {
        total: failedTotal,
        totalValue: failedTotalValue,
        emailsSent: failedEmailsSent,
        recovered: failedRecovered,
        recoveredValue: failedRecoveredValue,
        conversionRate: failedTotal > 0 ? (failedRecovered / failedTotal) * 100 : 0,
      },
      totalLostRevenue,
      totalRecoveredRevenue,
      overallConversionRate,
    };
  }

  async getAbandonedCartsList(limit: number = 50): Promise<AbandonedCartWithDetails[]> {
    const carts = await db
      .select()
      .from(abandonedCarts)
      .where(isNotNull(abandonedCarts.abandonedAt))
      .orderBy(desc(abandonedCarts.abandonedAt))
      .limit(limit);

    const cartsWithDetails: AbandonedCartWithDetails[] = [];

    for (const cart of carts) {
      let customerName: string | undefined;
      let customerEmail = cart.email || undefined;

      if (cart.customerId) {
        const customer = await storage.getCustomer(cart.customerId);
        if (customer) {
          customerName = customer.name;
          customerEmail = customerEmail || customer.email;
        }
      }

      cartsWithDetails.push({
        ...cart,
        customerName,
        customerEmail,
      });
    }

    return cartsWithDetails;
  }

  async getFailedPaymentsList(limit: number = 50): Promise<FailedPaymentWithDetails[]> {
    const payments = await db
      .select()
      .from(failedPayments)
      .orderBy(desc(failedPayments.createdAt))
      .limit(limit);

    const paymentsWithDetails: FailedPaymentWithDetails[] = [];

    for (const payment of payments) {
      let customerName: string | undefined;
      let orderNumber: string | undefined;

      if (payment.customerId) {
        const customer = await storage.getCustomer(payment.customerId);
        if (customer) {
          customerName = customer.name;
        }
      }

      const order = await storage.getOrder(payment.orderId);
      if (order) {
        orderNumber = order.id;
      }

      paymentsWithDetails.push({
        ...payment,
        customerName,
        orderNumber,
      });
    }

    return paymentsWithDetails;
  }

  async sendAbandonedCartRecoveryEmails(): Promise<{ sent: number; errors: string[] }> {
    const { emailService } = await import("../integrations/mailgun/EmailService");
    const errors: string[] = [];
    let sent = 0;

    const now = new Date();

    const carts = await db
      .select()
      .from(abandonedCarts)
      .where(
        and(
          isNull(abandonedCarts.recoveredAt),
          isNotNull(abandonedCarts.abandonedAt),
          isNotNull(abandonedCarts.email),
          sql`${abandonedCarts.recoveryEmailSent} < 2`
        )
      );

    for (const cart of carts) {
      if (!cart.email || !cart.abandonedAt || cart.cartValue === null) continue;

      const abandonedTime = new Date(cart.abandonedAt);
      const emailsSent = cart.recoveryEmailSent || 0;
      const timeSinceAbandonment = now.getTime() - abandonedTime.getTime();
      const fourHoursMs = 4 * 60 * 60 * 1000;
      const twentyFourHoursMs = 24 * 60 * 60 * 1000;

      let shouldSend = false;

      if (emailsSent === 0 && timeSinceAbandonment >= fourHoursMs) {
        shouldSend = true;
      } else if (emailsSent === 1 && timeSinceAbandonment >= twentyFourHoursMs) {
        shouldSend = true;
      }

      if (!shouldSend) continue;

      try {
        const settings = await storage.getSiteSettings();
        const siteName = settings?.companyName || "Power Plunge";
        const cartItems = (cart.cartData as any)?.items || [];
        const itemsList = cartItems.map((item: any) => `${item.name} x ${item.quantity}`).join(", ");

        const subject = emailsSent === 0
          ? `Don't forget your items at ${siteName}!`
          : `We miss you! Your cart is still waiting`;

        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a2e;">You left something behind!</h2>
            <p>Hi there,</p>
            <p>We noticed you left some great items in your cart at ${siteName}. Don't miss out!</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Your Cart:</strong></p>
              <p>${itemsList || "Your selected items"}</p>
              <p><strong>Total: $${(cart.cartValue / 100).toFixed(2)}</strong></p>
            </div>
            <p>Complete your purchase today and enjoy your new cold plunge!</p>
            <a href="${process.env.REPLIT_DEPLOYMENT_URL || 'https://powerplunge.com'}/checkout?session=${cart.sessionId}" 
               style="display: inline-block; background: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Complete Your Order
            </a>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              If you have any questions, just reply to this email.
            </p>
          </div>
        `;

        const result = await emailService.sendEmail({
          to: cart.email,
          subject,
          html,
        });

        if (result.success) {
          await this.markRecoveryEmailSent(cart.id);
          sent++;
          console.log(`[RECOVERY] Sent abandoned cart email to ${cart.email} (attempt ${emailsSent + 1})`);
        } else {
          errors.push(`Cart ${cart.id}: ${result.error}`);
        }
      } catch (error: any) {
        errors.push(`Cart ${cart.id}: ${error.message}`);
      }
    }

    return { sent, errors };
  }

  async sendFailedPaymentRecoveryEmails(): Promise<{ sent: number; errors: string[] }> {
    const { emailService } = await import("../integrations/mailgun/EmailService");
    const errors: string[] = [];
    let sent = 0;

    const now = new Date();

    const payments = await this.getFailedPaymentsForRecovery();

    for (const payment of payments) {
      const createdTime = new Date(payment.createdAt);
      const emailsSent = payment.recoveryEmailSent || 0;
      const timeSinceFailure = now.getTime() - createdTime.getTime();
      const fourHoursMs = 4 * 60 * 60 * 1000;
      const twentyFourHoursMs = 24 * 60 * 60 * 1000;

      let shouldSend = false;
      if (emailsSent === 0 && timeSinceFailure >= fourHoursMs) {
        shouldSend = true;
      } else if (emailsSent === 1 && timeSinceFailure >= twentyFourHoursMs) {
        shouldSend = true;
      }

      if (!shouldSend) continue;

      try {
        const settings = await storage.getSiteSettings();
        const siteName = settings?.companyName || "Power Plunge";

        const subject = "There was an issue with your payment";
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a2e;">Payment Issue</h2>
            <p>Hi there,</p>
            <p>We noticed there was an issue processing your payment of <strong>$${(payment.amount / 100).toFixed(2)}</strong> at ${siteName}.</p>
            ${payment.failureReason ? `<p style="color: #dc2626;">Reason: ${payment.failureReason}</p>` : ""}
            <p>Don't worry - your order is still saved. Please try again with a different payment method.</p>
            <a href="${process.env.REPLIT_DEPLOYMENT_URL || 'https://powerplunge.com'}/checkout" 
               style="display: inline-block; background: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Complete Payment
            </a>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              If you have questions about this charge, please contact us.
            </p>
          </div>
        `;

        const result = await emailService.sendEmail({
          to: payment.email,
          subject,
          html,
        });

        if (result.success) {
          await this.markFailedPaymentEmailSent(payment.id);
          sent++;
          console.log(`[RECOVERY] Sent failed payment email to ${payment.email} (attempt ${emailsSent + 1})`);
        } else {
          errors.push(`Payment ${payment.id}: ${result.error}`);
        }
      } catch (error: any) {
        errors.push(`Payment ${payment.id}: ${error.message}`);
      }
    }

    return { sent, errors };
  }

  async runRecoveryEmailJob(): Promise<{ abandonedCarts: { sent: number; errors: string[] }; failedPayments: { sent: number; errors: string[] } }> {
    await this.detectAbandonedCarts();
    
    const abandonedCartResults = await this.sendAbandonedCartRecoveryEmails();
    const failedPaymentResults = await this.sendFailedPaymentRecoveryEmails();

    return {
      abandonedCarts: abandonedCartResults,
      failedPayments: failedPaymentResults,
    };
  }
}

export const checkoutRecoveryService = new CheckoutRecoveryService();
