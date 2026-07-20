import { prisma } from "@aios/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { WORKFLOW_TEMPLATES, type WorkflowAction, type WorkflowTrigger } from "@aios/agent-core";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InstallWorkflowButton, ToggleWorkflowButton } from "@/components/workflow-actions";
import { ArrowLeft, Workflow as WorkflowIcon, Zap } from "lucide-react";

const actionLabel: Record<WorkflowAction["type"], string> = {
  run_agent: "Lance un agent",
  create_task: "Crée une tâche",
  record_decision: "Enregistre une décision",
};

export default async function AutomationPage({ params }: { params: { businessId: string } }) {
  const business = await prisma.business.findUnique({ where: { id: params.businessId } });
  if (!business) notFound();

  const installed = await prisma.workflow.findMany({
    where: { businessId: params.businessId },
    orderBy: { createdAt: "desc" },
    include: { runs: { orderBy: { createdAt: "desc" }, take: 3 } },
  });

  const installedTemplateNames = new Set(installed.map((w) => w.name));
  const availableTemplates = WORKFLOW_TEMPLATES.filter((t) => !installedTemplateNames.has(t.name));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href={`/dashboard/businesses/${business.id}`}
          className="mb-2 inline-flex items-center gap-1.5 text-xs text-secondary hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à {business.name}
        </Link>
        <h1 className="font-display text-xl font-medium text-primary">Automatisation</h1>
        <p className="text-sm text-secondary">
          Déclencheur → conditions → actions. Ces workflows tournent sans qu&apos;un agent n&apos;ait
          besoin d&apos;être relancé manuellement.
        </p>
      </div>

      {installed.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Workflows installés</h2>
          {installed.map((w) => {
            const steps = w.steps as unknown as WorkflowAction[];
            const trigger = w.trigger as unknown as WorkflowTrigger;
            return (
              <Card key={w.id}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <WorkflowIcon className="h-4 w-4 text-accent" strokeWidth={1.75} />
                    <p className="font-display text-sm font-medium text-primary">{w.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={w.isActive ? "success" : "default"}>
                      {w.isActive ? "Actif" : "Désactivé"}
                    </Badge>
                    <ToggleWorkflowButton workflowId={w.id} isActive={w.isActive} />
                  </div>
                </div>
                {trigger.event === "webhook" && trigger.webhookSlug && (
                  <p className="mb-2 rounded-md bg-surface-elevated px-2 py-1.5 font-mono text-xs text-secondary">
                    POST /api/webhooks/custom/{business.id}/{trigger.webhookSlug}
                  </p>
                )}
                <ul className="ml-1 flex flex-col gap-1 text-xs text-secondary">
                  {steps.map((s, i) => (
                    <li key={i}>
                      → {actionLabel[s.type]}
                      {s.type === "create_task" && ` : "${s.title}"`}
                    </li>
                  ))}
                </ul>
                {w.runs.length > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-2 text-xs text-muted">
                    <Zap className="h-3 w-3" />
                    Déclenché {w.runs.length} fois récemment — dernière fois{" "}
                    {new Date(w.runs[0].createdAt).toLocaleString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {availableTemplates.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Catalogue</h2>
          {availableTemplates.map((t) => (
            <Card key={t.id} className="flex items-start justify-between gap-4">
              <div>
                <p className="font-display text-sm font-medium text-primary">{t.name}</p>
                <p className="mt-1 text-xs text-secondary">{t.description}</p>
              </div>
              <InstallWorkflowButton businessId={business.id} templateId={t.id} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
