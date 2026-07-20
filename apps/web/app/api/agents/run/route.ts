import { NextResponse } from "next/server";
import { prisma } from "@aios/db";
import { getAgentRunQueue } from "@aios/agent-core";
import { checkCanRunAgent } from "@/lib/limits";
import { requireOrg, requireBusinessAccess, authErrorResponse } from "@/lib/authz";

const DEMO_BUSINESS_ID = "demo-business";

export async function POST(req: Request) {
  const body = (await req.json()) as { agentInstanceId?: string; goal?: string; businessId?: string };
  if (!body.goal || !body.goal.trim()) {
    return NextResponse.json({ error: "L'objectif ne peut pas être vide." }, { status: 400 });
  }

  try {
    const { org } = await requireOrg();

    // Résolution de l'agent cible : soit un agentInstanceId explicite, soit le CEO de l'entreprise.
    let instance = body.agentInstanceId
      ? await prisma.agentInstance.findUnique({ where: { id: body.agentInstanceId } })
      : null;

    // Détermine le businessId réel de l'agent (depuis l'instance si fournie, sinon depuis le body).
    const targetBusinessId = instance?.businessId ?? body.businessId ?? DEMO_BUSINESS_ID;

    // Vérifie la propriété de l'entreprise cible — sauf pour la démo, ouverte à tous.
    if (targetBusinessId !== DEMO_BUSINESS_ID) {
      await requireBusinessAccess(targetBusinessId);
    }

    if (!instance) {
      instance = await prisma.agentInstance.findFirst({
        where: { businessId: targetBusinessId, definition: { role: "CEO" } },
      });
    }

    if (!instance) {
      return NextResponse.json({ error: "Agent introuvable ou non déployé." }, { status: 404 });
    }

    // Garde-fou supplémentaire : si un agentInstanceId a été fourni, s'assurer qu'il appartient
    // bien à l'entreprise dont on vient de vérifier la propriété (évite le cross-org via instanceId).
    if (body.agentInstanceId && targetBusinessId !== DEMO_BUSINESS_ID) {
      const ownedBusiness = await prisma.business.findFirst({
        where: { id: instance.businessId, orgId: org.id },
      });
      if (!ownedBusiness) {
        return NextResponse.json({ error: "Agent introuvable." }, { status: 404 });
      }
    }

    const business = await prisma.business.findUnique({ where: { id: instance.businessId } });
    if (business) {
      const limitError = await checkCanRunAgent(business.orgId);
      if (limitError) {
        return NextResponse.json({ error: limitError }, { status: 403 });
      }
    }

    await getAgentRunQueue().add(
      "run",
      { agentInstanceId: instance.id, goal: body.goal.trim(), trigger: "user_message" },
      { removeOnComplete: 100, removeOnFail: 100 }
    );

    return NextResponse.json({ queued: true, agentInstanceId: instance.id });
  } catch (err) {
    const mapped = authErrorResponse(err);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    throw err;
  }
}
