import { prisma } from "@aios/db";

export async function buildSystemPrompt(agentInstanceId: string): Promise<string> {
  const instance = await prisma.agentInstance.findUniqueOrThrow({
    where: { id: agentInstanceId },
    include: { definition: true, business: true },
  });

  const recentMemory = await prisma.agentMemory.findMany({
    where: { agentId: agentInstanceId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const projectCount = await prisma.project.count({ where: { businessId: instance.businessId } });
  const genesisInstruction =
    projectCount === 0 && instance.definition.role === "CEO"
      ? "\nCette entreprise vient d'être créée et n'a encore ni plan ni projet. Ta toute première " +
        "action doit être d'appeler l'outil create_business_plan à partir du pitch reçu, avant toute " +
        "autre action."
      : "";

  const memoryBlock = recentMemory.length
    ? recentMemory
        .reverse()
        .map((m) => `- [${m.kind}] ${m.content}`)
        .join("\n")
    : "(aucune mémoire enregistrée pour l'instant)";

  const knowledgeBlock =
    instance.definition.role === "SUPPORT"
      ? await (async () => {
          const articles = await prisma.knowledgeArticle.findMany({
            where: { businessId: instance.businessId },
            orderBy: { createdAt: "desc" },
            take: 5,
          });
          if (articles.length === 0) return "";
          return (
            "\n\nBase de connaissances disponible :\n" +
            articles.map((a) => `### ${a.title}\n${a.content}`).join("\n\n")
          );
        })()
      : "";

  return [
    instance.definition.systemPrompt,
    genesisInstruction,
    knowledgeBlock,
    "",
    `Entreprise : ${instance.business.name}${instance.business.pitch ? " — " + instance.business.pitch : ""}`,
    "",
    "Mémoire des échanges et décisions précédentes :",
    memoryBlock,
    "",
    "Réponds de façon concise et actionnable. Utilise les outils disponibles quand une action concrète est nécessaire plutôt que de simplement la décrire en texte.",
  ].join("\n");
}
