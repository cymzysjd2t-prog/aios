import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { prisma } from "@aios/db";
import { getOrCreateOrganization } from "@/lib/tenant";
import { Card } from "@/components/ui/card";
import { LineChart } from "lucide-react";

function fmtEuros(v: number | null): string {
  if (v === null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

export default async function AnalyticsPage() {
  const { userId } = auth();
  if (!userId) return null;

  const org = await getOrCreateOrganization(userId);
  const businesses = await prisma.business.findMany({
    where: { orgId: org.id },
    include: {
      kpis: { orderBy: { date: "desc" }, take: 1 },
      agents: { select: { budgetUsedUsd: true } },
      _count: { select: { leads: true, tickets: true, contents: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalMrr = businesses.reduce((sum, b) => sum + (b.kpis[0]?.mrr ?? 0), 0);
  const totalAiCost = businesses.reduce(
    (sum, b) => sum + b.agents.reduce((s, a) => s + a.budgetUsedUsd, 0),
    0
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-medium text-primary">Analytique</h1>
        <p className="text-sm text-secondary">Vue consolidée de toutes tes entreprises.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <p className="text-xs text-secondary">MRR consolidé (derniers relevés)</p>
          <p className="mt-2 font-display text-2xl font-medium text-primary">{fmtEuros(totalMrr)}</p>
        </Card>
        <Card>
          <p className="text-xs text-secondary">Coût IA total (tous agents)</p>
          <p className="mt-2 font-display text-2xl font-medium text-primary">{totalAiCost.toFixed(2)} $</p>
        </Card>
      </div>

      {businesses.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <LineChart className="h-8 w-8 text-muted" strokeWidth={1.5} />
          <p className="text-sm text-secondary">Aucune entreprise à analyser pour l&apos;instant.</p>
        </Card>
      ) : (
        <Card className="p-0">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="px-5 py-3 font-normal">Entreprise</th>
                <th className="px-5 py-3 font-normal">MRR</th>
                <th className="px-5 py-3 font-normal">Churn</th>
                <th className="px-5 py-3 font-normal">Leads</th>
                <th className="px-5 py-3 font-normal">Tickets</th>
                <th className="px-5 py-3 font-normal">Contenus</th>
                <th className="px-5 py-3 font-normal">Coût IA</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((b) => {
                const kpi = b.kpis[0];
                const aiCost = b.agents.reduce((s, a) => s + a.budgetUsedUsd, 0);
                return (
                  <tr key={b.id} className="border-t border-border">
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/businesses/${b.id}`} className="text-primary hover:underline">
                        {b.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-mono text-secondary">{fmtEuros(kpi?.mrr ?? null)}</td>
                    <td className="px-5 py-3 font-mono text-secondary">
                      {kpi?.churn != null ? `${kpi.churn.toFixed(1)} %` : "—"}
                    </td>
                    <td className="px-5 py-3 font-mono text-secondary">{b._count.leads}</td>
                    <td className="px-5 py-3 font-mono text-secondary">{b._count.tickets}</td>
                    <td className="px-5 py-3 font-mono text-secondary">{b._count.contents}</td>
                    <td className="px-5 py-3 font-mono text-secondary">{aiCost.toFixed(3)} $</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <p className="text-xs text-muted">
        Le coût IA est l&apos;estimation cumulée des appels LLM de chaque agent (voir
        `budgetUsedUsd`). Les autres colonnes viennent des derniers relevés KPI et des compteurs
        réels en base.
      </p>
    </div>
  );
}
