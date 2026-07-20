import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { prisma } from "@aios/db";
import { AGENT_DEFINITIONS, WORKFLOW_TEMPLATES } from "@aios/agent-core";
import { getOrCreateOrganization } from "@/lib/tenant";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeployAgentButton } from "@/components/deploy-agent-button";
import { Bot, Workflow as WorkflowIcon } from "lucide-react";

export default async function MarketplacePage() {
  const { userId } = auth();
  if (!userId) return null;

  const org = await getOrCreateOrganization(userId);
  const businesses = await prisma.business.findMany({
    where: { orgId: org.id },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });

  // Pour marquer "déjà déployé partout" : on compte les déploiements par rôle.
  const deployedByRole = await prisma.agentInstance.groupBy({
    by: ["definitionId"],
    where: { business: { orgId: org.id } },
    _count: true,
  });
  const definitions = await prisma.agentDefinition.findMany();
  const deployCountByRole = new Map(
    deployedByRole.map((d) => {
      const def = definitions.find((x) => x.id === d.definitionId);
      return [def?.role ?? "", d._count] as const;
    })
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <div>
        <h1 className="font-display text-xl font-medium text-primary">Marketplace</h1>
        <p className="text-sm text-secondary">
          Déploie de nouveaux agents sur tes entreprises, et installe des workflows d&apos;automatisation.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted">
          <Bot className="h-3.5 w-3.5" /> Agents ({AGENT_DEFINITIONS.length})
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {AGENT_DEFINITIONS.map((def) => {
            const deployCount = deployCountByRole.get(def.role) ?? 0;
            return (
              <Card key={def.role} className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-sm font-medium text-primary">{def.name}</p>
                  {deployCount > 0 && (
                    <Badge variant="success">
                      Déployé ×{deployCount}
                    </Badge>
                  )}
                </div>
                <p className="line-clamp-3 flex-1 text-xs text-secondary">{def.systemPrompt}</p>
                <div className="flex flex-wrap gap-1">
                  {def.tools.map((t) => (
                    <span key={t} className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted">
                      {t}
                    </span>
                  ))}
                </div>
                <DeployAgentButton role={def.role} businesses={businesses} />
              </Card>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted">
          <WorkflowIcon className="h-3.5 w-3.5" /> Workflows ({WORKFLOW_TEMPLATES.length})
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {WORKFLOW_TEMPLATES.map((t) => (
            <Card key={t.id} className="flex flex-col gap-2">
              <p className="font-display text-sm font-medium text-primary">{t.name}</p>
              <p className="flex-1 text-xs text-secondary">{t.description}</p>
              <p className="text-xs text-muted">
                Installation depuis la page{" "}
                <span className="text-secondary">Automatisation</span> de chaque entreprise.
              </p>
            </Card>
          ))}
        </div>
      </section>

      {businesses.length > 0 && (
        <p className="text-xs text-muted">
          Astuce : pour installer un workflow, va sur{" "}
          <Link href={`/dashboard/businesses/${businesses[0].id}/automation`} className="text-accent hover:underline">
            Automatisation
          </Link>{" "}
          de l&apos;entreprise concernée.
        </p>
      )}
    </div>
  );
}
