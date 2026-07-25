import { executePublishedWorkflowsForTicket } from "@/features/workflows/services/versioned-workflow-runtime";
import { executeWorkflowRules } from "@/features/workflows/services/workflow-service";

export async function dispatchTicketUpdatedWorkflows(input: {
  organizationId: string;
  ticketId: string;
  eventId: string;
}) {
  try {
    await executeWorkflowRules(input.ticketId, {
      organizationId: input.organizationId,
      triggerType: "ticket-updated",
    });
  } catch (error) {
    console.error("Legacy ticket-updated workflow failed", error);
  }

  try {
    return await executePublishedWorkflowsForTicket({
      organizationId: input.organizationId,
      ticketId: input.ticketId,
      triggerType: "ticket-updated",
      idempotencyKey: `ticket-updated:${input.eventId}`,
    });
  } catch (error) {
    console.error("Published ticket-updated workflow failed", error);
    return [];
  }
}
