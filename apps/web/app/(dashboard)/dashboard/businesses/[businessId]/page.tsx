import { prisma } from "@aios/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FileText, LifeBuoy, Handshake, Workflow as WorkflowIcon } from "lucide-react";
import { AgentRail } from "@/components/agent-rail";
import { RunAgentForm } from "@/components/run-agent-form";
import { ProjectsTable } from "@/components/projects-table";
import { ActivityFeed } from "@/components/activity-feed";
import { KpiCards } from "@/components/kpi-cards";
import { UpdateKpisForm } from "@/components/update-kpis-form";

export default async function BusinessDashboardPage({
  params,
}: {
  params: { businessId: string };
}) {
  const business = await prisma.business.findUnique({ where: { id: params.businessId } });
  if (!business) notFound();

  const contentCount = await prisma.contentPiece.count({ where: { businessId: business.id } });
  const escalatedCount = await prisma.supportTicket.count({
    where: { businessId: business.id, status: "ESCALATED" },
  });
  const qualifiedLeadCount = await prisma.lead.count({
    where: { businessId: business.id, status: "QUALIFIED" },
  });
  const activeWorkflowCount = await prisma.workflow.count({
    where: { businessId: business.id, isActive: true },
  });

  const branding = business.branding as {
    targetAudience?: string;
    competitors?: string[] | string;
    businessModel?: string;
    primaryColor?: string;
    tone?: string;
  } | null;

  // Défense en profondeur : certaines entrées historiques ont pu stocker competitors
  // comme une chaîne simple plutôt qu'une liste (avant durcissement de la validation).
  const competitorsList: string[] = Array.isArray(branding?.competitors)
    ? branding!.competitors
    : branding?.competitors
      ? [branding.competitors]
      : [];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-medium text-primary">{business.name}</h1>
        <p className="text-sm text-secondary">
          {business.pitch ?? "Le plan business n'a pas encore été généré — le CEO Agent y travaille."}
        </p>
      </div>

      {branding && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {branding.targetAudience && (
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs text-muted">Public cible</p>
              <p className="mt-1 text-sm text-primary">{branding.targetAudience}</p>
            </div>
          )}
          {branding.businessModel && (
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs text-muted">Modèle économique</p>
              <p className="mt-1 text-sm text-primary">{branding.businessModel}</p>
            </div>
          )}
          {competitorsList.length > 0 && (
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs text-muted">Concurrents identifiés</p>
              <p className="mt-1 text-sm text-primary">{competitorsList.join(", ")}</p>
            </div>
          )}
        </div>
      )}

      <Link
        href={`/dashboard/businesses/${business.id}/automation`}
        className="flex items-center justify-between rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong"
      >
        <div className="flex items-center gap-3">
          <WorkflowIcon className="h-4 w-4 text-accent" strokeWidth={1.75} />
          <span className="text-sm text-primary">Automatisation</span>
        </div>
        <span className="text-sm text-secondary">{activeWorkflowCount} workflow{activeWorkflowCount !== 1 ? "s" : ""} actif{activeWorkflowCount !== 1 ? "s" : ""} →</span>
      </Link>

      <Link
        href={`/dashboard/businesses/${business.id}/sales`}
        className="flex items-center justify-between rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong"
      >
        <div className="flex items-center gap-3">
          <Handshake className="h-4 w-4 text-accent" strokeWidth={1.75} />
          <span className="text-sm text-primary">Pipeline commercial</span>
        </div>
        <span className="text-sm text-secondary">
          {qualifiedLeadCount > 0 ? (
            <span className="text-agent-running">{qualifiedLeadCount} qualifié{qualifiedLeadCount > 1 ? "s" : ""} →</span>
          ) : (
            "→"
          )}
        </span>
      </Link>

      <Link
        href={`/dashboard/businesses/${business.id}/support`}
        className="flex items-center justify-between rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong"
      >
        <div className="flex items-center gap-3">
          <LifeBuoy className="h-4 w-4 text-accent" strokeWidth={1.75} />
          <span className="text-sm text-primary">Support client</span>
        </div>
        <span className="text-sm text-secondary">
          {escalatedCount > 0 ? (
            <span className="text-warning">{escalatedCount} à valider →</span>
          ) : (
            "→"
          )}
        </span>
      </Link>

      <Link
        href={`/dashboard/businesses/${business.id}/content`}
        className="flex items-center justify-between rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong"
      >
        <div className="flex items-center gap-3">
          <FileText className="h-4 w-4 text-accent" strokeWidth={1.75} />
          <span className="text-sm text-primary">Contenu marketing généré</span>
        </div>
        <span className="text-sm text-secondary">{contentCount} pièce{contentCount !== 1 ? "s" : ""} →</span>
      </Link>

      <RunAgentForm businessId={business.id} />

      <KpiCards businessId={business.id} />

      <UpdateKpisForm businessId={business.id} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <ProjectsTable businessId={business.id} />
          <ActivityFeed businessId={business.id} />
        </div>
        <AgentRail businessId={business.id} />
      </div>
    </div>
  );
}