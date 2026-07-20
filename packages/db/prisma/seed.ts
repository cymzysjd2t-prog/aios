import { PrismaClient } from "@prisma/client";
import { AGENT_DEFINITIONS } from "../../agent-core/definitions";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: "demo-org" },
    update: {},
    create: { id: "demo-org", name: "Acme Inc.", plan: "PRO" },
  });

  const business = await prisma.business.upsert({
    where: { id: "demo-business" },
    update: {},
    create: {
      id: "demo-business",
      orgId: org.id,
      name: "Acme Facturation",
      pitch: "SaaS de facturation pour freelances et petites entreprises",
      branding: { primaryColor: "#6C5CE7" },
    },
  });

  await prisma.project.upsert({
    where: { id: "demo-project" },
    update: {},
    create: {
      id: "demo-project",
      businessId: business.id,
      type: "WEB_APP",
      name: "Facturation SaaS — App web",
      status: "En cours",
    },
  });

  // Crée les 12 définitions d'agents (le "catalogue" — réutilisable par toute entreprise).
  const definitionIds: Record<string, string> = {};
  for (const def of AGENT_DEFINITIONS) {
    const created = await prisma.agentDefinition.upsert({
      where: { id: `def-${def.role.toLowerCase()}` },
      update: { systemPrompt: def.systemPrompt, tools: def.tools, defaultModel: def.defaultModel },
      create: {
        id: `def-${def.role.toLowerCase()}`,
        role: def.role,
        name: def.name,
        systemPrompt: def.systemPrompt,
        tools: def.tools,
        defaultModel: def.defaultModel,
      },
    });
    definitionIds[def.role] = created.id;
  }

  // Phase 6 : CEO, PM et Support sont déployés sur l'entreprise de démo (Support pour tester
  // le flux de tickets sans avoir à passer par create_business_plan).
  for (const role of ["CEO", "PM", "SUPPORT", "SALES"] as const) {
    await prisma.agentInstance.upsert({
      where: { id: `demo-agent-${role.toLowerCase()}` },
      update: {},
      create: {
        id: `demo-agent-${role.toLowerCase()}`,
        businessId: business.id,
        definitionId: definitionIds[role],
        status: "IDLE",
      },
    });
  }

  await prisma.knowledgeArticle.upsert({
    where: { id: "demo-kb-refund" },
    update: {},
    create: {
      id: "demo-kb-refund",
      businessId: business.id,
      title: "Politique de remboursement",
      content:
        "Les remboursements sont possibles sous 14 jours après souscription, sur simple demande. " +
        "Au-delà, chaque cas est étudié individuellement — ne jamais promettre un remboursement " +
        "au client sans validation humaine.",
    },
  });
  await prisma.knowledgeArticle.upsert({
    where: { id: "demo-kb-export" },
    update: {},
    create: {
      id: "demo-kb-export",
      businessId: business.id,
      title: "Export des factures",
      content:
        "Les factures sont exportables en PDF depuis Paramètres > Facturation > Historique. " +
        "L'export CSV groupé est disponible sur les plans Business et Enterprise uniquement.",
    },
  });

  console.log("Seed terminé : organisation, entreprise, 12 définitions d'agents, CEO+PM+Support déployés, base de connaissances.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
