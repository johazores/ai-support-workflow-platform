import type { Prisma } from "@prisma/client";
import { generateAiDraftReply } from "@/features/ai-drafts/services/ai-draft-service";
import { isLegacyOrganization } from "@/features/organizations/services/organization-service";
import {
  parseWorkflowDefinition,
  validateWorkflowForPublish,
} from "@/features/workflows/services/workflow-definition-validation";
import type {
  WorkflowActionNode,
  WorkflowConditionNode,
  WorkflowDefinition,
  WorkflowNode,
  WorkflowTriggerType,
} from "@/features/workflows/types/workflow-definition";
import { prisma } from "@/lib/prisma";

type RuntimeTicket = {
  id: string;
  organizationId: string | null;
  subject: string;
  status: string;
  priority: string;
  assigneeName: string | null;
  assigneeEmail: string | null;
  tagIds: string[];
  customer: { name: string };
  messages: Array<{ body: string }>;
};

type ExecuteInput = {
  organizationId: string;
  ticketId: string;
  triggerType: WorkflowTriggerType;
  workflowId?: string;
  idempotencyKey?: string;
};

type ExecutionMode = "live" | "test";
type RuntimeTriggerType = WorkflowTriggerType | "test";
type TicketMutation = {
  status?: string;
  priority?: string;
  assigneeName?: string | null;
  assigneeEmail?: string | null;
  tagIds?: string[];
};

export class WorkflowExecutionError extends Error {
  constructor(
    message: string,
    readonly executionId: string,
  ) {
    super(message);
    this.name = "WorkflowExecutionError";
  }
}

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
      customer: { select: { name: true } },
      messages: {
        where: { author: "customer" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true },
      },
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

async function updateTenantTicket(input: {
  organizationId: string;
  ticketId: string;
  data: TicketMutation;
}) {
  const updated = await prisma.ticket.updateMany({
    where: {
      id: input.ticketId,
      ...(await ticketTenantWhere(input.organizationId)),
    },
    data: { ...input.data, organizationId: input.organizationId },
  });

  if (updated.count !== 1) throw new Error("Ticket not found");
}

async function recordActivity(input: {
  mode: ExecutionMode;
  organizationId: string;
  ticketId: string;
  type: string;
  message: string;
}) {
  if (input.mode === "test") return;
  await prisma.activityLog.create({
    data: {
      organizationId: input.organizationId,
      ticketId: input.ticketId,
      type: input.type,
      message: input.message,
    },
  });
}

