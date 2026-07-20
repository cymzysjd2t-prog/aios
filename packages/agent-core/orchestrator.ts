import { prisma, AgentRole, AgentStatus, RunStatus } from "@aios/db";
import { complete, type ToolDefinition } from "@aios/llm-router";
import { buildSystemPrompt } from "./prompt";
import { TOOL_REGISTRY, executeTool, type ToolExecutionContext } from "./tools";

export interface RunAgentParams {
  agentInstanceId: string;
  trigger: "user_message" | "agent_delegation" | "cron" | "webhook";
  goal: string;
  enqueueDelegatedRun: ToolExecutionContext["enqueueDelegatedRun"];
}

/**
 * Exécute un tour complet d'un agent : construit son contexte (définition + mémoire),
 * appelle le LLM, exécute les outils demandés, journalise chaque étape, met à jour
 * le coût et le statut. Conçu pour tourner dans un worker (BullMQ), indépendamment
 * de toute requête HTTP — l'agent continue même si l'utilisateur s'est déconnecté.
 */
export async function runAgentInstance(params: RunAgentParams): Promise<void> {
  const { agentInstanceId, trigger, goal, enqueueDelegatedRun } = params;

  const instance = await prisma.agentInstance.findUniqueOrThrow({
    where: { id: agentInstanceId },
    include: { definition: true },
  });

  await prisma.agentInstance.update({
    where: { id: agentInstanceId },
    data: { status: AgentStatus.RUNNING },
  });

  const run = await prisma.agentRun.create({
    data: {
      agentId: agentInstanceId,
      trigger,
      input: { goal },
      status: RunStatus.RUNNING,
    },
  });

  try {
    const system = await buildSystemPrompt(agentInstanceId);
    const tools = instance.definition.tools as string[];

    const result = await complete({
      model: instance.definition.defaultModel,
      system,
      messages: [{ role: "user", content: goal }],
      tools: tools.map((name) => TOOL_REGISTRY[name]).filter((t): t is ToolDefinition => Boolean(t)),
      maxTokens: 2048,
    });

    if (result.text) {
      await prisma.agentStep.create({
        data: { runId: run.id, type: "output", payload: { text: result.text } },
      });
    }

    const ctx: ToolExecutionContext = {
      agentInstanceId,
      businessId: instance.businessId,
      runId: run.id,
      enqueueDelegatedRun,
    };

    for (const call of result.toolCalls) {
      await executeTool(call, ctx);
    }

    // Mémoire courte : un résumé du run, pour que l'agent se souvienne de ce qu'il a fait.
    await prisma.agentMemory.create({
      data: {
        agentId: agentInstanceId,
        kind: "SUMMARY",
        content: `Objectif reçu : "${goal}". ${result.text || "Actions exécutées via outils."}`.slice(0, 2000),
      },
    });

    await prisma.agentRun.update({
      where: { id: run.id },
      data: { status: RunStatus.SUCCESS, finishedAt: new Date(), costUsd: result.costUsd },
    });

    await prisma.agentInstance.update({
      where: { id: agentInstanceId },
      data: {
        status: AgentStatus.IDLE,
        budgetUsedUsd: { increment: result.costUsd },
      },
    });
  } catch (err) {
    await prisma.agentStep.create({
      data: {
        runId: run.id,
        type: "error",
        payload: { message: err instanceof Error ? err.message : String(err) },
      },
    });
    await prisma.agentRun.update({
      where: { id: run.id },
      data: { status: RunStatus.FAILED, finishedAt: new Date() },
    });
    await prisma.agentInstance.update({
      where: { id: agentInstanceId },
      data: { status: AgentStatus.ERROR },
    });
    throw err;
  }
}

export { AgentRole };