import { test, expect, APIRequestContext } from "@playwright/test";
import { adminLogin, createProduct } from "./helpers/api";
import { clearEmailOutbox, waitForEmailLink } from "./helpers/email-outbox";
import { uniqueEmail, uniqueName } from "./helpers/test-data";

async function registerCustomer(request: APIRequestContext) {
  const email = uniqueEmail();
  const name = uniqueName();
  const password = "EmailFlow123!";
  const response = await request.post("/api/customer/auth/register", {
    data: {
      email,
      password,
      name,
    },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return {
    id: body.customer.id as string,
    name,
    email,
    password,
  };
}

async function createCheckoutOrder(
  request: APIRequestContext,
  params: {
    productId: string;
    email: string;
    name: string;
  },
) {
  const response = await request.post("/api/checkout", {
    data: {
      items: [{ productId: params.productId, quantity: 1 }],
      customer: {
        name: params.name,
        email: params.email,
        phone: "5555551234",
        address: "123 Test Street",
        city: "Austin",
        state: "TX",
        zipCode: "78701",
        country: "USA",
      },
    },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{
    success: boolean;
    orderId: string;
    message?: string;
    checkoutUrl?: string;
  }>;
}

async function createManualOrder(
  request: APIRequestContext,
  customerId: string,
  productId: string,
) {
  const response = await request.post("/api/admin/orders", {
    data: {
      customerId,
      items: [{ productId, quantity: 1 }],
      notes: "E2E order email flow test",
    },
  });
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<{ id: string }>;
}

test.describe("Customer Email Flows @customer", () => {
  test("checkout order sends confirmation + fulfillment notifications", async ({
    request,
  }) => {
    await adminLogin(request);
    const customer = await registerCustomer(request);
    const product = await createProduct(request, {
      price: 11999,
      active: true,
      status: "published",
    });

    await clearEmailOutbox(request);
    const checkout = await createCheckoutOrder(request, {
      productId: product.id,
      email: customer.email,
      name: customer.name,
    });
    const orderId = checkout.checkoutUrl
      ? (await createManualOrder(request, customer.id, product.id)).id
      : checkout.orderId;
    expect(orderId).toBeTruthy();

    const customerLink = await waitForEmailLink(request, {
      to: customer.email,
      subjectContains: `Order Confirmed - #${orderId.slice(0, 8).toUpperCase()}`,
      pathIncludes: "/my-account?tab=orders",
    });
    expect(customerLink).toContain("/my-account?tab=orders");

    const fulfillmentLink = await waitForEmailLink(request, {
      to: "fulfillment@test.com",
      subjectContains: `New Order #${orderId.slice(0, 8).toUpperCase()}`,
      pathIncludes: "/admin/orders",
    });
    expect(fulfillmentLink).toContain("/admin/orders");
  });

  test("shipping order sends fulfillment email to customer and appears in account tracking", async ({
    request,
    page,
  }) => {
    await adminLogin(request);
    const customer = await registerCustomer(request);
    const product = await createProduct(request, {
      price: 11999,
      active: true,
      status: "published",
    });

    const checkout = await createCheckoutOrder(request, {
      productId: product.id,
      email: customer.email,
      name: customer.name,
    });
    const orderId = checkout.checkoutUrl
      ? (await createManualOrder(request, customer.id, product.id)).id
      : checkout.orderId;

    await clearEmailOutbox(request);

    const shipResponse = await request.post(`/api/admin/orders/${orderId}/shipments`, {
      data: {
        carrier: "UPS",
        trackingNumber: "1Z999AA10123456784",
        trackingUrl: `https://tracking.example.test/${orderId}`,
        sendEmail: true,
      },
    });
    expect(shipResponse.ok()).toBeTruthy();
    const shipBody = await shipResponse.json();
    expect(shipBody.emailSent).toBeTruthy();

    const shippingLink = await waitForEmailLink(request, {
      to: customer.email,
      subjectContains: `Your Order Has Shipped! - #${orderId.slice(0, 8).toUpperCase()}`,
      pathIncludes: `/order-status/${orderId}`,
    });
    expect(shippingLink).toContain(`/order-status/${orderId}`);

    const loginResponse = await request.post("/api/customer/auth/login", {
      data: {
        email: customer.email,
        password: customer.password,
      },
    });
    expect(loginResponse.ok()).toBeTruthy();
    const loginBody = await loginResponse.json();
    const sessionToken = loginBody.sessionToken as string;

    await page.goto("/");
    await page.evaluate((token) => {
      localStorage.setItem("customerSessionToken", token);
    }, sessionToken);

    await page.goto("/my-account?tab=orders");
    await expect(page.locator(`[data-testid="card-order-${orderId}"]`)).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator(`[data-testid="shipment-section-${orderId}"]`)).toBeVisible();
    await expect(page.locator(`[data-testid="shipment-details-${shipBody.id}"]`)).toContainText(
      "1Z999AA10123456784",
    );
    await expect(
      page.locator(`[data-testid="badge-shipment-status-${shipBody.id}"]`),
    ).toHaveText("Shipped");
    await expect(
      page.locator(`[data-testid="button-track-package-${orderId}"]`),
    ).toHaveAttribute("href", `https://tracking.example.test/${orderId}`);
  });
});
