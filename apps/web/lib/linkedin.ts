const LINKEDIN_API_VERSION = "202601"; // format YYYYMM exigé par l'en-tête Linkedin-Version

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;

export function isLinkedInConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

export function getLinkedInAuthorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    state,
    scope: "openid profile w_member_social",
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

export async function exchangeLinkedInCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; expiresInSeconds: number }> {
  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: CLIENT_ID ?? "",
      client_secret: CLIENT_SECRET ?? "",
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`LinkedIn token exchange failed: ${await res.text()}`);
  const data = await res.json();
  return { accessToken: data.access_token, expiresInSeconds: data.expires_in };
}

/** Récupère l'identifiant du membre connecté (OpenID Connect) pour construire son URN. */
export async function getLinkedInAuthorUrn(accessToken: string): Promise<string> {
  const res = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`LinkedIn userinfo failed: ${await res.text()}`);
  const data = await res.json();
  return `urn:li:person:${data.sub}`;
}

/** Publie un post texte sur le profil personnel connecté. */
export async function publishToLinkedIn(params: {
  accessToken: string;
  authorUrn: string;
  text: string;
}): Promise<void> {
  const res = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": LINKEDIN_API_VERSION,
    },
    body: JSON.stringify({
      author: params.authorUrn,
      commentary: params.text,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
    }),
  });
  if (!res.ok) throw new Error(`Échec de la publication LinkedIn (${res.status}) : ${await res.text()}`);
}