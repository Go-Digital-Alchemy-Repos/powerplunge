import type { APIRequestContext } from "@playwright/test";

const defaultPort = process.env.REPL_ID ? 5000 : 5001;
const e2ePort = Number(process.env.E2E_PORT ?? defaultPort);
const BASE = process.env.E2E_BASE_URL ?? `http://localhost:${e2ePort}`;
const ADMIN_EMAIL = "admin@test.com";
const PASSWORD = process.env.SEED_TEST_PASSWORD || "testpass123";

export async function adminLogin(request: APIRequestContext) {
  const resp = await request.post(`${BASE}/api/admin/login`, {
    data: { email: ADMIN_EMAIL, password: PASSWORD },
  });
  if (!resp.ok()) throw new Error(`Admin login failed: ${resp.status()}`);
  return resp;
}

export async function createProduct(
  request: APIRequestContext,
  overrides: Record<string, unknown> = {},
) {
  await adminLogin(request);
  const uid = Math.random().toString(36).slice(2, 8);
  const data = {
    name: `Test Product ${uid}`,
    price: 9999,
    active: true,
    status: "published",
    urlSlug: `test-product-${uid}`,
    ...overrides,
  };
  const resp = await request.post(`${BASE}/api/admin/products`, { data });
  if (!resp.ok()) {
    const body = await resp.text();
    throw new Error(`Create product failed (${resp.status()}): ${body}`);
  }
  return resp.json();
}

export async function listPublicProducts(request: APIRequestContext) {
  const resp = await request.get(`${BASE}/api/products`);
  if (!resp.ok()) throw new Error(`List products failed: ${resp.status()}`);
  return resp.json();
}

export async function deleteProduct(
  request: APIRequestContext,
  productId: string,
) {
  await adminLogin(request);
  const resp = await request.delete(`${BASE}/api/admin/products/${productId}`);
  return resp;
}

export async function customerLogin(
  request: APIRequestContext,
  email = "customer@test.com",
  password = PASSWORD,
) {
  const resp = await request.post(`${BASE}/api/customer/auth/login`, {
    data: { email, password },
  });
  if (!resp.ok()) throw new Error(`Customer login failed: ${resp.status()}`);
  const body = await resp.json();
  return body.sessionToken as string;
}
