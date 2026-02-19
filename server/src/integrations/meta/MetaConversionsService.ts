import crypto from "crypto";
import { storage } from "../../../storage";
import type { MetaCapiEvent, Order, Refund } from "@shared/schema";
import { getStaticBaseUrl } from "../../utils/base-url";
import { metaGraphClient, MetaGraphError } from "./MetaGraphClient";
import { metaCatalogService } from "./MetaCatalogService";
import { errorAlertingService } from "../../services/error-alerting.service";
import {
  createNextRetryAt,
  getFailureStatus,
  normalizeCity,
  normalizeEmail,
  normalizePhone,
  normalizeState,
  normalizeZip,
  resolveMetaProductId,
  sha256,
} from "./meta-utils";

const MAX_ATTEMPTS = 8;
const DISPATCH_BATCH_SIZE = 20;

type MetaEventPayload = {
  event_name: string;
  event_time: number;
  event_id: string;
  action_source: "website";
  event_source_url?: string;
  user_data: Record<string, any>;
  custom_data?: Record<string, any>;
};

function extractFirstLastName(name?: string | null): { first?: string; last?: string } {
  if (!name) return {};
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  return {
    first: parts[0]?.toLowerCase(),
    last: parts.length > 1 ? parts[parts.length - 1].toLowerCase() : undefined,
  };
}

class NonRetryableMetaDispatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NonRetryableMetaDispatchError";
  }
}

class MetaConversionsService {
  private async shouldEnqueueForOrder(order: Order): Promise<boolean> {
    if (!order.marketingConsentGranted) return false;
    const settings = await storage.getIntegrationSettings();
    return !!settings?.metaMarketingConfigured;
  }

  private async buildCommonUserData(order: Order): Promise<Record<string, any>> {
    const customer = await storage.getCustomer(order.customerId);
    const firstLast = extractFirstLastName(customer?.name || order.shippingName || undefined);
    const userData: Record<string, any> = {};

    const em = normalizeEmail(customer?.email);
    if (em) userData.em = [sha256(em)];

    const ph = normalizePhone(customer?.phone);
    if (ph) userData.ph = [sha256(ph)];

    if (firstLast.first) userData.fn = [sha256(firstLast.first)];
    if (firstLast.last) userData.ln = [sha256(firstLast.last)];

    const city = normalizeCity(order.shippingCity);
    if (city) userData.ct = [sha256(city)];

    const state = normalizeState(order.shippingState);
    if (state) userData.st = [sha256(state)];

    const zip = normalizeZip(order.shippingZip);
    if (zip) userData.zp = [sha256(zip.toLowerCase())];

    const country = (order.shippingCountry || "US").toLowerCase();
    if (country) userData.country = [sha256(country)];

    if (customer?.id) userData.external_id = [sha256(customer.id)];
    if (order.metaFbp) userData.fbp = order.metaFbp;
    if (order.metaFbc) userData.fbc = order.metaFbc;
    if (order.customerIp) userData.client_ip_address = order.customerIp;
    if (order.customerUserAgent) userData.client_user_agent = order.customerUserAgent;

    return userData;
  }

