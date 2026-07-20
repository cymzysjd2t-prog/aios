"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type LiveStatus = "RUNNING" | "IDLE" | "WAITING_APPROVAL" | "ERROR";

interface LiveAgent {
  id: string;
  role: string;
  name: string;
  status: LiveStatus;
  budgetUsedUsd: number;
  lastRun: { status: string; goal: string | null; startedAt: string } | null;
  deployed: boolean;
}

const statusColor: Record<LiveStatus, string> = {
  RUNNING: "bg-agent-running",
  IDLE: "bg-agent-idle",
  WAITING_APPROVAL: "bg-warning",
  ERROR: "bg-agent-error",
};

const statusLabel: Record<LiveStatus, string> = {
  RUNNING: "En cours",
  IDLE: "Inactif",
  WAITING_APPROVAL: "Attend validation",
  ERROR: "Erreur",
};

// Le hiérarchie visuelle suit l'ordre de la chaîne de commande définie dans le brief,
// indépendamment de l'ordre retourné par l'API.
const ROLE_ORDER = [
  "CEO", "PM", "DEV", "DESIGNER", "MARKETING", "SALES",
  "SEO", "SUPPORT", "FINANCE", "LEGAL", "DATA", "AUTOMATION",
];

export function AgentRail({ businessId }: { businessId?: string } = {}) {
  const [agents, setAgents] = useState<LiveAgent[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const url = businessId ? `/api/agents?businessId=${businessId}` : "/api/agents";
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setAgents(data.agents);
      } catch {
        // silencieux : on retentera au prochain intervalle
      }
    }

    load();
    const interval = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [businessId]);

  const sorted = agents
    ? [...agents].sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role))
    : null;

  return (
    <Card className="flex flex-col gap-1">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm font-medium text-primary">Votre équipe IA</h3>
        <span className="text-xs text-muted">
          {sorted ? `${sorted.filter((a) => a.status === "RUNNING").length} actifs` : "…"}
        </span>
      </div>

      {!sorted && <p className="text-xs text-muted">Chargement de l'équipe...</p>}

      <div className="relative flex flex-col">
        {sorted?.map((agent, i) => (
          <div key={agent.id} className="relative flex gap-3 pb-4 last:pb-0">
            {i < sorted.length - 1 && (
              <span className="absolute left-[7px] top-[18px] h-full w-px bg-border-strong" />
            )}

            <span
              className={cn(
                "relative z-10 mt-1.5 h-[15px] w-[15px] flex-shrink-0 rounded-full ring-4 ring-surface",
                agent.deployed ? statusColor[agent.status] : "bg-transparent border border-dashed border-border-strong",
                agent.deployed && agent.status === "RUNNING" && "animate-pulse-dot"
              )}
            />

            <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <div className="min-w-0">
                <p className={cn("truncate text-sm", agent.deployed ? "text-primary" : "text-muted")}>
                  {agent.name}
                </p>
                {agent.deployed && agent.lastRun?.goal ? (
                  <p className="truncate font-mono text-xs text-secondary">{agent.lastRun.goal}</p>
                ) : (
                  <p className="text-xs text-muted">
                    {agent.deployed ? statusLabel[agent.status] : "Non déployé"}
                  </p>
                )}
              </div>
              <span className="flex-shrink-0 text-[11px] uppercase tracking-wide text-muted">
                {agent.role}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
