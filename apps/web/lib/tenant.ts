import { prisma } from "@aios/db";

/**
 * Chaque utilisateur Clerk possède exactement une Organization à ce stade (pas encore
 * d'invitation d'équipe multi-membres — prévu par le schéma via Organization, à activer
 * quand la gestion d'équipe sera implémentée).
 */
export async function getOrCreateOrganization(userId: string) {
  return prisma.organization.upsert({
    where: { ownerUserId: userId },
    update: {},
    create: { ownerUserId: userId, name: "Mon organisation" },
  });
}
