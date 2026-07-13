import express from "express";
import { createServer, type Server } from "http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentEvent: undefined as any,
  storage: {
    getProcessedWebhookEvent: vi.fn(),
    createProcessedWebhookEvent: vi.fn(),
    getOrder: vi.fn(),
    getOrderByStripeSession: vi.fn(),
    markOrderPaidIfPending: vi.fn(),
    createCouponRedemption: vi.fn(),
    incrementCouponUsage: vi.fn(),
    updateOrder: vi.fn(),
    getOrderByPaymentIntentId: vi.fn(),
    getRefundByStripeRefundId: vi.fn(),
    createRefund: vi.fn(),
    updateRefund: vi.fn(),
    createAuditLog: vi.fn(),
    getIntegrationSettings: vi.fn(),
    getAffiliatePayoutAccountByStripeAccountId: vi.fn(),
    updateAffiliatePayoutAccount: vi.fn(),
  },
  stripeService: {
    getDbOnlyWebhookSecret: vi.fn(),
    constructWebhookEvent: vi.fn(),
    getClient: vi.fn(),
    isConfigured: vi.fn(),
    retrieveAccount: vi.fn(),
  },
  finalizationService: {
    finalizeStripePaymentIntent: vi.fn(),
    finalizeStripeCheckoutSession: vi.fn(),
  },
  recordCommission: vi.fn(),
  enqueuePurchase: vi.fn(),
  enqueueRefundProcessed: vi.fn(),
  sendOrderNotification: vi.fn(),
  alertWebhookFailure: vi.fn(),
  alertPaymentFailure: vi.fn(),
  updateOrderPaymentStatus: vi.fn(),
  decrypt: vi.fn(),
}));

vi.mock("../../../../storage", () => ({ storage: mocks.storage }));
vi.mock("../../../integrations/stripe/StripeService", () => ({ stripeService: mocks.stripeService }));
vi.mock("../../../services/order-finalization.service", () => ({
  createOrderFinalizationService: vi.fn(() => mocks.finalizationService),
}));
vi.mock("../../../services/order-notification.service", () => ({
  sendOrderNotification: mocks.sendOrderNotification,
}));
vi.mock("../../../services/affiliate-commission.service", () => ({
  affiliateCommissionService: {
    recordCommission: mocks.recordCommission,
  },
}));
vi.mock("../../../integrations/meta/MetaConversionsService", () => ({
  metaConversionsService: {
    enqueuePurchase: mocks.enqueuePurchase,
    enqueueRefundProcessed: mocks.enqueueRefundProcessed,
  },
}));
vi.mock("../../../services/error-alerting.service", () => ({
  errorAlertingService: {
    alertWebhookFailure: mocks.alertWebhookFailure,
    alertPaymentFailure: mocks.alertPaymentFailure,
  },
}));
vi.mock("../../../services/refund.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../services/refund.service")>();
  return {
    ...actual,
    updateOrderPaymentStatus: mocks.updateOrderPaymentStatus,
  };
});
vi.mock("../../../utils/encryption", () => ({ decrypt: mocks.decrypt }));
const router = (await import("../stripe.routes")).default;

async function startApp() {
  const app = express();
  app.use(express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }));
  app.use("/webhooks", router);

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Failed to listen");

  return {
    server,
    request: (path: string, init?: RequestInit) => fetch(`http://127.0.0.1:${address.port}${path}`, init),
  };
}

let server: Server | undefined;

function stripeEvent(id: string, type: string, object: Record<string, unknown>) {
  return { id, type, livemode: false, data: { object } };
}

async function postWebhook(path: "/webhooks/stripe" | "/webhooks/stripe-connect", signature = "sig_test") {
  const app = await startApp();
  server = app.server;
  return app.request(path, {
    method: "POST",
    headers: {
      ...(signature ? { "stripe-signature": signature } : {}),
      "content-type": "application/json",
    },
    body: "{}",
  });
}

