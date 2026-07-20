import { NextResponse } from "next/server";
import { prisma } from "@aios/db";
import { AGENT_DEFINITIONS } from "@aios/agent-core";
import { requireBusinessAccess, authErrorResponse } from "@/lib/authz";

const DEMO_BUSINESS_ID = "demo-business";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId") ?? DEMO_BUSINESS_ID;

  // La démo reste lisible par tout utilisateur connecté (données de démonstration partagées) ;
  // toute autre entreprise exige la propriété.
  if (businessId !== DEMO_BUSINESS_ID) {
    try {
      await requireBusinessAccess(businessId);
    } catch (err) {
      const mapped = authErrorResponse(err);
      if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
      throw err;
    }
  }

  const instances = await prisma.agentInstance.findMany({
    where: { businessId },
    include: {
      definition: true,
      runs: { orderBy: { startedAt: "desc" }, take: 1 },
    },
  });

  const deployedRoles = new Set(instances.map((i) => i.definition.role));

  const deployed = instances.map((instance) => ({
    id: instance.id,
    role: instance.definition.role,
    name: instance.definition.name,
    status: instance.status,
    budgetUsedUsd: instance.budgetUsedUsd,
    lastRun: instance.runs[0]
      ? {
          status: instance.runs[0].status,
          goal: (instance.runs[0].input as { goal?: string })?.goal ?? null,
          startedAt: instance.runs[0].startedAt,
        }
      : null,
    deployed: true,
  }));

  const notDeployed = AGENT_DEFINITIONS.filter((def) => !deployedRoles.has(def.role)).map((def) => ({
    id: `catalog-${def.role}`,
    role: def.role,
    name: def.name,
    status: "IDLE" as const,
    budgetUsedUsd: 0,
    lastRun: null,
    deployed: false,
  }));

  return NextResponse.json({ agents: [...deployed, ...notDeployed] });
}
