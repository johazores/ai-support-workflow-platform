import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { runWorkflowWorkerIteration } from "@/features/workflows/services/workflow-worker-service";
import { logError, logInfo } from "@/lib/structured-logger";
import { prisma } from "@/lib/prisma";

function boundedInteger(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, value));
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  const workerId =
    process.env.WORKFLOW_WORKER_ID?.trim() ||
    `${hostname()}:${process.pid}:${randomUUID()}`;
  const pollIntervalMs = boundedInteger(
    "WORKFLOW_WORKER_POLL_MS",
    1_000,
    100,
    60_000,
  );
  const idleBackoffMs = boundedInteger(
    "WORKFLOW_WORKER_IDLE_MS",
    2_500,
    pollIntervalMs,
    60_000,
  );
  let stopping = false;

  const requestStop = (signal: string) => {
    if (stopping) return;
    stopping = true;
    logInfo("workflow.worker.stop_requested", { workerId, signal });
  };

  process.once("SIGINT", () => requestStop("SIGINT"));
  process.once("SIGTERM", () => requestStop("SIGTERM"));

  logInfo("workflow.worker.started", {
    workerId,
    pollIntervalMs,
    idleBackoffMs,
  });

  try {
    while (!stopping) {
      try {
        const result = await runWorkflowWorkerIteration({ workerId });
        await sleep(result.claimed ? pollIntervalMs : idleBackoffMs);
      } catch (error) {
        logError("workflow.worker.iteration_failed", { workerId, error });
        await sleep(idleBackoffMs);
      }
    }
  } finally {
    await prisma.$disconnect();
    logInfo("workflow.worker.stopped", { workerId });
  }
}

void main().catch((error) => {
  logError("workflow.worker.fatal", { error });
  process.exitCode = 1;
});
