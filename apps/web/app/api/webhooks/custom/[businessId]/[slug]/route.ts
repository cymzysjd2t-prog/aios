import { NextResponse } from "next/server";
import { emitEvent } from "@aios/agent-core";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export async function POST(
  req: Request,
  { params }: { params: { businessId: string; slug: string } }
) {
  // 60 appels / minute / IP : les webhooks externes peuvent être fréquents mais pas illimités.
  const allowed = await rateLimit(clientKey(req, `webhook:${params.slug}`), 60, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    // Corps vide ou non-JSON accepté : certains services envoient un webhook sans payload.
  }

  await emitEvent(params.businessId, "webhook", payload, { webhookSlug: params.slug });

  return NextResponse.json({ received: true });
}
