import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { prisma, Plan } from "@aios/db";
import { getOrCreateOrganization } from "@/lib/tenant";
import { getStripePriceId } from "@/lib/plans";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  if (!stripe) {
    return NextResponse.json({ error: "Stripe non configuré (STRIPE_SECRET_KEY manquante)." }, { status: 501 });
  }

  const body = (await req.json()) as { plan?: string };
  const plan = body.plan as Plan;
  if (plan !== "PRO" && plan !== "BUSINESS") {
    return NextResponse.json(
      { error: "Plan invalide. Seuls PRO et BUSINESS passent par Checkout (Enterprise = sur devis)." },
      { status: 400 }
    );
  }

  const priceId = getStripePriceId(plan);
  if (!priceId) {
    return NextResponse.json(
      { error: `Prix Stripe non configuré pour ${plan} (variable STRIPE_PRICE_${plan} manquante).` },
      { status: 501 }
    );
  }

  const org = await getOrCreateOrganization(userId);

  // Réutilise le customer Stripe existant, ou en crée un rattaché à l'organisation.
  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ metadata: { orgId: org.id } });
    customerId = customer.id;
    await prisma.organization.update({ where: { id: org.id }, data: { stripeCustomerId: customerId } });
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { metadata: { orgId: org.id, plan } },
    success_url: `${origin}/dashboard/billing?success=1`,
    cancel_url: `${origin}/dashboard/billing?canceled=1`,
  });

  return NextResponse.json({ url: session.url });
}
