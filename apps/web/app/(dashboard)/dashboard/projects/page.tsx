import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { prisma } from "@aios/db";
import { getOrCreateOrganization } from "@/lib/tenant";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderKanban } from "lucide-react";

const taskStatusLabel: Record<string, string> = {
  TODO: "À faire",
  IN_PROGRESS: "En cours",
  REVIEW: "En revue",
  DONE: "Terminé",
};

export default async function ProjectsPage() {
  const { userId } = auth();
  if (!userId) return null;

  const org = await getOrCreateOrganization(userId);
  const projects = await prisma.project.findMany({
    where: { business: { orgId: org.id } },
    include: {
      business: true,
      tasks: { orderBy: [{ status: "asc" }, { priority: "desc" }] },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-medium text-primary">Projets</h1>
        <p className="text-sm text-secondary">
          Tous les projets de tes entreprises, avec les tâches créées par les agents.
        </p>
      </div>

      {projects.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <FolderKanban className="h-8 w-8 text-muted" strokeWidth={1.5} />
          <p className="text-sm text-secondary">Aucun projet pour l&apos;instant.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {projects.map((p) => {
            const done = p.tasks.filter((t) => t.status === "DONE").length;
            return (
              <Card key={p.id}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-sm font-medium text-primary">{p.name}</p>
                    <Link
                      href={`/dashboard/businesses/${p.businessId}`}
                      className="text-xs text-muted hover:text-secondary hover:underline"
                    >
                      {p.business.name}
                    </Link>
                  </div>
                  <span className="font-mono text-xs text-secondary">
                    {done}/{p.tasks.length} tâches
                  </span>
                </div>

                {p.tasks.length > 0 && (
                  <ul className="flex flex-col gap-1.5 border-t border-border pt-3">
                    {p.tasks.slice(0, 8).map((t) => (
                      <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className={t.status === "DONE" ? "text-muted line-through" : "text-secondary"}>
                          {t.title}
                        </span>
                        <Badge variant={t.status === "DONE" ? "default" : t.status === "TODO" ? "default" : "success"}>
                          {taskStatusLabel[t.status]}
                        </Badge>
                      </li>
                    ))}
                    {p.tasks.length > 8 && (
                      <li className="text-xs text-muted">+ {p.tasks.length - 8} autres tâches</li>
                    )}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
