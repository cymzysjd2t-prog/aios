import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { prisma } from "@aios/db";
import { getOrCreateOrganization } from "@/lib/tenant";
import { Card } from "@/components/ui/card";
import { Workflow as WorkflowIcon } from "lucide-react";

export default async function AutomationIndexPage() {
  const { userId } = auth();
  if (!userId) return null;

  const org = await getOrCreateOrganization(userId);
  const businesses = await prisma.business.findMany({
    where: { orgId: org.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { workflows: true } } },
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-medium text-primary">Automatisation</h1>
        <p className="text-sm text-secondary">
          Les workflows sont propres à chaque entreprise. Choisis celle dont tu veux gérer les
          automatisations.
        </p>
      </div>

      {businesses.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <WorkflowIcon className="h-8 w-8 text-muted" strokeWidth={1.5} />
          <p className="text-sm text-secondary">
            Aucune entreprise pour l&apos;instant.{" "}
            <Link href="/dashboard/new" className="text-accent hover:underline">
              Crée ta première entreprise
            </Link>{" "}
            pour installer des workflows.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {businesses.map((b) => (
            <Link key={b.id} href={`/dashboard/businesses/${b.id}/automation`}>
              <Card className="flex items-center justify-between transition-colors hover:border-border-strong">
                <div className="flex items-center gap-3">
                  <WorkflowIcon className="h-4 w-4 text-accent" strokeWidth={1.75} />
                  <span className="text-sm text-primary">{b.name}</span>
                </div>
                <span className="text-sm text-secondary">
                  {b._count.workflows} workflow{b._count.workflows !== 1 ? "s" : ""} →
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}