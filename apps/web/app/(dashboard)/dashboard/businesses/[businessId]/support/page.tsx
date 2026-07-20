import { prisma } from "@aios/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HumanReplyForm } from "@/components/human-reply-form";
import { ArrowLeft, LifeBuoy } from "lucide-react";

const statusVariant: Record<string, "default" | "success" | "warning"> = {
  OPEN: "default",
  ANSWERED: "success",
  ESCALATED: "warning",
  RESOLVED: "default",
};

const statusLabel: Record<string, string> = {
  OPEN: "Ouvert",
  ANSWERED: "Répondu",
  ESCALATED: "À valider par un humain",
  RESOLVED: "Résolu",
};

export default async function SupportPage({ params }: { params: { businessId: string } }) {
  const business = await prisma.business.findUnique({ where: { id: params.businessId } });
  if (!business) notFound();

  const tickets = await prisma.supportTicket.findMany({
    where: { businessId: params.businessId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  const escalatedCount = tickets.filter((t) => t.status === "ESCALATED").length;

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
        <h1 className="font-display text-xl font-medium text-primary">Support</h1>
        <p className="text-sm text-secondary">
          {escalatedCount > 0
            ? `${escalatedCount} ticket${escalatedCount > 1 ? "s" : ""} attend${escalatedCount > 1 ? "ent" : ""} ta validation.`
            : "L'Agent Support gère les demandes entrantes."}
        </p>
      </div>

      {tickets.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <LifeBuoy className="h-8 w-8 text-muted" strokeWidth={1.5} />
          <p className="text-sm text-secondary">Aucun ticket pour l&apos;instant.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {tickets.map((ticket) => (
            <Card key={ticket.id}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-display text-sm font-medium text-primary">{ticket.subject}</p>
                  <p className="text-xs text-muted">{ticket.customerEmail}</p>
                </div>
                <Badge variant={statusVariant[ticket.status]}>{statusLabel[ticket.status]}</Badge>
              </div>

              <div className="flex flex-col gap-2 border-t border-border pt-3">
                {ticket.messages
                  .filter((m) => !m.internal || ticket.status === "ESCALATED")
                  .map((m) => (
                    <div key={m.id} className="text-sm">
                      <span
                        className={
                          m.sender === "CUSTOMER"
                            ? "text-secondary"
                            : m.internal
                              ? "text-warning"
                              : "text-primary"
                        }
                      >
                        {m.sender === "CUSTOMER" ? "Client" : m.sender === "HUMAN" ? "Toi" : "Agent Support"}
                        {m.internal ? " (note interne)" : ""} :
                      </span>{" "}
                      <span className="text-secondary">{m.body}</span>
                    </div>
                  ))}
              </div>

              {ticket.status === "ESCALATED" && <HumanReplyForm ticketId={ticket.id} />}
            </Card>
          ))}
        </div>
      )}

      <Card>
        <p className="text-xs text-muted">
          Lien à partager avec tes clients pour soumettre un ticket :{" "}
          <span className="font-mono text-secondary">/support/{business.id}</span>
        </p>
      </Card>
    </div>
  );
}
