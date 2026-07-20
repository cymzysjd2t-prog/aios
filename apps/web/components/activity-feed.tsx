import { prisma } from "@aios/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const DEMO_BUSINESS_ID = "demo-business";

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  return `il y a ${diffD} j`;
}

function describeStep(type: string, payload: unknown): { text: string; variant: "default" | "success" | "warning" } {
  if (type === "tool_call") {
    const p = payload as { name?: string; input?: Record<string, unknown> };
    const labels: Record<string, string> = {
      create_business_plan: "a structuré le plan business",
      delegate_to_agent: `a délégué à l'agent ${(p.input?.role as string) ?? "?"}`,
      create_task: `a créé la tâche « ${(p.input?.title as string) ?? "?"} »`,
      record_decision: "a enregistré une décision en mémoire",
    };
    return { text: labels[p.name ?? ""] ?? `a appelé l'outil ${p.name}`, variant: "success" };
  }
  if (type === "error") {
    const p = payload as { message?: string };
    return { text: `a rencontré une erreur : ${p.message ?? "inconnue"}`, variant: "warning" };
  }
  const p = payload as { text?: string };
  const text = p.text ?? "";
  return { text: text.length > 100 ? text.slice(0, 100) + "..." : text || "a terminé son tour", variant: "default" };
}

export async function ActivityFeed({ businessId = DEMO_BUSINESS_ID }: { businessId?: string }) {
  const steps = await prisma.agentStep.findMany({
    where: { run: { agent: { businessId } } },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { run: { include: { agent: { include: { definition: true } } } } },
  });

  return (
    <Card>
      <h3 className="mb-4 font-display text-sm font-medium text-primary">Activité récente</h3>
      {steps.length === 0 ? (
        <p className="text-sm text-muted">
          Aucune activité pour l&apos;instant. Donne un objectif à ton équipe pour la voir travailler ici.
        </p>
      ) : (
        <ul className="space-y-3">
          {steps.map((step) => {
            const { text, variant } = describeStep(step.type, step.payload);
            return (
              <li key={step.id} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <span className="text-primary">{step.run.agent.definition.name}</span>{" "}
                  <span className="text-secondary">{text}</span>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  {variant === "warning" && <Badge variant="warning">Erreur</Badge>}
                  <span className="whitespace-nowrap text-xs text-muted">
                    {formatRelativeTime(step.createdAt)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
