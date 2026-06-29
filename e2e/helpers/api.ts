import type { APIRequestContext } from "@playwright/test";

const defaultPort = process.env.REPL_ID ? 5000 : 5001;
const e2ePort = Number(process.env.E2E_PORT ?? defaultPort);
const BASE = process.env.E2E_BASE_URL ?? `http://localhost:${e2ePort}`;
const ADMIN_EMAIL = "admin@test.com";
const PASSWORD = process.env.SEED_TEST_PASSWORD || "testpass123";

export type E2EProduct = {
  id: string;
  name: string;
  price: number;
  urlSlug: string;
};

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
): Promise<E2EProduct> {
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

export async function createE2EProduct(
  request: APIRequestContext,
  overrides: Record<string, unknown> = {},
): Promise<E2EProduct> {
  const uid = Math.random().toString(36).slice(2, 8);
  return createProduct(request, {
    name: `E2E Critical Product ${uid}`,
    price: 12999,
    active: true,
    status: "published",
    urlSlug: `e2e-critical-product-${uid}`,
    ...overrides,
  });
}

export function createE2EProductTracker() {
  const productIds = new Set<string>();
  const productNames = new Set<string>();

  return {
    track(productId: string) {
      productIds.add(productId);
    },
    trackName(productName: string) {
      productNames.add(productName);
    },
    async create(
      request: APIRequestContext,
      overrides: Record<string, unknown> = {},
    ) {
      const product = await createE2EProduct(request, overrides);
      productIds.add(product.id);
      return product;
    },
    async cleanup(request: APIRequestContext) {
      const ids = Array.from(productIds);
      const names = Array.from(productNames);
      productIds.clear();
      productNames.clear();

      for (const id of ids) {
        await deleteProduct(request, id).catch(() => undefined);
      }

      if (!names.length) return;

      const products = await listAdminProducts(request).catch(() => []);
      for (const product of products) {
        if (names.includes(product.name)) {
          await deleteProduct(request, product.id).catch(() => undefined);
        }
      }
    },
  };
}

export async function listPublicProducts(request: APIRequestContext) {
  const resp = await request.get(`${BASE}/api/products`);
  if (!resp.ok()) throw new Error(`List products failed: ${resp.status()}`);
  return resp.json();
}

export async function listAdminProducts(request: APIRequestContext) {
  await adminLogin(request);
  const resp = await request.get(`${BASE}/api/admin/products`);
  if (!resp.ok()) throw new Error(`List admin products failed: ${resp.status()}`);
  return resp.json() as Promise<E2EProduct[]>;
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
  return resp.json() as Promise<{
    success: boolean;
    customer: { id: string; email: string; name: string };
  }>;
}
