import { NextResponse } from "next/server";
import { prisma } from "@aios/db";
import { requireOrg, authErrorResponse } from "@/lib/authz";

export async function POST(req: Request, { params }: { params: { ticketId: string } }) {
  try {
    const { org } = await requireOrg();

    const body = (await req.json()) as { message?: string };
    if (!body.message || !body.message.trim()) {
      return NextResponse.json({ error: "La réponse ne peut pas être vide." }, { status: 400 });
    }

    // Charge le ticket avec son entreprise pour vérifier qu'il appartient à l'organisation.
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.ticketId },
      include: { business: true },
    });

    if (!ticket || ticket.business.orgId !== org.id) {
      return NextResponse.json({ error: "Ticket introuvable." }, { status: 404 });
    }

    await prisma.ticketMessage.create({
      data: { ticketId: ticket.id, sender: "HUMAN", body: body.message.trim() },
    });
    await prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: "RESOLVED" } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const mapped = authErrorResponse(err);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    throw err;
  }
}
