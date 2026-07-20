import { NextResponse } from "next/server";
import { prisma } from "@aios/db";
import { requireBusinessAccess, authErrorResponse } from "@/lib/authz";

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    businessId?: string;
    mrr?: number;
    arr?: number;
    churn?: number;
    traffic?: number;
  };

  if (!body.businessId) {
    return NextResponse.json({ error: "businessId manquant." }, { status: 400 });
  }

  try {
    await requireBusinessAccess(body.businessId);
  } catch (err) {
    const mapped = authErrorResponse(err);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    throw err;
  }

  const date = startOfDay(new Date());

  const snapshot = await prisma.kpiSnapshot.upsert({
    where: { businessId_date: { businessId: body.businessId, date } },
    update: {
      ...(body.mrr !== undefined && { mrr: body.mrr }),
      ...(body.arr !== undefined && { arr: body.arr }),
      ...(body.churn !== undefined && { churn: body.churn }),
      ...(body.traffic !== undefined && { traffic: body.traffic }),
    },
    create: {
      businessId: body.businessId,
      date,
      mrr: body.mrr,
      arr: body.arr,
      churn: body.churn,
      traffic: body.traffic,
    },
  });

  return NextResponse.json({ snapshot });
}
