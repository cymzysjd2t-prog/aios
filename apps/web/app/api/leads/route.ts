import { NextResponse } from "next/server";
import { prisma } from "@aios/db";
import { getAgentRunQueue } from "@aios/agent-core";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const allowed = await rateLimit(clientKey(req, "leads"), 10, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Trop de requêtes, réessaie dans une minute." }, { status: 429 });
  }

  const body = (await req.json()) as {
    businessId?: string;
    name?: string;
    email?: string;
    company?: string;
    message?: string;
  };

  if (!body.businessId || !body.name || !body.email) {
    return NextResponse.json({ error: "Champs manquants." }, { status: 400 });
  }

  const business = await prisma.business.findUnique({ where: { id: body.businessId } });
  if (!business) return NextResponse.json({ error: "Entreprise introuvable." }, { status: 404 });

  const lead = await prisma.lead.upsert({
    where: { businessId_email: { businessId: body.businessId, email: body.email } },
    update: { name: body.name, company: body.company ?? undefined, source: "Formulaire web" },
    create: {
      businessId: body.businessId,
      name: body.name,
      email: body.email,
      company: body.company ?? null,
      source: "Formulaire web",
    },
  });

  const salesInstance = await prisma.agentInstance.findFirst({
    where: { businessId: body.businessId, definition: { role: "SALES" } },
  });

  if (salesInstance) {
    const goal =
      `Nouveau lead entrant : ${body.name} (${body.email})${body.company ? `, société : ${body.company}` : ""}.\n` +
      `${body.message ? `Message : ${body.message}\n\n` : ""}` +
      `Qualifie ce lead avec l'outil qualify_lead.`;

    await getAgentRunQueue().add(
      "run",
      { agentInstanceId: salesInstance.id, goal, trigger: "user_message" },
      { removeOnComplete: 100, removeOnFail: 100 }
    );
  }

  return NextResponse.json({ leadId: lead.id, autoHandled: Boolean(salesInstance) });
}
