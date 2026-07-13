import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createStripePaymentWebhookService,
  type StripePaymentWebhookDependencies,
} from "../stripe-payment-webhook.service";

function makeDependencies(): StripePaymentWebhookDependencies {
  return {
    errorAlertingService: {
      alertPaymentFailure: vi.fn(),
    },
    log: {
      error: vi.fn(),
    },
  };
}

describe("StripePaymentWebhookService", () => {
  let deps: StripePaymentWebhookDependencies;

  beforeEach(() => {
    deps = makeDependencies();
  });

  it("alerts a failed payment with its order and Stripe error context", async () => {
    await createStripePaymentWebhookService(deps).alertStripePaymentFailure({
      paymentIntent: {
        id: "pi_failed",
        amount: 8250,
        receipt_email: "buyer@example.com",
        metadata: { orderId: "order-failed", customerEmail: "fallback@example.com" },
        last_payment_error: { code: "card_declined", message: "Card declined" },
      },
    });

    expect(deps.log.error).toHaveBeenCalledWith("[WEBHOOK] Payment failed:", {
      paymentIntentId: "pi_failed",
      orderId: "order-failed",
      errorCode: "card_declined",
      errorMessage: "Card declined",
    });
    expect(deps.errorAlertingService.alertPaymentFailure).toHaveBeenCalledWith({
      orderId: "order-failed",
      email: "buyer@example.com",
      amount: 8250,
      paymentIntentId: "pi_failed",
      errorMessage: "Card declined",
      errorCode: "card_declined",
    });
  });

  it("omits a missing order ID and falls back to the metadata customer email", async () => {
    await createStripePaymentWebhookService(deps).alertStripePaymentFailure({
      paymentIntent: {
        id: "pi_fallback",
        amount: 4100,
        receipt_email: "",
        metadata: { orderId: "", customerEmail: "fallback@example.com" },
        last_payment_error: { message: "Declined" },
      },
    });

    expect(deps.errorAlertingService.alertPaymentFailure).toHaveBeenCalledWith({
      orderId: undefined,
      email: "fallback@example.com",
      amount: 4100,
      paymentIntentId: "pi_fallback",
      errorMessage: "Declined",
      errorCode: undefined,
    });
  });

  it("uses the default payment failure message when Stripe omits one", async () => {
    await createStripePaymentWebhookService(deps).alertStripePaymentFailure({
      paymentIntent: {
        id: "pi_no_message",
        amount: 2500,
        metadata: {},
        last_payment_error: { code: "processing_error" },
      },
    });

    expect(deps.errorAlertingService.alertPaymentFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        errorMessage: "Payment failed",
        errorCode: "processing_error",
      }),
    );
  });

  it("propagates alerting errors to the route-owned error boundary", async () => {
    vi.mocked(deps.errorAlertingService.alertPaymentFailure).mockRejectedValue(
      new Error("alert transport unavailable"),
    );

    await expect(
      createStripePaymentWebhookService(deps).alertStripePaymentFailure({
        paymentIntent: {
          id: "pi_alert_error",
          amount: 1200,
          last_payment_error: { message: "Declined" },
        },
      }),
    ).rejects.toThrow("alert transport unavailable");
  });
});
