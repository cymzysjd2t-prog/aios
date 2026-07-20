import { NextResponse } from "next/server";
import { prisma } from "@aios/db";
import { requireBusinessAccess, authErrorResponse } from "@/lib/authz";
import { exchangeLinkedInCode, getLinkedInAuthorUrn } from "@/lib/linkedin";

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const businessId = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${origin}/dashboard/businesses/${businessId}/content?linkedin=error`);
  }
  if (!code || !businessId) {
    return NextResponse.json({ error: "Réponse LinkedIn invalide (code ou state manquant)." }, { status: 400 });
  }

  try {
    await requireBusinessAccess(businessId);
  } catch (err) {
    const mapped = authErrorResponse(err);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    throw err;
  }

  try {
    const redirectUri = `${origin}/api/integrations/linkedin/callback`;
    const { accessToken, expiresInSeconds } = await exchangeLinkedInCode(code, redirectUri);
    const authorUrn = await getLinkedInAuthorUrn(accessToken);

    await prisma.business.update({
      where: { id: businessId },
      data: {
        linkedinAccessToken: accessToken,
        linkedinAccessTokenExpiresAt: new Date(Date.now() + expiresInSeconds * 1000),
        linkedinAuthorUrn: authorUrn,
      },
    });

    return NextResponse.redirect(`${origin}/dashboard/businesses/${businessId}/content?linkedin=connected`);
  } catch (err) {
    console.error("[linkedin] callback error", err);
    return NextResponse.redirect(`${origin}/dashboard/businesses/${businessId}/content?linkedin=error`);
  }
}