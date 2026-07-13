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

export interface StripeCapability {
  id: string;
  account?: string | { id?: string | null } | null;
  status?: string | null;
}

export interface SynchronizeAffiliatePayoutCapabilityInput {
  capability: StripeCapability;
  eventId: string;
}

export interface StripeConnectWebhookDependencies {
  storage: Pick<
    IStorage,
    | "getAffiliatePayoutAccountByStripeAccountId"
    | "updateAffiliatePayoutAccount"
    | "createAuditLog"
  >;
  stripeService: {
    retrieveAccount(accountId: string): Promise<StripeConnectAccount>;
  };
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

    await this.deps.storage.updateAffiliatePayoutAccount(payoutAccount.id, {
      ...newState,
      requirements: account.requirements as any,
    });
    this.deps.log.log(
      `[CONNECT] Updated payout account ${payoutAccount.id} for Stripe account ${account.id}`,
    );
  }

  async synchronizeAffiliatePayoutCapability(
    input: SynchronizeAffiliatePayoutCapabilityInput,
  ): Promise<void> {
    const { capability, eventId } = input;
    const accountId = typeof capability.account === "string"
      ? capability.account
      : capability.account?.id;
    if (!accountId) return;

    const payoutAccount = await this.deps.storage.getAffiliatePayoutAccountByStripeAccountId(
      accountId,
    );
    if (!payoutAccount) return;

    const fullAccount = await this.deps.stripeService.retrieveAccount(accountId);
    await this.deps.storage.updateAffiliatePayoutAccount(payoutAccount.id, {
      payoutsEnabled: fullAccount.payouts_enabled ?? false,
      chargesEnabled: fullAccount.charges_enabled ?? false,
      detailsSubmitted: fullAccount.details_submitted ?? false,
      requirements: fullAccount.requirements as any,
    });
    this.deps.log.log(`[CONNECT] Updated capability for payout account ${payoutAccount.id}`);

    await this.deps.storage.createAuditLog({
      actor: "stripe_webhook",
      action: "stripe_connect.capability_updated",
      entityType: "affiliate_payout_account",
      entityId: payoutAccount.id,
      metadata: {
        stripeAccountId: accountId,
        affiliateId: payoutAccount.affiliateId,
        capability: capability.id,
        status: capability.status,
        eventId,
      },
    });
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
    stripeService: dependencies.stripeService ?? {
      retrieveAccount: async (accountId) => {
        const { stripeService } = await import("../integrations/stripe/StripeService");
        return stripeService.retrieveAccount(accountId);
      },
    },
    log: dependencies.log ?? console,
  });
}
