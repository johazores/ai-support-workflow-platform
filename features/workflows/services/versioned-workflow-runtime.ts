import type { Prisma, Ticket } from "@prisma/client";
import { isLegacyOrganization } from "@/features/organizations/services/organization-service";
import { parseWorkflowDefinition } from "@/features/workflows/services/workflow-definition-validation";
import type {
  WorkflowActionNode,
  WorkflowConditionNode,
  WorkflowDefinition,
  WorkflowNode,
  WorkflowTriggerType,
} from "@/features/workflows/types/workflow-definition";
import { prisma } from "@/lib/prisma";

type RuntimeTicket = Pick<
  Ticket,
  | "id"
  | "organizationId"
  | "subject"
  | "status"
  | "priority"
  | "assigneeName"
  | "assigneeEmail"
  | "tagIds"
>;

type ExecuteInput = {
  organizationId: string;
  ticketId: string;
  triggerType: WorkflowTriggerType;
  workflowId?: string;
  idempotencyKey?: string;
};

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function ticketTenantWhere(organizationId: string) {
  return (await isLegacyOrganization(organizationId))
    ? { OR: [{ organizationId }, { organizationId: null }] }
    : { organizationId };
}

async function loadTicket(
  organizationId: string,
  ticketId: string,
): Promise<RuntimeTicket> {
  const ticket = await prisma.ticket.findFirst({
    where: {
      id: ticketId,
      ...(await ticketTenantWhere(organizationId)),
    },
    select: {
      id: true,
      organizationId: true,
      subject: true,
      status: true,
      priority: true,
      assigneeName: true,
      assigneeEmail: true,
      tagIds: true,
    },
  });

  if (!ticket) throw new Error("Ticket not found");
  return ticket;
}

function matchesCondition(
  node: WorkflowConditionNode,
  ticket: RuntimeTicket,
) {
  const actual = String(ticket[node.data.field] ?? "");
  const expected = node.data.value;

  if (node.data.operator === "equals") return actual === expected;
  if (node.data.operator === "not-equals") return actual !== expected;
  return actual.toLowerCase().includes(expected.toLowerCase());
}

async function resolveAssignee(organizationId: string, email: string) {
  const user = await prisma.user.findFirst({
    where: {
      email: email.trim().toLowerCase(),
      status: "active",
    },
    select: { id: true, name: true, email: true },
  });
  if (!user) throw new Error("Workflow assignee not found");

  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: user.id,
      },
    },
    select: { status: true },
  });
  if (membership?.status !== "active") {
    throw new Error("Workflow assignee is not an active organization member");
  }

  return user;
}

async function resolveTag(organizationId: string, tagId: string) {
  const includeLegacy = await isLegacyOrganization(organizationId);
  const tag = await prisma.tag.findFirst({
    where: {
      id: tagId,
      ...(includeLegacy
        ? { OR: [{ organizationId }, { organizationId: null }] }
        : { organizationId }),
    },
    select: { id: true, name: true },
  });
  if (!tag) throw new Error("Workflow tag not found");
  return tag;
}

async function applyAction(input: {
  organizationId: string;
  ticket: RuntimeTicket;
  node: WorkflowActionNode;
}) {
  const { organizationId, node } = input;
  const ticket = { ...input.ticket };
  const tenantWhere = await ticketTenantWhere(organizationId);

  if (node.data.actionType === "change-status") {
    await prisma.ticket.updateMany({
      where: { id: ticket.id, ...tenantWhere },
      data: { organizationId, status: node.data.value },
    });
    ticket.status = node.data.value;
    await prisma.activityLog.create({
      data: {
        organizationId,
        ticketId: ticket.id,
        type: "workflow_change_status",
        message: `Workflow changed status to ${node.data.value}`,
      },
    });
    return { ticket, output: { status: node.data.value } };
  }

  if (node.data.actionType === "change-priority") {
    await prisma.ticket.updateMany({
      where: { id: ticket.id, ...tenantWhere },
      data: { organizationId, priority: node.data.value },
    });
    ticket.priority = node.data.value;
    await prisma.activityLog.create({
      data: {
        organizationId,
        ticketId: ticket.id,
        type: "workflow_change_priority",
        message: `Workflow changed priority to ${node.data.value}`,
      },
    });
    return { ticket, output: { priority: node.data.value } };
  }

  if (node.data.actionType === "assign-ticket") {
    const assignee = await resolveAssignee(organizationId, node.data.value);
    await prisma.ticket.updateMany({
      where: { id: ticket.id, ...tenantWhere },
      data: {
        organizationId,
        assigneeName: assignee.name,
        assigneeEmail: assignee.email,
      },
    });
    ticket.assigneeName = assignee.name;
    ticket.assigneeEmail = assignee.email;
    await prisma.activityLog.create({
      data: {
        organizationId,
        ticketId: ticket.id,
        type: "workflow_assignment",
        message: `Workflow assigned ticket to ${assignee.name}`,
      },
    });
    return {
      ticket,
      output: { assigneeName: assignee.name, assigneeEmail: assignee.email },
    };
  }

  const tag = await resolveTag(organizationId, node.data.value);
  const nextTagIds = ticket.tagIds.includes(tag.id)
    ? ticket.tagIds
    : [...ticket.tagIds, tag.id];

  if (nextTagIds !== ticket.tagIds) {
    await prisma.ticket.updateMany({
      where: { id: ticket.id, ...tenantWhere },
      data: { organizationId, tagIds: nextTagIds },
    });
    ticket.tagIds = nextTagIds;
    await prisma.activityLog.create({
      data: {
        organizationId,
        ticketId: ticket.id,
        type: "workflow_add_tag",
        message: `Workflow added tag ${tag.name}`,
      },
    });
  }

  return { ticket, output: { tagId: tag.id, tagName: tag.name } };
}

