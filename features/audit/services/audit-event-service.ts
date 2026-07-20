import { prisma } from "@/lib/prisma";

type AuditEventInput = {
  actorType: "root-admin" | "user" | "system";
  action: string;
  organizationId?: string;
  rootAdminId?: string;
  userId?: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
};

export async function recordAuditEvent(input: AuditEventInput) {
  return prisma.auditEvent.create({
    data: {
      actorType: input.actorType,
      action: input.action,
      organizationId: input.organizationId,
      rootAdminId: input.rootAdminId,
      userId: input.userId,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  });
}
