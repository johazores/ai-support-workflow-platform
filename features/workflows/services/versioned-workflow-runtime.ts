import { randomUUID } from "node:crypto";
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
import {
  logError,
  logInfo,
  logWarn,
  redactLogValue,
} from "@/lib/structured-logger";

const QUEUE_NODE_ID = "__workflow_queue__";
const QUEUE_NODE_TYPE = "queue";
const TERMINAL_EXECUTION_STATUSES = ["succeeded", "failed", "cancelled"] as const;

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
  availableAt?: Date;
  maxAttempts?: number;
  timeoutMs?: number;
};

type ExecutionMode = "live" | "test";
type TicketMutation = {
  status?: string;
  priority?: string;
  assigneeName?: string | null;
  assigneeEmail?: string | null;
  tagIds?: string[];
};

type QueueInput = {
  ticketId: string;
  maxAttempts: number;
  timeoutMs: number;
};

export type ClaimedWorkflowExecution = {
  execution: {
    id: string;
    organizationId: string;
    workflowId: string;
    workflowVersionId: string;
    triggerType: string;
    status: string;
    input: Prisma.JsonValue | null;
  };
  queueStep: {
    id: string;
    executionId: string;
    attempt: number;
    input: Prisma.JsonValue | null;
  };
  leaseToken: string;
  workerId: string;
  leaseMs: number;
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

export class WorkflowLeaseLostError extends Error {
  constructor(readonly executionId: string) {
    super("Workflow execution lease was lost");
    this.name = "WorkflowLeaseLostError";
  }
}

export class WorkflowCancellationError extends Error {
  constructor(readonly executionId: string) {
    super("Workflow execution was cancelled");
    this.name = "WorkflowCancellationError";
  }
}

class NonRetryableWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NonRetryableWorkflowError";
  }
}

function boundedEnvironmentInteger(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, value));
}

function defaultMaxAttempts() {
  return boundedEnvironmentInteger("WORKFLOW_MAX_ATTEMPTS", 3, 1, 10);
}

function defaultExecutionTimeoutMs() {
  return boundedEnvironmentInteger(
    "WORKFLOW_EXECUTION_TIMEOUT_MS",
    120_000,
    10_000,
    30 * 60_000,
  );
}

function defaultLeaseMs() {
  return boundedEnvironmentInteger(
    "WORKFLOW_WORKER_LEASE_MS",
    60_000,
    15_000,
    10 * 60_000,
  );
}

function retryDelayMs(attempt: number) {
  const base = boundedEnvironmentInteger(
    "WORKFLOW_RETRY_BASE_MS",
    5_000,
    1_000,
    60_000,
  );
  const maximum = boundedEnvironmentInteger(
    "WORKFLOW_RETRY_MAX_MS",
    5 * 60_000,
    base,
    60 * 60_000,
  );
  return Math.min(maximum, base * 2 ** Math.max(0, attempt - 1));
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return redactLogValue(value) as Prisma.InputJsonValue;
}

function asRecord(value: Prisma.JsonValue | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : {};
}