function childrenOf(definition: WorkflowDefinition, nodeId: string) {
  return definition.edges
    .filter((edge) => edge.source === nodeId)
    .map((edge) => edge.target);
}

async function runNode(input: {
  organizationId: string;
  executionId: string;
  node: WorkflowNode;
  ticket: RuntimeTicket;
}) {
  const startedAt = new Date();
  const step = await prisma.workflowExecutionStep.create({
    data: {
      organizationId: input.organizationId,
      executionId: input.executionId,
      nodeId: input.node.id,
      nodeType: input.node.type,
      status: "running",
      attempt: 1,
      input: asJson({ ticketId: input.ticket.id }),
      startedAt,
    },
  });

  try {
    if (input.node.type === "trigger") {
      const output = { triggered: true };
      await prisma.workflowExecutionStep.update({
        where: { id: step.id },
        data: {
          status: "completed",
          output: asJson(output),
          finishedAt: new Date(),
        },
      });
      return { ticket: input.ticket, shouldContinue: true, output };
    }

    if (input.node.type === "condition") {
      const matched = matchesCondition(input.node, input.ticket);
      const output = { matched };
      await prisma.workflowExecutionStep.update({
        where: { id: step.id },
        data: {
          status: "completed",
          output: asJson(output),
          finishedAt: new Date(),
        },
      });
      return { ticket: input.ticket, shouldContinue: matched, output };
    }

    const result = await applyAction({
      organizationId: input.organizationId,
      ticket: input.ticket,
      node: input.node,
    });
    await prisma.workflowExecutionStep.update({
      where: { id: step.id },
      data: {
        status: "completed",
        output: asJson(result.output),
        finishedAt: new Date(),
      },
    });
    return { ticket: result.ticket, shouldContinue: true, output: result.output };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workflow step failed";
    await prisma.workflowExecutionStep.update({
      where: { id: step.id },
      data: {
        status: "failed",
        error: message,
        finishedAt: new Date(),
      },
    });
    throw error;
  }
}

async function executeWorkflow(input: {
  organizationId: string;
  ticket: RuntimeTicket;
  triggerType: WorkflowTriggerType;
  workflow: {
    id: string;
    currentVersion: number;
  };
  version: {
    id: string;
    definition: Prisma.JsonValue;
  };
  idempotencyKey?: string;
}) {
  const definition = parseWorkflowDefinition(input.version.definition);
  const trigger = definition.nodes.find(
    (node) =>
      node.type === "trigger" && node.data.triggerType === input.triggerType,
  );
  if (!trigger) return null;

  if (input.idempotencyKey) {
    const previous = await prisma.workflowExecution.findFirst({
      where: {
        organizationId: input.organizationId,
        workflowId: input.workflow.id,
        idempotencyKey: input.idempotencyKey,
      },
      orderBy: { createdAt: "desc" },
    });
    if (previous) return previous;
  }

  const execution = await prisma.workflowExecution.create({
    data: {
      organizationId: input.organizationId,
      workflowId: input.workflow.id,
      workflowVersionId: input.version.id,
      triggerType: input.triggerType,
      status: "running",
      idempotencyKey: input.idempotencyKey || null,
      input: asJson({ ticketId: input.ticket.id }),
      startedAt: new Date(),
    },
  });

  let ticket = { ...input.ticket };
  const visited = new Set<string>();
  const queue = [trigger.id];
  const executedNodeIds: string[] = [];

  try {
    while (queue.length > 0) {
      const nodeId = queue.shift();
      if (!nodeId || visited.has(nodeId)) continue;
      visited.add(nodeId);

      const node = definition.nodes.find((candidate) => candidate.id === nodeId);
      if (!node) throw new Error(`Workflow node ${nodeId} was not found`);

      const result = await runNode({
        organizationId: input.organizationId,
        executionId: execution.id,
        node,
        ticket,
      });
      ticket = result.ticket;
      executedNodeIds.push(node.id);

      if (result.shouldContinue) {
        queue.push(...childrenOf(definition, node.id));
      }
    }

    return prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: "completed",
        output: asJson({ ticketId: ticket.id, executedNodeIds }),
        finishedAt: new Date(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workflow execution failed";
    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: "failed",
        error: message,
        output: asJson({ ticketId: ticket.id, executedNodeIds }),
        finishedAt: new Date(),
      },
    });
    throw error;
  }
}

export async function executePublishedWorkflowsForTicket(input: ExecuteInput) {
  const ticket = await loadTicket(input.organizationId, input.ticketId);
  const workflows = await prisma.workflow.findMany({
    where: {
      organizationId: input.organizationId,
      status: "active",
      ...(input.workflowId ? { id: input.workflowId } : {}),
    },
    orderBy: { updatedAt: "asc" },
  });

  const results = [];
  for (const workflow of workflows) {
    const version = await prisma.workflowVersion.findFirst({
      where: {
        organizationId: input.organizationId,
        workflowId: workflow.id,
        version: workflow.currentVersion,
        status: "published",
      },
    });
    if (!version) continue;

    const result = await executeWorkflow({
      organizationId: input.organizationId,
      ticket,
      triggerType: input.triggerType,
      workflow,
      version,
      idempotencyKey: input.idempotencyKey
        ? `${input.idempotencyKey}:${workflow.id}`
        : undefined,
    });
    if (result) results.push(result);
  }

  return results;
}
