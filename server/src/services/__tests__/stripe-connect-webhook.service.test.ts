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
    stripeService: {
      retrieveAccount: vi.fn(),
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

  it("completes a payout account retry after the audit write initially fails", async () => {
    const persistedPayoutAccount = {
      id: "payout-account-1",
      affiliateId: "affiliate-1",
      payoutsEnabled: false,
      chargesEnabled: false,
      detailsSubmitted: false,
    };
    vi.mocked(deps.storage.getAffiliatePayoutAccountByStripeAccountId).mockImplementation(
      async () => persistedPayoutAccount as any,
    );
    vi.mocked(deps.storage.updateAffiliatePayoutAccount).mockImplementation(
      async (_id, update) => {
        Object.assign(persistedPayoutAccount, update);
        return persistedPayoutAccount as any;
      },
    );
    vi.mocked(deps.storage.createAuditLog)
      .mockRejectedValueOnce(new Error("audit unavailable"))
      .mockResolvedValueOnce({} as any);
    const service = createStripeConnectWebhookService(deps);
    const input = {
      account: {
        id: "acct_updated",
        payouts_enabled: true,
        charges_enabled: true,
        details_submitted: true,
      },
      eventId: "evt_retry",
    };

    await expect(service.synchronizeAffiliatePayoutAccount(input)).rejects.toThrow(
      "audit unavailable",
    );
    await expect(service.synchronizeAffiliatePayoutAccount(input)).resolves.toBeUndefined();

    expect(deps.storage.createAuditLog).toHaveBeenCalledTimes(2);
    expect(deps.storage.updateAffiliatePayoutAccount).toHaveBeenCalledTimes(1);
    expect(persistedPayoutAccount.payoutsEnabled).toBe(true);
    expect(persistedPayoutAccount.detailsSubmitted).toBe(true);
    // An audit-success/final-account-write-failure retry may duplicate the append-only audit entry.
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

  it("refreshes a known payout account from a capability update and always audits", async () => {
    vi.mocked(deps.storage.getAffiliatePayoutAccountByStripeAccountId).mockResolvedValue({
      id: "payout-account-1",
      affiliateId: "affiliate-1",
    } as any);
    vi.mocked(deps.stripeService.retrieveAccount).mockResolvedValue({
      id: "acct_capability",
      payouts_enabled: true,
      charges_enabled: false,
      details_submitted: true,
      requirements: { currently_due: ["external_account"] },
    });

    await createStripeConnectWebhookService(deps).synchronizeAffiliatePayoutCapability({
      capability: {
        id: "card_payments",
        account: "acct_capability",
        status: "active",
      },
      eventId: "evt_capability_updated",
    });

    expect(deps.stripeService.retrieveAccount).toHaveBeenCalledWith("acct_capability");
    expect(deps.storage.updateAffiliatePayoutAccount).toHaveBeenCalledWith(
      "payout-account-1",
      {
        payoutsEnabled: true,
        chargesEnabled: false,
        detailsSubmitted: true,
        requirements: { currently_due: ["external_account"] },
      },
    );
    expect(deps.log.log).toHaveBeenCalledWith(
      "[CONNECT] Updated capability for payout account payout-account-1",
    );
    expect(deps.storage.createAuditLog).toHaveBeenCalledWith({
      actor: "stripe_webhook",
      action: "stripe_connect.capability_updated",
      entityType: "affiliate_payout_account",
      entityId: "payout-account-1",
      metadata: {
        stripeAccountId: "acct_capability",
        affiliateId: "affiliate-1",
        capability: "card_payments",
        status: "active",
        eventId: "evt_capability_updated",
      },
    });
  });

  it("resolves the capability account from its object form", async () => {
    vi.mocked(deps.storage.getAffiliatePayoutAccountByStripeAccountId).mockResolvedValue({
      id: "payout-account-1",
      affiliateId: "affiliate-1",
    } as any);
    vi.mocked(deps.stripeService.retrieveAccount).mockResolvedValue({
      id: "acct_object",
    });

    await createStripeConnectWebhookService(deps).synchronizeAffiliatePayoutCapability({
      capability: {
        id: "transfers",
        account: { id: "acct_object" },
        status: "pending",
      },
      eventId: "evt_object_account",
    });

    expect(deps.storage.getAffiliatePayoutAccountByStripeAccountId).toHaveBeenCalledWith(
      "acct_object",
    );
    expect(deps.stripeService.retrieveAccount).toHaveBeenCalledWith("acct_object");
  });

  it("does not refresh or write when a capability has no local payout account", async () => {
    vi.mocked(deps.storage.getAffiliatePayoutAccountByStripeAccountId).mockResolvedValue(undefined);

    await createStripeConnectWebhookService(deps).synchronizeAffiliatePayoutCapability({
      capability: {
        id: "transfers",
        account: "acct_unknown",
        status: "active",
      },
      eventId: "evt_unknown_capability",
    });

    expect(deps.stripeService.retrieveAccount).not.toHaveBeenCalled();
    expect(deps.storage.updateAffiliatePayoutAccount).not.toHaveBeenCalled();
    expect(deps.storage.createAuditLog).not.toHaveBeenCalled();
    expect(deps.log.log).not.toHaveBeenCalled();
  });

  it("does nothing when a capability has no account ID", async () => {
    await createStripeConnectWebhookService(deps).synchronizeAffiliatePayoutCapability({
      capability: {
        id: "transfers",
        account: { id: null },
        status: "inactive",
      },
      eventId: "evt_missing_account",
    });

    expect(deps.storage.getAffiliatePayoutAccountByStripeAccountId).not.toHaveBeenCalled();
    expect(deps.stripeService.retrieveAccount).not.toHaveBeenCalled();
    expect(deps.storage.updateAffiliatePayoutAccount).not.toHaveBeenCalled();
    expect(deps.storage.createAuditLog).not.toHaveBeenCalled();
    expect(deps.log.log).not.toHaveBeenCalled();
  });

  it("propagates capability seam errors to the route-owned error boundary", async () => {
    vi.mocked(deps.storage.getAffiliatePayoutAccountByStripeAccountId).mockResolvedValue({
      id: "payout-account-1",
      affiliateId: "affiliate-1",
    } as any);
    vi.mocked(deps.stripeService.retrieveAccount).mockRejectedValue(
      new Error("Stripe account unavailable"),
    );

    await expect(
      createStripeConnectWebhookService(deps).synchronizeAffiliatePayoutCapability({
        capability: {
          id: "transfers",
          account: "acct_error",
          status: "pending",
        },
        eventId: "evt_capability_error",
      }),
    ).rejects.toThrow("Stripe account unavailable");
  });
});