async function applyAction(input: {
  organizationId: string;
  ticket: RuntimeTicket;
  node: WorkflowActionNode;
  mode: ExecutionMode;
}) {
  const { organizationId, node, mode } = input;
  const ticket = { ...input.ticket, tagIds: [...input.ticket.tagIds] };
  const simulated = mode === "test";

  if (node.data.actionType === "change-status") {
    if (mode === "live") {
      await updateTenantTicket({
        organizationId,
        ticketId: ticket.id,
        data: { status: node.data.value },
      });
    }
    ticket.status = node.data.value;
    await recordActivity({
      mode,
      organizationId,
      ticketId: ticket.id,
      type: "workflow_change_status",
      message: `Workflow changed status to ${node.data.value}`,
    });
    return { ticket, output: { status: node.data.value, simulated } };
  }

  if (node.data.actionType === "change-priority") {
    if (mode === "live") {
      await updateTenantTicket({
        organizationId,
        ticketId: ticket.id,
        data: { priority: node.data.value },
      });
    }
    ticket.priority = node.data.value;
    await recordActivity({
      mode,
      organizationId,
      ticketId: ticket.id,
      type: "workflow_change_priority",
      message: `Workflow changed priority to ${node.data.value}`,
    });
    return { ticket, output: { priority: node.data.value, simulated } };
  }

  if (node.data.actionType === "assign-ticket") {
    const assignee = await resolveAssignee(organizationId, node.data.value);
    if (mode === "live") {
      await updateTenantTicket({
        organizationId,
        ticketId: ticket.id,
        data: {
          assigneeName: assignee.name,
          assigneeEmail: assignee.email,
        },
      });
    }
    ticket.assigneeName = assignee.name;
    ticket.assigneeEmail = assignee.email;
    await recordActivity({
      mode,
      organizationId,
      ticketId: ticket.id,
      type: "workflow_assignment",
      message: `Workflow assigned ticket to ${assignee.name}`,
    });
    return {
      ticket,
      output: {
        assigneeName: assignee.name,
        assigneeEmail: assignee.email,
        simulated,
      },
    };
  }

  if (node.data.actionType === "add-tag") {
    const tag = await resolveTag(organizationId, node.data.value);
    const alreadyPresent = ticket.tagIds.includes(tag.id);

    if (!alreadyPresent) {
      const nextTagIds = [...ticket.tagIds, tag.id];
      if (mode === "live") {
        await updateTenantTicket({
          organizationId,
          ticketId: ticket.id,
          data: { tagIds: nextTagIds },
        });
      }
      ticket.tagIds = nextTagIds;
      await recordActivity({
        mode,
        organizationId,
        ticketId: ticket.id,
        type: "workflow_add_tag",
        message: `Workflow added tag ${tag.name}`,
      });
    }

    return {
      ticket,
      output: {
        tagId: tag.id,
        tagName: tag.name,
        alreadyPresent,
        simulated,
      },
    };
  }

  if (mode === "test") {
    return {
      ticket,
      output: { wouldGenerateDraft: true, simulated: true },
    };
  }

  const result = await generateAiDraftReply({
    organizationId,
    subject: ticket.subject,
    customerName: ticket.customer.name,
    customerMessage: ticket.messages[0]?.body ?? "",
  });
  const draft = await prisma.draft.create({
    data: {
      organizationId,
      ticketId: ticket.id,
      body: result.draft,
    },
  });
  await recordActivity({
    mode,
    organizationId,
    ticketId: ticket.id,
    type: "workflow_generate_draft",
    message: "Workflow generated an AI draft for review.",
  });

  return { ticket, output: { draftId: draft.id, simulated: false } };
}

function childIdsForResult(input: {
  definition: WorkflowDefinition;
  node: WorkflowNode;
  conditionMatched?: boolean;
}) {
  return input.definition.edges
    .filter((edge) => {
      if (edge.source !== input.node.id) return false;
      if (input.node.type !== "condition") return edge.branch === undefined;
      return edge.branch === (input.conditionMatched ? "true" : "false");
    })
    .map((edge) => edge.target);
}

