import { NextResponse } from "next/server";
import { prisma } from "@aios/db";
import { getAgentRunQueue } from "@aios/agent-core";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  // Route publique : 10 tickets / minute / IP pour éviter le spam.
  const allowed = await rateLimit(clientKey(req, "tickets"), 10, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Trop de requêtes, réessaie dans une minute." }, { status: 429 });
  }

  const body = (await req.json()) as { businessId?: string; customerEmail?: string; subject?: string; message?: string };

  if (!body.businessId || !body.customerEmail || !body.subject || !body.message) {
    return NextResponse.json({ error: "Champs manquants." }, { status: 400 });
  }

  const business = await prisma.business.findUnique({ where: { id: body.businessId } });
  if (!business) {
    return NextResponse.json({ error: "Entreprise introuvable." }, { status: 404 });
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      businessId: body.businessId,
      customerEmail: body.customerEmail,
      subject: body.subject,
      messages: { create: { sender: "CUSTOMER", body: body.message } },
    },
  });

  const supportInstance = await prisma.agentInstance.findFirst({
    where: { businessId: body.businessId, definition: { role: "SUPPORT" } },
  });

  if (supportInstance) {
    const goal =
      `Nouveau ticket de support #${ticket.id} de ${body.customerEmail}.\n` +
      `Sujet : ${body.subject}\n\n${body.message}\n\n` +
      `Réponds avec l'outil respond_to_ticket en utilisant ticketId="${ticket.id}".`;

    await getAgentRunQueue().add(
      "run",
      { agentInstanceId: supportInstance.id, goal, trigger: "user_message" },
      { removeOnComplete: 100, removeOnFail: 100 }
    );
  }

  return NextResponse.json({ ticketId: ticket.id, autoHandled: Boolean(supportInstance) });
}
