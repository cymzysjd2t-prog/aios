/**
 * Logique d'autorisation pure, extraite pour être testable sans Clerk ni Prisma.
 * La règle centrale : une ressource est accessible si et seulement si son orgId correspond
 * à celui de l'utilisateur. En cas de non-correspondance OU d'absence, on renvoie 404 (et non
 * 403) afin de ne pas révéler l'existence d'une ressource appartenant à une autre organisation.
 */

export interface OwnedResource {
  orgId: string;
}

export type AccessDecision = { allowed: true } | { allowed: false; status: 404 };

export function decideResourceAccess(
  resource: OwnedResource | null | undefined,
  userOrgId: string
): AccessDecision {
  if (!resource || resource.orgId !== userOrgId) {
    return { allowed: false, status: 404 };
  }
  return { allowed: true };
}
