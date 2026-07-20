import { prisma, AgentRole, TaskStatus, ProjectType } from "@aios/db";
import type { ToolDefinition, ToolCall } from "@aios/llm-router";
import { emitEvent } from "./events";
import { openPullRequest } from "./integrations/github";
import { validateToolInput } from "./tool-schemas";

export const TOOL_REGISTRY: Record<string, ToolDefinition> = {
  open_pull_request: {
    name: "open_pull_request",
    description:
      "Ouvre une vraie pull request sur le dépôt GitHub du projet, avec un ou plusieurs fichiers " +
      "créés ou modifiés. Le dépôt est celui renseigné sur le projet (Project.repoUrl).",
    input_schema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Identifiant du projet dont le repoUrl sera utilisé" },
        branch: { type: "string", description: "Nom de la nouvelle branche, ex: feat/stripe-webhooks" },
        title: { type: "string" },
        body: { type: "string", description: "Description de la PR : quoi, pourquoi, comment tester" },
        files: {
          type: "array",
          items: {
            type: "object",
            properties: { path: { type: "string" }, content: { type: "string" } },
            required: ["path", "content"],
          },
        },
      },
      required: ["projectId", "branch", "title", "body", "files"],
    },
  },
  qualify_lead: {
    name: "qualify_lead",
    description:
      "Qualifie un lead entrant : lui attribue un score de 0 à 100 selon son potentiel, un statut " +
      "de pipeline, et une note expliquant le raisonnement. Peut être appelé plusieurs fois sur le " +
      "même email pour faire progresser un lead dans le pipeline (ex: QUALIFIED → CONTACTED).",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        company: { type: "string" },
        status: { type: "string", enum: ["NEW", "QUALIFIED", "CONTACTED", "WON", "LOST"] },
        score: { type: "integer", minimum: 0, maximum: 100 },
        notes: { type: "string", description: "Raisonnement de qualification, prochaine action recommandée" },
      },
      required: ["name", "email", "status", "score"],
    },
  },
  respond_to_ticket: {
    name: "respond_to_ticket",
    description:
      "Répond à un ticket de support. Si la question est sensible (remboursement, litige, données " +
      "personnelles, ou toute situation où une erreur aurait des conséquences réelles pour le client), " +
      "utilise escalate=true : ta réponse devient alors une note interne pour un humain, jamais envoyée " +
      "telle quelle au client.",
    input_schema: {
      type: "object",
      properties: {
        ticketId: { type: "string", description: "Identifiant du ticket auquel répondre" },
        response: { type: "string", description: "Réponse au client, ou note interne si escalade" },
        escalate: { type: "boolean", description: "true si un humain doit valider avant tout envoi au client" },
      },
      required: ["ticketId", "response", "escalate"],
    },
  },
  generate_content: {
    name: "generate_content",
    description:
      "Produit un livrable de contenu marketing concret (article SEO, post LinkedIn, tweet, email) " +
      "et l'enregistre pour que le fondateur puisse le relire et le publier.",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["SEO_ARTICLE", "LINKEDIN_POST", "TWEET", "EMAIL"] },
        title: { type: "string", description: "Titre ou sujet court du contenu" },
        body: { type: "string", description: "Le contenu complet, prêt à être relu et publié" },
      },
      required: ["type", "title", "body"],
    },
  },
  create_business_plan: {
    name: "create_business_plan",
    description:
      "À utiliser une seule fois, au tout début de la vie d'une entreprise : structure le plan " +
      "business à partir du pitch initial du fondateur, définit l'identité de marque, et lance la " +
      "feuille de route. Déploie aussi les premiers agents spécialisés dont l'entreprise a besoin.",
    input_schema: {
      type: "object",
      properties: {
        positioning: { type: "string", description: "Positionnement en une phrase claire" },
        targetAudience: { type: "string", description: "Public cible principal" },
        competitors: { type: "array", items: { type: "string" }, description: "2 à 4 concurrents identifiés" },
        businessModel: { type: "string", description: "Modèle économique (abonnement, freemium, etc.)" },
        brandPrimaryColor: { type: "string", description: "Couleur de marque principale en hexadécimal, ex: #6C5CE7" },
        brandTone: { type: "string", description: "Ton de marque en 2-3 mots, ex: 'direct, technique, sans jargon'" },
        roadmap: {
          type: "array",
          description: "3 à 6 premières étapes concrètes de la feuille de route",
          items: { type: "object", properties: { title: { type: "string" } }, required: ["title"] },
        },
        deployRoles: {
          type: "array",
          description: "Rôles d'agents à déployer immédiatement en plus du CEO (ex: PM, DEV, MARKETING)",
          items: { type: "string", enum: Object.values(AgentRole) },
        },
      },
      required: ["positioning", "targetAudience", "businessModel", "roadmap"],
    },
  },
  delegate_to_agent: {
    name: "delegate_to_agent",
    description:
      "Délègue une tâche à un autre agent de l'équipe, qui l'exécutera de façon autonome (potentiellement après ta déconnexion).",
    input_schema: {
      type: "object",
      properties: {
        role: {
          type: "string",
          enum: Object.values(AgentRole),
          description: "Rôle de l'agent à qui déléguer",
        },
        instruction: { type: "string", description: "Instruction précise à transmettre à l'agent" },
      },
      required: ["role", "instruction"],
    },
  },
  create_task: {
    name: "create_task",
    description: "Crée une tâche concrète dans le projet actif de l'entreprise, assignable à un agent.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        assignedRole: { type: "string", enum: Object.values(AgentRole) },
        priority: { type: "integer", minimum: 0, maximum: 5 },
      },
      required: ["title"],
    },
  },
  record_decision: {
    name: "record_decision",
    description:
      "Enregistre une décision ou un fait important en mémoire persistante, pour que toi-même (ou un autre agent) t'en souviennes lors d'une future exécution.",
    input_schema: {
      type: "object",
      properties: {
        content: { type: "string", description: "La décision ou le fait à retenir, formulé clairement" },
      },
      required: ["content"],
    },
  },
};

