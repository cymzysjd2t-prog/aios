import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { getOrCreateOrganization } from "@/lib/tenant";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  if (!stripe) {
    return NextResponse.json({ error: "Stripe non configuré." }, { status: 501 });
  }

  const org = await getOrCreateOrganization(userId);
  if (!org.stripeCustomerId) {
    return NextResponse.json({ error: "Aucun abonnement actif à gérer." }, { status: 400 });
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3000";
  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${origin}/dashboard/billing`,
  });

  return NextResponse.json({ url: session.url });
}
