import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteSavedReply,
  getAllSavedReplies,
} from "@/features/saved-replies/services/saved-reply-service";

const mocks = vi.hoisted(() => ({
  isLegacyOrganization: vi.fn(),
  savedReplyFindMany: vi.fn(),
  savedReplyFindFirst: vi.fn(),
  savedReplyDelete: vi.fn(),
}));

vi.mock("@/features/organizations/services/organization-service", () => ({
  isLegacyOrganization: mocks.isLegacyOrganization,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    savedReply: {
      findMany: mocks.savedReplyFindMany,
      findFirst: mocks.savedReplyFindFirst,
      delete: mocks.savedReplyDelete,
    },
  },
}));

describe("saved reply tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isLegacyOrganization.mockResolvedValue(false);
    mocks.savedReplyFindMany.mockResolvedValue([]);
    mocks.savedReplyFindFirst.mockResolvedValue({ id: "reply-1" });
    mocks.savedReplyDelete.mockResolvedValue({ id: "reply-1" });
  });

  it("does not expose null-owned replies to normal organizations", async () => {
    await getAllSavedReplies("org-1");

    expect(mocks.savedReplyFindMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
      orderBy: { title: "asc" },
    });
  });

  it("does not let a normal organization adopt a null-owned reply during delete", async () => {
    await deleteSavedReply("org-1", "reply-1");

    expect(mocks.savedReplyFindFirst).toHaveBeenCalledWith({
      where: { id: "reply-1", organizationId: "org-1" },
    });
  });

  it("allows null-owned reply migration access only for the legacy workspace", async () => {
    mocks.isLegacyOrganization.mockResolvedValue(true);

    await getAllSavedReplies("legacy-org");

    expect(mocks.savedReplyFindMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { organizationId: "legacy-org" },
          { organizationId: null },
        ],
      },
      orderBy: { title: "asc" },
    });
  });
});
