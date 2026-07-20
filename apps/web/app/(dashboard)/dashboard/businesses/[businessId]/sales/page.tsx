import { prisma } from "@aios/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Handshake } from "lucide-react";

const statusLabel: Record<string, string> = {
  NEW: "Nouveau",
  QUALIFIED: "Qualifié",
  CONTACTED: "Contacté",
  WON: "Gagné",
  LOST: "Perdu",
};

const statusVariant: Record<string, "default" | "success" | "warning" | "danger"> = {
  NEW: "default",
  QUALIFIED: "success",
  CONTACTED: "success",
  WON: "success",
  LOST: "danger",
};

function scoreColor(score: number): string {
  if (score >= 70) return "text-agent-running";
  if (score >= 40) return "text-warning";
  return "text-muted";
}

export default async function SalesPage({ params }: { params: { businessId: string } }) {
  const business = await prisma.business.findUnique({ where: { id: params.businessId } });
  if (!business) notFound();

  const leads = await prisma.lead.findMany({
    where: { businessId: params.businessId },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <Link
          href={`/dashboard/businesses/${business.id}`}
          className="mb-2 inline-flex items-center gap-1.5 text-xs text-secondary hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à {business.name}
        </Link>
        <h1 className="font-display text-xl font-medium text-primary">Pipeline commercial</h1>
        <p className="text-sm text-secondary">Leads qualifiés et priorisés par l&apos;Agent Ventes.</p>
      </div>

      {leads.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <Handshake className="h-8 w-8 text-muted" strokeWidth={1.5} />
          <p className="text-sm text-secondary">Aucun lead pour l&apos;instant.</p>
        </Card>
      ) : (
        <Card className="p-0">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="px-5 py-3 font-normal">Contact</th>
                <th className="px-5 py-3 font-normal">Société</th>
                <th className="px-5 py-3 font-normal">Statut</th>
                <th className="px-5 py-3 font-normal">Score</th>
                <th className="px-5 py-3 font-normal">Note de l&apos;agent</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-t border-border align-top">
                  <td className="px-5 py-3">
                    <p className="text-primary">{lead.name}</p>
                    <p className="text-xs text-muted">{lead.email}</p>
                  </td>
                  <td className="px-5 py-3 text-secondary">{lead.company ?? "—"}</td>
                  <td className="px-5 py-3">
                    <Badge variant={statusVariant[lead.status]}>{statusLabel[lead.status]}</Badge>
                  </td>
                  <td className={`px-5 py-3 font-mono font-medium ${scoreColor(lead.score)}`}>{lead.score}</td>
                  <td className="px-5 py-3 max-w-xs text-secondary">{lead.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card>
        <p className="text-xs text-muted">
          Lien à partager pour recevoir des demandes de démo :{" "}
          <span className="font-mono text-secondary">/leads/{business.id}</span>
        </p>
      </Card>
    </div>
  );
}
