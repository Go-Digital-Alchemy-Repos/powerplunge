import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createStripeConnectWebhookService,
  type StripeConnectWebhookDependencies,
} from "../stripe-connect-webhook.service";

function makeDependencies(): StripeConnectWebhookDependencies {
  return {
    storage: {
      getAffiliatePayoutAccountByStripeAccountId: vi.fn(),
      updateAffiliatePayoutAccount: vi.fn(),
      createAuditLog: vi.fn(),
    },
    log: {
      log: vi.fn(),
    },
  };
}

describe("StripeConnectWebhookService", () => {
  let deps: StripeConnectWebhookDependencies;

  beforeEach(() => {
    deps = makeDependencies();
  });

  it("synchronizes a known payout account and audits a payout enablement change", async () => {
    vi.mocked(deps.storage.getAffiliatePayoutAccountByStripeAccountId).mockResolvedValue({
      id: "payout-account-1",
      affiliateId: "affiliate-1",
      payoutsEnabled: false,
      chargesEnabled: false,
      detailsSubmitted: false,
    } as any);

    await createStripeConnectWebhookService(deps).synchronizeAffiliatePayoutAccount({
      account: {
        id: "acct_updated",
        payouts_enabled: true,
        charges_enabled: true,
        details_submitted: true,
        requirements: { currently_due: [] },
      },
      eventId: "evt_account_updated",
    });

    expect(deps.storage.updateAffiliatePayoutAccount).toHaveBeenCalledWith("payout-account-1", {
      payoutsEnabled: true,
      chargesEnabled: true,
      detailsSubmitted: true,
      requirements: { currently_due: [] },
    });
    expect(deps.log.log).toHaveBeenCalledWith(
      "[CONNECT] Updated payout account payout-account-1 for Stripe account acct_updated",
    );
    expect(deps.storage.createAuditLog).toHaveBeenCalledWith({
      actor: "stripe_webhook",
      action: "stripe_connect.account_updated",
      entityType: "affiliate_payout_account",
      entityId: "payout-account-1",
      metadata: {
        stripeAccountId: "acct_updated",
        affiliateId: "affiliate-1",
        prevState: {
          payoutsEnabled: false,
          chargesEnabled: false,
          detailsSubmitted: false,
        },
        newState: {
          payoutsEnabled: true,
          chargesEnabled: true,
          detailsSubmitted: true,
        },
        eventId: "evt_account_updated",
      },
    });
  });

  it("does not audit when only charges enablement changes", async () => {
    vi.mocked(deps.storage.getAffiliatePayoutAccountByStripeAccountId).mockResolvedValue({
      id: "payout-account-1",
      affiliateId: "affiliate-1",
      payoutsEnabled: true,
      chargesEnabled: false,
      detailsSubmitted: true,
    } as any);

    await createStripeConnectWebhookService(deps).synchronizeAffiliatePayoutAccount({
      account: {
        id: "acct_updated",
        payouts_enabled: true,
        charges_enabled: true,
        details_submitted: true,
      },
      eventId: "evt_charges_enabled",
    });

    expect(deps.storage.updateAffiliatePayoutAccount).toHaveBeenCalledWith(
      "payout-account-1",
      {
        payoutsEnabled: true,
        chargesEnabled: true,
        detailsSubmitted: true,
        requirements: undefined,
      },
    );
    expect(deps.storage.createAuditLog).not.toHaveBeenCalled();
  });

  it("does nothing when the Stripe account has no local payout account", async () => {
    vi.mocked(deps.storage.getAffiliatePayoutAccountByStripeAccountId).mockResolvedValue(undefined);

    await createStripeConnectWebhookService(deps).synchronizeAffiliatePayoutAccount({
      account: { id: "acct_unknown" },
      eventId: "evt_unknown",
    });

    expect(deps.storage.updateAffiliatePayoutAccount).not.toHaveBeenCalled();
    expect(deps.storage.createAuditLog).not.toHaveBeenCalled();
    expect(deps.log.log).not.toHaveBeenCalled();
  });

  it("defaults absent Stripe account enablement fields to false", async () => {
    vi.mocked(deps.storage.getAffiliatePayoutAccountByStripeAccountId).mockResolvedValue({
      id: "payout-account-1",
      affiliateId: "affiliate-1",
      payoutsEnabled: true,
      chargesEnabled: true,
      detailsSubmitted: true,
    } as any);

    await createStripeConnectWebhookService(deps).synchronizeAffiliatePayoutAccount({
      account: { id: "acct_incomplete" },
      eventId: "evt_incomplete",
    });

    expect(deps.storage.updateAffiliatePayoutAccount).toHaveBeenCalledWith(
      "payout-account-1",
      {
        payoutsEnabled: false,
        chargesEnabled: false,
        detailsSubmitted: false,
        requirements: undefined,
      },
    );
    expect(deps.storage.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          newState: {
            payoutsEnabled: false,
            chargesEnabled: false,
            detailsSubmitted: false,
          },
        }),
      }),
    );
  });

  it("propagates storage errors to the route-owned error boundary", async () => {
    vi.mocked(deps.storage.getAffiliatePayoutAccountByStripeAccountId).mockRejectedValue(
      new Error("payout storage unavailable"),
    );

    await expect(
      createStripeConnectWebhookService(deps).synchronizeAffiliatePayoutAccount({
        account: { id: "acct_error" },
        eventId: "evt_error",
      }),
    ).rejects.toThrow("payout storage unavailable");
  });
});
