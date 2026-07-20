import { NextResponse } from "next/server";
import { prisma } from "@aios/db";
import { requireOrg, authErrorResponse } from "@/lib/authz";

export async function POST(_req: Request, { params }: { params: { workflowId: string } }) {
  try {
    const { org } = await requireOrg();

    // Charge le workflow avec son entreprise pour vérifier l'appartenance à l'organisation.
    const workflow = await prisma.workflow.findUnique({
      where: { id: params.workflowId },
      include: { business: true },
    });

    if (!workflow || workflow.business.orgId !== org.id) {
      // 404 uniforme : ne pas révéler l'existence d'un workflow d'une autre org.
      return NextResponse.json({ error: "Workflow introuvable." }, { status: 404 });
    }

    const updated = await prisma.workflow.update({
      where: { id: params.workflowId },
      data: { isActive: !workflow.isActive },
    });

    return NextResponse.json({ workflow: updated });
  } catch (err) {
    const mapped = authErrorResponse(err);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    throw err;
  }
}
