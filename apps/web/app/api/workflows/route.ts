import { NextResponse } from "next/server";
import { prisma } from "@aios/db";
import { WORKFLOW_TEMPLATES } from "@aios/agent-core";
import { requireBusinessAccess, authErrorResponse } from "@/lib/authz";

export async function POST(req: Request) {
  const body = (await req.json()) as { businessId?: string; templateId?: string };
  const template = WORKFLOW_TEMPLATES.find((t) => t.id === body.templateId);

  if (!body.businessId || !template) {
    return NextResponse.json({ error: "Template ou entreprise invalide." }, { status: 400 });
  }

  try {
    await requireBusinessAccess(body.businessId);
  } catch (err) {
    const mapped = authErrorResponse(err);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    throw err;
  }

  const workflow = await prisma.workflow.create({
    data: {
      businessId: body.businessId,
      name: template.name,
      trigger: template.trigger,
      steps: template.steps,
      isActive: true,
    },
  });

  return NextResponse.json({ workflow });
}