describe("Stripe webhook routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentEvent = undefined;
    mocks.stripeService.getDbOnlyWebhookSecret.mockResolvedValue({
      secret: "whsec_test",
      source: "database",
      mode: "test",
    });
    mocks.stripeService.constructWebhookEvent.mockImplementation(async () => mocks.currentEvent);
    mocks.storage.getProcessedWebhookEvent.mockResolvedValue(undefined);
    mocks.storage.createProcessedWebhookEvent.mockResolvedValue(undefined);
    mocks.storage.getOrderByPaymentIntentId.mockResolvedValue(undefined);
    mocks.storage.getRefundByStripeRefundId.mockResolvedValue(undefined);
    mocks.storage.createRefund.mockResolvedValue({ id: "refund-created" });
    mocks.storage.updateRefund.mockResolvedValue(undefined);
    mocks.storage.createAuditLog.mockResolvedValue(undefined);
    mocks.storage.getIntegrationSettings.mockResolvedValue(undefined);
    mocks.storage.getAffiliatePayoutAccountByStripeAccountId.mockResolvedValue(undefined);
    mocks.storage.updateAffiliatePayoutAccount.mockResolvedValue(undefined);
    mocks.stripeService.getClient.mockResolvedValue({});
    mocks.stripeService.isConfigured.mockResolvedValue(true);
    mocks.stripeService.retrieveAccount.mockResolvedValue({});
    mocks.recordCommission.mockResolvedValue({ success: true, commissionAmount: 1000 });
    mocks.enqueuePurchase.mockResolvedValue({ success: true, queued: true });
    mocks.enqueueRefundProcessed.mockResolvedValue({ success: true, queued: true });
    mocks.sendOrderNotification.mockResolvedValue(undefined);
    mocks.alertWebhookFailure.mockResolvedValue(undefined);
    mocks.alertPaymentFailure.mockResolvedValue(undefined);
    mocks.updateOrderPaymentStatus.mockResolvedValue(undefined);
    mocks.decrypt.mockReturnValue("whsec_connect_stored");
    vi.stubEnv("STRIPE_CONNECT_WEBHOOK_SECRET", "whsec_connect_env");
    mocks.finalizationService.finalizeStripePaymentIntent.mockResolvedValue({
      status: "finalized",
      orderId: "order-1",
      order: { id: "order-1", status: "paid", paymentStatus: "paid" },
    });
    mocks.finalizationService.finalizeStripeCheckoutSession.mockResolvedValue({
      status: "finalized",
      orderId: "order-1",
      order: { id: "order-1", status: "paid", paymentStatus: "paid" },
    });
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    if (!server) return;
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => (error ? reject(error) : resolve()));
    });
    server = undefined;
  });

  it("finalizes checkout.session.completed orders through the order finalization service", async () => {
    mocks.currentEvent = {
      id: "evt_checkout_completed",
      type: "checkout.session.completed",
      livemode: false,
      data: {
        object: {
          id: "cs_test_123",
          payment_intent: "pi_123",
          amount_total: 10000,
          currency: "usd",
          metadata: {
            affiliateSessionId: "session-1",
            attributionType: "coupon",
            isFriendsFamily: "true",
          },
        },
      },
    };

    const app = await startApp();
    server = app.server;
    const response = await app.request("/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "sig_test", "content-type": "application/json" },
      body: "{}",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(mocks.storage.getOrderByStripeSession).not.toHaveBeenCalled();
    expect(mocks.finalizationService.finalizeStripeCheckoutSession).toHaveBeenCalledWith({
      session: mocks.currentEvent.data.object,
    });
    expect(mocks.finalizationService.finalizeStripePaymentIntent).not.toHaveBeenCalled();
    expect(mocks.storage.updateOrder).not.toHaveBeenCalled();
    expect(mocks.recordCommission).not.toHaveBeenCalled();
    expect(mocks.enqueuePurchase).not.toHaveBeenCalled();
    expect(mocks.sendOrderNotification).not.toHaveBeenCalled();
  });

  it("uses the notification service by default when the finalization factory finalizes an order", async () => {
    const paidOrder = {
      id: "order-1",
      customerId: "customer-1",
      status: "paid",
      paymentStatus: "paid",
      totalAmount: 10000,
    };
    mocks.storage.getOrder.mockResolvedValue(paidOrder);
    mocks.storage.markOrderPaidIfPending.mockResolvedValue(paidOrder);
    const { createOrderFinalizationService } = await vi.importActual<
      typeof import("../../../services/order-finalization.service")
    >("../../../services/order-finalization.service");

    const result = await createOrderFinalizationService().finalizeStripePaymentIntent({
      paymentIntent: {
        id: "pi_123",
        amount: 10000,
        currency: "usd",
        metadata: { orderId: "order-1" },
      },
    });

    expect(result).toEqual({ status: "finalized", orderId: "order-1", order: paidOrder });
    expect(mocks.sendOrderNotification).toHaveBeenCalledWith("order-1");
  });

  it("leaves late checkout.session.completed paid obligations behind the finalization claim", async () => {
    const paidOrder = {
      id: "order-1",
      status: "paid",
      paymentStatus: "paid",
      totalAmount: 10000,
      affiliateCode: "AFFILIATE",
    };
    mocks.finalizationService.finalizeStripeCheckoutSession.mockResolvedValue({
      status: "skipped",
      orderId: "order-1",
      reason: "claim_not_won",
      order: paidOrder,
    });
    mocks.currentEvent = {
      id: "evt_checkout_completed_late",
      type: "checkout.session.completed",
      livemode: false,
      data: {
        object: {
          id: "cs_test_123",
          payment_intent: "pi_123",
          amount_total: 10000,
          currency: "usd",
          metadata: {
            affiliateSessionId: "session-1",
            attributionType: "coupon",
            isFriendsFamily: "true",
          },
        },
      },
    };

    const app = await startApp();
    server = app.server;
    const response = await app.request("/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "sig_test", "content-type": "application/json" },
      body: "{}",
    });

    expect(response.status).toBe(200);
    expect(mocks.finalizationService.finalizeStripeCheckoutSession).toHaveBeenCalledOnce();
    expect(mocks.finalizationService.finalizeStripePaymentIntent).not.toHaveBeenCalled();
    expect(mocks.storage.updateOrder).not.toHaveBeenCalled();
    expect(mocks.recordCommission).not.toHaveBeenCalled();
    expect(mocks.enqueuePurchase).not.toHaveBeenCalled();
    expect(mocks.sendOrderNotification).not.toHaveBeenCalled();
  });

  it("passes Stripe-added tax Checkout Sessions to Checkout Session finalization", async () => {
    mocks.currentEvent = {
      id: "evt_checkout_completed_taxed",
      type: "checkout.session.completed",
      livemode: false,
      data: {
        object: {
          id: "cs_test_taxed",
          payment_intent: "pi_taxed",
          amount_total: 10825,
          currency: "usd",
          automatic_tax: { enabled: true, status: "complete" },
          metadata: {
            attributionType: "direct",
          },
        },
      },
    };

    const app = await startApp();
    server = app.server;
    const response = await app.request("/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "sig_test", "content-type": "application/json" },
      body: "{}",
    });

    expect(response.status).toBe(200);
    expect(mocks.finalizationService.finalizeStripeCheckoutSession).toHaveBeenCalledWith({
      session: mocks.currentEvent.data.object,
    });
    expect(mocks.finalizationService.finalizeStripePaymentIntent).not.toHaveBeenCalled();
  });

  describe("POST /stripe characterization", () => {
    it("returns the current database-secret failure response", async () => {
      mocks.stripeService.getDbOnlyWebhookSecret.mockResolvedValue({
        secret: undefined,
        reason: "No Stripe webhook secret is configured",
        source: "database",
        mode: "test",
      });

      const response = await postWebhook("/webhooks/stripe");

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        message: "No Stripe webhook secret is configured",
        debug: { source: "database", mode: "test" },
      });
      expect(mocks.stripeService.constructWebhookEvent).not.toHaveBeenCalled();
    });

    it("returns the current signature failure response when the signature is missing", async () => {
      mocks.stripeService.constructWebhookEvent.mockRejectedValue(
        new Error("No signatures found matching the expected signature for payload")
      );

      const response = await postWebhook("/webhooks/stripe", "");

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        message: "Webhook Error: No signatures found matching the expected signature for payload",
        debug: { source: "database", mode: "test" },
      });
      expect(mocks.stripeService.constructWebhookEvent).toHaveBeenCalledWith(
        expect.any(Buffer),
        undefined,
        "whsec_test"
      );
      expect(mocks.alertWebhookFailure).toHaveBeenCalledWith(expect.objectContaining({
        provider: "stripe",
        eventType: "signature_verification",
        errorCode: "SIGNATURE_VERIFICATION_FAILED",
      }));
    });

    it("acknowledges duplicate deliveries without dispatching the event twice", async () => {
      mocks.currentEvent = stripeEvent("evt_duplicate", "payment_intent.payment_failed", {
        id: "pi_duplicate",
        amount: 4500,
        metadata: { orderId: "order-duplicate" },
        last_payment_error: { message: "Declined" },
      });
      mocks.storage.getProcessedWebhookEvent
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ eventId: "evt_duplicate" });
      const app = await startApp();
      server = app.server;
      const request = () => app.request("/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "sig_test", "content-type": "application/json" },
        body: "{}",
      });

      const firstResponse = await request();
      const secondResponse = await request();

      expect(firstResponse.status).toBe(200);
      expect(await firstResponse.json()).toEqual({ received: true });
      expect(secondResponse.status).toBe(200);
      expect(await secondResponse.json()).toEqual({ received: true, duplicate: true });
      expect(mocks.storage.createProcessedWebhookEvent).toHaveBeenCalledOnce();
      expect(mocks.alertPaymentFailure).toHaveBeenCalledOnce();
    });

    it("acknowledges unknown events without domain writes", async () => {
      mocks.currentEvent = stripeEvent("evt_unknown", "customer.created", { id: "cus_123" });

      const response = await postWebhook("/webhooks/stripe");

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: true });
      expect(mocks.storage.createProcessedWebhookEvent).toHaveBeenCalledWith(expect.objectContaining({
        eventId: "evt_unknown",
        eventType: "customer.created",
        source: "stripe",
      }));
      expect(mocks.storage.createRefund).not.toHaveBeenCalled();
      expect(mocks.storage.updateRefund).not.toHaveBeenCalled();
      expect(mocks.storage.createAuditLog).not.toHaveBeenCalled();
      expect(mocks.storage.updateAffiliatePayoutAccount).not.toHaveBeenCalled();
      expect(mocks.storage.updateOrder).not.toHaveBeenCalled();
      expect(mocks.storage.markOrderPaidIfPending).not.toHaveBeenCalled();
      expect(mocks.storage.createCouponRedemption).not.toHaveBeenCalled();
      expect(mocks.storage.incrementCouponUsage).not.toHaveBeenCalled();
      expect(mocks.finalizationService.finalizeStripePaymentIntent).not.toHaveBeenCalled();
      expect(mocks.finalizationService.finalizeStripeCheckoutSession).not.toHaveBeenCalled();
      expect(mocks.updateOrderPaymentStatus).not.toHaveBeenCalled();
      expect(mocks.recordCommission).not.toHaveBeenCalled();
      expect(mocks.enqueuePurchase).not.toHaveBeenCalled();
      expect(mocks.enqueueRefundProcessed).not.toHaveBeenCalled();
      expect(mocks.sendOrderNotification).not.toHaveBeenCalled();
      expect(mocks.alertPaymentFailure).not.toHaveBeenCalled();
      expect(mocks.alertWebhookFailure).not.toHaveBeenCalled();
    });

    it("alerts with order context when a payment intent fails", async () => {
      mocks.currentEvent = stripeEvent("evt_payment_failed", "payment_intent.payment_failed", {
        id: "pi_failed",
        amount: 8250,
        receipt_email: "buyer@example.com",
        metadata: { orderId: "order-failed", customerEmail: "fallback@example.com" },
        last_payment_error: { code: "card_declined", message: "Card declined" },
      });

      const response = await postWebhook("/webhooks/stripe");

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: true });
      expect(mocks.alertPaymentFailure).toHaveBeenCalledWith(expect.objectContaining({
        orderId: "order-failed",
        email: "buyer@example.com",
        amount: 8250,
        paymentIntentId: "pi_failed",
        errorMessage: "Card declined",
        errorCode: "card_declined",
      }));
    });

    it("creates a processed refund from charge.refunded and attempts Meta enqueue", async () => {
      mocks.currentEvent = stripeEvent("evt_charge_refunded_create", "charge.refunded", {
        id: "ch_refunded",
        payment_intent: "pi_refunded",
        refunds: {
          data: [{ id: "re_new", amount: 10000, reason: "requested_by_customer", status: "succeeded" }],
        },
      });
      mocks.storage.getOrderByPaymentIntentId.mockResolvedValue({
        id: "order-refunded",
        totalAmount: 10000,
      });
      mocks.storage.createRefund.mockResolvedValue({ id: "refund-local-new" });

      const response = await postWebhook("/webhooks/stripe");

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: true });
      expect(mocks.storage.createRefund).toHaveBeenCalledWith(expect.objectContaining({
        orderId: "order-refunded",
        amount: 10000,
        reason: "requested_by_customer",
        reasonCode: "requested_by_customer",
        type: "full",
        source: "stripe",
        stripeRefundId: "re_new",
        status: "processed",
        processedAt: expect.any(Date),
      }));
      expect(mocks.enqueueRefundProcessed).toHaveBeenCalledWith("refund-local-new");
      expect(mocks.updateOrderPaymentStatus).toHaveBeenCalledWith("order-refunded");
    });

    it("updates an existing charge refund instead of creating a duplicate", async () => {
      mocks.currentEvent = stripeEvent("evt_charge_refunded_update", "charge.refunded", {
        id: "ch_refunded_existing",
        payment_intent: "pi_refunded_existing",
        refunds: { data: [{ id: "re_existing", amount: 2500, status: "succeeded" }] },
      });
      mocks.storage.getOrderByPaymentIntentId.mockResolvedValue({
        id: "order-existing-refund",
        totalAmount: 10000,
      });
      mocks.storage.getRefundByStripeRefundId.mockResolvedValue({
        id: "refund-local-existing",
        orderId: "order-existing-refund",
        status: "pending",
        processedAt: undefined,
      });

      const response = await postWebhook("/webhooks/stripe");

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: true });
      expect(mocks.storage.updateRefund).toHaveBeenCalledWith(
        "refund-local-existing",
        expect.objectContaining({ status: "processed", processedAt: expect.any(Date) })
      );
      expect(mocks.storage.createRefund).not.toHaveBeenCalled();
      expect(mocks.enqueueRefundProcessed).toHaveBeenCalledWith("refund-local-existing");
      expect(mocks.updateOrderPaymentStatus).toHaveBeenCalledWith("order-existing-refund");
    });

    it("acknowledges charge.refunded when refund storage fails", async () => {
      mocks.currentEvent = stripeEvent("evt_charge_refunded_error", "charge.refunded", {
        payment_intent: "pi_refund_error",
        refunds: { data: [{ id: "re_error", amount: 1000, status: "pending" }] },
      });
      mocks.storage.getOrderByPaymentIntentId.mockRejectedValue(new Error("refund storage unavailable"));

      const response = await postWebhook("/webhooks/stripe");

      // current behavior - candidate bug, do not rely on
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: true });
      expect(mocks.storage.createProcessedWebhookEvent).toHaveBeenCalledOnce();
      expect(mocks.storage.createRefund).not.toHaveBeenCalled();
    });

    it("normalizes refund.updated status and records the domain writes", async () => {
      mocks.currentEvent = stripeEvent("evt_refund_updated", "refund.updated", {
        id: "re_updated",
        status: "succeeded",
      });
      mocks.storage.getRefundByStripeRefundId.mockResolvedValue({
        id: "refund-local-updated",
        orderId: "order-updated-refund",
        status: "pending",
        processedAt: undefined,
      });

      const response = await postWebhook("/webhooks/stripe");

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: true });
      expect(mocks.storage.updateRefund).toHaveBeenCalledWith(
        "refund-local-updated",
        expect.objectContaining({ status: "processed", processedAt: expect.any(Date) })
      );
      expect(mocks.enqueueRefundProcessed).toHaveBeenCalledWith("refund-local-updated");
      expect(mocks.updateOrderPaymentStatus).toHaveBeenCalledWith("order-updated-refund");
      expect(mocks.storage.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        actor: "stripe_webhook",
        action: "refund.status_synced",
        entityType: "refund",
        entityId: "refund-local-updated",
        metadata: expect.objectContaining({
          previousStatus: "pending",
          newStatus: "processed",
          stripeStatus: "succeeded",
          eventId: "evt_refund_updated",
        }),
      }));
    });
  });

  describe("POST /stripe-connect characterization", () => {
    it("uses the decrypted settings-stored Connect secret when present", async () => {
      mocks.currentEvent = stripeEvent("evt_connect_stored", "person.updated", { id: "person_123" });
      mocks.storage.getIntegrationSettings.mockResolvedValue({
        stripeConnectWebhookSecretEncrypted: "encrypted-connect-secret",
      });

      const response = await postWebhook("/webhooks/stripe-connect");

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: true });
      expect(mocks.decrypt).toHaveBeenCalledWith("encrypted-connect-secret");
      expect(mocks.stripeService.constructWebhookEvent).toHaveBeenCalledWith(
        expect.any(Buffer),
        "sig_test",
        "whsec_connect_stored"
      );
    });

    it("uses the environment Connect secret when settings are absent", async () => {
      mocks.currentEvent = stripeEvent("evt_connect_env", "person.updated", { id: "person_456" });
      vi.stubEnv("STRIPE_CONNECT_WEBHOOK_SECRET", "whsec_connect_fallback");

      const response = await postWebhook("/webhooks/stripe-connect");

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: true });
      expect(mocks.decrypt).not.toHaveBeenCalled();
      expect(mocks.stripeService.constructWebhookEvent).toHaveBeenCalledWith(
        expect.any(Buffer),
        "sig_test",
        "whsec_connect_fallback"
      );
    });

    it("returns the current failure response when no Connect secret exists", async () => {
      vi.stubEnv("STRIPE_CONNECT_WEBHOOK_SECRET", "");

      const response = await postWebhook("/webhooks/stripe-connect");

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        message: "Stripe Connect webhook secret not configured. Please add it in Admin → Integrations → Stripe → Stripe Connect section.",
      });
      expect(mocks.stripeService.constructWebhookEvent).not.toHaveBeenCalled();
    });

    it("returns the current Connect signature failure response", async () => {
      mocks.stripeService.constructWebhookEvent.mockRejectedValue(new Error("Invalid Connect signature"));

      const response = await postWebhook("/webhooks/stripe-connect");

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ message: "Webhook Error: Invalid Connect signature" });
      expect(mocks.alertWebhookFailure).toHaveBeenCalledWith(expect.objectContaining({
        provider: "stripe_connect",
        eventType: "signature_verification",
        errorCode: "SIGNATURE_VERIFICATION_FAILED",
      }));
    });

    it("applies account.updated payout enablement writes", async () => {
      mocks.currentEvent = stripeEvent("evt_account_updated", "account.updated", {
        id: "acct_updated",
        payouts_enabled: true,
        charges_enabled: true,
        details_submitted: true,
        requirements: { currently_due: [] },
      });
      mocks.storage.getAffiliatePayoutAccountByStripeAccountId.mockResolvedValue({
        id: "payout-account-1",
        affiliateId: "affiliate-1",
        payoutsEnabled: false,
        chargesEnabled: false,
        detailsSubmitted: false,
      });

      const response = await postWebhook("/webhooks/stripe-connect");

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: true });
      expect(mocks.storage.updateAffiliatePayoutAccount).toHaveBeenCalledWith(
        "payout-account-1",
        expect.objectContaining({
          payoutsEnabled: true,
          chargesEnabled: true,
          detailsSubmitted: true,
          requirements: { currently_due: [] },
        })
      );
      expect(mocks.storage.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: "stripe_connect.account_updated",
        entityId: "payout-account-1",
        metadata: expect.objectContaining({
          stripeAccountId: "acct_updated",
          affiliateId: "affiliate-1",
          eventId: "evt_account_updated",
        }),
      }));
    });

    it("refreshes payout enablement when a capability is updated", async () => {
      mocks.currentEvent = stripeEvent("evt_capability_updated", "capability.updated", {
        id: "card_payments",
        account: "acct_capability",
        status: "active",
      });
      mocks.storage.getAffiliatePayoutAccountByStripeAccountId.mockResolvedValue({
        id: "payout-account-2",
        affiliateId: "affiliate-2",
      });
      mocks.stripeService.retrieveAccount.mockResolvedValue({
        payouts_enabled: true,
        charges_enabled: true,
        details_submitted: false,
        requirements: { eventually_due: ["business_profile.url"] },
      });

      const response = await postWebhook("/webhooks/stripe-connect");

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: true });
      expect(mocks.stripeService.retrieveAccount).toHaveBeenCalledWith("acct_capability");
      expect(mocks.storage.updateAffiliatePayoutAccount).toHaveBeenCalledWith(
        "payout-account-2",
        expect.objectContaining({
          payoutsEnabled: true,
          chargesEnabled: true,
          detailsSubmitted: false,
          requirements: { eventually_due: ["business_profile.url"] },
        })
      );
      expect(mocks.storage.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: "stripe_connect.capability_updated",
        entityId: "payout-account-2",
        metadata: expect.objectContaining({
          stripeAccountId: "acct_capability",
          capability: "card_payments",
          status: "active",
          eventId: "evt_capability_updated",
        }),
      }));
    });

    it("acknowledges Connect handler errors after delivery dedupe", async () => {
      mocks.currentEvent = stripeEvent("evt_connect_error", "account.updated", {
        id: "acct_error",
      });
      mocks.storage.getAffiliatePayoutAccountByStripeAccountId.mockRejectedValue(
        new Error("payout storage unavailable")
      );

      const response = await postWebhook("/webhooks/stripe-connect");

      // current behavior - candidate bug, do not rely on
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: true });
      expect(mocks.storage.createProcessedWebhookEvent).toHaveBeenCalledWith(expect.objectContaining({
        eventId: "evt_connect_error",
        source: "stripe_connect",
      }));
      expect(mocks.storage.updateAffiliatePayoutAccount).not.toHaveBeenCalled();
    });
  });
});
