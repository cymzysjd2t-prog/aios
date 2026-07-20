import { prisma, TaskStatus } from "@aios/db";
import { enqueueRoleRun } from "./dispatch";
import { interpolate, matchesConditions } from "./workflow-logic";

/** Événements internes qu'un workflow peut écouter. À étendre au fil des phases (Stripe, GitHub...). */
export type DomainEvent = "lead.status_changed" | "ticket.escalated" | "content.generated" | "webhook";

export interface WorkflowCondition {
  field: string;
  equals: string | number | boolean;
}

export interface WorkflowTrigger {
  event: DomainEvent;
  conditions?: WorkflowCondition[];
  /** Requis quand event === "webhook" : distingue plusieurs workflows webhook sur la même entreprise. */
  webhookSlug?: string;
}

export type WorkflowAction =
  | { type: "run_agent"; role: string; goal: string }
  | { type: "create_task"; title: string; priority?: number }
  | { type: "record_decision"; role: string; content: string };

async function executeAction(action: WorkflowAction, businessId: string, payload: Record<string, unknown>) {
  switch (action.type) {
    case "run_agent": {
      await enqueueRoleRun({
        businessId,
        role: action.role,
        goal: interpolate(action.goal, payload),
        trigger: "cron",
      });
      break;
    }
    case "create_task": {
      const project = await prisma.project.findFirst({ where: { businessId } });
      if (project) {
        await prisma.task.create({
          data: {
            projectId: project.id,
            title: interpolate(action.title, payload),
            status: TaskStatus.TODO,
            priority: action.priority ?? 3,
          },
        });
      }
      break;
    }
    case "record_decision": {
      const instance = await prisma.agentInstance.findFirst({
        where: { businessId, definition: { role: action.role as never } },
      });
      if (instance) {
        await prisma.agentMemory.create({
          data: { agentId: instance.id, kind: "DECISION", content: interpolate(action.content, payload) },
        });
      }
      break;
    }
  }
}

/**
 * Point d'entrée du moteur : à appeler chaque fois qu'un événement métier se produit (upsert
 * de lead, escalade de ticket, contenu généré...). Trouve les workflows actifs de l'entreprise
 * qui écoutent cet événement, vérifie leurs conditions, exécute leurs actions dans l'ordre, et
 * journalise le déclenchement dans WorkflowRun pour la traçabilité.
 */
export async function emitEvent(
  businessId: string,
  event: DomainEvent,
  payload: Record<string, unknown>,
  opts?: { webhookSlug?: string }
) {
  const workflows = await prisma.workflow.findMany({ where: { businessId, isActive: true } });

  for (const workflow of workflows) {
    const trigger = workflow.trigger as unknown as WorkflowTrigger;
    if (trigger.event !== event) continue;
    if (event === "webhook" && trigger.webhookSlug !== opts?.webhookSlug) continue;
    if (!matchesConditions(trigger.conditions, payload)) continue;

    const steps = workflow.steps as unknown as WorkflowAction[];
    for (const action of steps) {
      await executeAction(action, businessId, payload);
    }

    await prisma.workflowRun.create({
      data: { workflowId: workflow.id, eventPayload: JSON.parse(JSON.stringify(payload)) },
    });
  }
}