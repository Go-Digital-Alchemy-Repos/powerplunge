import { APIRequestContext, expect, test } from "@playwright/test";
import { adminLogin, createProduct } from "./helpers/api";
import {
  clearEmailOutbox,
  getEmailOutboxCount,
  waitForEmailLink,
} from "./helpers/email-outbox";
import { uniqueEmail, uniqueName } from "./helpers/test-data";

async function registerCustomer(request: APIRequestContext) {
  const email = uniqueEmail();
  const password = "WebhookFlow123!";
  const name = uniqueName();

  const response = await request.post("/api/customer/auth/register", {
    data: { email, password, name },
  });
  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  return {
    id: body.customer.id as string,
    email,
    name,
  };
}

async function createPendingStripeOrder(
  request: APIRequestContext,
  params: { productId: string; customerName: string; customerEmail: string },
) {
  const createResponse = await request.post("/api/create-payment-intent", {
    data: {
      items: [{ productId: params.productId, quantity: 1 }],
      customer: {
        name: params.customerName,
        email: params.customerEmail,
        phone: "5555551234",
        address: "123 Test Street",
        city: "Austin",
        state: "TX",
        zipCode: "78701",
        country: "USA",
      },
    },
  });

  const createBody = await createResponse.json();
  test.skip(
    !createResponse.ok() &&
      typeof createBody?.message === "string" &&
      createBody.message.toLowerCase().includes("stripe is not configured"),
    "Stripe not configured; skipping webhook success-path test.",
  );
  expect(createResponse.ok(), JSON.stringify(createBody)).toBeTruthy();

  const orderId = createBody.orderId as string;
  expect(orderId).toBeTruthy();

  const beforeResponse = await request.get(`/api/admin/orders/${orderId}`);
  expect(beforeResponse.ok()).toBeTruthy();
  const orderBefore = await beforeResponse.json();
  expect(orderBefore.status).toBe("pending");
  expect(orderBefore.totalAmount).toBe(createBody.total);

  return {
    orderId,
    total: createBody.total as number,
    paymentIntentId: orderBefore.stripePaymentIntentId as string,
  };
}

