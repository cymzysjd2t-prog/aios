import { NextResponse } from "next/server";
import { requireBusinessAccess, authErrorResponse } from "@/lib/authz";
import { getLinkedInAuthorizeUrl, isLinkedInConfigured } from "@/lib/linkedin";

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const businessId = searchParams.get("businessId");

  if (!businessId) {
    return NextResponse.json({ error: "businessId manquant." }, { status: 400 });
  }
  if (!isLinkedInConfigured()) {
    return NextResponse.json(
      { error: "LinkedIn non configuré (LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET manquants)." },
      { status: 501 }
    );
  }

  try {
    await requireBusinessAccess(businessId);
  } catch (err) {
    const mapped = authErrorResponse(err);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    throw err;
  }

  const redirectUri = `${origin}/api/integrations/linkedin/callback`;
  const authorizeUrl = getLinkedInAuthorizeUrl(redirectUri, businessId);

  return NextResponse.redirect(authorizeUrl);
}