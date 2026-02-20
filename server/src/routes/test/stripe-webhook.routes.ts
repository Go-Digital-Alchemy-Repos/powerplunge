import { Router } from "express";
import Stripe from "stripe";
import { storage } from "../../../storage";
import { handlePaymentIntentSucceededWebhook } from "../webhooks/stripe.routes";

const router = Router();

router.use((_req, res, next) => {
  if (process.env.NODE_ENV === "production" || process.env.E2E_TEST_MODE !== "true") {
    return res.status(404).json({ message: "Not found" });
  }
  next();
});

router.post("/payment-intent-succeeded", async (req, res) => {
  try {
    const orderId = typeof req.body?.orderId === "string" ? req.body.orderId : "";
    if (!orderId) {
      return res.status(400).json({ message: "orderId is required" });
    }

    const order = await storage.getOrder(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const amount =
      typeof req.body?.amount === "number" ? req.body.amount : order.totalAmount;

    const paymentIntent = {
      id:
        (typeof req.body?.paymentIntentId === "string" && req.body.paymentIntentId) ||
        order.stripePaymentIntentId ||
        `pi_e2e_${Date.now()}`,
      amount,
      metadata: {
        orderId,
        ...(req.body?.metadata && typeof req.body.metadata === "object"
          ? req.body.metadata
          : {}),
      },
    };

    await handlePaymentIntentSucceededWebhook(paymentIntent);

    const updatedOrder = await storage.getOrder(orderId);
    return res.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    return res
      .status(500)
      .json({ message: error?.message || "Failed to simulate payment_intent.succeeded" });
  }
});

router.post("/dispatch-signed-payment-intent-succeeded", async (req, res) => {
  try {
    const orderId = typeof req.body?.orderId === "string" ? req.body.orderId : "";
    if (!orderId) {
      return res.status(400).json({ message: "orderId is required" });
    }

    const order = await storage.getOrder(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const amount =
      typeof req.body?.amount === "number" ? req.body.amount : order.totalAmount;

    const paymentIntentId =
      (typeof req.body?.paymentIntentId === "string" && req.body.paymentIntentId) ||
      order.stripePaymentIntentId ||
      `pi_e2e_${Date.now()}`;

    const { stripeService } = await import("../../integrations/stripe/StripeService");
    const dbWebhookSecret = await stripeService.getDbOnlyWebhookSecret();
    if (!dbWebhookSecret.secret) {
      return res.status(412).json({
        message: dbWebhookSecret.reason || "Stripe webhook secret is not configured in DB",
        debug: { source: dbWebhookSecret.source, mode: dbWebhookSecret.mode },
      });
    }

    const event = {
      id: `evt_e2e_${Date.now()}`,
      object: "event",
      api_version: "2025-01-27.acacia",
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: paymentIntentId,
          object: "payment_intent",
          amount,
          metadata: {
            orderId,
          },
        },
      },
      livemode: false,
      pending_webhooks: 1,
      request: {
        id: null,
        idempotency_key: null,
      },
      type: "payment_intent.succeeded",
    };

    const payload = JSON.stringify(event);
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: dbWebhookSecret.secret,
    });

    const parsedEvent = await stripeService.constructWebhookEvent(
      Buffer.from(payload),
      signature,
      dbWebhookSecret.secret,
    );

    const existingEvent = await storage.getProcessedWebhookEvent(parsedEvent.id);
    if (!existingEvent) {
      await storage.createProcessedWebhookEvent({
        eventId: parsedEvent.id,
        eventType: parsedEvent.type,
        source: "stripe",
        metadata: { livemode: false, simulated: true, signed: true },
      });
    }

    await handlePaymentIntentSucceededWebhook(parsedEvent.data.object);

    const updatedOrder = await storage.getOrder(orderId);
    return res.json({
      success: true,
      duplicate: !!existingEvent,
      eventId: parsedEvent.id,
      order: updatedOrder,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: error?.message || "Failed to dispatch signed payment_intent.succeeded",
    });
  }
});

export default router;
