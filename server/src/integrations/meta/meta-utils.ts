import crypto from "crypto";

export function resolveMetaProductId(sku: string | null | undefined, productId: string): string {
  const normalizedSku = typeof sku === "string" ? sku.trim() : "";
  return normalizedSku || productId;
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function normalizeEmail(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

export function normalizePhone(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.replace(/[^\d]/g, "");
  return normalized || null;
}

export function normalizeCity(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replace(/[^a-z]/g, "");
  return normalized || null;
}

export function normalizeState(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replace(/[^a-z]/g, "");
  return normalized || null;
}

export function normalizeZip(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().split("-")[0];
  return normalized || null;
}

export function getRetryDelaySeconds(attemptCount: number, jitterSeconds: number): number {
  const cappedBase = Math.min(3600, Math.pow(2, Math.max(1, attemptCount)) * 15);
  return cappedBase + Math.max(0, jitterSeconds);
}

export function createNextRetryAt(attemptCount: number, nowMs: number = Date.now()): Date {
  const jitter = Math.floor(Math.random() * 10);
  const delaySeconds = getRetryDelaySeconds(attemptCount, jitter);
  return new Date(nowMs + delaySeconds * 1000);
}

export function getFailureStatus(attempts: number, retryable: boolean, maxAttempts: number): "retry" | "failed" {
  return retryable && attempts < maxAttempts ? "retry" : "failed";
}
