import { getStoredConsent } from "./consent";

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

let currentMeasurementId: string | null = null;

const PURCHASE_DEDUPE_KEY = "pp_ga4_purchased_ids";

function hasAnalyticsConsent(): boolean {
  const stored = getStoredConsent();
  if (!stored) return true;
  return stored.categories.analytics === true;
}

function gaEvent(name: string, params: Record<string, any>): void {
  try {
    if (!hasAnalyticsConsent()) return;
    if (typeof window === "undefined") return;
    if (window.gtag) {
      window.gtag("event", name, params);
    } else if (window.dataLayer) {
      window.dataLayer.push({ event: name, ...params });
    }
  } catch {}
}

function isPurchaseFired(transactionId: string): boolean {
  try {
    const raw = localStorage.getItem(PURCHASE_DEDUPE_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    return ids.includes(transactionId);
  } catch {
    return false;
  }
}

function markPurchaseFired(transactionId: string): void {
  try {
    const raw = localStorage.getItem(PURCHASE_DEDUPE_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    ids.push(transactionId);
    if (ids.length > 50) ids.splice(0, ids.length - 50);
    localStorage.setItem(PURCHASE_DEDUPE_KEY, JSON.stringify(ids));
  } catch {}
}

interface GA4Item {
  item_id: string;
  item_name: string;
  price: number;
  quantity?: number;
  item_brand?: string;
  item_category?: string;
  item_variant?: string;
  index?: number;
}

export function mapItem(item: {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  category?: string;
  variant?: string;
  index?: number;
}): GA4Item {
  const mapped: GA4Item = {
    item_id: item.id,
    item_name: item.name,
    price: item.price,
    item_brand: "Power Plunge",
    item_category: item.category || "Cold Plunge",
  };
  if (item.quantity !== undefined) mapped.quantity = item.quantity;
  if (item.variant) mapped.item_variant = item.variant;
  if (item.index !== undefined) mapped.index = item.index;
  return mapped;
}

export const initGA = (measurementId?: string) => {
  const id = measurementId || import.meta.env.VITE_GA_MEASUREMENT_ID;

  if (!id) return;

  if (currentMeasurementId === id) return;
  currentMeasurementId = id;

  const existing = document.querySelector(`script[src*="googletagmanager.com/gtag"]`);
  if (existing) existing.remove();

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", id);
};

export const initGAFromSettings = async () => {
  try {
    const res = await fetch("/api/site-settings");
    if (!res.ok) return;
    const data = await res.json();
    if (data.gaMeasurementId) {
      initGA(data.gaMeasurementId);
    } else if (import.meta.env.VITE_GA_MEASUREMENT_ID) {
      initGA(import.meta.env.VITE_GA_MEASUREMENT_ID);
    }
  } catch {
    if (import.meta.env.VITE_GA_MEASUREMENT_ID) {
      initGA(import.meta.env.VITE_GA_MEASUREMENT_ID);
    }
  }
};

export const trackPageView = (url: string) => {
  if (typeof window === "undefined" || !window.gtag || !currentMeasurementId) return;
  if (!hasAnalyticsConsent()) return;
  window.gtag("config", currentMeasurementId, { page_path: url });
};

export const trackEvent = (
  action: string,
  category?: string,
  label?: string,
  value?: number,
) => {
  gaEvent(action, {
    event_category: category,
    event_label: label,
    value,
  });
};

export const trackEcommerceEvent = (
  eventName: string,
  params: Record<string, any>,
) => {
  gaEvent(eventName, params);
};

export const trackViewItemList = (
  listName: string,
  items: Array<{ id: string; name: string; price: number }>,
) => {
  gaEvent("view_item_list", {
    item_list_name: listName,
    items: items.slice(0, 20).map((i, index) => mapItem({ ...i, index })),
  });
};

export const trackViewItem = (item: {
  id: string;
  name: string;
  price: number;
  category?: string;
}) => {
  gaEvent("view_item", {
    currency: "USD",
    value: item.price,
    items: [mapItem(item)],
  });
};

export const trackAddToCart = (item: {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}) => {
  gaEvent("add_to_cart", {
    currency: "USD",
    value: item.price * item.quantity,
    items: [mapItem(item)],
  });
};

export const trackRemoveFromCart = (item: {
  id: string;
  name: string;
  price: number;
  quantity: number;
}) => {
  gaEvent("remove_from_cart", {
    currency: "USD",
    value: item.price * item.quantity,
    items: [mapItem(item)],
  });
};

export const trackBeginCheckout = (items: Array<{
  id: string;
  name: string;
  price: number;
  quantity: number;
}>, totalValue: number) => {
  gaEvent("begin_checkout", {
    currency: "USD",
    value: totalValue,
    items: items.map((i) => mapItem(i)),
  });
};

export const trackAddShippingInfo = (items: Array<{
  id: string;
  name: string;
  price: number;
  quantity: number;
}>, totalValue: number, shippingTier?: string) => {
  gaEvent("add_shipping_info", {
    currency: "USD",
    value: totalValue,
    shipping_tier: shippingTier || "Standard",
    items: items.map((i) => mapItem(i)),
  });
};

export const trackAddPaymentInfo = (items: Array<{
  id: string;
  name: string;
  price: number;
  quantity: number;
}>, totalValue: number, paymentType?: string) => {
  gaEvent("add_payment_info", {
    currency: "USD",
    value: totalValue,
    payment_type: paymentType || "Credit Card",
    items: items.map((i) => mapItem(i)),
  });
};

export const trackPurchase = (transaction: {
  transactionId: string;
  value: number;
  tax?: number;
  shipping?: number;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
}) => {
  if (isPurchaseFired(transaction.transactionId)) return;
  gaEvent("purchase", {
    transaction_id: transaction.transactionId,
    currency: "USD",
    value: transaction.value,
    tax: transaction.tax || 0,
    shipping: transaction.shipping || 0,
    items: transaction.items.map((i) => mapItem(i)),
  });
  markPurchaseFired(transaction.transactionId);
};

export const trackSearch = (searchTerm: string) => {
  trackEvent("search", "engagement", searchTerm);
};

export const trackSignUp = (method: string) => {
  trackEvent("sign_up", "engagement", method);
};

export const trackLogin = (method: string) => {
  trackEvent("login", "engagement", method);
};