  private async buildPurchasePayload(order: Order): Promise<MetaEventPayload> {
    const items = await storage.getOrderItems(order.id);
    const products = await Promise.all(items.map((item) => storage.getProduct(item.productId)));

    const contents = items.map((item, idx) => ({
      id: resolveMetaProductId(products[idx]?.sku, item.productId),
      quantity: item.quantity,
      item_price: Number((item.unitPrice / 100).toFixed(2)),
    }));
    const contentIds = contents.map((c) => c.id);
    const numItems = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      event_name: "Purchase",
      event_time: Math.floor((order.updatedAt || order.createdAt).getTime() / 1000),
      event_id: `purchase:${order.id}`,
      action_source: "website",
      event_source_url: order.metaEventSourceUrl || `${getStaticBaseUrl()}/checkout`,
      user_data: await this.buildCommonUserData(order),
      custom_data: {
        currency: "USD",
        value: Number((order.totalAmount / 100).toFixed(2)),
        order_id: order.id,
        content_type: "product",
        content_ids: contentIds,
        contents,
        num_items: numItems,
      },
    };
  }

  private async buildRefundPayload(refund: Refund): Promise<MetaEventPayload | null> {
    const order = await storage.getOrder(refund.orderId);
    if (!order) return null;
    return {
      event_name: "Refund",
      event_time: Math.floor((refund.processedAt || refund.createdAt).getTime() / 1000),
      event_id: `refund:${refund.id}:processed`,
      action_source: "website",
      event_source_url: order.metaEventSourceUrl || `${getStaticBaseUrl()}/checkout`,
      user_data: await this.buildCommonUserData(order),
      custom_data: {
        currency: "USD",
        value: Number((refund.amount / 100).toFixed(2)),
        order_id: order.id,
      },
    };
  }

  async enqueuePurchase(orderId: string): Promise<{ success: boolean; queued: boolean; reason?: string }> {
    const order = await storage.getOrder(orderId);
    if (!order) return { success: false, queued: false, reason: "Order not found" };
    if (!(await this.shouldEnqueueForOrder(order))) {
      return { success: true, queued: false, reason: "marketing_consent_or_meta_config_missing" };
    }

    const eventKey = `purchase:${order.id}`;
    const payload = await this.buildPurchasePayload(order);
    try {
      await storage.createMetaCapiEvent({
        eventKey,
        eventName: "Purchase",
        orderId: order.id,
        payloadJson: payload,
        status: "queued",
      });
      return { success: true, queued: true };
    } catch (error: any) {
      if (error?.code === "23505") {
        return { success: true, queued: false, reason: "already_exists" };
      }
      return { success: false, queued: false, reason: error.message || "enqueue_failed" };
    }
  }

  async enqueueRefundProcessed(refundId: string): Promise<{ success: boolean; queued: boolean; reason?: string }> {
    const refund = await storage.getRefund(refundId);
    if (!refund) return { success: false, queued: false, reason: "Refund not found" };
    if (refund.status !== "processed") return { success: true, queued: false, reason: "refund_not_processed" };

    const order = await storage.getOrder(refund.orderId);
    if (!order) return { success: false, queued: false, reason: "Order not found" };
    if (!(await this.shouldEnqueueForOrder(order))) {
      return { success: true, queued: false, reason: "marketing_consent_or_meta_config_missing" };
    }

    const payload = await this.buildRefundPayload(refund);
    if (!payload) return { success: false, queued: false, reason: "payload_build_failed" };

    const eventKey = `refund:${refund.id}:processed`;
    try {
      await storage.createMetaCapiEvent({
        eventKey,
        eventName: "Refund",
        orderId: refund.orderId,
        refundId: refund.id,
        payloadJson: payload,
        status: "queued",
      });
      return { success: true, queued: true };
    } catch (error: any) {
      if (error?.code === "23505") {
        return { success: true, queued: false, reason: "already_exists" };
      }
      return { success: false, queued: false, reason: error.message || "enqueue_failed" };
    }
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof NonRetryableMetaDispatchError) return false;
    if (error instanceof MetaGraphError) {
      if (error.status === 429) return true;
      return error.status >= 500;
    }
    return true;
  }

  private async markDispatchStatus(status: "success" | "failed"): Promise<void> {
    await storage.updateIntegrationSettings({
      metaCapiLastDispatchAt: new Date(),
      metaCapiLastDispatchStatus: status,
    });
  }

  private async dispatchEvent(event: MetaCapiEvent): Promise<void> {
    const settings = await storage.getIntegrationSettings();
    if (!settings?.metaPixelId) {
      throw new NonRetryableMetaDispatchError("Meta pixel ID is not configured");
    }

    if (event.orderId) {
      const order = await storage.getOrder(event.orderId);
      if (!order) {
        throw new NonRetryableMetaDispatchError("Order not found");
      }
      if (!order.marketingConsentGranted) {
        throw new NonRetryableMetaDispatchError("Marketing consent not granted");
      }
    }

    const body: Record<string, any> = {
      data: [event.payloadJson],
    };
    const testEventCode = await metaCatalogService.getTestEventCode();
    if (testEventCode) body.test_event_code = testEventCode;

    const response = await metaGraphClient.call<any>("POST", `/${settings.metaPixelId}/events`, {
      body,
    });

    await storage.updateMetaCapiEvent(event.id, {
      status: "sent",
      sentAt: new Date(),
      lockToken: null,
      lockedAt: null,
      metaTraceId: response?.fbtrace_id || null,
      lastError: null,
      attemptCount: event.attemptCount + 1,
    });
  }

  async dispatchDueEvents(limit = DISPATCH_BATCH_SIZE): Promise<{ success: boolean; dispatched: number; failed: number }> {
    const settings = await storage.getIntegrationSettings();
    if (!settings?.metaMarketingConfigured || !settings.metaCapiEnabled) {
      return { success: true, dispatched: 0, failed: 0 };
    }

    const lockToken = crypto.randomUUID();
    const batch = await storage.claimDueMetaCapiEvents(limit, lockToken);
    let dispatched = 0;
    let failed = 0;

    for (const event of batch) {
      try {
        await this.dispatchEvent(event);
        dispatched += 1;
      } catch (error: any) {
        failed += 1;
        const attempts = event.attemptCount + 1;
        const retryable = this.isRetryable(error);
        const nextStatus = getFailureStatus(attempts, retryable, MAX_ATTEMPTS);
        await storage.updateMetaCapiEvent(event.id, {
          status: nextStatus,
          attemptCount: attempts,
          nextAttemptAt: nextStatus === "retry" ? createNextRetryAt(attempts) : event.nextAttemptAt,
          lastError: error.message || "dispatch_failed",
          lockToken: null,
          lockedAt: null,
        });

        await errorAlertingService.alertSystemError({
          component: "meta_capi_dispatch",
          operation: "dispatch_event",
          errorMessage: error.message || "Meta dispatch failed",
          metadata: {
            eventId: event.id,
            eventKey: event.eventKey,
            status: nextStatus,
            attempts,
          },
        });
      }
    }

    await this.markDispatchStatus(failed > 0 ? "failed" : "success");
    return { success: failed === 0, dispatched, failed };
  }

  async sendTestEvent(): Promise<{ success: boolean; error?: string; fbtraceId?: string }> {
    try {
      const settings = await storage.getIntegrationSettings();
      if (!settings?.metaPixelId) return { success: false, error: "Meta pixel ID is required" };
      const testEventCode = await metaCatalogService.getTestEventCode();
      const event: MetaEventPayload = {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: `meta_test:${Date.now()}`,
        action_source: "website",
        event_source_url: `${getStaticBaseUrl()}/checkout`,
        user_data: {
          external_id: [sha256("meta-test-user")],
          client_user_agent: "powerplunge-meta-test",
        },
        custom_data: {
          currency: "USD",
          value: 1.0,
          order_id: `meta-test-${Date.now()}`,
        },
      };

      const body: Record<string, any> = { data: [event] };
      if (testEventCode) body.test_event_code = testEventCode;
      const response = await metaGraphClient.call<any>("POST", `/${settings.metaPixelId}/events`, { body });
      return { success: true, fbtraceId: response?.fbtrace_id };
    } catch (error: any) {
      await errorAlertingService.alertSystemError({
        component: "meta_capi_test_event",
        operation: "send_test_event",
        errorMessage: error.message || "Meta test event failed",
        metadata: { provider: "meta" },
      });
      return { success: false, error: error.message || "Failed to send test event" };
    }
  }

  async getStats(): Promise<{
    queue: {
      queued: number;
      retry: number;
      processing: number;
      failed: number;
      sent: number;
      oldestQueuedAt: Date | null;
      oldestQueuedAgeSeconds: number | null;
      lastSentAt: Date | null;
    };
    lastDispatchAt: Date | null;
    lastDispatchStatus: string | null;
  }> {
    const queue = await storage.getMetaCapiQueueStats();
    const settings = await storage.getIntegrationSettings();
    return {
      queue: {
        ...queue,
        oldestQueuedAgeSeconds: queue.oldestQueuedAt
          ? Math.max(0, Math.floor((Date.now() - queue.oldestQueuedAt.getTime()) / 1000))
          : null,
      },
      lastDispatchAt: settings?.metaCapiLastDispatchAt || null,
      lastDispatchStatus: settings?.metaCapiLastDispatchStatus || "never",
    };
  }
}

export const metaConversionsService = new MetaConversionsService();
