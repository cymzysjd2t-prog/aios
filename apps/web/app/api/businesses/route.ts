import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@aios/db";
import { getAgentRunQueue } from "@aios/agent-core";
import { getOrCreateOrganization } from "@/lib/tenant";
import { checkCanCreateBusiness, checkCanRunAgent } from "@/lib/limits";

function deriveName(pitch: string): string {
  const trimmed = pitch.trim().replace(/\.$/, "");
  return trimmed.length > 60 ? trimmed.slice(0, 57) + "..." : trimmed;
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const org = await getOrCreateOrganization(userId);
  const businesses = await prisma.business.findMany({
    where: { orgId: org.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { projects: true, agents: true } } },
  });

  return NextResponse.json({ businesses });
}

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = (await req.json()) as { pitch?: string };
  if (!body.pitch || body.pitch.trim().length < 8) {
    return NextResponse.json({ error: "Décris ton idée en une phrase ou plus." }, { status: 400 });
  }
  const pitch = body.pitch.trim();

  const org = await getOrCreateOrganization(userId);

  const businessLimitError = await checkCanCreateBusiness(org.id);
  if (businessLimitError) {
    return NextResponse.json({ error: businessLimitError }, { status: 403 });
  }
  const runLimitError = await checkCanRunAgent(org.id);
  if (runLimitError) {
    return NextResponse.json({ error: runLimitError }, { status: 403 });
  }

  const business = await prisma.business.create({
    data: { orgId: org.id, name: deriveName(pitch) },
  });

  const ceoDefinition = await prisma.agentDefinition.findFirst({ where: { role: "CEO" } });
  if (!ceoDefinition) {
    return NextResponse.json(
      { error: "Catalogue d'agents vide — lance `pnpm db:seed` avant de créer une entreprise." },
      { status: 500 }
    );
  }

  const ceoInstance = await prisma.agentInstance.create({
    data: { businessId: business.id, definitionId: ceoDefinition.id, status: "IDLE" },
  });

  await getAgentRunQueue().add(
    "run",
    { agentInstanceId: ceoInstance.id, goal: pitch, trigger: "user_message" },
    { removeOnComplete: 100, removeOnFail: 100 }
  );

  return NextResponse.json({ businessId: business.id });
}
