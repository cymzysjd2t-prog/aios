import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { prisma } from "@aios/db";
import { getOrCreateOrganization } from "@/lib/tenant";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/copy-button";
import { Megaphone } from "lucide-react";

const typeLabel: Record<string, string> = {
  SEO_ARTICLE: "Article SEO",
  LINKEDIN_POST: "Post LinkedIn",
  TWEET: "Tweet",
  EMAIL: "Email",
};

export default async function MarketingPage() {
  const { userId } = auth();
  if (!userId) return null;

  const org = await getOrCreateOrganization(userId);
  const contents = await prisma.contentPiece.findMany({
    where: { business: { orgId: org.id } },
    include: { business: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-medium text-primary">Marketing</h1>
        <p className="text-sm text-secondary">
          Tout le contenu produit par tes Agents Marketing et SEO, toutes entreprises confondues.
        </p>
      </div>

      {contents.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <Megaphone className="h-8 w-8 text-muted" strokeWidth={1.5} />
          <p className="text-sm text-secondary">
            Aucun contenu généré. Donne un objectif marketing à une de tes équipes (ex : &laquo;
            écris 2 articles SEO sur notre produit &raquo;).
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {contents.map((c) => (
            <Card key={c.id}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge>{typeLabel[c.type] ?? c.type}</Badge>
                  <Link
                    href={`/dashboard/businesses/${c.businessId}/content`}
                    className="text-xs text-muted hover:text-secondary hover:underline"
                  >
                    {c.business.name}
                  </Link>
                </div>
                <CopyButton text={c.body} />
              </div>
              <p className="mb-2 font-display text-sm font-medium text-primary">{c.title}</p>
              <p className="line-clamp-4 whitespace-pre-wrap text-sm text-secondary">{c.body}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