async function runNode(input: {
  organizationId: string;
  executionId: string;
  node: WorkflowNode;
  ticket: RuntimeTicket;
  mode: ExecutionMode;
}) {
  const step = await prisma.workflowExecutionStep.create({
    data: {
      organizationId: input.organizationId,
      executionId: input.executionId,
      nodeId: input.node.id,
      nodeType: input.node.type,
      status: "running",
      attempt: 1,
      input: asJson({ ticketId: input.ticket.id, testMode: input.mode === "test" }),
      startedAt: new Date(),
    },
  });

  try {
    if (input.node.type === "trigger") {
      const output = { triggered: true, simulated: input.mode === "test" };
      await prisma.workflowExecutionStep.update({
        where: { id: step.id },
        data: {
          status: "succeeded",
          output: asJson(output),
          finishedAt: new Date(),
        },
      });
      return { ticket: input.ticket, conditionMatched: undefined, output };
    }

    if (input.node.type === "condition") {
      const matched = matchesCondition(input.node, input.ticket);
      const output = { matched, simulated: input.mode === "test" };
      await prisma.workflowExecutionStep.update({
        where: { id: step.id },
        data: {
          status: "succeeded",
          output: asJson(output),
          finishedAt: new Date(),
        },
      });
      return { ticket: input.ticket, conditionMatched: matched, output };
    }

    const result = await applyAction({
      organizationId: input.organizationId,
      ticket: input.ticket,
      node: input.node,
      mode: input.mode,
    });
    await prisma.workflowExecutionStep.update({
      where: { id: step.id },
      data: {
        status: "succeeded",
        output: asJson(result.output),
        finishedAt: new Date(),
      },
    });
    return {
      ticket: result.ticket,
      conditionMatched: undefined,
      output: result.output,
    };
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
  triggerType: RuntimeTriggerType;
  workflow: { id: string; currentVersion: number };
  version: { id: string; definition: Prisma.JsonValue };
  idempotencyKey?: string;
  mode: ExecutionMode;
}) {
  const definition =
    input.mode === "test"
      ? validateWorkflowForPublish(input.version.definition)
      : parseWorkflowDefinition(input.version.definition);
  const trigger =
    input.mode === "test"
      ? definition.nodes.find((node) => node.type === "trigger")
      : definition.nodes.find(
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
        status: { in: ["queued", "running", "succeeded"] },
      },
      orderBy: { createdAt: "desc" },
    });
    if (previous) {
      return {
        execution: previous,
        ticket: await loadTicket(input.organizationId, input.ticket.id),
      };
    }
  }

  const execution = await prisma.workflowExecution.create({
    data: {
      organizationId: input.organizationId,
      workflowId: input.workflow.id,
      workflowVersionId: input.version.id,
      triggerType: input.triggerType,
      status: "running",
      idempotencyKey: input.idempotencyKey || null,
      input: asJson({
        ticketId: input.ticket.id,
        testMode: input.mode === "test",
      }),
      startedAt: new Date(),
    },
  });

  let ticket = { ...input.ticket, tagIds: [...input.ticket.tagIds] };
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
        mode: input.mode,
      });
      ticket = result.ticket;
      executedNodeIds.push(node.id);
      queue.push(
        ...childIdsForResult({
          definition,
          node,
          conditionMatched: result.conditionMatched,
        }),
      );
    }

    const completed = await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: "succeeded",
        output: asJson({
          ticketId: ticket.id,
          executedNodeIds,
          testMode: input.mode === "test",
          preview:
            input.mode === "test"
              ? {
                  status: ticket.status,
                  priority: ticket.priority,
                  assigneeName: ticket.assigneeName,
                  assigneeEmail: ticket.assigneeEmail,
                  tagIds: ticket.tagIds,
                }
              : undefined,
        }),
        finishedAt: new Date(),
      },
    });
    return { execution: completed, ticket };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Workflow execution failed";
    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: "failed",
        error: message,
        output: asJson({
          ticketId: ticket.id,
          executedNodeIds,
          testMode: input.mode === "test",
        }),
        finishedAt: new Date(),
      },
    });
    throw new WorkflowExecutionError(message, execution.id);
  }
}

export async function executePublishedWorkflowsForTicket(input: ExecuteInput) {
  let ticket = await loadTicket(input.organizationId, input.ticketId);
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
      mode: "live",
    });
    if (!result) continue;

    results.push(result.execution);
    ticket = result.ticket;
  }

  return results;
}

export async function testLatestWorkflowDraftForTicket(input: {
  organizationId: string;
  workflowId: string;
  ticketId: string;
  idempotencyKey: string;
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
    },
    orderBy: { version: "desc" },
  });
  if (!version) throw new Error("Workflow version not found");

  const ticket = await loadTicket(input.organizationId, input.ticketId);
  const result = await executeWorkflow({
    organizationId: input.organizationId,
    ticket,
    triggerType: "test",
    workflow,
    version,
    idempotencyKey: input.idempotencyKey,
    mode: "test",
  });

  if (!result) throw new Error("Workflow does not contain a trigger");
  return result.execution;
}