export interface ToolExecutionContext {
  agentInstanceId: string;
  businessId: string;
  runId: string;
  /** Injecté par l'appelant (worker) pour ne pas coupler agent-core à BullMQ directement. */
  enqueueDelegatedRun: (params: {
    role: AgentRole;
    businessId: string;
    instruction: string;
    fromAgentInstanceId: string;
  }) => Promise<void>;
}

/**
 * Exécute un appel d'outil émis par le modèle et journalise l'étape correspondante.
 * Simplification assumée pour cette phase : exécution "single-shot" (pas de boucle
 * ReAct multi-tours où le résultat de l'outil est renvoyé au modèle). À faire évoluer
 * en Phase 3 si des agents ont besoin d'enchaîner plusieurs outils dans un même run.
 */
export async function executeTool(call: ToolCall, ctx: ToolExecutionContext): Promise<void> {
  await prisma.agentStep.create({
    data: { runId: ctx.runId, type: "tool_call", payload: { name: call.name, input: call.input } },
  });

  // Validation défensive de l'input émis par le LLM avant toute écriture en base.
  const validation = validateToolInput(call.name, call.input);
  if (!validation.ok) {
    await prisma.agentStep.create({
      data: { runId: ctx.runId, type: "error", payload: { message: validation.error } },
    });
    return;
  }

  switch (call.name) {
    case "open_pull_request": {
      const project = await prisma.project.findUnique({ where: { id: call.input.projectId as string } });
      if (!project || project.businessId !== ctx.businessId || !project.repoUrl) {
        await prisma.agentStep.create({
          data: {
            runId: ctx.runId,
            type: "error",
            payload: { message: "Projet introuvable ou sans repoUrl configuré pour ouvrir une PR." },
          },
        });
        break;
      }

      try {
        const { url } = await openPullRequest({
          repoUrl: project.repoUrl,
          branch: call.input.branch as string,
          title: call.input.title as string,
          body: call.input.body as string,
          files: (call.input.files as { path: string; content: string }[]) ?? [],
        });
        await prisma.task.create({
          data: {
            projectId: project.id,
            title: `PR ouverte : ${call.input.title} — ${url}`,
            status: TaskStatus.DONE,
            priority: 3,
          },
        });
      } catch (err) {
        await prisma.agentStep.create({
          data: {
            runId: ctx.runId,
            type: "error",
            payload: { message: err instanceof Error ? err.message : "Échec de l'ouverture de la PR." },
          },
        });
      }
      break;
    }

    case "qualify_lead": {
      const email = call.input.email as string;
      await prisma.lead.upsert({
        where: { businessId_email: { businessId: ctx.businessId, email } },
        update: {
          name: call.input.name as string,
          company: (call.input.company as string) ?? undefined,
          status: call.input.status as never,
          score: call.input.score as number,
          notes: (call.input.notes as string) ?? undefined,
        },
        create: {
          businessId: ctx.businessId,
          name: call.input.name as string,
          email,
          company: (call.input.company as string) ?? null,
          status: call.input.status as never,
          score: call.input.score as number,
          notes: (call.input.notes as string) ?? null,
        },
      });
      await emitEvent(ctx.businessId, "lead.status_changed", {
        name: call.input.name,
        email,
        company: call.input.company ?? "",
        status: call.input.status,
        score: call.input.score,
      });
      break;
    }

    case "respond_to_ticket": {
      const ticketId = call.input.ticketId as string;
      const response = call.input.response as string;
      const escalate = Boolean(call.input.escalate);

      const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
      if (!ticket || ticket.businessId !== ctx.businessId) break;

      await prisma.ticketMessage.create({
        data: { ticketId, sender: "AGENT", body: response, internal: escalate },
      });
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: escalate ? "ESCALATED" : "ANSWERED" },
      });
      if (escalate) {
        await emitEvent(ctx.businessId, "ticket.escalated", {
          ticketId,
          subject: ticket.subject,
          customerEmail: ticket.customerEmail,
        });
      }
      break;
    }

    case "generate_content": {
      await prisma.contentPiece.create({
        data: {
          businessId: ctx.businessId,
          type: call.input.type as never,
          title: call.input.title as string,
          body: call.input.body as string,
          createdByAgentId: ctx.agentInstanceId,
        },
      });
      await emitEvent(ctx.businessId, "content.generated", {
        type: call.input.type,
        title: call.input.title,
      });
      break;
    }

    case "create_business_plan": {
      const roadmap = (call.input.roadmap as { title: string }[]) ?? [];
      const deployRoles = (call.input.deployRoles as string[]) ?? [];

      await prisma.business.update({
        where: { id: ctx.businessId },
        data: {
          pitch: call.input.positioning as string,
          branding: {
            targetAudience: call.input.targetAudience,
            competitors: call.input.competitors ?? [],
            businessModel: call.input.businessModel,
            primaryColor: call.input.brandPrimaryColor ?? "#6C5CE7",
            tone: call.input.brandTone ?? null,
          },
        },
      });

      await prisma.project.create({
        data: {
          businessId: ctx.businessId,
          type: ProjectType.WEB_APP,
          name: "Lancement",
          status: "En cours",
          tasks: {
            create: roadmap.map((item, i) => ({
              title: item.title,
              status: TaskStatus.TODO,
              priority: roadmap.length - i,
            })),
          },
        },
      });

      // Limites de plan : plafonne le nombre d'agents déployables sur cette entreprise.
      // Dupliqué volontairement ici (agent-core ne dépend pas de apps/web/lib) — la source de
      // vérité côté UI/API reste apps/web/lib/plans.ts ; garder les deux synchronisés.
      const orgForLimits = await prisma.business.findUnique({
        where: { id: ctx.businessId },
        include: { org: true },
      });
      const maxAgents: Record<string, number> = { FREE: 3, PRO: 6, BUSINESS: 12, ENTERPRISE: 12 };
      const agentCap = maxAgents[orgForLimits?.org.plan ?? "FREE"] ?? 3;

      for (const role of deployRoles) {
        const currentCount = await prisma.agentInstance.count({ where: { businessId: ctx.businessId } });
        if (currentCount >= agentCap) break;

        const definition = await prisma.agentDefinition.findFirst({ where: { role: role as AgentRole } });
        if (!definition) continue;
        const existing = await prisma.agentInstance.findFirst({
          where: { businessId: ctx.businessId, definitionId: definition.id },
        });
        if (!existing) {
          await prisma.agentInstance.create({
            data: { businessId: ctx.businessId, definitionId: definition.id, status: "IDLE" },
          });
        }
      }
      break;
    }

    case "delegate_to_agent": {
      const role = call.input.role as AgentRole;
      const instruction = call.input.instruction as string;
      await ctx.enqueueDelegatedRun({
        role,
        businessId: ctx.businessId,
        instruction,
        fromAgentInstanceId: ctx.agentInstanceId,
      });
      break;
    }

    case "create_task": {
      const project = await prisma.project.findFirst({ where: { businessId: ctx.businessId } });
      if (project) {
        await prisma.task.create({
          data: {
            projectId: project.id,
            title: call.input.title as string,
            status: TaskStatus.TODO,
            priority: (call.input.priority as number) ?? 0,
          },
        });
      }
      break;
    }

    case "record_decision": {
      await prisma.agentMemory.create({
        data: {
          agentId: ctx.agentInstanceId,
          kind: "DECISION",
          content: call.input.content as string,
        },
      });
      break;
    }

    default:
      // Outil inconnu : on journalise déjà l'appel ci-dessus, rien de plus à faire.
      break;
  }
}
