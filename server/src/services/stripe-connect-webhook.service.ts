import type { IStorage } from "../../storage";

export interface StripeConnectAccount {
  id: string;
  payouts_enabled?: boolean | null;
  charges_enabled?: boolean | null;
  details_submitted?: boolean | null;
  requirements?: unknown;
}

export interface SynchronizeAffiliatePayoutAccountInput {
  account: StripeConnectAccount;
  eventId: string;
}

export interface StripeConnectWebhookDependencies {
  storage: Pick<
    IStorage,
    | "getAffiliatePayoutAccountByStripeAccountId"
    | "updateAffiliatePayoutAccount"
    | "createAuditLog"
  >;
  log: Pick<Console, "log">;
}

export class StripeConnectWebhookService {
  constructor(private readonly deps: StripeConnectWebhookDependencies) {}

  async synchronizeAffiliatePayoutAccount(
    input: SynchronizeAffiliatePayoutAccountInput,
  ): Promise<void> {
    const { account, eventId } = input;
    const payoutAccount = await this.deps.storage.getAffiliatePayoutAccountByStripeAccountId(
      account.id,
    );
    if (!payoutAccount) return;

    const prevState = {
      payoutsEnabled: payoutAccount.payoutsEnabled,
      chargesEnabled: payoutAccount.chargesEnabled,
      detailsSubmitted: payoutAccount.detailsSubmitted,
    };
    const newState = {
      payoutsEnabled: account.payouts_enabled ?? false,
      chargesEnabled: account.charges_enabled ?? false,
      detailsSubmitted: account.details_submitted ?? false,
    };

    await this.deps.storage.updateAffiliatePayoutAccount(payoutAccount.id, {
      ...newState,
      requirements: account.requirements as any,
    });
    this.deps.log.log(
      `[CONNECT] Updated payout account ${payoutAccount.id} for Stripe account ${account.id}`,
    );

    if (
      prevState.payoutsEnabled !== newState.payoutsEnabled ||
      prevState.detailsSubmitted !== newState.detailsSubmitted
    ) {
      await this.deps.storage.createAuditLog({
        actor: "stripe_webhook",
        action: "stripe_connect.account_updated",
        entityType: "affiliate_payout_account",
        entityId: payoutAccount.id,
        metadata: {
          stripeAccountId: account.id,
          affiliateId: payoutAccount.affiliateId,
          prevState,
          newState,
          eventId,
        },
      });
    }
  }
}

export function createStripeConnectWebhookService(
  dependencies: Partial<StripeConnectWebhookDependencies> = {},
): StripeConnectWebhookService {
  const storageDependency: StripeConnectWebhookDependencies["storage"] = {
    getAffiliatePayoutAccountByStripeAccountId: async (...args) =>
      (await import("../../storage")).storage.getAffiliatePayoutAccountByStripeAccountId(...args),
    updateAffiliatePayoutAccount: async (...args) =>
      (await import("../../storage")).storage.updateAffiliatePayoutAccount(...args),
    createAuditLog: async (...args) =>
      (await import("../../storage")).storage.createAuditLog(...args),
  };

  return new StripeConnectWebhookService({
    storage: dependencies.storage ?? storageDependency,
    log: dependencies.log ?? console,
  });
}
