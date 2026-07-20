import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@aios/db";

// Utilise l'API Stripe la plus récente disponible au moment de l'écriture ; à garder synchronisé
// avec la version du SDK dans package.json si Stripe force une migration.
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

async function resolveBusinessId(event: Stripe.Event): Promise<string | null> {
  // Cas 1 — Stripe Connect : l'entreprise a connecté son propre compte Stripe, identifié par
  // `event.account`, qu'on a stocké dans Business.stripeAccountId lors de la connexion.
  if (event.account) {
    const business = await prisma.business.findFirst({ where: { stripeAccountId: event.account } });
    if (business) return business.id;
  }

  // Cas 2 — compte Stripe unique : l'entreprise a mis businessId en metadata de l'objet Stripe
  // (abonnement, facture...) au moment de sa création, à sa charge.
  const obj = event.data.object as { metadata?: Record<string, string> };
  return obj.metadata?.businessId ?? null;
}

export async function POST(req: Request) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Stripe non configuré (STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET manquants)." },
      { status: 501 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature ?? "", process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json(
      { error: `Signature invalide : ${err instanceof Error ? err.message : "erreur inconnue"}` },
      { status: 400 }
    );
  }

  const relevantTypes = ["customer.subscription.created", "customer.subscription.updated"];
  if (!relevantTypes.includes(event.type)) {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const businessId = await resolveBusinessId(event);
  if (!businessId) {
    return NextResponse.json({
      received: true,
      warning: "Impossible de résoudre l'entreprise (ni Business.stripeAccountId, ni metadata.businessId).",
    });
  }

  const subscription = event.data.object as Stripe.Subscription;
  const item = subscription.items.data[0];
  const monthlyAmount = item?.price.unit_amount
    ? (item.price.unit_amount / 100) * (item.quantity ?? 1) * (item.price.recurring?.interval === "year" ? 1 / 12 : 1)
    : 0;

  // Approximation volontaire pour cette phase : on prend le montant du dernier événement reçu
  // comme MRR plutôt que de re-sommer tous les abonnements actifs du compte. Suffisant pour
  // démontrer le branchement réel ; une reconciliation complète interrogerait l'API Stripe
  // pour lister tous les abonnements actifs à chaque événement.
  const date = startOfDay(new Date());
  await prisma.kpiSnapshot.upsert({
    where: { businessId_date: { businessId, date } },
    update: { mrr: monthlyAmount },
    create: { businessId, date, mrr: monthlyAmount },
  });

  return NextResponse.json({ received: true, businessId, mrr: monthlyAmount });
}
