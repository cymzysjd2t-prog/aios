import { Worker } from "bullmq";
import {
  AGENT_RUN_QUEUE,
  getQueueConnection,
  runAgentInstance,
  enqueueRoleRun,
  type AgentRunJobData,
} from "@aios/agent-core";

async function enqueueDelegatedRun(params: {
  role: string;
  businessId: string;
  instruction: string;
  fromAgentInstanceId: string;
}) {
  const queued = await enqueueRoleRun({
    businessId: params.businessId,
    role: params.role,
    goal: params.instruction,
    trigger: "agent_delegation",
  });

  if (!queued) {
    console.warn(
      `[worker] Délégation vers ${params.role} ignorée : aucun agent de ce rôle n'est déployé sur cette entreprise.`
    );
  }
}

const worker = new Worker<AgentRunJobData>(
  AGENT_RUN_QUEUE,
  async (job) => {
    console.log(`[worker] Exécution agent ${job.data.agentInstanceId} — objectif: "${job.data.goal}"`);
    await runAgentInstance({
      agentInstanceId: job.data.agentInstanceId,
      goal: job.data.goal,
      trigger: job.data.trigger,
      enqueueDelegatedRun,
    });
  },
  { connection: getQueueConnection(), concurrency: 3 }
);

worker.on("completed", (job) => console.log(`[worker] Run terminé: ${job.id}`));
worker.on("failed", (job, err) => console.error(`[worker] Run échoué: ${job?.id}`, err.message));

console.log("[worker] AIOS agent worker démarré, en écoute sur la file 'agent-runs'...");
