import crypto from "crypto";

function uid() {
  return crypto.randomUUID().slice(0, 8);
}

export function uniqueEmail() {
  return `test-${uid()}@example.com`;
}

export function uniqueName() {
  return `Test User ${uid()}`;
}

export function uniqueCode() {
  return `TEST${uid().toUpperCase()}`;
}

export function uniqueProductName() {
  return `Test Product ${uid()}`;
}