function numberFromJson(value: Prisma.JsonValue | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringFromJson(value: Prisma.JsonValue | undefined) {
  return typeof value === "string" ? value : null;
}

function safeErrorMessage(error: unknown) {
  const original =
    error instanceof Error ? error.message : "Workflow execution failed";
  return original
    .replace(/(bearer\s+)[^\s]+/gi, "$1[redacted]")
    .replace(
      /(api[-_]?key|token|secret|password|credential)(\s*[:=]\s*)[^\s,;]+/gi,
      "$1$2[redacted]",
    )
    .slice(0, 2_000);
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

  if (!ticket) throw new NonRetryableWorkflowError("Ticket not found");
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
  if (!user) throw new NonRetryableWorkflowError("Workflow assignee not found");

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
    throw new NonRetryableWorkflowError(
      "Workflow assignee is not an active organization member",
    );
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
  if (!tag) throw new NonRetryableWorkflowError("Workflow tag not found");
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

  if (updated.count !== 1) {
    throw new NonRetryableWorkflowError("Ticket not found");
  }
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
  attempt: number;
}) {
  if (input.mode === "live") {
    const previous = await prisma.workflowExecutionStep.findFirst({
      where: {
        executionId: input.executionId,
        nodeId: input.node.id,
        status: "succeeded",
      },
      orderBy: [{ attempt: "desc" }, { createdAt: "desc" }],
    });

    if (previous) {
      const output = asRecord(previous.output);
      return {
        ticket: input.ticket,
        conditionMatched:
          input.node.type === "condition" ? Boolean(output.matched) : undefined,
        output,
        reused: true,
      };
    }
  }

  const step = await prisma.workflowExecutionStep.create({
    data: {
      organizationId: input.organizationId,
      executionId: input.executionId,
      nodeId: input.node.id,
      nodeType: input.node.type,
      status: "running",
      attempt: input.attempt,
      input: asJson({
        ticketId: input.ticket.id,
        testMode: input.mode === "test",
      }),
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
    const message = safeErrorMessage(error);
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

async function executeGraph(input: {
  organizationId: string;
  executionId: string;
  definition: WorkflowDefinition;
  trigger: WorkflowNode;
  ticket: RuntimeTicket;
  mode: ExecutionMode;
  attempt: number;
  ensureCanContinue?: () => Promise<void>;
  heartbeat?: () => Promise<void>;
}) {
  let ticket = { ...input.ticket, tagIds: [...input.ticket.tagIds] };
  const visited = new Set<string>();
  const queue = [input.trigger.id];
  const executedNodeIds: string[] = [];

  while (queue.length > 0) {
    await input.ensureCanContinue?.();
    await input.heartbeat?.();

    const nodeId = queue.shift();
    if (!nodeId || visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = input.definition.nodes.find(
      (candidate) => candidate.id === nodeId,
    );
    if (!node) {
      throw new NonRetryableWorkflowError(
        `Workflow node ${nodeId} was not found`,
      );
    }

    const result = await runNode({
      organizationId: input.organizationId,
      executionId: input.executionId,
      node,
      ticket,
      mode: input.mode,
      attempt: input.attempt,
    });
    ticket = result.ticket;
    executedNodeIds.push(node.id);
    queue.push(
      ...childIdsForResult({
        definition: input.definition,
        node,
        conditionMatched: result.conditionMatched,
      }),
    );
  }

  return { ticket, executedNodeIds };
}

function queueInputFromStep(step: {
  input: Prisma.JsonValue | null;
}): QueueInput {
  const input = asRecord(step.input);
  const ticketId = stringFromJson(input.ticketId);
  if (!ticketId) {
    throw new NonRetryableWorkflowError(
      "Workflow queue record is missing a ticket ID",
    );
  }

  return {
    ticketId,
    maxAttempts: Math.min(
      10,
      Math.max(1, numberFromJson(input.maxAttempts, defaultMaxAttempts())),
    ),
    timeoutMs: Math.min(
      30 * 60_000,
      Math.max(
        10_000,
        numberFromJson(input.timeoutMs, defaultExecutionTimeoutMs()),
      ),
    ),
  };
}

async function enqueueWorkflow(input: {
  organizationId: string;
  ticketId: string;
  triggerType: WorkflowTriggerType;
  workflow: { id: string; currentVersion: number };
  version: { id: string; definition: Prisma.JsonValue };
  idempotencyKey?: string;
  availableAt: Date;
  maxAttempts: number;
  timeoutMs: number;
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
        status: {
          in: ["queued", "running", "cancelling", "succeeded"],
        },
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
      status: "queued",
      idempotencyKey: input.idempotencyKey || null,
      input: asJson({
        ticketId: input.ticketId,
        testMode: false,
      }),
    },
  });

  try {
    await prisma.workflowExecutionStep.create({
      data: {
        organizationId: input.organizationId,
        executionId: execution.id,
        nodeId: QUEUE_NODE_ID,
        nodeType: QUEUE_NODE_TYPE,
        status: "queued",
        attempt: 0,
        input: asJson({
          ticketId: input.ticketId,
          maxAttempts: input.maxAttempts,
          timeoutMs: input.timeoutMs,
        }),
        startedAt: input.availableAt,
      },
    });
  } catch (error) {
    await prisma.workflowExecution.delete({ where: { id: execution.id } });
    throw error;
  }

  logInfo("workflow.execution.queued", {
    executionId: execution.id,
    organizationId: input.organizationId,
    workflowId: input.workflow.id,
    triggerType: input.triggerType,
    availableAt: input.availableAt,
  });
  return execution;
}

export async function enqueuePublishedWorkflowsForTicket(input: ExecuteInput) {
  await loadTicket(input.organizationId, input.ticketId);
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

    const execution = await enqueueWorkflow({
      organizationId: input.organizationId,
      ticketId: input.ticketId,
      triggerType: input.triggerType,
      workflow,
      version,
      idempotencyKey: input.idempotencyKey
        ? `${input.idempotencyKey}:${workflow.id}`
        : undefined,
      availableAt: input.availableAt ?? new Date(),
      maxAttempts: Math.min(
        10,
        Math.max(1, input.maxAttempts ?? defaultMaxAttempts()),
      ),
      timeoutMs: Math.min(
        30 * 60_000,
        Math.max(10_000, input.timeoutMs ?? defaultExecutionTimeoutMs()),
      ),
    });
    if (execution) results.push(execution);
  }

  return results;
}

/**
 * Compatibility export retained while callers migrate from synchronous execution.
 * Live execution is now always queued and processed by the workflow worker.
 */
export const executePublishedWorkflowsForTicket =
  enqueuePublishedWorkflowsForTicket;

async function finalizeCancelledExecution(input: {
  executionId: string;
  queueStepId: string;
  leaseToken: string;
}) {
  const now = new Date();
  await prisma.workflowExecution.updateMany({
    where: {
      id: input.executionId,
      status: { in: ["queued", "running", "cancelling"] },
    },
    data: {
      status: "cancelled",
      error: null,
      finishedAt: now,
    },
  });
  await prisma.workflowExecutionStep.updateMany({
    where: {
      id: input.queueStepId,
      status: { in: ["queued", "running"] },
      error: input.leaseToken,
    },
    data: {
      status: "cancelled",
      error: null,
      finishedAt: now,
    },
  });
}

async function claimQueueStep(input: {
  workerId: string;
  leaseMs: number;
  stale: boolean;
}) {
  const now = new Date();
  const candidate = await prisma.workflowExecutionStep.findFirst({
    where: input.stale
      ? {
          nodeId: QUEUE_NODE_ID,
          nodeType: QUEUE_NODE_TYPE,
          status: "running",
          finishedAt: { lte: now },
        }
      : {
          nodeId: QUEUE_NODE_ID,
          nodeType: QUEUE_NODE_TYPE,
          status: "queued",
          startedAt: { lte: now },
        },
    orderBy: input.stale
      ? [{ finishedAt: "asc" }, { createdAt: "asc" }]
      : [{ startedAt: "asc" }, { createdAt: "asc" }],
  });
  if (!candidate) return null;

  const leaseToken = `${input.workerId}:${randomUUID()}`;
  const leaseExpiresAt = new Date(now.getTime() + input.leaseMs);
  const claimed = await prisma.workflowExecutionStep.updateMany({
    where: input.stale
      ? {
          id: candidate.id,
          status: "running",
          finishedAt: { lte: now },
        }
      : {
          id: candidate.id,
          status: "queued",
          startedAt: { lte: now },
        },
    data: {
      status: "running",
      attempt: { increment: 1 },
      startedAt: now,
      finishedAt: leaseExpiresAt,
      error: leaseToken,
    },
  });
  if (claimed.count !== 1) return null;

  const queueStep = await prisma.workflowExecutionStep.findUnique({
    where: { id: candidate.id },
  });
  if (!queueStep) return null;

  const execution = await prisma.workflowExecution.findUnique({
    where: { id: queueStep.executionId },
  });
  if (!execution) {
    await prisma.workflowExecutionStep.updateMany({
      where: {
        id: queueStep.id,
        status: "running",
        error: leaseToken,
      },
      data: {
        status: "failed",
        error: "Workflow execution record was not found",
        finishedAt: new Date(),
      },
    });
    return null;
  }

  if (
    TERMINAL_EXECUTION_STATUSES.includes(
      execution.status as (typeof TERMINAL_EXECUTION_STATUSES)[number],
    )
  ) {
    await prisma.workflowExecutionStep.updateMany({
      where: {
        id: queueStep.id,
        status: "running",
        error: leaseToken,
      },
      data: {
        status: execution.status,
        error: null,
        finishedAt: new Date(),
      },
    });
    return null;
  }

  if (execution.status === "cancelling") {
    await finalizeCancelledExecution({
      executionId: execution.id,
      queueStepId: queueStep.id,
      leaseToken,
    });
    return null;
  }

  const activated = await prisma.workflowExecution.updateMany({
    where: {
      id: execution.id,
      status: { in: ["queued", "running"] },
    },
    data: {
      status: "running",
      startedAt: now,
      finishedAt: null,
      error: null,
    },
  });
  if (activated.count !== 1) return null;

  return {
    execution,
    queueStep,
    leaseToken,
    workerId: input.workerId,
    leaseMs: input.leaseMs,
  } satisfies ClaimedWorkflowExecution;
}

export async function claimNextWorkflowExecution(input: {
  workerId: string;
  leaseMs?: number;
}) {
  const leaseMs = input.leaseMs ?? defaultLeaseMs();

  for (let index = 0; index < 10; index += 1) {
    const queued = await claimQueueStep({
      workerId: input.workerId,
      leaseMs,
      stale: false,
    });
    if (queued) return queued;

    const stale = await claimQueueStep({
      workerId: input.workerId,
      leaseMs,
      stale: true,
    });
    if (stale) {
      logWarn("workflow.execution.reclaimed", {
        executionId: stale.execution.id,
        workerId: input.workerId,
        attempt: stale.queueStep.attempt,
      });
      return stale;
    }

    return null;
  }

  return null;
}

async function heartbeatClaim(claim: ClaimedWorkflowExecution) {
  const renewed = await prisma.workflowExecutionStep.updateMany({
    where: {
      id: claim.queueStep.id,
      status: "running",
      error: claim.leaseToken,
    },
    data: {
      finishedAt: new Date(Date.now() + claim.leaseMs),
    },
  });
  if (renewed.count !== 1) {
    throw new WorkflowLeaseLostError(claim.execution.id);
  }
}

async function ensureClaimCanContinue(input: {
  claim: ClaimedWorkflowExecution;
  deadlineAt: number;
  leaseLost: boolean;
}) {
  if (input.leaseLost) {
    throw new WorkflowLeaseLostError(input.claim.execution.id);
  }
  if (Date.now() > input.deadlineAt) {
    throw new Error("Workflow execution timed out");
  }

  const execution = await prisma.workflowExecution.findUnique({
    where: { id: input.claim.execution.id },
    select: { status: true },
  });
  if (!execution) {
    throw new NonRetryableWorkflowError("Workflow execution was not found");
  }
  if (execution.status === "cancelling" || execution.status === "cancelled") {
    throw new WorkflowCancellationError(input.claim.execution.id);
  }
  if (execution.status !== "running") {
    throw new WorkflowLeaseLostError(input.claim.execution.id);
  }
}

function isRetryableWorkflowError(error: unknown) {
  return !(
    error instanceof NonRetryableWorkflowError ||
    error instanceof WorkflowCancellationError ||
    error instanceof WorkflowLeaseLostError
  );
}

export async function executeClaimedWorkflowExecution(
  claim: ClaimedWorkflowExecution,
) {
  const queueInput = queueInputFromStep(claim.queueStep);
  const attempt = claim.queueStep.attempt;
  const deadlineAt = Date.now() + queueInput.timeoutMs;
  let leaseLost = false;
  let heartbeatStopped = false;

  const heartbeatTimer = setInterval(() => {
    if (heartbeatStopped) return;
    void heartbeatClaim(claim).catch(() => {
      leaseLost = true;
    });
  }, Math.max(1_000, Math.floor(claim.leaseMs / 3)));
  heartbeatTimer.unref();

  const stopHeartbeat = () => {
    if (heartbeatStopped) return;
    heartbeatStopped = true;
    clearInterval(heartbeatTimer);
  };

  try {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: claim.execution.workflowId,
        organizationId: claim.execution.organizationId,
        status: "active",
      },
    });
    if (!workflow) {
      throw new NonRetryableWorkflowError(
        "Published workflow is no longer active",
      );
    }

    const version = await prisma.workflowVersion.findFirst({
      where: {
        id: claim.execution.workflowVersionId,
        organizationId: claim.execution.organizationId,
        workflowId: workflow.id,
        status: "published",
      },
    });
    if (!version) {
      throw new NonRetryableWorkflowError(
        "Published workflow version was not found",
      );
    }

    const definition = parseWorkflowDefinition(version.definition);
    const trigger = definition.nodes.find(
      (node) =>
        node.type === "trigger" &&
        node.data.triggerType === claim.execution.triggerType,
    );
    if (!trigger) {
      throw new NonRetryableWorkflowError(
        "Workflow no longer contains the queued trigger",
      );
    }

    const ticket = await loadTicket(
      claim.execution.organizationId,
      queueInput.ticketId,
    );
    const result = await executeGraph({
      organizationId: claim.execution.organizationId,
      executionId: claim.execution.id,
      definition,
      trigger,
      ticket,
      mode: "live",
      attempt,
      ensureCanContinue: () =>
        ensureClaimCanContinue({ claim, deadlineAt, leaseLost }),
      heartbeat: () => heartbeatClaim(claim),
    });

    await ensureClaimCanContinue({ claim, deadlineAt, leaseLost });
    stopHeartbeat();

    const completedAt = new Date();
    const completed = await prisma.workflowExecution.updateMany({
      where: { id: claim.execution.id, status: "running" },
      data: {
        status: "succeeded",
        output: asJson({
          ticketId: result.ticket.id,
          executedNodeIds: result.executedNodeIds,
          attempt,
          testMode: false,
        }),
        error: null,
        finishedAt: completedAt,
      },
    });
    if (completed.count !== 1) {
      throw new WorkflowLeaseLostError(claim.execution.id);
    }

    await prisma.workflowExecutionStep.updateMany({
      where: {
        id: claim.queueStep.id,
        status: "running",
        error: claim.leaseToken,
      },
      data: {
        status: "succeeded",
        error: null,
        output: asJson({ attempt, completedAt }),
        finishedAt: completedAt,
      },
    });

    logInfo("workflow.execution.succeeded", {
      executionId: claim.execution.id,
      organizationId: claim.execution.organizationId,
      workflowId: claim.execution.workflowId,
      workerId: claim.workerId,
      attempt,
    });

    return prisma.workflowExecution.findUnique({
      where: { id: claim.execution.id },
    });
  } catch (error) {
    stopHeartbeat();

    if (error instanceof WorkflowLeaseLostError || leaseLost) {
      logWarn("workflow.execution.lease_lost", {
        executionId: claim.execution.id,
        workerId: claim.workerId,
        attempt,
      });
      throw new WorkflowLeaseLostError(claim.execution.id);
    }

    if (error instanceof WorkflowCancellationError) {
      await finalizeCancelledExecution({
        executionId: claim.execution.id,
        queueStepId: claim.queueStep.id,
        leaseToken: claim.leaseToken,
      });
      logInfo("workflow.execution.cancelled", {
        executionId: claim.execution.id,
        organizationId: claim.execution.organizationId,
        workerId: claim.workerId,
        attempt,
      });
      return prisma.workflowExecution.findUnique({
        where: { id: claim.execution.id },
      });
    }

    const message = safeErrorMessage(error);
    const retryable =
      isRetryableWorkflowError(error) && attempt < queueInput.maxAttempts;

    if (retryable) {
      const nextRunAt = new Date(Date.now() + retryDelayMs(attempt));
      await prisma.workflowExecution.updateMany({
        where: { id: claim.execution.id, status: "running" },
        data: {
          status: "queued",
          error: message,
          startedAt: null,
          finishedAt: null,
        },
      });
      await prisma.workflowExecutionStep.updateMany({
        where: {
          id: claim.queueStep.id,
          status: "running",
          error: claim.leaseToken,
        },
        data: {
          status: "queued",
          error: null,
          startedAt: nextRunAt,
          finishedAt: null,
          output: asJson({
            previousAttempt: attempt,
            lastError: message,
            nextRunAt,
          }),
        },
      });

      logWarn("workflow.execution.retry_scheduled", {
        executionId: claim.execution.id,
        organizationId: claim.execution.organizationId,
        workerId: claim.workerId,
        attempt,
        maxAttempts: queueInput.maxAttempts,
        nextRunAt,
        error: message,
      });
      return prisma.workflowExecution.findUnique({
        where: { id: claim.execution.id },
      });
    }

    const failedAt = new Date();
    await prisma.workflowExecution.updateMany({
      where: {
        id: claim.execution.id,
        status: { in: ["running", "cancelling"] },
      },
      data: {
        status: "failed",
        error: message,
        finishedAt: failedAt,
      },
    });
    await prisma.workflowExecutionStep.updateMany({
      where: {
        id: claim.queueStep.id,
        status: "running",
        error: claim.leaseToken,
      },
      data: {
        status: "failed",
        error: message,
        output: asJson({ attempt, maxAttempts: queueInput.maxAttempts }),
        finishedAt: failedAt,
      },
    });

    logError("workflow.execution.failed", {
      executionId: claim.execution.id,
      organizationId: claim.execution.organizationId,
      workflowId: claim.execution.workflowId,
      workerId: claim.workerId,
      attempt,
      maxAttempts: queueInput.maxAttempts,
      error: message,
    });
    throw new WorkflowExecutionError(message, claim.execution.id);
  } finally {
    stopHeartbeat();
  }
}

