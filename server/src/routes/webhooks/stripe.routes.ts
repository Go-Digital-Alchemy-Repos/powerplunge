import { Router } from "express";
import { storage } from "../../../storage";
import { affiliateCommissionService } from "../../services/affiliate-commission.service";
import { errorAlertingService } from "../../services/error-alerting.service";
import { sendOrderNotification } from "../public/payments.routes";

const router = Router();

router.post("/stripe", async (req, res) => {
  const { stripeService } = await import("../../integrations/stripe/StripeService");

  const dbWebhookSecret = await stripeService.getDbOnlyWebhookSecret();
  if (!dbWebhookSecret.secret) {
    const msg = `[WEBHOOK] ${dbWebhookSecret.reason}`;
    console.error(msg);
    return res.status(400).json({
      message: dbWebhookSecret.reason,
      debug: { source: dbWebhookSecret.source, mode: dbWebhookSecret.mode },
    });
  }

  console.log(`[WEBHOOK] Using webhook secret from ${dbWebhookSecret.source}, mode=${dbWebhookSecret.mode}`);

  const sig = req.headers["stripe-signature"] as string;
  let event;

  try {
    event = await stripeService.constructWebhookEvent(
      req.rawBody as Buffer,
      sig,
      dbWebhookSecret.secret
    );
  } catch (err: any) {
    console.error(`[WEBHOOK] Signature verification failed (source=${dbWebhookSecret.source}, mode=${dbWebhookSecret.mode}):`, err.message);
    await errorAlertingService.alertWebhookFailure({
      provider: "stripe",
      eventType: "signature_verification",
      errorMessage: err.message,
      errorCode: "SIGNATURE_VERIFICATION_FAILED",
    });
    return res.status(400).json({
      message: `Webhook Error: ${err.message}`,
      debug: { source: dbWebhookSecret.source, mode: dbWebhookSecret.mode },
    });
  }

  const existingEvent = await storage.getProcessedWebhookEvent(event.id);
  if (existingEvent) {
    console.log(`[WEBHOOK] Duplicate event rejected: ${event.id}`);
    return res.json({ received: true, duplicate: true });
  }

  try {
    await storage.createProcessedWebhookEvent({
      eventId: event.id,
      eventType: event.type,
      source: "stripe",
      metadata: { livemode: event.livemode },
    });
  } catch (err: any) {
    if (err.code === "23505") {
      console.log(`[WEBHOOK] Concurrent duplicate rejected: ${event.id}`);
      return res.json({ received: true, duplicate: true });
    }
    throw err;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;

    const order = await storage.getOrderByStripeSession(session.id);
    if (order) {
      await storage.updateOrder(order.id, {
        status: "paid",
        paymentStatus: "paid",
        stripePaymentIntentId: session.payment_intent,
      });

      if (order.affiliateCode) {
        const sessionId = session.metadata?.affiliateSessionId;
        const attributionType = session.metadata?.attributionType;
        const metaIsFriendsFamily = session.metadata?.isFriendsFamily === "true";
        const commissionResult = await affiliateCommissionService.recordCommission(order.id, {
          sessionId: sessionId || undefined,
          attributionType: attributionType || undefined,
          isFriendsFamily: metaIsFriendsFamily,
        });
        if (commissionResult.success && commissionResult.commissionAmount) {
          console.log(`[CHECKOUT] Recorded commission for order ${order.id}`);
        }
      }

      await sendOrderNotification(order.id);
    }
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as any;
    const orderId = paymentIntent.metadata?.orderId;

    if (orderId) {
      const order = await storage.getOrder(orderId);
      if (order && order.status === "pending") {
        if (paymentIntent.amount === order.totalAmount) {
          await storage.updateOrder(orderId, {
            status: "paid",
            paymentStatus: "paid",
            stripePaymentIntentId: paymentIntent.id,
          });

          if (order.affiliateCode) {
            const sessionId = paymentIntent.metadata?.affiliateSessionId;
            const attributionType = paymentIntent.metadata?.attributionType;
            const metaIsFriendsFamily = paymentIntent.metadata?.isFriendsFamily === "true";
            const commissionResult = await affiliateCommissionService.recordCommission(orderId, {
              sessionId: sessionId || undefined,
              attributionType: attributionType || undefined,
              isFriendsFamily: metaIsFriendsFamily,
            });
            if (commissionResult.success && commissionResult.commissionAmount) {
              console.log(`[WEBHOOK] Recorded commission for order ${orderId}`);
            }
          }

          const couponId = paymentIntent.metadata?.couponId;
          const couponDiscountAmountStr = paymentIntent.metadata?.couponDiscountAmount;
          if (couponId && couponDiscountAmountStr && parseInt(couponDiscountAmountStr) > 0) {
            try {
              const couponDiscountAmt = parseInt(couponDiscountAmountStr);
              await storage.createCouponRedemption({
                couponId,
                orderId,
                customerId: order.customerId,
                discountAmount: couponDiscountAmt,
                orderSubtotal: order.subtotalAmount || order.totalAmount,
                orderTotal: order.totalAmount,
                netRevenue: order.totalAmount - couponDiscountAmt,
                affiliateCode: order.affiliateCode || null,
                affiliateCommissionBlocked: paymentIntent.metadata?.couponBlocksAffiliate === "true",
              });
              await storage.incrementCouponUsage(couponId);
              console.log(`[WEBHOOK] Recorded coupon redemption for order ${orderId}, coupon ${couponId}`);
            } catch (couponErr: any) {
              console.error(`[WEBHOOK] Failed to record coupon redemption:`, couponErr.message);
            }
          }

          await sendOrderNotification(orderId);
        } else {
          console.error("Webhook: Amount mismatch for order", orderId, {
            paymentAmount: paymentIntent.amount,
            orderAmount: order.totalAmount,
          });
        }
      }
    }
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as any;
    const paymentIntentId = charge.payment_intent;

    if (paymentIntentId) {
      try {
        const { normalizeStripeRefundStatus, updateOrderPaymentStatus } = await import("../../services/refund.service");

        const order = await storage.getOrderByPaymentIntentId(paymentIntentId);
        if (order) {
          const stripeClient = await stripeService.getClient();
          if (stripeClient && charge.refunds?.data) {
            for (const stripeRefund of charge.refunds.data) {
              const existingRefund = await storage.getRefundByStripeRefundId(stripeRefund.id);
              const normalizedStatus = normalizeStripeRefundStatus(stripeRefund.status || "pending");

              if (existingRefund) {
                if (existingRefund.status !== normalizedStatus) {
                  await storage.updateRefund(existingRefund.id, {
                    status: normalizedStatus,
                    processedAt: normalizedStatus === "processed" ? new Date() : existingRefund.processedAt,
                  });
                  console.log(`[WEBHOOK] Updated refund ${existingRefund.id} status to ${normalizedStatus} (charge.refunded)`);
                }
              } else {
                await storage.createRefund({
                  orderId: order.id,
                  amount: stripeRefund.amount,
                  reason: stripeRefund.reason || "Refund via Stripe",
                  reasonCode: stripeRefund.reason || "other",
                  type: stripeRefund.amount >= order.totalAmount ? "full" : "partial",
                  source: "stripe",
                  stripeRefundId: stripeRefund.id,
                  status: normalizedStatus,
                  processedAt: normalizedStatus === "processed" ? new Date() : undefined,
                });
                console.log(`[WEBHOOK] Created refund record for Stripe refund ${stripeRefund.id} on order ${order.id}`);
              }
            }

            await updateOrderPaymentStatus(order.id);
          }
        } else {
          console.warn(`[WEBHOOK] charge.refunded: No order found for payment_intent ${paymentIntentId}`);
        }
      } catch (refundErr: any) {
        console.error("[WEBHOOK] Error processing charge.refunded:", refundErr.message);
      }
    }
  }

  if (event.type === "refund.updated") {
    const stripeRefund = event.data.object as any;

    try {
      const { normalizeStripeRefundStatus, updateOrderPaymentStatus } = await import("../../services/refund.service");

      const existingRefund = await storage.getRefundByStripeRefundId(stripeRefund.id);
      if (existingRefund) {
        const normalizedStatus = normalizeStripeRefundStatus(stripeRefund.status || "pending");

        if (existingRefund.status !== normalizedStatus) {
          await storage.updateRefund(existingRefund.id, {
            status: normalizedStatus,
            processedAt: normalizedStatus === "processed" ? new Date() : existingRefund.processedAt,
          });

          await updateOrderPaymentStatus(existingRefund.orderId);

          await storage.createAuditLog({
            actor: "stripe_webhook",
            action: "refund.status_synced",
            entityType: "refund",
            entityId: existingRefund.id,
            metadata: {
              orderId: existingRefund.orderId,
              stripeRefundId: stripeRefund.id,
              previousStatus: existingRefund.status,
              newStatus: normalizedStatus,
              stripeStatus: stripeRefund.status,
              eventId: event.id,
            },
          });

          console.log(`[WEBHOOK] Synced refund ${existingRefund.id} status: ${existingRefund.status} -> ${normalizedStatus}`);
        }
      } else {
        console.warn(`[WEBHOOK] refund.updated: No local refund found for Stripe refund ${stripeRefund.id}`);
      }
    } catch (refundErr: any) {
      console.error("[WEBHOOK] Error processing refund.updated:", refundErr.message);
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as any;
    const orderId = paymentIntent.metadata?.orderId;
    const lastError = paymentIntent.last_payment_error;
    
    console.error("[WEBHOOK] Payment failed:", {
      paymentIntentId: paymentIntent.id,
      orderId,
      errorCode: lastError?.code,
      errorMessage: lastError?.message,
    });

    await errorAlertingService.alertPaymentFailure({
      orderId: orderId || undefined,
      email: paymentIntent.receipt_email || paymentIntent.metadata?.customerEmail,
      amount: paymentIntent.amount,
      paymentIntentId: paymentIntent.id,
      errorMessage: lastError?.message || "Payment failed",
      errorCode: lastError?.code,
    });
  }

  res.json({ received: true });
});

router.post("/stripe-connect", async (req, res) => {
  const { stripeService } = await import("../../integrations/stripe/StripeService");
  
  if (!(await stripeService.isConfigured())) {
    return res.status(400).json({ message: "Stripe not configured" });
  }

  let connectSecret: string | undefined;

  const settings = await storage.getIntegrationSettings();
  if (settings?.stripeConnectWebhookSecretEncrypted) {
    try {
      const { decrypt } = await import("../../utils/encryption");
      connectSecret = decrypt(settings.stripeConnectWebhookSecretEncrypted);
    } catch (error) {
      console.error("Failed to decrypt Stripe Connect webhook secret from database");
    }
  }

  if (!connectSecret) {
    connectSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  }

  if (!connectSecret) {
    return res.status(400).json({ message: "Stripe Connect webhook secret not configured. Please add it in Admin → Integrations → Stripe → Stripe Connect section." });
  }

  const webhookSecret = connectSecret;

  const sig = req.headers["stripe-signature"] as string;
  if (!sig) {
    return res.status(400).json({ message: "Missing stripe-signature header" });
  }

  let event: any;

  try {
    event = await stripeService.constructWebhookEvent(
      req.rawBody as Buffer,
      sig,
      webhookSecret
    );
  } catch (err: any) {
    console.error("Connect webhook signature verification failed:", err.message);
    await errorAlertingService.alertWebhookFailure({
      provider: "stripe_connect",
      eventType: "signature_verification",
      errorMessage: err.message,
      errorCode: "SIGNATURE_VERIFICATION_FAILED",
    });
    return res.status(400).json({ message: `Webhook Error: ${err.message}` });
  }

  const existingEvent = await storage.getProcessedWebhookEvent(event.id);
  if (existingEvent) {
    console.log(`[CONNECT] Duplicate event rejected: ${event.id}`);
    return res.json({ received: true, duplicate: true });
  }

  try {
    await storage.createProcessedWebhookEvent({
      eventId: event.id,
      eventType: event.type,
      source: "stripe_connect",
      metadata: { livemode: event.livemode },
    });
  } catch (err: any) {
    if (err.code === "23505") {
      console.log(`[CONNECT] Concurrent duplicate rejected: ${event.id}`);
      return res.json({ received: true, duplicate: true });
    }
    throw err;
  }

  try {
    if (event.type === "account.updated") {
      const account = event.data.object;
      
      const payoutAccount = await storage.getAffiliatePayoutAccountByStripeAccountId(account.id);
      if (payoutAccount) {
        const prevState = {
          payoutsEnabled: payoutAccount.payoutsEnabled,
          chargesEnabled: payoutAccount.chargesEnabled,
          detailsSubmitted: payoutAccount.detailsSubmitted,
        };
        
        await storage.updateAffiliatePayoutAccount(payoutAccount.id, {
          payoutsEnabled: account.payouts_enabled ?? false,
          chargesEnabled: account.charges_enabled ?? false,
          detailsSubmitted: account.details_submitted ?? false,
          requirements: account.requirements as any,
        });
        console.log(`[CONNECT] Updated payout account ${payoutAccount.id} for Stripe account ${account.id}`);
        
        const newState = {
          payoutsEnabled: account.payouts_enabled ?? false,
          chargesEnabled: account.charges_enabled ?? false,
          detailsSubmitted: account.details_submitted ?? false,
        };
        
        if (prevState.payoutsEnabled !== newState.payoutsEnabled ||
            prevState.detailsSubmitted !== newState.detailsSubmitted) {
          await storage.createAuditLog({
            actor: "stripe_webhook",
            action: "stripe_connect.account_updated",
            entityType: "affiliate_payout_account",
            entityId: payoutAccount.id,
            metadata: {
              stripeAccountId: account.id,
              affiliateId: payoutAccount.affiliateId,
              prevState,
              newState,
              eventId: event.id,
            },
          });
        }
      }
    }

    if (event.type === "capability.updated") {
      const capability = event.data.object;
      const accountId = typeof capability.account === "string" 
        ? capability.account 
        : capability.account?.id;

      if (accountId) {
        const payoutAccount = await storage.getAffiliatePayoutAccountByStripeAccountId(accountId);
        if (payoutAccount) {
          const fullAccount = await stripeService.retrieveAccount(accountId);
          await storage.updateAffiliatePayoutAccount(payoutAccount.id, {
            payoutsEnabled: fullAccount.payouts_enabled ?? false,
            chargesEnabled: fullAccount.charges_enabled ?? false,
            detailsSubmitted: fullAccount.details_submitted ?? false,
            requirements: fullAccount.requirements as any,
          });
          console.log(`[CONNECT] Updated capability for payout account ${payoutAccount.id}`);
          
          await storage.createAuditLog({
            actor: "stripe_webhook",
            action: "stripe_connect.capability_updated",
            entityType: "affiliate_payout_account",
            entityId: payoutAccount.id,
            metadata: {
              stripeAccountId: accountId,
              affiliateId: payoutAccount.affiliateId,
              capability: capability.id,
              status: capability.status,
              eventId: event.id,
            },
          });
        }
      }
    }
  } catch (error) {
    console.error("Error processing Connect webhook:", error);
  }

  res.json({ received: true });
});

export default router;
