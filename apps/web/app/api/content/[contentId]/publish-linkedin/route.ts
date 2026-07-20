import { NextResponse } from "next/server";
import { prisma } from "@aios/db";
import { requireOrg, authErrorResponse } from "@/lib/authz";
import { publishToLinkedIn } from "@/lib/linkedin";

export async function POST(_req: Request, { params }: { params: { contentId: string } }) {
  try {
    const { org } = await requireOrg();

    const content = await prisma.contentPiece.findUnique({
      where: { id: params.contentId },
      include: { business: true },
    });

    if (!content || content.business.orgId !== org.id) {
      return NextResponse.json({ error: "Contenu introuvable." }, { status: 404 });
    }
    if (content.type !== "LINKEDIN_POST") {
      return NextResponse.json({ error: "Seuls les posts LinkedIn peuvent être publiés ainsi." }, { status: 400 });
    }
    if (!content.business.linkedinAccessToken || !content.business.linkedinAuthorUrn) {
      return NextResponse.json(
        { error: "LinkedIn n'est pas connecté pour cette entreprise." },
        { status: 400 }
      );
    }
    if (
      content.business.linkedinAccessTokenExpiresAt &&
      content.business.linkedinAccessTokenExpiresAt < new Date()
    ) {
      return NextResponse.json(
        { error: "La connexion LinkedIn a expiré, reconnecte le compte." },
        { status: 400 }
      );
    }

    await publishToLinkedIn({
      accessToken: content.business.linkedinAccessToken,
      authorUrn: content.business.linkedinAuthorUrn,
      text: content.body,
    });

    await prisma.contentPiece.update({ where: { id: content.id }, data: { status: "PUBLISHED" } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const mapped = authErrorResponse(err);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    console.error("[linkedin] publish error", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}