export async function requestWorkflowExecutionCancellation(input: {
  organizationId: string;
  executionId: string;
}) {
  const execution = await prisma.workflowExecution.findFirst({
    where: {
      id: input.executionId,
      organizationId: input.organizationId,
    },
  });
  if (!execution) throw new Error("Workflow execution not found");

  if (
    TERMINAL_EXECUTION_STATUSES.includes(
      execution.status as (typeof TERMINAL_EXECUTION_STATUSES)[number],
    )
  ) {
    return execution;
  }

  if (execution.status === "queued") {
    const now = new Date();
    await prisma.workflowExecution.updateMany({
      where: {
        id: execution.id,
        organizationId: input.organizationId,
        status: "queued",
      },
      data: {
        status: "cancelled",
        error: null,
        finishedAt: now,
      },
    });
    await prisma.workflowExecutionStep.updateMany({
      where: {
        executionId: execution.id,
        nodeId: QUEUE_NODE_ID,
        nodeType: QUEUE_NODE_TYPE,
        status: "queued",
      },
      data: {
        status: "cancelled",
        error: null,
        finishedAt: now,
      },
    });
  } else {
    await prisma.workflowExecution.updateMany({
      where: {
        id: execution.id,
        organizationId: input.organizationId,
        status: "running",
      },
      data: { status: "cancelling" },
    });
  }

  logInfo("workflow.execution.cancellation_requested", {
    executionId: execution.id,
    organizationId: input.organizationId,
    previousStatus: execution.status,
  });

  return prisma.workflowExecution.findUnique({
    where: { id: execution.id },
  });
}

