import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
}));

vi.mock("../../integrations/mailgun/EmailService", () => ({
  emailService: {
    sendEmail: mocks.sendEmail,
  },
}));

const { sendBetterAuthPasswordReset } = await import("../betterAuthEmail");

describe("betterAuthEmail", () => {
  beforeEach(() => {
    mocks.sendEmail.mockReset();
    mocks.sendEmail.mockResolvedValue({ success: true });
  });

  it("normalizes customer reset URLs into the customer reset page", async () => {
    await sendBetterAuthPasswordReset({
      email: "customer@example.com",
      name: "Customer",
      url: "https://powerplunge.com/reset-password/customer-token",
    });

    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      text: expect.stringContaining("https://powerplunge.com/reset-password?token=customer-token"),
    }));
  });

  it("preserves admin reset callback URLs from Better Auth reset links", async () => {
    await sendBetterAuthPasswordReset({
      email: "admin@example.com",
      name: "Admin",
      url: "https://powerplunge.com/reset-password/admin-token?callbackURL=%2Fadmin%2Freset-password",
    });

    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      text: expect.stringContaining("https://powerplunge.com/admin/reset-password?token=admin-token"),
      html: expect.stringContaining("https://powerplunge.com/admin/reset-password?token=admin-token"),
    }));
  });
});
