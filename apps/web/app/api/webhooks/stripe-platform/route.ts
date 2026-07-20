import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma, Plan } from "@aios/db";

// Webhook DISTINCT de /api/webhooks/stripe (qui traite le Stripe des produits construits par
// les entreprises clientes). Celui-ci gère l'abonnement à AIOS lui-même. Deux endpoints Stripe
// séparés = deux secrets séparés, pour ne jamais mélanger les deux flux.
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_PLATFORM_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe plateforme non configuré (STRIPE_PLATFORM_WEBHOOK_SECRET manquant)." },
      { status: 501 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature ?? "", webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { error: `Signature invalide : ${err instanceof Error ? err.message : "erreur inconnue"}` },
      { status: 400 }
    );
  }

  if (
    event.type !== "customer.subscription.created" &&
    event.type !== "customer.subscription.updated" &&
    event.type !== "customer.subscription.deleted"
  ) {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const subscription = event.data.object as Stripe.Subscription;
  const orgId = subscription.metadata?.orgId;
  if (!orgId) {
    return NextResponse.json({ received: true, warning: "metadata.orgId absent de l'abonnement." });
  }

  const isActive = subscription.status === "active" || subscription.status === "trialing";
  const targetPlan: Plan =
    event.type === "customer.subscription.deleted" || !isActive
      ? "FREE"
      : ((subscription.metadata?.plan as Plan) ?? "PRO");

  await prisma.organization.update({ where: { id: orgId }, data: { plan: targetPlan } });

  return NextResponse.json({ received: true, orgId, plan: targetPlan });
}