export async function getWorkflowQueueHealth() {
  const [queued, running, cancelling, failed, oldestQueued] = await Promise.all([
    prisma.workflowExecution.count({ where: { status: "queued" } }),
    prisma.workflowExecution.count({ where: { status: "running" } }),
    prisma.workflowExecution.count({ where: { status: "cancelling" } }),
    prisma.workflowExecution.count({ where: { status: "failed" } }),
    prisma.workflowExecution.findFirst({
      where: { status: "queued" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);

  return {
    queued,
    running,
    cancelling,
    failed,
    oldestQueuedAt: oldestQueued?.createdAt ?? null,
  };
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

  const definition = validateWorkflowForPublish(version.definition);
  const trigger = definition.nodes.find((node) => node.type === "trigger");
  if (!trigger) throw new Error("Workflow does not contain a trigger");

  if (input.idempotencyKey) {
    const previous = await prisma.workflowExecution.findFirst({
      where: {
        organizationId: input.organizationId,
        workflowId: workflow.id,
        idempotencyKey: input.idempotencyKey,
        status: { in: ["running", "succeeded"] },
      },
      orderBy: { createdAt: "desc" },
    });
    if (previous) return previous;
  }

  const ticket = await loadTicket(input.organizationId, input.ticketId);
  const execution = await prisma.workflowExecution.create({
    data: {
      organizationId: input.organizationId,
      workflowId: workflow.id,
      workflowVersionId: version.id,
      triggerType: "test",
      status: "running",
      idempotencyKey: input.idempotencyKey,
      input: asJson({ ticketId: ticket.id, testMode: true }),
      startedAt: new Date(),
    },
  });

  try {
    const result = await executeGraph({
      organizationId: input.organizationId,
      executionId: execution.id,
      definition,
      trigger,
      ticket,
      mode: "test",
      attempt: 1,
    });
    return await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: "succeeded",
        output: asJson({
          ticketId: result.ticket.id,
          executedNodeIds: result.executedNodeIds,
          testMode: true,
          preview: {
            status: result.ticket.status,
            priority: result.ticket.priority,
            assigneeName: result.ticket.assigneeName,
            assigneeEmail: result.ticket.assigneeEmail,
            tagIds: result.ticket.tagIds,
          },
        }),
        finishedAt: new Date(),
      },
    });
  } catch (error) {
    const message = safeErrorMessage(error);
    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: "failed",
        error: message,
        output: asJson({
          ticketId: ticket.id,
          testMode: true,
        }),
        finishedAt: new Date(),
      },
    });
    throw new WorkflowExecutionError(message, execution.id);
  }
}
