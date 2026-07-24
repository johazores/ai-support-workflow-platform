import type { Prisma } from "@prisma/client";
import {
  parseWorkflowDefinition,
  validateWorkflowForPublish,
} from "@/features/workflows/services/workflow-definition-validation";
import type { WorkflowDefinition } from "@/features/workflows/types/workflow-definition";
import { prisma } from "@/lib/prisma";

type WorkflowInput = {
  organizationId: string;
  userId: string;
  name: string;
  description?: string;
  definition: WorkflowDefinition;
};

function asJson(definition: WorkflowDefinition): Prisma.InputJsonValue {
  return definition as unknown as Prisma.InputJsonValue;
}

export async function listVersionedWorkflows(organizationId: string) {
  const workflows = await prisma.workflow.findMany({
    where: { organizationId },
    orderBy: { updatedAt: "desc" },
  });

  const versions = await prisma.workflowVersion.findMany({
    where: {
      organizationId,
      workflowId: { in: workflows.map((workflow) => workflow.id) },
    },
    orderBy: { version: "desc" },
  });
  const latestByWorkflow = new Map<string, (typeof versions)[number]>();

  for (const version of versions) {
    if (!latestByWorkflow.has(version.workflowId)) {
      latestByWorkflow.set(version.workflowId, version);
    }
  }

  return workflows.map((workflow) => ({
    ...workflow,
    currentVersionStatus: latestByWorkflow.get(workflow.id)?.status ?? "draft",
  }));
}

export async function getVersionedWorkflow(
  organizationId: string,
  workflowId: string,
) {
  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, organizationId },
  });
  if (!workflow) return null;

  const version = await prisma.workflowVersion.findFirst({
    where: {
      organizationId,
      workflowId,
      version: workflow.currentVersion,
    },
  });
  if (!version) return null;

  return {
    ...workflow,
    version: {
      ...version,
      definition: parseWorkflowDefinition(version.definition),
    },
  };
}

export async function createVersionedWorkflow(input: WorkflowInput) {
  const definition = parseWorkflowDefinition(input.definition);
  const workflow = await prisma.workflow.create({
    data: {
      organizationId: input.organizationId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      status: "draft",
      currentVersion: 1,
      createdByUserId: input.userId,
    },
  });

  try {
    const version = await prisma.workflowVersion.create({
      data: {
        organizationId: input.organizationId,
        workflowId: workflow.id,
        version: 1,
        status: "draft",
        definition: asJson(definition),
        createdByUserId: input.userId,
      },
    });

    return { ...workflow, version: { ...version, definition } };
  } catch (error) {
    await prisma.workflow.deleteMany({
      where: { id: workflow.id, organizationId: input.organizationId },
    });
    throw error;
  }
}

export async function saveVersionedWorkflow(input: WorkflowInput & {
  workflowId: string;
}) {
  const definition = parseWorkflowDefinition(input.definition);
  const workflow = await prisma.workflow.findFirst({
    where: {
      id: input.workflowId,
      organizationId: input.organizationId,
      status: { not: "archived" },
    },
  });
  if (!workflow) throw new Error("Workflow not found");

  const current = await prisma.workflowVersion.findFirst({
    where: {
      organizationId: input.organizationId,
      workflowId: workflow.id,
      version: workflow.currentVersion,
    },
  });
  if (!current) throw new Error("Workflow version not found");

  if (current.status === "draft") {
    const [updatedWorkflow, updatedVersion] = await Promise.all([
      prisma.workflow.update({
        where: { id: workflow.id },
        data: {
          name: input.name.trim(),
          description: input.description?.trim() || null,
          status: "draft",
        },
      }),
      prisma.workflowVersion.update({
        where: { id: current.id },
        data: {
          definition: asJson(definition),
          createdByUserId: input.userId,
        },
      }),
    ]);

    return {
      ...updatedWorkflow,
      version: { ...updatedVersion, definition },
    };
  }

  const nextVersion = workflow.currentVersion + 1;
  const version = await prisma.workflowVersion.create({
    data: {
      organizationId: input.organizationId,
      workflowId: workflow.id,
      version: nextVersion,
      status: "draft",
      definition: asJson(definition),
      createdByUserId: input.userId,
    },
  });

  try {
    const updatedWorkflow = await prisma.workflow.update({
      where: { id: workflow.id },
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        status: "draft",
        currentVersion: nextVersion,
      },
    });

    return { ...updatedWorkflow, version: { ...version, definition } };
  } catch (error) {
    await prisma.workflowVersion.deleteMany({
      where: { id: version.id, organizationId: input.organizationId },
    });
    throw error;
  }
}

export async function publishVersionedWorkflow(input: {
  organizationId: string;
  workflowId: string;
  userId: string;
}) {
  const workflow = await prisma.workflow.findFirst({
    where: {
      id: input.workflowId,
      organizationId: input.organizationId,
      status: { not: "archived" },
    },
  });
  if (!workflow) throw new Error("Workflow not found");

  const version = await prisma.workflowVersion.findFirst({
    where: {
      organizationId: input.organizationId,
      workflowId: workflow.id,
      version: workflow.currentVersion,
    },
  });
  if (!version) throw new Error("Workflow version not found");

  const definition = validateWorkflowForPublish(version.definition);
  if (version.status === "published" && workflow.status === "active") {
    return { ...workflow, version: { ...version, definition } };
  }

  const publishedAt = new Date();
  const [updatedVersion, updatedWorkflow] = await Promise.all([
    prisma.workflowVersion.update({
      where: { id: version.id },
      data: {
        status: "published",
        publishedAt,
        createdByUserId: input.userId,
      },
    }),
    prisma.workflow.update({
      where: { id: workflow.id },
      data: { status: "active" },
    }),
  ]);

  return {
    ...updatedWorkflow,
    version: { ...updatedVersion, definition },
  };
}

export async function archiveVersionedWorkflow(input: {
  organizationId: string;
  workflowId: string;
}) {
  const workflow = await prisma.workflow.findFirst({
    where: { id: input.workflowId, organizationId: input.organizationId },
  });
  if (!workflow) throw new Error("Workflow not found");

  return prisma.workflow.update({
    where: { id: workflow.id },
    data: { status: "archived" },
  });
}
