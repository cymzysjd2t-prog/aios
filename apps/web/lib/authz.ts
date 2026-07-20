import { auth } from "@clerk/nextjs/server";
import { prisma } from "@aios/db";
import { decideResourceAccess } from "@aios/agent-core";
import { getOrCreateOrganization } from "./tenant";

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

/**
 * Résout l'utilisateur connecté et son organisation, ou lève une AuthorizationError 401.
 * À appeler en tête de toute route authentifiée.
 */
export async function requireOrg() {
  const { userId } = auth();
  if (!userId) throw new AuthorizationError("Non authentifié.", 401);
  const org = await getOrCreateOrganization(userId);
  return { userId, org };
}

/**
 * Vérifie que l'entreprise ciblée appartient bien à l'organisation de l'utilisateur.
 * Empêche qu'un utilisateur agisse sur le businessId d'une autre organisation en le devinant.
 * Lève 401 si non connecté, 404 si l'entreprise n'existe pas ou n'appartient pas à l'org.
 */
export async function requireBusinessAccess(businessId: string) {
  const { org } = await requireOrg();
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  const decision = decideResourceAccess(business, org.id);
  if (!decision.allowed) {
    // 404 plutôt que 403 : ne pas révéler l'existence d'un businessId d'une autre org.
    throw new AuthorizationError("Entreprise introuvable.", decision.status);
  }
  return { org, business: business! };
}

/** Convertit une AuthorizationError en réponse ; à utiliser dans un catch de route. */
export function authErrorResponse(err: unknown): { error: string; status: number } | null {
  if (err instanceof AuthorizationError) {
    return { error: err.message, status: err.status };
  }
  return null;
}
