import { z } from "zod";

/**
 * Le modèle peut renvoyer un input d'outil malformé (champ manquant, type inattendu, enum hors
 * liste). Sans validation, ça provoque une erreur Prisma opaque au milieu d'un run. Ces schémas
 * valident l'input AVANT toute écriture en base et produisent un message d'erreur clair.
 * On ne valide que les outils qui écrivent des données structurées ; les outils libres
 * (record_decision, delegate_to_agent) n'en ont pas besoin.
 */
export const TOOL_INPUT_SCHEMAS: Record<string, z.ZodTypeAny> = {
  qualify_lead: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    company: z.string().optional(),
    status: z.enum(["NEW", "QUALIFIED", "CONTACTED", "WON", "LOST"]),
    score: z.number().int().min(0).max(100),
    notes: z.string().optional(),
  }),

  respond_to_ticket: z.object({
    ticketId: z.string().min(1),
    response: z.string().min(1),
    escalate: z.boolean(),
  }),

  generate_content: z.object({
    type: z.enum(["SEO_ARTICLE", "LINKEDIN_POST", "TWEET", "EMAIL"]),
    title: z.string().min(1),
    body: z.string().min(1),
  }),

  create_business_plan: z.object({
    positioning: z.string().min(1),
    targetAudience: z.string().min(1),
    competitors: z.array(z.string()).optional(),
    businessModel: z.string().min(1),
    brandPrimaryColor: z.string().optional(),
    brandTone: z.string().optional(),
    roadmap: z.array(z.object({ title: z.string().min(1) })).min(1),
    deployRoles: z.array(z.string()).optional(),
  }),

  open_pull_request: z.object({
    projectId: z.string().min(1),
    branch: z.string().min(1),
    title: z.string().min(1),
    body: z.string(),
    files: z.array(z.object({ path: z.string().min(1), content: z.string() })).min(1),
  }),

  create_task: z.object({
    title: z.string().min(1),
    assignedRole: z.string().optional(),
    priority: z.number().int().min(0).max(5).optional(),
  }),
};

/** Valide l'input d'un outil. Renvoie { ok: true } ou { ok: false, error } — ne lève jamais. */
export function validateToolInput(
  toolName: string,
  input: unknown
): { ok: true } | { ok: false; error: string } {
  const schema = TOOL_INPUT_SCHEMAS[toolName];
  if (!schema) return { ok: true };
  const result = schema.safeParse(input);
  if (result.success) return { ok: true };
  if (result.error.issues.length === 0) {
    return { ok: false, error: `Input invalide pour ${toolName}.` };
  }
  const firstIssue = result.error.issues[0]!;
  return {
    ok: false,
    error: `Input invalide pour ${toolName} : ${firstIssue.path.join(".")} — ${firstIssue.message}`,
  };
}