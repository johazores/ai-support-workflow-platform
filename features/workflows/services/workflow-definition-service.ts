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

function normalizedText(value: string) {
  return value.trim();
}

async function getLatestVersion(organizationId: string, workflowId: string) {
  return prisma.workflowVersion.findFirst({
    where: { organizationId, workflowId },
    orderBy: { version: "desc" },
  });
}

export async function listVersionedWorkflows(organizationId: string) {
  const workflows = await prisma.workflow.findMany({
    where: { organizationId },
    orderBy: { updatedAt: "desc" },
  });

  if (workflows.length === 0) return [];

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
    latestVersion: latestByWorkflow.get(workflow.id)?.version ?? null,
    latestVersionStatus: latestByWorkflow.get(workflow.id)?.status ?? null,
    publishedVersion:
      workflow.status === "active" ? workflow.currentVersion : null,
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

  const version = await getLatestVersion(organizationId, workflowId);
  if (!version) return null;

  return {
    ...workflow,
    publishedVersion:
      workflow.status === "active" ? workflow.currentVersion : null,
    version: {
      ...version,
      definition: parseWorkflowDefinition(version.definition),
    },
  };
}

export async function listWorkflowVersions(
  organizationId: string,
  workflowId: string,
) {
  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, organizationId },
    select: { id: true },
  });
  if (!workflow) throw new Error("Workflow not found");

  return prisma.workflowVersion.findMany({
    where: { organizationId, workflowId },
    orderBy: { version: "desc" },
  });
}

export async function createVersionedWorkflow(input: WorkflowInput) {
  const definition = parseWorkflowDefinition(input.definition);
  const name = normalizedText(input.name);
  if (!name) throw new Error("Workflow name is required");

  const workflow = await prisma.workflow.create({
    data: {
      organizationId: input.organizationId,
      name,
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

    return {
      ...workflow,
      publishedVersion: null,
      version: { ...version, definition },
    };
  } catch (error) {
    await prisma.workflow.deleteMany({
      where: { id: workflow.id, organizationId: input.organizationId },
    });
    throw error;
  }
}

export async function saveVersionedWorkflow(
  input: WorkflowInput & { workflowId: string },
) {
  const definition = parseWorkflowDefinition(input.definition);
  const name = normalizedText(input.name);
  if (!name) throw new Error("Workflow name is required");

  const workflow = await prisma.workflow.findFirst({
    where: {
      id: input.workflowId,
      organizationId: input.organizationId,
      status: { not: "archived" },
    },
  });
  if (!workflow) throw new Error("Workflow not found");

  const latest = await getLatestVersion(input.organizationId, workflow.id);
  if (!latest) throw new Error("Workflow version not found");

  if (latest.status === "draft") {
    const previousDefinition = latest.definition;
    const previousCreatedBy = latest.createdByUserId;
    const updatedVersion = await prisma.workflowVersion.update({
      where: { id: latest.id },
      data: {
        definition: asJson(definition),
        createdByUserId: input.userId,
      },
    });

    try {
      const updatedWorkflow = await prisma.workflow.update({
        where: { id: workflow.id },
        data: {
          name,
          description: input.description?.trim() || null,
        },
      });

      return {
        ...updatedWorkflow,
        publishedVersion:
          updatedWorkflow.status === "active"
            ? updatedWorkflow.currentVersion
            : null,
        version: { ...updatedVersion, definition },
      };
    } catch (error) {
      await prisma.workflowVersion.update({
        where: { id: latest.id },
        data: {
          definition: previousDefinition,
          createdByUserId: previousCreatedBy,
        },
      });
      throw error;
    }
  }

  const nextVersion = latest.version + 1;
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
        name,
        description: input.description?.trim() || null,
      },
    });

    return {
      ...updatedWorkflow,
      publishedVersion:
        updatedWorkflow.status === "active"
          ? updatedWorkflow.currentVersion
          : null,
      version: { ...version, definition },
    };
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

  const version = await getLatestVersion(input.organizationId, workflow.id);
  if (!version) throw new Error("Workflow version not found");

  const definition = validateWorkflowForPublish(version.definition);
  if (
    version.status === "published" &&
    workflow.status === "active" &&
    workflow.currentVersion === version.version
  ) {
    return {
      ...workflow,
      publishedVersion: workflow.currentVersion,
      version: { ...version, definition },
    };
  }

  const previousVersionState = {
    status: version.status,
    publishedAt: version.publishedAt,
    createdByUserId: version.createdByUserId,
  };
  const publishedAt = new Date();
  const updatedVersion = await prisma.workflowVersion.update({
    where: { id: version.id },
    data: {
      status: "published",
      publishedAt,
      createdByUserId: input.userId,
    },
  });

  try {
    const updatedWorkflow = await prisma.workflow.update({
      where: { id: workflow.id },
      data: { status: "active", currentVersion: version.version },
    });

    return {
      ...updatedWorkflow,
      publishedVersion: version.version,
      version: { ...updatedVersion, definition },
    };
  } catch (error) {
    await prisma.workflowVersion.update({
      where: { id: version.id },
      data: previousVersionState,
    });
    throw error;
  }
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
