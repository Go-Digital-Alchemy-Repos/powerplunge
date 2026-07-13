export interface StripePaymentIntentFailure {
  id: string;
  amount?: number;
  receipt_email?: string | null;
  metadata?: {
    orderId?: string;
    customerEmail?: string;
  } | null;
  last_payment_error?: {
    code?: string;
    message?: string;
  } | null;
}

export interface AlertStripePaymentFailureInput {
  paymentIntent: StripePaymentIntentFailure;
}

export interface PaymentFailureAlert {
  orderId?: string;
  email?: string;
  amount?: number;
  paymentIntentId: string;
  errorMessage: string;
  errorCode?: string;
}

export interface StripePaymentWebhookDependencies {
  errorAlertingService: {
    alertPaymentFailure(params: PaymentFailureAlert): Promise<void>;
  };
  log: Pick<Console, "error">;
}

export class StripePaymentWebhookService {
  constructor(private readonly deps: StripePaymentWebhookDependencies) {}

  async alertStripePaymentFailure(input: AlertStripePaymentFailureInput): Promise<void> {
    const { paymentIntent } = input;
    const orderId = paymentIntent.metadata?.orderId;
    const lastError = paymentIntent.last_payment_error;

    this.deps.log.error("[WEBHOOK] Payment failed:", {
      paymentIntentId: paymentIntent.id,
      orderId,
      errorCode: lastError?.code,
      errorMessage: lastError?.message,
    });

    await this.deps.errorAlertingService.alertPaymentFailure({
      orderId: orderId || undefined,
      email: paymentIntent.receipt_email || paymentIntent.metadata?.customerEmail,
      amount: paymentIntent.amount,
      paymentIntentId: paymentIntent.id,
      errorMessage: lastError?.message || "Payment failed",
      errorCode: lastError?.code,
    });
  }
}

export function createStripePaymentWebhookService(
  dependencies: Partial<StripePaymentWebhookDependencies> = {},
): StripePaymentWebhookService {
  return new StripePaymentWebhookService({
    errorAlertingService: dependencies.errorAlertingService ?? {
      alertPaymentFailure: async (...args) =>
        (await import("./error-alerting.service")).errorAlertingService.alertPaymentFailure(...args),
    },
    log: dependencies.log ?? console,
  });
}
