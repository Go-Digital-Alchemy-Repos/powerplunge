import { APIRequestContext, expect, test } from "@playwright/test";
import { adminLogin } from "./helpers/api";
import { clearEmailOutbox, waitForEmailLink } from "./helpers/email-outbox";
import { uniqueEmail, uniqueName } from "./helpers/test-data";

function customerAuthHeaders(sessionToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${sessionToken}`,
  };
}

async function registerAndLoginCustomer(request: APIRequestContext) {
  const email = uniqueEmail();
  const name = uniqueName();
  const password = "SupportFlow123!";

  const registerResponse = await request.post("/api/customer/auth/register", {
    data: {
      email,
      password,
      name,
    },
  });
  expect(registerResponse.ok()).toBeTruthy();

  const loginResponse = await request.post("/api/customer/auth/login", {
    data: {
      email,
      password,
    },
  });
  expect(loginResponse.ok()).toBeTruthy();
  const loginBody = await loginResponse.json();

  return {
    email,
    name,
    sessionToken: loginBody.sessionToken as string,
  };
}

async function configureSupportNotifications(request: APIRequestContext) {
  await adminLogin(request);
  const response = await request.put("/api/admin/support/settings", {
    data: {
      supportNotifyEmails: "fulfillment@test.com",
      supportNotifyOnNew: true,
      supportNotifyOnReply: true,
      supportAutoReplyEnabled: true,
    },
  });
  expect(response.ok()).toBeTruthy();
}

async function createSupportTicket(
  request: APIRequestContext,
  sessionToken: string,
  params: { subject: string; message: string; type?: "general" | "return" | "refund" | "shipping" | "technical" },
) {
  const response = await request.post("/api/customer/orders/support", {
    headers: customerAuthHeaders(sessionToken),
    data: {
      subject: params.subject,
      message: params.message,
      type: params.type || "general",
    },
  });
  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  return body.ticket as { id: string; subject: string };
}

test.describe("Support Ticket Email Flows @customer @support", () => {
  test("new support ticket sends admin notification and customer confirmation", async ({
    request,
  }) => {
    await configureSupportNotifications(request);
    const customer = await registerAndLoginCustomer(request);
    const subject = `Support Ticket ${Date.now()}`;

    await clearEmailOutbox(request);
    await createSupportTicket(request, customer.sessionToken, {
      subject,
      message: "I need help with my order tracking details.",
      type: "shipping",
    });

    const adminLink = await waitForEmailLink(request, {
      to: "fulfillment@test.com",
      subjectContains: `New Support Ticket: ${subject}`,
      pathIncludes: "/admin/support",
    });
    expect(adminLink).toContain("/admin/support");

    const customerLink = await waitForEmailLink(request, {
      to: customer.email,
      subjectContains: `Re: ${subject} - We've received your message`,
      pathIncludes: "/my-account?tab=support",
    });
    expect(customerLink).toContain("/my-account?tab=support");
  });

  test("admin reply sends support response email to customer", async ({
    request,
  }) => {
    await configureSupportNotifications(request);
    const customer = await registerAndLoginCustomer(request);
    const subject = `Support Reply ${Date.now()}`;

    const ticket = await createSupportTicket(request, customer.sessionToken, {
      subject,
      message: "I need help with a billing question.",
      type: "general",
    });

    await clearEmailOutbox(request);

    const patchResponse = await request.patch(`/api/admin/support/${ticket.id}`, {
      data: {
        noteText: "Thanks for contacting us. We have updated your account.",
      },
    });
    expect(patchResponse.ok()).toBeTruthy();

    const customerLink = await waitForEmailLink(request, {
      to: customer.email,
      subjectContains: `Re: ${subject}`,
      pathIncludes: "/my-account?tab=support",
    });
    expect(customerLink).toContain("/my-account?tab=support");
  });

  test("status change sends status update email to customer", async ({
    request,
  }) => {
    await configureSupportNotifications(request);
    const customer = await registerAndLoginCustomer(request);
    const subject = `Support Status ${Date.now()}`;

    const ticket = await createSupportTicket(request, customer.sessionToken, {
      subject,
      message: "Please update me on this ticket status.",
      type: "technical",
    });

    await clearEmailOutbox(request);

    const patchResponse = await request.patch(`/api/admin/support/${ticket.id}`, {
      data: {
        status: "resolved",
      },
    });
    expect(patchResponse.ok()).toBeTruthy();

    const customerLink = await waitForEmailLink(request, {
      to: customer.email,
      subjectContains: `Ticket Update: ${subject} - Resolved`,
      pathIncludes: "/my-account?tab=support",
    });
    expect(customerLink).toContain("/my-account?tab=support");
  });

  test("customer reply sends admin notification email", async ({
    request,
  }) => {
    await configureSupportNotifications(request);
    const customer = await registerAndLoginCustomer(request);
    const subject = `Support Customer Reply ${Date.now()}`;

    const ticket = await createSupportTicket(request, customer.sessionToken, {
      subject,
      message: "I need additional help and want to reply.",
      type: "return",
    });

    await clearEmailOutbox(request);

    const replyResponse = await request.post(
      `/api/customer/orders/support/${ticket.id}/reply`,
      {
        headers: customerAuthHeaders(customer.sessionToken),
        data: {
          message: "Here are more details from the customer side.",
        },
      },
    );
    expect(replyResponse.ok()).toBeTruthy();

    const adminLink = await waitForEmailLink(request, {
      to: "fulfillment@test.com",
      subjectContains: `Customer Reply: ${subject}`,
      pathIncludes: "/admin/support",
    });
    expect(adminLink).toContain("/admin/support");
  });
});
