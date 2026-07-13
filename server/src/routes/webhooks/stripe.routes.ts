import { Router } from "express";
import { storage } from "../../../storage";
import { errorAlertingService } from "../../services/error-alerting.service";
import { createOrderFinalizationService } from "../../services/order-finalization.service";
import { createStripeConnectWebhookService } from "../../services/stripe-connect-webhook.service";
import { createStripePaymentWebhookService } from "../../services/stripe-payment-webhook.service";
import { createStripeRefundWebhookService } from "../../services/stripe-refund-webhook.service";

const router = Router();
type WebhookEventHandler = () => Promise<void>;

export async function handlePaymentIntentSucceededWebhook(paymentIntent: any): Promise<void> {
  const finalizationService = createOrderFinalizationService();
  await finalizationService.finalizeStripePaymentIntent({ paymentIntent });
}

export async function handleCheckoutSessionCompletedWebhook(session: any): Promise<void> {
  const finalizationService = createOrderFinalizationService();
  await finalizationService.finalizeStripeCheckoutSession({ session });
}

export async function handleChargeRefundedWebhook(charge: any): Promise<void> {
  const refundWebhookService = createStripeRefundWebhookService();
  await refundWebhookService.synchronizeStripeChargeRefunds({ charge });
}

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

  const handlers: Partial<Record<string, WebhookEventHandler>> = {
    "checkout.session.completed": async () => {
      const session = event.data.object as any;
      await handleCheckoutSessionCompletedWebhook(session);
    },
    "payment_intent.succeeded": async () => {
      const paymentIntent = event.data.object as any;
      await handlePaymentIntentSucceededWebhook(paymentIntent);
    },
    "charge.refunded": async () => {
      const charge = event.data.object as any;
      await handleChargeRefundedWebhook(charge);
    },
    "refund.updated": async () => {
      const stripeRefund = event.data.object as any;
      const refundWebhookService = createStripeRefundWebhookService();
      await refundWebhookService.synchronizeStripeRefundStatus({
        refund: stripeRefund,
        eventId: event.id,
      });
    },
    "payment_intent.payment_failed": async () => {
      const paymentIntent = event.data.object as any;
      const paymentWebhookService = createStripePaymentWebhookService();
      await paymentWebhookService.alertStripePaymentFailure({
        paymentIntent,
      });
    },
  };

  const handler = Object.prototype.hasOwnProperty.call(handlers, event.type)
    ? handlers[event.type]
    : undefined;
  if (handler) await handler();

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
    const handlers: Partial<Record<string, WebhookEventHandler>> = {
      "account.updated": async () => {
        const account = event.data.object;
        const connectWebhookService = createStripeConnectWebhookService();
        await connectWebhookService.synchronizeAffiliatePayoutAccount({
          account,
          eventId: event.id,
        });
      },
      "capability.updated": async () => {
        const capability = event.data.object;
        const connectWebhookService = createStripeConnectWebhookService();
        await connectWebhookService.synchronizeAffiliatePayoutCapability({
          capability,
          eventId: event.id,
        });
      },
    };

    const handler = Object.prototype.hasOwnProperty.call(handlers, event.type)
      ? handlers[event.type]
      : undefined;
    if (handler) await handler();
  } catch (error) {
    console.error("Error processing Connect webhook:", error);
  }

  res.json({ received: true });
});

export default router;
