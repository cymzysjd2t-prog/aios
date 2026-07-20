import { prisma } from "@aios/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const DEMO_BUSINESS_ID = "demo-business";

const typeLabel: Record<string, string> = {
  WEB_APP: "Application web",
  MOBILE_APP: "Application mobile",
  CHROME_EXT: "Extension Chrome",
  DISCORD_BOT: "Bot Discord",
  TELEGRAM_BOT: "Bot Telegram",
  API: "API",
  AUTOMATION: "Automatisation",
};

const statusVariant: Record<string, "success" | "warning" | "default"> = {
  "En cours": "success",
  "En revue": "warning",
  Terminé: "default",
};

export async function ProjectsTable({ businessId = DEMO_BUSINESS_ID }: { businessId?: string }) {
  const projects = await prisma.project.findMany({
    where: { businessId },
    include: { _count: { select: { tasks: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <Card className="p-0">
      <div className="flex items-center justify-between px-5 py-4">
        <h3 className="font-display text-sm font-medium text-primary">Projets actifs</h3>
      </div>

      {projects.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-muted">
          Aucun projet pour l&apos;instant. Donne un objectif à ton équipe pour lancer le premier.
        </p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-t border-border text-left text-xs text-muted">
              <th className="px-5 py-2 font-normal">Projet</th>
              <th className="px-5 py-2 font-normal">Type</th>
              <th className="px-5 py-2 font-normal">Statut</th>
              <th className="px-5 py-2 font-normal">Tâches</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-5 py-3 text-primary">{p.name}</td>
                <td className="px-5 py-3 text-secondary">{typeLabel[p.type] ?? p.type}</td>
                <td className="px-5 py-3">
                  <Badge variant={statusVariant[p.status] ?? "default"}>{p.status}</Badge>
                </td>
                <td className="px-5 py-3 text-secondary">{p._count.tasks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
