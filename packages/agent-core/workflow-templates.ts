import type { WorkflowTrigger, WorkflowAction } from "./events";

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  steps: WorkflowAction[];
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "lead_won_finance_task",
    name: "Lead gagné → Finance + tâche onboarding",
    description:
      "Quand un lead passe au statut Gagné, l'Agent Finance réévalue le MRR et une tâche " +
      "d'onboarding est créée automatiquement.",
    trigger: { event: "lead.status_changed", conditions: [{ field: "status", equals: "WON" }] },
    steps: [
      {
        type: "record_decision",
        role: "FINANCE",
        content: "Nouveau client gagné : {{name}} ({{company}}). Réévaluer le MRR et l'ARR.",
      },
      { type: "create_task", title: "Envoyer l'email d'onboarding à {{email}} ({{name}})", priority: 4 },
    ],
  },
  {
    id: "ticket_escalated_task",
    name: "Ticket escaladé → tâche prioritaire",
    description: "Chaque ticket nécessitant une validation humaine devient une tâche à traiter en priorité.",
    trigger: { event: "ticket.escalated" },
    steps: [{ type: "create_task", title: "Valider la réponse au ticket #{{ticketId}} — {{subject}}", priority: 5 }],
  },
  {
    id: "content_generated_review",
    name: "Contenu généré → tâche de relecture",
    description: "Chaque contenu produit par le Marketing/SEO Agent génère une tâche de relecture avant publication.",
    trigger: { event: "content.generated" },
    steps: [{ type: "create_task", title: "Relire et publier : {{title}} ({{type}})", priority: 2 }],
  },
  {
    id: "webhook_new_signup",
    name: "Webhook « nouvel inscrit » → tâche d'onboarding",
    description:
      "Déclenché par un appel externe (ex: ton app envoie un POST à chaque inscription). " +
      "Démontre le déclencheur webhook générique, indépendant des outils internes des agents.",
    trigger: { event: "webhook", webhookSlug: "new-signup" },
    steps: [{ type: "create_task", title: "Onboarder le nouvel inscrit : {{email}}", priority: 3 }],
  },
];
