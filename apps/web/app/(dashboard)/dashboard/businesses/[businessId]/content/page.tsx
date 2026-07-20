import { prisma } from "@aios/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/copy-button";
import { ArrowLeft, FileText } from "lucide-react";

const typeLabel: Record<string, string> = {
  SEO_ARTICLE: "Article SEO",
  LINKEDIN_POST: "Post LinkedIn",
  TWEET: "Tweet",
  EMAIL: "Email",
};

export default async function ContentPage({ params }: { params: { businessId: string } }) {
  const business = await prisma.business.findUnique({ where: { id: params.businessId } });
  if (!business) notFound();

  const contents = await prisma.contentPiece.findMany({
    where: { businessId: params.businessId },
    orderBy: { createdAt: "desc" },
  });

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
        <h1 className="font-display text-xl font-medium text-primary">Contenu marketing</h1>
        <p className="text-sm text-secondary">
          Ce que l&apos;Agent Marketing et l&apos;Agent SEO ont produit — à relire avant publication.
        </p>
      </div>

      {contents.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <FileText className="h-8 w-8 text-muted" strokeWidth={1.5} />
          <p className="text-sm text-secondary">
            Aucun contenu généré pour l&apos;instant. Donne un objectif marketing à ton équipe
            depuis le tableau de bord de l&apos;entreprise (ex : &laquo; écris 2 articles SEO sur
            la facturation récurrente &raquo;).
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {contents.map((c) => (
            <Card key={c.id}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge>{typeLabel[c.type] ?? c.type}</Badge>
                  <span className="text-xs text-muted">
                    {new Date(c.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <CopyButton text={c.body} />
              </div>
              <p className="mb-2 font-display text-sm font-medium text-primary">{c.title}</p>
              <p className="whitespace-pre-wrap text-sm text-secondary">{c.body}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
