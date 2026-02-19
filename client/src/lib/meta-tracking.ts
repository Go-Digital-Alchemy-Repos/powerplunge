import { hasMarketingConsent } from "./consent";

export interface MetaTrackingPayload {
  marketingConsentGranted: boolean;
  fbp?: string;
  fbc?: string;
  eventSourceUrl?: string;
  userAgent?: string;
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!cookie) return undefined;
  return decodeURIComponent(cookie.slice(name.length + 1));
}

export function getMetaTrackingPayload(): MetaTrackingPayload {
  if (typeof window === "undefined") {
    return { marketingConsentGranted: false };
  }

  return {
    marketingConsentGranted: hasMarketingConsent(),
    fbp: readCookie("_fbp"),
    fbc: readCookie("_fbc"),
    eventSourceUrl: window.location.href,
    userAgent: window.navigator.userAgent,
  };
}

