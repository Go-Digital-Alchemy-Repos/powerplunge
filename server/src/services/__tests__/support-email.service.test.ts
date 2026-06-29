import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  getEmailSettings: vi.fn(),
  values: vi.fn(),
  db: {
    query: {
      siteSettings: {
        findFirst: vi.fn(),
      },
      customers: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(),
  },
}));

vi.mock("../../../db", () => ({ db: mocks.db }));
vi.mock("../../../storage", () => ({
  storage: {
    getEmailSettings: mocks.getEmailSettings,
  },
}));
vi.mock("../../integrations/mailgun/EmailService", () => ({
  emailService: {
    sendEmail: mocks.sendEmail,
  },
}));

const { sendTicketConfirmationToCustomer } = await import("../support-email.service");

describe("support email service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.insert.mockReturnValue({ values: mocks.values });
    mocks.values.mockResolvedValue(undefined);
    mocks.sendEmail.mockResolvedValue({ success: true, messageId: "msg-test" });
    mocks.db.query.customers.findFirst.mockResolvedValue(null);
    mocks.db.query.siteSettings.findFirst.mockResolvedValue({
      supportAutoReplyEnabled: true,
      supportAutoReplyMessage: "",
      supportNotifyEmails: "",
      supportNotifyOnNew: true,
      supportNotifyOnReply: true,
      supportFromEmail: "support@powerplunge.com",
      supportSlaHours: 24,
      companyName: "Power Plunge",
      supportEmail: "support@powerplunge.com",
      supportInboundRepliesEnabled: true,
    });
    mocks.getEmailSettings.mockResolvedValue({
      mailgunDomain: "mg.powerplunge.com",
    });
  });

  it("uses ticket-specific Reply-To on customer confirmations when inbound replies are enabled", async () => {
    await sendTicketConfirmationToCustomer({
      ticketId: "11111111-2222-3333-4444-555555555555",
      customerName: "Avery Carter",
      customerEmail: "avery@example.com",
      subject: "Need help",
      message: "Question",
      type: "general",
    });

    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "avery@example.com",
      replyTo: "support+devticket-11111111-2222-3333-4444-555555555555@mg.powerplunge.com",
    }));
  });

  it("omits Reply-To on customer confirmations when inbound replies are disabled", async () => {
    mocks.db.query.siteSettings.findFirst.mockResolvedValue({
      supportAutoReplyEnabled: true,
      supportAutoReplyMessage: "",
      supportNotifyEmails: "",
      supportNotifyOnNew: true,
      supportNotifyOnReply: true,
      supportFromEmail: "support@powerplunge.com",
      supportSlaHours: 24,
      companyName: "Power Plunge",
      supportEmail: "support@powerplunge.com",
      supportInboundRepliesEnabled: false,
    });

    await sendTicketConfirmationToCustomer({
      ticketId: "11111111-2222-3333-4444-555555555555",
      customerName: "Avery Carter",
      customerEmail: "avery@example.com",
      subject: "Need help",
      message: "Question",
      type: "general",
    });

    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.not.objectContaining({
      replyTo: expect.any(String),
    }));
  });
});
