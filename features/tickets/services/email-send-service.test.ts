import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendTicketEmail } from "@/features/tickets/services/email-send-service";

const mocks = vi.hoisted(() => ({
  messageFindFirst: vi.fn(),
  messageUpdate: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    message: {
      findFirst: mocks.messageFindFirst,
      update: mocks.messageUpdate,
    },
  },
}));

vi.mock("@/features/email/services/smtp-service", () => ({
  sendEmail: mocks.sendEmail,
}));

describe("email-send-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.messageFindFirst.mockResolvedValue({ id: "message-1" });
    mocks.messageUpdate.mockResolvedValue({});
    mocks.sendEmail.mockResolvedValue({
      messageId: "smtp-message-1",
      mailboxId: "mailbox-1",
    });
  });

  it("sends through tenant SMTP and stores the external message id", async () => {
    const result = await sendTicketEmail({
      organizationId: "org-1",
      ticketId: "ticket-1",
      messageId: "message-1",
      to: "customer@example.com",
      subject: "Re: Help",
      body: "We can help.",
      mailboxId: "mailbox-1",
      inReplyTo: "customer-message-1",
    });

    expect(mocks.messageFindFirst).toHaveBeenCalledWith({
      where: {
        id: "message-1",
        ticketId: "ticket-1",
        organizationId: "org-1",
      },
      select: { id: true },
    });
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        mailboxId: "mailbox-1",
        inReplyTo: "customer-message-1",
      }),
    );
    expect(mocks.messageUpdate).toHaveBeenCalledWith({
      where: { id: "message-1" },
      data: { externalMessageId: "smtp-message-1" },
    });
    expect(result).toEqual({
      success: true,
      externalMessageId: "smtp-message-1",
    });
  });

  it("does not send a message outside the organization", async () => {
    mocks.messageFindFirst.mockResolvedValueOnce(null);

    await expect(
      sendTicketEmail({
        organizationId: "org-2",
        ticketId: "ticket-1",
        messageId: "message-1",
        to: "customer@example.com",
        subject: "Re: Help",
        body: "We can help.",
      }),
    ).resolves.toEqual({
      success: false,
      error: "Message not found in organization",
    });

    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
