import type { Plan } from "@aios/db";

export interface PlanLimits {
  label: string;
  priceEur: number | null; // null = sur devis (Enterprise)
  maxBusinesses: number;
  maxAgentsPerBusiness: number;
  maxRunsPerMonth: number;
  /** ID de prix Stripe (mode abonnement). Configuré via env, null pour FREE/ENTERPRISE. */
  stripePriceIdEnv: string | null;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    label: "Freemium",
    priceEur: 0,
    maxBusinesses: 1,
    maxAgentsPerBusiness: 3,
    maxRunsPerMonth: 20,
    stripePriceIdEnv: null,
  },
  PRO: {
    label: "Pro",
    priceEur: 29,
    maxBusinesses: 3,
    maxAgentsPerBusiness: 6,
    maxRunsPerMonth: 200,
    stripePriceIdEnv: "STRIPE_PRICE_PRO",
  },
  BUSINESS: {
    label: "Business",
    priceEur: 99,
    maxBusinesses: 10,
    maxAgentsPerBusiness: 12,
    maxRunsPerMonth: 1000,
    stripePriceIdEnv: "STRIPE_PRICE_BUSINESS",
  },
  ENTERPRISE: {
    label: "Enterprise",
    priceEur: null,
    maxBusinesses: Number.MAX_SAFE_INTEGER,
    maxAgentsPerBusiness: 12,
    maxRunsPerMonth: Number.MAX_SAFE_INTEGER,
    stripePriceIdEnv: null,
  },
};

export function getStripePriceId(plan: Plan): string | null {
  const envKey = PLAN_LIMITS[plan].stripePriceIdEnv;
  return envKey ? (process.env[envKey] ?? null) : null;
}
