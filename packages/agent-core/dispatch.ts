import { prisma, AgentRole } from "@aios/db";
import { getAgentRunQueue } from "./queue";

/**
 * Point d'entrée unique pour "faire agir un rôle sur une entreprise", que ce soit à la demande
 * d'un autre agent (delegate_to_agent) ou d'un workflow automatisé (action run_agent). Renvoie
 * false sans lever d'erreur si aucun agent de ce rôle n'est déployé — l'appelant décide comment
 * réagir (log, ignorer, etc.).
 */
export async function enqueueRoleRun(params: {
  businessId: string;
  role: AgentRole | string;
  goal: string;
  trigger: "user_message" | "agent_delegation" | "cron" | "webhook";
}): Promise<boolean> {
  const instance = await prisma.agentInstance.findFirst({
    where: { businessId: params.businessId, definition: { role: params.role as AgentRole } },
  });

  if (!instance) return false;

  await getAgentRunQueue().add(
    "run",
    { agentInstanceId: instance.id, goal: params.goal, trigger: params.trigger },
    { removeOnComplete: 100, removeOnFail: 100 }
  );
  return true;
}
