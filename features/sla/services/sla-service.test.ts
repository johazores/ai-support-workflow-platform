import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAllSlaPolicies,
  getSlaStatus,
  updateSlaPolicy,
} from "@/features/sla/services/sla-service";

const mocks = vi.hoisted(() => ({
  ticketFindFirst: vi.fn(),
  slaFindFirst: vi.fn(),
  slaFindMany: vi.fn(),
  slaUpdate: vi.fn(),
  auditCreate: vi.fn(),
  isLegacyOrganization: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ticket: {
      findFirst: mocks.ticketFindFirst,
    },
    slaPolicy: {
      findFirst: mocks.slaFindFirst,
      findMany: mocks.slaFindMany,
      update: mocks.slaUpdate,
    },
    auditEvent: {
      create: mocks.auditCreate,
    },
  },
}));

vi.mock("@/features/organizations/services/organization-service", () => ({
  isLegacyOrganization: mocks.isLegacyOrganization,
}));

const policy = {
  id: "policy-1",
  organizationId: "org-1",
  name: "High",
  priority: "high",
  firstResponseMinutes: 60,
  resolutionMinutes: 480,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("SLA tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isLegacyOrganization.mockResolvedValue(false);
    mocks.ticketFindFirst.mockResolvedValue(null);
    mocks.slaFindFirst.mockResolvedValue(null);
    mocks.slaFindMany.mockResolvedValue([]);
    mocks.slaUpdate.mockResolvedValue(policy);
    mocks.auditCreate.mockResolvedValue({});
  });

  it("scopes ticket, messages, and policy lookup to the active organization", async () => {
    mocks.ticketFindFirst.mockResolvedValueOnce({
      id: "ticket-1",
      organizationId: "org-1",
      priority: "high",
      status: "open",
      createdAt: new Date(Date.now() - 30 * 60_000),
      messages: [],
    });
    mocks.slaFindFirst.mockResolvedValueOnce(policy);

    const status = await getSlaStatus("org-1", "ticket-1");

    expect(mocks.ticketFindFirst).toHaveBeenCalledWith({
      where: { id: "ticket-1", organizationId: "org-1" },
      include: {
        messages: {
          where: { organizationId: "org-1" },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    expect(mocks.slaFindFirst).toHaveBeenCalledWith({
      where: { organizationId: "org-1", priority: "high" },
    });
    expect(status?.firstResponseDue).not.toBeNull();
  });

  it("does not read a policy when the ticket is outside the tenant", async () => {
    await expect(getSlaStatus("org-2", "ticket-1")).resolves.toBeNull();
    expect(mocks.slaFindFirst).not.toHaveBeenCalled();
  });

  it("stops the resolution clock for resolved tickets", async () => {
    mocks.ticketFindFirst.mockResolvedValueOnce({
      id: "ticket-1",
      organizationId: "org-1",
      priority: "high",
      status: "resolved",
      createdAt: new Date(Date.now() - 60 * 60_000),
      messages: [],
    });
    mocks.slaFindFirst.mockResolvedValueOnce(policy);

    const status = await getSlaStatus("org-1", "ticket-1");

    expect(status?.resolutionDue).toBeNull();
    expect(status?.resolutionBreached).toBe(false);
  });

  it("uses a legacy null policy only for the default workspace", async () => {
    mocks.isLegacyOrganization.mockResolvedValue(true);
    mocks.ticketFindFirst.mockResolvedValueOnce({
      id: "ticket-1",
      organizationId: null,
      priority: "high",
      status: "open",
      createdAt: new Date(Date.now() - 30 * 60_000),
      messages: [],
    });
    mocks.slaFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...policy, organizationId: null });

    await getSlaStatus("org-default", "ticket-1");

    expect(mocks.ticketFindFirst).toHaveBeenCalledWith({
      where: {
        id: "ticket-1",
        OR: [
          { organizationId: "org-default" },
          { organizationId: null },
        ],
      },
      include: {
        messages: {
          where: {
            OR: [
              { organizationId: "org-default" },
              { organizationId: null },
            ],
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    expect(mocks.slaFindFirst).toHaveBeenNthCalledWith(2, {
      where: { organizationId: null, priority: "high" },
    });
  });

  it("claims an editable legacy policy into the active tenant and audits it", async () => {
    mocks.slaFindFirst.mockResolvedValueOnce({ ...policy, organizationId: null });
    mocks.slaUpdate.mockResolvedValueOnce({
      ...policy,
      organizationId: "org-default",
      firstResponseMinutes: 45,
      resolutionMinutes: 360,
    });
    mocks.isLegacyOrganization.mockResolvedValueOnce(true);

    const updated = await updateSlaPolicy({
      organizationId: "org-default",
      actorUserId: "admin-1",
      id: "policy-1",
      data: { firstResponseMinutes: 45, resolutionMinutes: 360 },
    });

    expect(mocks.slaUpdate).toHaveBeenCalledWith({
      where: { id: "policy-1" },
      data: {
        organizationId: "org-default",
        firstResponseMinutes: 45,
        resolutionMinutes: 360,
      },
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-default",
        userId: "admin-1",
        action: "sla.policy.updated",
        targetId: "policy-1",
      }),
    });
    expect(updated.organizationId).toBe("org-default");
  });

  it("prefers tenant-owned policies over legacy duplicates in the default workspace", async () => {
    mocks.isLegacyOrganization.mockResolvedValueOnce(true);
    mocks.slaFindMany.mockResolvedValueOnce([
      { ...policy, id: "legacy", organizationId: null },
      { ...policy, id: "owned", organizationId: "org-default" },
    ]);

    const policies = await getAllSlaPolicies("org-default");

    expect(policies).toHaveLength(1);
    expect(policies[0].id).toBe("owned");
  });
});
