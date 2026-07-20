import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { prisma } from "@aios/db";
import { getOrCreateOrganization } from "@/lib/tenant";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot } from "lucide-react";

const statusVariant: Record<string, "default" | "success" | "warning" | "danger"> = {
  IDLE: "default",
  RUNNING: "success",
  WAITING_APPROVAL: "warning",
  ERROR: "danger",
};

const statusLabel: Record<string, string> = {
  IDLE: "Inactif",
  RUNNING: "En cours",
  WAITING_APPROVAL: "Attend validation",
  ERROR: "Erreur",
};

export default async function AgentsPage() {
  const { userId } = auth();
  if (!userId) return null;

  const org = await getOrCreateOrganization(userId);
  const agents = await prisma.agentInstance.findMany({
    where: { business: { orgId: org.id } },
    include: {
      definition: true,
      business: true,
      runs: { orderBy: { startedAt: "desc" }, take: 1 },
      _count: { select: { runs: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-medium text-primary">Agents</h1>
        <p className="text-sm text-secondary">
          Tous les agents déployés dans tes entreprises. Pour en déployer de nouveaux, va dans la
          Marketplace.
        </p>
      </div>

      {agents.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <Bot className="h-8 w-8 text-muted" strokeWidth={1.5} />
          <p className="text-sm text-secondary">
            Aucun agent déployé.{" "}
            <Link href="/dashboard/new" className="text-accent hover:underline">
              Crée une entreprise
            </Link>{" "}
            pour lancer ta première équipe IA.
          </p>
        </Card>
      ) : (
        <Card className="p-0">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="px-5 py-3 font-normal">Agent</th>
                <th className="px-5 py-3 font-normal">Entreprise</th>
                <th className="px-5 py-3 font-normal">Statut</th>
                <th className="px-5 py-3 font-normal">Runs</th>
                <th className="px-5 py-3 font-normal">Budget consommé</th>
                <th className="px-5 py-3 font-normal">Dernière activité</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-5 py-3">
                    <p className="text-primary">{a.definition.name}</p>
                    <p className="text-[11px] uppercase tracking-wide text-muted">{a.definition.role}</p>
                  </td>
                  <td className="px-5 py-3 text-secondary">
                    <Link
                      href={`/dashboard/businesses/${a.businessId}`}
                      className="hover:text-primary hover:underline"
                    >
                      {a.business.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={statusVariant[a.status]}>{statusLabel[a.status]}</Badge>
                  </td>
                  <td className="px-5 py-3 font-mono text-secondary">{a._count.runs}</td>
                  <td className="px-5 py-3 font-mono text-secondary">{a.budgetUsedUsd.toFixed(3)} $</td>
                  <td className="max-w-xs truncate px-5 py-3 text-xs text-muted">
                    {(a.runs[0]?.input as { goal?: string } | undefined)?.goal ?? (a.runs[0] ? "—" : "Jamais exécuté")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}