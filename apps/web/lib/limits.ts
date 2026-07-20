import { prisma } from "@aios/db";
import { PLAN_LIMITS } from "./plans";

function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export interface OrgUsage {
  plan: keyof typeof PLAN_LIMITS;
  businesses: number;
  runsThisMonth: number;
  limits: (typeof PLAN_LIMITS)[keyof typeof PLAN_LIMITS];
}

export async function getOrgUsage(orgId: string): Promise<OrgUsage> {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
  const limits = PLAN_LIMITS[org.plan];

  const [businesses, runsThisMonth] = await Promise.all([
    prisma.business.count({ where: { orgId } }),
    prisma.agentRun.count({
      where: {
        agent: { business: { orgId } },
        startedAt: { gte: startOfMonth() },
      },
    }),
  ]);

  return { plan: org.plan, businesses, runsThisMonth, limits };
}

/** Renvoie null si autorisé, sinon un message d'erreur explicite à afficher à l'utilisateur. */
export async function checkCanCreateBusiness(orgId: string): Promise<string | null> {
  const usage = await getOrgUsage(orgId);
  if (usage.businesses >= usage.limits.maxBusinesses) {
    return `Limite atteinte : le plan ${usage.limits.label} permet ${usage.limits.maxBusinesses} entreprise(s). Passe à un plan supérieur pour en créer davantage.`;
  }
  return null;
}

/** Renvoie null si autorisé, sinon un message d'erreur explicite. */
export async function checkCanRunAgent(orgId: string): Promise<string | null> {
  const usage = await getOrgUsage(orgId);
  if (usage.runsThisMonth >= usage.limits.maxRunsPerMonth) {
    return `Limite atteinte : le plan ${usage.limits.label} permet ${usage.limits.maxRunsPerMonth} exécutions d'agents par mois. Passe à un plan supérieur pour continuer.`;
  }
  return null;
}
