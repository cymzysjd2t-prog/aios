import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma, AgentRole } from "@aios/db";
import { getOrCreateOrganization } from "@/lib/tenant";
import { PLAN_LIMITS } from "@/lib/plans";

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = (await req.json()) as { businessId?: string; role?: string };
  if (!body.businessId || !body.role || !Object.values(AgentRole).includes(body.role as AgentRole)) {
    return NextResponse.json({ error: "businessId ou rôle invalide." }, { status: 400 });
  }

  const org = await getOrCreateOrganization(userId);
  const business = await prisma.business.findUnique({ where: { id: body.businessId } });
  if (!business || business.orgId !== org.id) {
    return NextResponse.json({ error: "Entreprise introuvable ou non autorisée." }, { status: 404 });
  }

  const currentCount = await prisma.agentInstance.count({ where: { businessId: business.id } });
  const cap = PLAN_LIMITS[org.plan].maxAgentsPerBusiness;
  if (currentCount >= cap) {
    return NextResponse.json(
      { error: `Limite atteinte : le plan ${PLAN_LIMITS[org.plan].label} permet ${cap} agents par entreprise.` },
      { status: 403 }
    );
  }

  const definition = await prisma.agentDefinition.findFirst({ where: { role: body.role as AgentRole } });
  if (!definition) {
    return NextResponse.json(
      { error: "Catalogue d'agents vide — lance `pnpm db:seed` d'abord." },
      { status: 500 }
    );
  }

  const existing = await prisma.agentInstance.findFirst({
    where: { businessId: business.id, definitionId: definition.id },
  });
  if (existing) {
    return NextResponse.json({ error: "Cet agent est déjà déployé sur cette entreprise." }, { status: 409 });
  }

  const instance = await prisma.agentInstance.create({
    data: { businessId: business.id, definitionId: definition.id, status: "IDLE" },
  });

  return NextResponse.json({ agentInstanceId: instance.id });
}
