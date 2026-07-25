import { beforeEach, describe, expect, it, vi } from "vitest";
import { getWorkflowRules } from "@/features/workflows/services/workflow-query-service";

const mocks = vi.hoisted(() => ({
  workflowRuleFindMany: vi.fn(),
  isLegacyOrganization: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workflowRule: {
      findMany: mocks.workflowRuleFindMany,
    },
  },
}));

vi.mock("@/features/organizations/services/organization-service", () => ({
  isLegacyOrganization: mocks.isLegacyOrganization,
}));

describe("workflow query tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.workflowRuleFindMany.mockResolvedValue([]);
  });

  it("does not expose legacy null workflows to normal organizations", async () => {
    mocks.isLegacyOrganization.mockResolvedValueOnce(false);

    await getWorkflowRules("org-1");

    expect(mocks.workflowRuleFindMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("keeps legacy null workflows available to the default workspace", async () => {
    mocks.isLegacyOrganization.mockResolvedValueOnce(true);

    await getWorkflowRules("org-default");

    expect(mocks.workflowRuleFindMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { organizationId: "org-default" },
          { organizationId: null },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
  });
});
