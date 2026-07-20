import { auth } from "@clerk/nextjs/server";
import { getOrCreateOrganization } from "@/lib/tenant";
import { getOrgUsage } from "@/lib/limits";
import { PLAN_LIMITS } from "@/lib/plans";
import { Card } from "@/components/ui/card";
import { SubscribeButton, ManageSubscriptionButton } from "@/components/billing-actions";
import { Check } from "lucide-react";

function UsageBar({ label, used, max }: { label: string; used: number; max: number }) {
  const unlimited = max >= Number.MAX_SAFE_INTEGER;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / max) * 100));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-secondary">{label}</span>
        <span className="font-mono text-muted">
          {used} / {unlimited ? "∞" : max}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-elevated">
        <div
          className={pct >= 90 ? "h-full bg-danger" : pct >= 70 ? "h-full bg-warning" : "h-full bg-accent"}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function BillingPage() {
  const { userId } = auth();
  if (!userId) return null;

  const org = await getOrCreateOrganization(userId);
  const usage = await getOrgUsage(org.id);

  const plans = (["FREE", "PRO", "BUSINESS", "ENTERPRISE"] as const).map((key) => ({
    key,
    ...PLAN_LIMITS[key],
  }));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-medium text-primary">Facturation</h1>
        <p className="text-sm text-secondary">Ton plan, ton usage, et les options disponibles.</p>
      </div>

      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">Plan actuel</p>
            <p className="font-display text-lg font-medium text-primary">{usage.limits.label}</p>
          </div>
          {org.stripeCustomerId && <ManageSubscriptionButton />}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UsageBar label="Entreprises" used={usage.businesses} max={usage.limits.maxBusinesses} />
          <UsageBar
            label="Exécutions d'agents ce mois-ci"
            used={usage.runsThisMonth}
            max={usage.limits.maxRunsPerMonth}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => (
          <Card key={p.key} className="flex flex-col gap-4">
            <div>
              <p className="font-display text-sm font-medium text-primary">{p.label}</p>
              <p className="mt-1 font-display text-xl text-primary">
                {p.priceEur === null ? "Sur devis" : p.priceEur === 0 ? "Gratuit" : `${p.priceEur} € / mois`}
              </p>
            </div>
            <ul className="flex flex-1 flex-col gap-1.5 text-xs text-secondary">
              <li className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-accent" />
                {p.maxBusinesses >= Number.MAX_SAFE_INTEGER ? "Entreprises illimitées" : `${p.maxBusinesses} entreprise${p.maxBusinesses > 1 ? "s" : ""}`}
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-accent" />
                {p.maxAgentsPerBusiness} agents / entreprise
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-accent" />
                {p.maxRunsPerMonth >= Number.MAX_SAFE_INTEGER ? "Exécutions illimitées" : `${p.maxRunsPerMonth} exécutions / mois`}
              </li>
            </ul>
            {p.key === "PRO" || p.key === "BUSINESS" ? (
              <SubscribeButton plan={p.key} current={usage.plan === p.key} />
            ) : p.key === "ENTERPRISE" ? (
              <a
                href="mailto:sales@aios.example"
                className="rounded-md border border-border px-4 py-2 text-center text-sm text-secondary transition-colors hover:border-border-strong hover:text-primary"
              >
                Nous contacter
              </a>
            ) : usage.plan === "FREE" ? (
              <span className="rounded-md border border-agent-running/30 bg-agent-running/10 px-4 py-2 text-center text-sm text-agent-running">
                Plan actuel
              </span>
            ) : (
              <span className="px-4 py-2 text-center text-xs text-muted">
                Via le portail de facturation
              </span>
            )}
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted">
        Essai gratuit et coupons : configurables directement dans Stripe (trial_period_days sur le
        prix, codes promo sur la session Checkout) sans changement de code.
      </p>
    </div>
  );
}