test.describe("Stripe Webhook Success @customer @webhooks", () => {
  test("payment_intent.succeeded webhook marks order paid and sends emails", async ({
    request,
  }) => {
    await adminLogin(request);
    const customer = await registerCustomer(request);
    const product = await createProduct(request, {
      price: 11999,
      active: true,
      status: "published",
    });

    const order = await createPendingStripeOrder(request, {
      productId: product.id,
      customerName: customer.name,
      customerEmail: customer.email,
    });

    await clearEmailOutbox(request);

    const webhookResponse = await request.post(
      "/api/test/stripe-webhook/payment-intent-succeeded",
      {
        data: {
          orderId: order.orderId,
          paymentIntentId: order.paymentIntentId,
          amount: order.total,
        },
      },
    );
    expect(webhookResponse.ok()).toBeTruthy();

    const afterResponse = await request.get(`/api/admin/orders/${order.orderId}`);
    expect(afterResponse.ok()).toBeTruthy();
    const orderAfter = await afterResponse.json();
    expect(orderAfter.status).toBe("paid");
    expect(orderAfter.paymentStatus).toBe("paid");

    const customerLink = await waitForEmailLink(request, {
      to: customer.email,
      subjectContains: `Order Confirmed - #${order.orderId.slice(0, 8).toUpperCase()}`,
      pathIncludes: "/my-account?tab=orders",
    });
    expect(customerLink).toContain("/my-account?tab=orders");

    const fulfillmentLink = await waitForEmailLink(request, {
      to: "fulfillment@test.com",
      subjectContains: `New Order #${order.orderId.slice(0, 8).toUpperCase()}`,
      pathIncludes: "/admin/orders",
    });
    expect(fulfillmentLink).toContain("/admin/orders");
  });

  test("amount mismatch keeps order pending and sends no emails", async ({
    request,
  }) => {
    await adminLogin(request);
    const customer = await registerCustomer(request);
    const product = await createProduct(request, {
      price: 12999,
      active: true,
      status: "published",
    });
    const order = await createPendingStripeOrder(request, {
      productId: product.id,
      customerName: customer.name,
      customerEmail: customer.email,
    });

    await clearEmailOutbox(request);

    const mismatchResponse = await request.post(
      "/api/test/stripe-webhook/payment-intent-succeeded",
      {
        data: {
          orderId: order.orderId,
          paymentIntentId: order.paymentIntentId,
          amount: order.total + 1,
        },
      },
    );
    expect(mismatchResponse.ok()).toBeTruthy();

    const afterResponse = await request.get(`/api/admin/orders/${order.orderId}`);
    expect(afterResponse.ok()).toBeTruthy();
    const orderAfter = await afterResponse.json();
    expect(orderAfter.status).toBe("pending");

    const customerCount = await getEmailOutboxCount(request, {
      to: customer.email,
      subjectContains: `Order Confirmed - #${order.orderId.slice(0, 8).toUpperCase()}`,
    });
    expect(customerCount).toBe(0);

    const fulfillmentCount = await getEmailOutboxCount(request, {
      to: "fulfillment@test.com",
      subjectContains: `New Order #${order.orderId.slice(0, 8).toUpperCase()}`,
    });
    expect(fulfillmentCount).toBe(0);
  });

  test("duplicate webhook delivery is idempotent for emails", async ({
    request,
  }) => {
    await adminLogin(request);
    const customer = await registerCustomer(request);
    const product = await createProduct(request, {
      price: 13999,
      active: true,
      status: "published",
    });
    const order = await createPendingStripeOrder(request, {
      productId: product.id,
      customerName: customer.name,
      customerEmail: customer.email,
    });

    await clearEmailOutbox(request);

    const firstResponse = await request.post(
      "/api/test/stripe-webhook/payment-intent-succeeded",
      {
        data: {
          orderId: order.orderId,
          paymentIntentId: order.paymentIntentId,
          amount: order.total,
        },
      },
    );
    expect(firstResponse.ok()).toBeTruthy();

    await waitForEmailLink(request, {
      to: customer.email,
      subjectContains: `Order Confirmed - #${order.orderId.slice(0, 8).toUpperCase()}`,
      pathIncludes: "/my-account?tab=orders",
    });
    await waitForEmailLink(request, {
      to: "fulfillment@test.com",
      subjectContains: `New Order #${order.orderId.slice(0, 8).toUpperCase()}`,
      pathIncludes: "/admin/orders",
    });

    const customerCountBefore = await getEmailOutboxCount(request, {
      to: customer.email,
      subjectContains: `Order Confirmed - #${order.orderId.slice(0, 8).toUpperCase()}`,
    });
    const fulfillmentCountBefore = await getEmailOutboxCount(request, {
      to: "fulfillment@test.com",
      subjectContains: `New Order #${order.orderId.slice(0, 8).toUpperCase()}`,
    });

    const secondResponse = await request.post(
      "/api/test/stripe-webhook/payment-intent-succeeded",
      {
        data: {
          orderId: order.orderId,
          paymentIntentId: order.paymentIntentId,
          amount: order.total,
        },
      },
    );
    expect(secondResponse.ok()).toBeTruthy();

    const customerCountAfter = await getEmailOutboxCount(request, {
      to: customer.email,
      subjectContains: `Order Confirmed - #${order.orderId.slice(0, 8).toUpperCase()}`,
    });
    const fulfillmentCountAfter = await getEmailOutboxCount(request, {
      to: "fulfillment@test.com",
      subjectContains: `New Order #${order.orderId.slice(0, 8).toUpperCase()}`,
    });

    expect(customerCountAfter).toBe(customerCountBefore);
    expect(fulfillmentCountAfter).toBe(fulfillmentCountBefore);
  });

  test("signed webhook dispatch path processes payment_intent.succeeded", async ({
    request,
  }) => {
    await adminLogin(request);
    const customer = await registerCustomer(request);
    const product = await createProduct(request, {
      price: 14999,
      active: true,
      status: "published",
    });
    const order = await createPendingStripeOrder(request, {
      productId: product.id,
      customerName: customer.name,
      customerEmail: customer.email,
    });

    await clearEmailOutbox(request);

    const signedResponse = await request.post(
      "/api/test/stripe-webhook/dispatch-signed-payment-intent-succeeded",
      {
        data: {
          orderId: order.orderId,
          paymentIntentId: order.paymentIntentId,
          amount: order.total,
        },
      },
    );
    if (signedResponse.status() === 412) {
      const body = await signedResponse.json();
      test.skip(
        true,
        `Skipping signed webhook test because no DB webhook secret is configured: ${body.message}`,
      );
    }
    expect(signedResponse.ok()).toBeTruthy();

    const afterResponse = await request.get(`/api/admin/orders/${order.orderId}`);
    expect(afterResponse.ok()).toBeTruthy();
    const orderAfter = await afterResponse.json();
    expect(orderAfter.status).toBe("paid");
    expect(orderAfter.paymentStatus).toBe("paid");

    await waitForEmailLink(request, {
      to: customer.email,
      subjectContains: `Order Confirmed - #${order.orderId.slice(0, 8).toUpperCase()}`,
      pathIncludes: "/my-account?tab=orders",
    });
    await waitForEmailLink(request, {
      to: "fulfillment@test.com",
      subjectContains: `New Order #${order.orderId.slice(0, 8).toUpperCase()}`,
      pathIncludes: "/admin/orders",
    });
  });
});
