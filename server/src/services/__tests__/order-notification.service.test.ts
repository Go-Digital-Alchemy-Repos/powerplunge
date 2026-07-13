import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  storage: {
    getSiteSettings: vi.fn(),
    getOrder: vi.fn(),
    getCustomer: vi.fn(),
    getOrderItems: vi.fn(),
    getAdminUsers: vi.fn(),
  },
  sendOrderConfirmation: vi.fn(),
  sendEmail: vi.fn(),
  isEmailOutboxEnabled: vi.fn(),
}));

vi.mock("../../../storage", () => ({ storage: mocks.storage }));
vi.mock("../customer-email.service", () => ({
  customerEmailService: { sendOrderConfirmation: mocks.sendOrderConfirmation },
}));
vi.mock("../../integrations/mailgun/EmailService", () => ({
  emailService: { sendEmail: mocks.sendEmail },
}));
vi.mock("../../testing/email-outbox", () => ({
  isEmailOutboxEnabled: mocks.isEmailOutboxEnabled,
}));

import { sendOrderNotification } from "../order-notification.service";

const orderId = "order-12345678-abcd";

describe("sendOrderNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storage.getSiteSettings.mockResolvedValue({
      companyName: "Power Plunge",
      orderNotificationEmail: "orders@example.com",
    });
    mocks.storage.getOrder.mockResolvedValue({
      id: orderId,
      customerId: "customer-1",
      createdAt: new Date("2026-07-13T14:30:00Z"),
      totalAmount: 12900,
      isManualOrder: false,
      stripePaymentIntentId: "pi_test",
    });
    mocks.storage.getCustomer.mockResolvedValue({
      name: "Test Customer",
      email: "customer@example.com",
      phone: "555-0100",
      address: "123 Main Street",
      city: "Charlotte",
      state: "NC",
      zipCode: "28202",
      country: "US",
    });
    mocks.storage.getOrderItems.mockResolvedValue([
      { productName: "Power Plunge", quantity: 1, unitPrice: 12900 },
    ]);
    mocks.storage.getAdminUsers.mockResolvedValue([
      { role: "fulfillment", email: "fulfillment@example.com" },
      { role: "admin", email: "admin@example.com" },
    ]);
    mocks.sendOrderConfirmation.mockResolvedValue({ success: true });
    mocks.sendEmail.mockResolvedValue({ success: true });
    mocks.isEmailOutboxEnabled.mockReturnValue(true);
  });

  it("resolves without sending when the order is missing", async () => {
    mocks.storage.getOrder.mockResolvedValue(undefined);

    await expect(sendOrderNotification(orderId)).resolves.toBeUndefined();

    expect(mocks.sendOrderConfirmation).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("attempts customer and fulfillment notifications with the order data", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await sendOrderNotification(orderId);

    expect(mocks.sendOrderConfirmation).toHaveBeenCalledWith(orderId);
    expect(logSpy).toHaveBeenCalledWith(`Order confirmation email sent to customer for order ${orderId}`);
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: ["fulfillment@example.com", "orders@example.com"],
      subject: expect.stringContaining("ORDER-12"),
      html: expect.stringContaining("ORDER-12"),
    }));
  });

  it("logs a customer confirmation failure without throwing", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    mocks.sendOrderConfirmation.mockResolvedValue({ success: false, error: "customer email failed" });

    await expect(sendOrderNotification(orderId)).resolves.toBeUndefined();

    expect(logSpy).toHaveBeenCalledWith("Failed to send customer confirmation email: customer email failed");
  });

  it("logs an email failure and resolves without throwing", async () => {
    const failure = new Error("email transport failed");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.sendEmail.mockRejectedValue(failure);

    await expect(sendOrderNotification(orderId)).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith("Failed to send order notification:", failure);
  });
});
