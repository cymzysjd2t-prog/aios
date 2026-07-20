import { prisma } from "@aios/db";
import { KpiCard } from "@/components/kpi-card";
import { DollarSign, TrendingDown, Globe, Bot } from "lucide-react";

const DEMO_BUSINESS_ID = "demo-business";

function formatEuros(value: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
    value
  );
}

function delta(current: number | null, previous: number | null): { text: string; trend: "up" | "down" | "neutral" } {
  if (current === null || previous === null || previous === 0) return { text: "", trend: "neutral" };
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const sign = pct >= 0 ? "+" : "";
  return { text: `${sign}${pct.toFixed(1)} %`, trend: pct >= 0 ? "up" : "down" };
}

export async function KpiCards({ businessId = DEMO_BUSINESS_ID }: { businessId?: string }) {
  const [snapshots, agentCount, runningCount] = await Promise.all([
    prisma.kpiSnapshot.findMany({
      where: { businessId },
      orderBy: { date: "desc" },
      take: 2,
    }),
    prisma.agentInstance.count({ where: { businessId } }),
    prisma.agentInstance.count({ where: { businessId, status: "RUNNING" } }),
  ]);

  const [latest, previous] = snapshots;

  if (!latest) {
    return (
      <div className="rounded-lg border border-dashed border-border-strong p-5 text-center text-sm text-secondary">
        Aucun relevé de KPI pour l&apos;instant. Ajoute ton premier relevé ci-dessous pour voir
        apparaître MRR, ARR, churn et trafic ici.
      </div>
    );
  }

  const mrrDelta = delta(latest.mrr, previous?.mrr ?? null);
  const arrDelta = delta(latest.arr, previous?.arr ?? null);
  // Pour le churn, une baisse est une bonne nouvelle : on inverse le sens de la tendance.
  const churnDelta = delta(latest.churn, previous?.churn ?? null);
  if (churnDelta.trend !== "neutral") churnDelta.trend = churnDelta.trend === "up" ? "down" : "up";
  const trafficDelta = delta(latest.traffic, previous?.traffic ?? null);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard
        label="MRR"
        value={latest.mrr !== null ? formatEuros(latest.mrr) : "—"}
        delta={mrrDelta.text || undefined}
        trend={mrrDelta.trend}
        icon={DollarSign}
      />
      <KpiCard
        label="ARR"
        value={latest.arr !== null ? formatEuros(latest.arr) : "—"}
        delta={arrDelta.text || undefined}
        trend={arrDelta.trend}
        icon={DollarSign}
      />
      <KpiCard
        label="Churn"
        value={latest.churn !== null ? `${latest.churn.toFixed(1)} %` : "—"}
        delta={churnDelta.text || undefined}
        trend={churnDelta.trend}
        icon={TrendingDown}
      />
      <KpiCard
        label="Trafic"
        value={latest.traffic !== null ? latest.traffic.toLocaleString("fr-FR") : "—"}
        delta={trafficDelta.text || undefined}
        trend={trafficDelta.trend}
        icon={Globe}
      />
      <KpiCard label="Agents actifs" value={`${runningCount} / ${agentCount}`} icon={Bot} />
    </div>
  );
}
