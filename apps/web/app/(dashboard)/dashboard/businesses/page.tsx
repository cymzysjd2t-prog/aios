import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@aios/db";
import { getOrCreateOrganization } from "@/lib/tenant";
import { Card } from "@/components/ui/card";
import { Plus, Building2 } from "lucide-react";

export default async function BusinessesPage() {
  const { userId } = auth();
  if (!userId) return null;

  const org = await getOrCreateOrganization(userId);
  const businesses = await prisma.business.findMany({
    where: { orgId: org.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { projects: true, agents: true } } },
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-medium text-primary">Mes entreprises</h1>
          <p className="text-sm text-secondary">Chaque entreprise a sa propre équipe d&apos;agents IA.</p>
        </div>
        <Link
          href="/dashboard/new"
          className="flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Nouvelle entreprise
        </Link>
      </div>

      {businesses.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <Building2 className="h-8 w-8 text-muted" strokeWidth={1.5} />
          <p className="text-sm text-secondary">
            Tu n&apos;as pas encore d&apos;entreprise. Décris ton idée pour que ton équipe IA la construise.
          </p>
          <Link
            href="/dashboard/new"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Créer ma première entreprise
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {businesses.map((b) => (
            <Link key={b.id} href={`/dashboard/businesses/${b.id}`}>
              <Card className="h-full transition-colors hover:border-border-strong">
                <p className="font-display text-sm font-medium text-primary">{b.name}</p>
                {b.pitch && <p className="mt-1 line-clamp-2 text-xs text-secondary">{b.pitch}</p>}
                <div className="mt-3 flex gap-3 text-xs text-muted">
                  <span>{b._count.agents} agents</span>
                  <span>{b._count.projects} projets</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
