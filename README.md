# AIOS — AI Business Operating System

## Phase 1 — Fondation
Monorepo, authentification Clerk, shell de dashboard. Voir historique du projet pour le détail.

## Phase 2 — Premier agent fonctionnel de bout en bout ✅

Ce qui est branché maintenant :

- **`packages/llm-router`** — abstraction multi-modèle. Le fournisseur Claude (Anthropic) est
  pleinement implémenté avec function calling ; OpenAI/Gemini/DeepSeek sont des stubs typés,
  prêts à recevoir leur SDK sans toucher au reste du système.
- **`packages/agent-core`** — le framework d'agents :
  - `definitions.ts` : les 12 rôles (CEO, PM, Dev, Designer, Marketing, Sales, SEO, Support,
    Finance, Legal, Data, Automation) avec leur prompt système et leurs outils autorisés.
  - `tools.ts` : 3 outils réels — `delegate_to_agent`, `create_task`, `record_decision` —
    avec exécution en base de données.
  - `prompt.ts` : construit le prompt système à partir de la définition de l'agent + de sa
    mémoire persistante (10 derniers souvenirs).
  - `orchestrator.ts` : exécute un run complet (LLM → outils → mémoire → coût → statut),
    journalise chaque étape dans `AgentStep`.
  - `queue.ts` : file d'attente BullMQ partagée entre l'app web (producteur) et le worker
    (consommateur).
- **`apps/worker`** — process Node autonome qui consomme la file `agent-runs`. C'est ce qui
  permet aux agents de continuer à travailler même après déconnexion de l'utilisateur : le
  CEO Agent peut déléguer au PM Agent, qui s'exécute dans un job séparé, indépendamment de
  toute requête HTTP.
- **API** — `POST /api/agents/run` (déclenche le CEO Agent avec un objectif),
  `GET /api/agents` (statut live de tous les agents, déployés ou non).
- **`AgentRail`** — n'affiche plus de données statiques : interroge `/api/agents` toutes les
  4 secondes et reflète le vrai statut (idle / en cours / erreur) et le dernier objectif traité.

### Démarrage (3 terminaux)

```bash
pnpm install
cp .env.example .env   # DATABASE_URL, REDIS_URL, ANTHROPIC_API_KEY, clés Clerk
pnpm db:generate
pnpm db:migrate
pnpm db:seed            # crée l'entreprise de démo + les 12 définitions + CEO/PM déployés

# Terminal 1 — Redis doit tourner localement (ou pointer vers une instance managée)
redis-server

# Terminal 2 — le worker qui exécute les agents
pnpm worker:dev

# Terminal 3 — l'app web
pnpm dev
```

Va sur `/dashboard`, connecte-toi, et dans "Donnez un objectif au CEO Agent" écris par exemple
*"Prépare le lancement de la v2 de la facturation récurrente"*. Le CEO Agent va :
1. Recevoir l'objectif (job BullMQ, `trigger: user_message`)
2. Appeler Claude avec son prompt système + sa mémoire
3. Déléguer au PM Agent via l'outil `delegate_to_agent` → nouveau job enqueue
4. Le PM Agent découpe l'objectif en tâches (`create_task`) dans le projet actif
5. Chaque étape est visible dans `AgentStep` (table Prisma) et l'`AgentRail` se met à jour

### Simplifications assumées pour cette phase (à faire évoluer)

- **Exécution single-shot** : un agent appelle le LLM une fois, exécute les outils demandés,
  puis termine son run. Pas de boucle ReAct où le résultat d'un outil est renvoyé au modèle
  pour une suite d'actions dans le même run. À ajouter si un agent doit enchaîner plusieurs
  outils de façon conditionnelle dans un même tour.
- **Mémoire par récence, pas par similarité** : les 10 derniers souvenirs sont injectés tels
  quels. Le champ `embedding` (pgvector) est prévu dans le schéma pour une recherche sémantique
  future, mais n'est pas encore utilisé.
- **Entreprise unique en dur** (`demo-business`) : le multi-tenant réel (résolution du business
  actif via l'organisation Clerk de l'utilisateur) arrive avec le Business Creator.
- **Agents non déployés = pas d'instance** : seuls CEO et PM ont un `AgentInstance`. Déléguer
  vers un rôle non déployé est journalisé et ignoré proprement (pas de crash).

## Phase 3 — Business Creator ✅

Le flux "je décris mon idée → l'IA structure tout" est maintenant fonctionnel :

- **Multi-tenant réel** : chaque utilisateur Clerk a sa propre `Organization` (`lib/tenant.ts`,
  résolution par `ownerUserId`). Le schéma Prisma a été mis à jour (`Organization.ownerUserId`).
- **`POST /api/businesses`** : crée la `Business`, déploie son premier `AgentInstance` (CEO), et
  enqueue immédiatement un run avec le pitch de l'utilisateur comme objectif.
- **Nouvel outil `create_business_plan`** : donné uniquement au CEO. `prompt.ts` détecte qu'une
  entreprise n'a encore aucun projet et instruit explicitement le CEO d'appeler cet outil en
  priorité. Son exécution :
  - met à jour `Business.pitch` et `Business.branding` (positionnement, cible, concurrents,
    modèle économique, couleur de marque, ton) ;
  - crée le projet "Lancement" avec les tâches de la roadmap générée ;
  - déploie les `AgentInstance` supplémentaires que le CEO juge nécessaires (`deployRoles`).
- **Pages** : `/dashboard/new` (formulaire de création), `/dashboard/businesses` (liste par
  organisation), `/dashboard/businesses/[businessId]` (tableau de bord réel de l'entreprise —
  `AgentRail`, `RunAgentForm` et `ProjectsTable` acceptent maintenant tous un `businessId`).
- Le tableau de bord `/dashboard` d'origine reste un raccourci vers l'entreprise de démo du seed ;
  il n'est plus le point d'entrée principal une fois qu'on a de vraies entreprises.

### Tester le flux complet

```bash
# Terminaux Redis + worker + web toujours nécessaires (voir Phase 2)
```

Connecte-toi, va dans **Entreprises → Nouvelle entreprise**, écris par exemple *"Je veux lancer un
SaaS de facturation pour freelances"*, valide. Tu es redirigé vers le tableau de bord de
l'entreprise : au bout de quelques secondes (le temps que le worker traite le job), le
positionnement, le public cible, les concurrents et la roadmap apparaissent, et l'`AgentRail`
peut afficher de nouveaux agents déployés (PM, Dev, Marketing...) si le CEO a jugé bon de les
activer.

### Limitation assumée

`create_business_plan` fait confiance à la structuration renvoyée par le modèle sans validation
de schéma stricte (pas de Zod/JSON Schema runtime check pour l'instant) — à ajouter avant mise en
production pour éviter qu'une réponse malformée du modèle ne fasse échouer silencieusement le run.

## Phase 4 — Analytics & activité réelles ✅

Fini les chiffres statiques : le dashboard n'affiche plus que des données réellement stockées.

- **`KpiSnapshot` activé** : `packages/db/prisma/schema.prisma` a gagné une contrainte
  `@@unique([businessId, date])` pour permettre un relevé par jour et par entreprise.
- **`POST /api/kpis`** : upsert le relevé du jour (MRR, ARR, churn, trafic) pour une entreprise.
- **`KpiCards`** (composant serveur) : lit les deux derniers relevés, calcule la variation en %
  entre les deux (le churn est interprété à l'inverse : une baisse est positive), et affiche
  "Agents actifs" à partir d'un vrai comptage `AgentInstance` (running / total) — pas une valeur
  figée. Si aucun relevé n'existe encore, affiche un état vide explicite plutôt que d'inventer
  des chiffres.
- **`UpdateKpisForm`** : saisie manuelle du relevé du jour. C'est volontairement manuel pour
  cette phase — voir la limitation ci-dessous.
- **`ActivityFeed`** (composant serveur) : n'affiche plus 5 lignes inventées, mais les 10
  dernières `AgentStep` réelles de l'entreprise (délégations, tâches créées, décisions
  enregistrées, erreurs), avec un temps relatif calculé et un libellé humain par type d'outil.

### Limitation assumée : pas encore de synchronisation Stripe automatique

Le MRR/ARR de chaque entreprise devrait à terme provenir du compte Stripe **du produit que
l'entreprise construit** (pas du compte Stripe d'AIOS qui facture l'abonnement à la plateforme —
ce sont deux Stripe différents, `Organization.stripeCustomerId` sert au second usage). Une
intégration propre demanderait un flux Stripe Connect (OAuth) par entreprise, hors scope pour
cette phase car impossible à tester sans compte Stripe réel connecté. La saisie manuelle pose la
même structure de données (`KpiSnapshot`) qu'un futur webhook Stripe (`invoice.paid`,
`customer.subscription.updated`) alimenterait automatiquement — brancher ce webhook sur
`POST /api/kpis` en Phase 5+ ne demandera pas de changement de schéma.

## Phase 5 — Marketing AI ✅

Premier agent qui produit un livrable concret, consultable hors du dashboard technique.

- **`ContentPiece`** (nouveau modèle) : type (article SEO, post LinkedIn, tweet, email), titre, corps,
  statut, agent créateur. Un vrai contenu marketing en base, pas une simulation.
- **Nouvel outil `generate_content`**, donné à l'Agent Marketing et à l'Agent SEO : écrit
  directement un `ContentPiece`. Contrairement à `create_task` (qui ne fait que planifier),
  celui-ci produit le livrable fini.
- **`/dashboard/businesses/[businessId]/content`** : liste tout le contenu généré, avec bouton
  copier-coller pour publication manuelle. Accessible depuis un bandeau sur le tableau de bord
  de l'entreprise ("Contenu marketing généré — N pièces").

### Tester

Depuis le tableau de bord d'une entreprise, donne un objectif au CEO Agent du type *"Lance une
campagne de contenu : écris 2 articles SEO sur la facturation récurrente et un post LinkedIn
d'annonce"*. Le CEO va déléguer à l'Agent Marketing (`delegate_to_agent`), qui appellera
`generate_content` pour chaque pièce — visible dans **Contenu marketing** en quelques secondes.

### Limitation assumée

Le contenu est généré en un seul appel LLM par pièce (pas de relecture/itération automatique,
pas de vérification factuelle). Pour de la production réelle, une relecture humaine avant
publication reste nécessaire — c'est d'ailleurs pour ça que le statut par défaut est `DRAFT` et
qu'il n'y a pas encore de bouton "publier" connecté à un vrai canal (LinkedIn, Twitter...).

## Phase 6 — Support AI ✅

Chat de support avec base de connaissances, réponse automatique, et escalade humaine réelle pour
les cas sensibles — pas juste une case cochée dans le prompt système.

- **Nouveaux modèles** : `SupportTicket` (statut OPEN/ANSWERED/ESCALATED/RESOLVED),
  `TicketMessage` (thread avec `sender` CUSTOMER/AGENT/HUMAN et un flag `internal` pour les
  notes non visibles du client), `KnowledgeArticle`.
- **`POST /api/tickets`** (route publique, pas d'auth Clerk — un client n'est pas un utilisateur
  de la plateforme) : crée le ticket et, si un Support Agent est déployé sur l'entreprise,
  enqueue immédiatement un run avec le contenu du ticket dans l'objectif.
- **Nouvel outil `respond_to_ticket`** : deux chemins distincts selon `escalate`.
  - `escalate=false` → le message est créé avec `internal=false`, visible par le client, statut
    `ANSWERED`.
  - `escalate=true` → le message est créé avec `internal=true` : **il n'est jamais exposé au
    client**, seulement à l'équipe humaine via la page interne. Statut `ESCALATED`.
- **Base de connaissances** injectée dans le prompt système du Support Agent uniquement
  (`prompt.ts`) — les 5 derniers articles de l'entreprise sont donnés en contexte avant qu'il
  ne réponde.
- **`/support/[businessId]`** : page publique (hors authentification, ajoutée aux routes
  publiques du middleware) où un client soumet un ticket.
- **`/dashboard/businesses/[businessId]/support`** : vue interne — thread complet par ticket,
  les notes internes des tickets escaladés ne sont visibles qu'ici, et un formulaire permet à un
  humain de répondre directement (`POST /api/tickets/[id]/reply`), ce qui résout le ticket.

### Tester

L'entreprise de démo (`pnpm db:seed`) a déjà un Support Agent déployé et 2 articles de base de
connaissances. Ouvre `/support/demo-business`, envoie un ticket avec un sujet neutre (ex :
"Comment exporter mes factures ?") — l'Agent Support doit répondre directement en s'appuyant sur
la base de connaissances. Envoie-en un second sur un sujet sensible (ex : "Je veux un
remboursement, votre produit ne marche pas") — le ticket doit passer en `ESCALATED` et n'afficher
la note de l'agent que sur `/dashboard/businesses/demo-business/support`, jamais sur la page
publique.

### Limitation assumée

La détection "sensible vs non sensible" repose entièrement sur le jugement du modèle à partir de
son prompt système — pas de règle métier codée en dur (mots-clés, montants, etc.). Pour un usage
en production, une couche de règles explicites en complément du jugement du modèle réduirait le
risque qu'un cas sensible glisse entre les mailles.

## Phase 7 — Sales AI ✅

CRM minimal, mais réel : leads entrants, scoring par l'IA, pipeline consultable.

- **`Lead`** (nouveau modèle) : nom, email (unique par entreprise), société, source, statut
  (NEW/QUALIFIED/CONTACTED/WON/LOST), score 0-100, notes.
- **Nouvel outil `qualify_lead`**, donné à l'Agent Ventes : upsert par email, donc l'agent peut
  rappeler l'outil plus tard pour faire progresser le même lead dans le pipeline (ex: passer de
  QUALIFIED à CONTACTED après une relance).
- **`POST /api/leads`** (route publique) : un visiteur remplit le formulaire de démo, un `Lead`
  est créé, et si un Sales Agent est déployé, un run est enqueue immédiatement pour le qualifier.
- **`/leads/[businessId]`** : page publique "Demander une démo" à mettre sur la landing page de
  l'entreprise.
- **`/dashboard/businesses/[businessId]/sales`** : pipeline trié par score décroissant, avec la
  note de raisonnement de l'agent visible pour chaque lead — pas une boîte noire.
- Le seed déploie maintenant l'Agent Ventes sur l'entreprise de démo.

### Tester

Ouvre `/leads/demo-business`, soumets une démo avec un message qui donne un signal clair
d'intention (budget, taille d'équipe, urgence). L'Agent Ventes qualifie le lead en quelques
secondes — score et note visibles sur `/dashboard/businesses/demo-business/sales`.

## Récapitulatif des agents connectés à un vrai outil

| Rôle | Outil dédié | Résultat visible |
|---|---|---|
| CEO | `create_business_plan` | Page entreprise (branding, roadmap) |
| PM / tous | `create_task` | `ProjectsTable` |
| Marketing / SEO | `generate_content` | `/businesses/[id]/content` |
| Support | `respond_to_ticket` | `/businesses/[id]/support` |
| Ventes | `qualify_lead` | `/businesses/[id]/sales` |
| Tous | `record_decision` | Mémoire de l'agent (injectée dans son prochain prompt) |
| Tous | `delegate_to_agent` | Chaîne de commande (`AgentRail`) |

## Phase 8 — Workflows & Automatisation ✅

Le moteur générique déclencheur → conditions → actions prévu dans le brief initial, branché sur
les événements réels que les phases précédentes produisent déjà.

- **`packages/agent-core/events.ts`** : `emitEvent(businessId, event, payload)` — trouve les
  workflows actifs de l'entreprise qui écoutent cet événement, vérifie leurs conditions
  (égalité stricte sur un champ du payload), exécute leurs actions dans l'ordre, journalise le
  déclenchement dans `WorkflowRun`.
- **3 événements domaine branchés directement dans `tools.ts`** (pas de polling, émission au
  moment exact où l'état change) :
  - `lead.status_changed` — émis à chaque `qualify_lead`.
  - `ticket.escalated` — émis quand `respond_to_ticket` escalade.
  - `content.generated` — émis à chaque `generate_content`.
- **3 types d'actions** : `run_agent` (réutilise `enqueueRoleRun`, le même mécanisme que
  `delegate_to_agent` — extrait dans `dispatch.ts` pour éviter la duplication avec le worker),
  `create_task`, `record_decision` (celui-ci écrit directement en mémoire, sans appel LLM — utile
  pour une action réflexe qui n'a pas besoin de raisonnement).
- **Interpolation `{{champ}}`** dans les titres/contenus à partir du payload de l'événement.
- **`packages/agent-core/workflow-templates.ts`** : catalogue de 3 workflows prêts à installer en
  un clic (`/dashboard/businesses/[id]/automation`) plutôt qu'un éditeur visuel complet — voir
  limitation ci-dessous.

### Tester

Installe le template "Lead gagné → Finance + tâche onboarding" sur l'entreprise de démo, puis
va sur `/dashboard/businesses/demo-business/sales` et fais qualifier un lead en statut WON par
l'Agent Ventes (ou attends qu'il le fasse suite à un lead entrant). Une décision apparaît dans la
mémoire de l'Agent Finance, une tâche d'onboarding apparaît dans `ProjectsTable`, et le workflow
affiche son historique de déclenchement sur la page Automatisation.

### Limitation assumée

Pas d'éditeur visuel de workflow (drag & drop de blocs déclencheur/condition/action) — seulement
un catalogue de templates pré-écrits. Le moteur sous-jacent (JSON générique, conditions,
interpolation) supporte déjà n'importe quelle combinaison ; construire l'éditeur revient à écrire
une UI de composition de JSON, ce qui est un chantier à part entière plutôt qu'une extension
naturelle de cette phase. Documenté plutôt que simulé par une fausse UI qui ne validerait rien.

## Phase 9 — Intégrations externes ✅

Le système sort de sa bulle : Stripe entre, GitHub sort, et n'importe quel service externe peut
déclencher un workflow.

### Stripe → KPIs réels
- **`POST /api/webhooks/stripe`** : vérifie la signature (`STRIPE_WEBHOOK_SECRET`), écoute
  `customer.subscription.created/updated`, et met à jour `KpiSnapshot.mrr` du jour.
- **Résolution de l'entreprise** (deux mécanismes, dans l'ordre) :
  1. **Stripe Connect** : `event.account` → `Business.stripeAccountId` (nouveau champ).
  2. **Metadata** : `metadata.businessId` posé sur l'objet Stripe par l'entreprise elle-même.
- La promesse de la Phase 4 est tenue : le webhook alimente la même structure `KpiSnapshot` que
  la saisie manuelle, sans changement de schéma.
- Approximation assumée (commentée dans le code) : le MRR prend le montant du dernier événement
  reçu plutôt que de re-sommer tous les abonnements actifs — suffisant pour démontrer le
  branchement, une réconciliation complète interrogerait l'API Stripe à chaque événement.

### GitHub → le Dev Agent ouvre de vraies PR
- **`packages/agent-core/integrations/github.ts`** : client REST minimal (fetch, pas de SDK
  lourd) — crée une branche depuis la branche par défaut, commite les fichiers, ouvre la PR.
  Nécessite `GITHUB_TOKEN` avec droits d'écriture.
- **Nouvel outil `open_pull_request`** (Dev Agent) : utilise `Project.repoUrl` comme cible.
  Succès → une tâche DONE avec l'URL de la PR apparaît dans `ProjectsTable`. Échec (pas de
  repoUrl, token manquant, erreur API) → journalisé en `AgentStep` type error, visible dans
  l'`ActivityFeed`, sans faire échouer tout le run.
- Le prompt du Dev Agent a été mis à jour : coder via une PR quand la tâche est assez précise,
  planifier via `create_task` sinon.

### Déclencheur webhook générique
- **`emitEvent`** accepte maintenant l'événement `webhook` + un `webhookSlug` pour distinguer
  plusieurs workflows webhook sur la même entreprise.
- **`POST /api/webhooks/custom/[businessId]/[slug]`** (route publique) : n'importe quel service
  externe peut déclencher un workflow ; le corps JSON devient le payload interpolable
  (`{{email}}`, etc.).
- Nouveau template au catalogue ("Webhook nouvel inscrit → tâche d'onboarding") ; la page
  Automatisation affiche l'URL exacte à appeler pour chaque workflow de type webhook.

### Tester
- **Webhook générique** (sans aucun compte externe) : installe le template webhook, puis
  `curl -X POST http://localhost:3000/api/webhooks/custom/demo-business/new-signup -H "Content-Type: application/json" -d '{"email":"test@exemple.fr"}'`
  → une tâche "Onboarder le nouvel inscrit : test@exemple.fr" apparaît.
- **Stripe** : `stripe listen --forward-to localhost:3000/api/webhooks/stripe` avec la CLI
  Stripe, puis créer un abonnement de test avec `metadata.businessId=demo-business`.
- **GitHub** : renseigner `GITHUB_TOKEN`, mettre un `repoUrl` sur un projet, puis donner au CEO
  un objectif du type "fais ouvrir une PR au Dev Agent qui ajoute un fichier CONTRIBUTING.md".

### Limitation assumée
Le flux OAuth Stripe Connect (bouton "Connecter mon Stripe" qui remplit
`Business.stripeAccountId` automatiquement) n'est pas construit : il exige un compte Stripe
platform réel pour être testé. Le champ existe et le webhook le résout déjà ; seul l'écran de
connexion manque. En attendant, le mécanisme metadata fonctionne avec n'importe quel compte
Stripe standard.

## Phase 10 — Monétisation d'AIOS ✅

Le Stripe *de la plateforme* cette fois (celui de `Organization.stripeCustomerId`), avec des
limites réellement appliquées — pas juste une page de prix décorative.

- **`lib/plans.ts`** : un seul point de vérité pour les 4 plans (Freemium 0 €, Pro 29 €,
  Business 99 €, Enterprise sur devis) et leurs limites (entreprises, agents/entreprise,
  exécutions/mois).
- **`lib/limits.ts`** : `getOrgUsage`, `checkCanCreateBusiness`, `checkCanRunAgent` — messages
  d'erreur explicites renvoyés à l'utilisateur (403), pas des échecs silencieux.
- **Limites appliquées à 3 endroits** :
  - `POST /api/businesses` — nombre d'entreprises + quota de runs (la création déclenche un run).
  - `POST /api/agents/run` — quota d'exécutions mensuel de l'organisation.
  - `create_business_plan` (tools.ts) — plafond d'agents déployables selon le plan, avec un
    commentaire assumant la duplication des valeurs (agent-core ne peut pas importer apps/web).
- **Checkout** : `POST /api/billing/checkout` (customer réutilisé ou créé, metadata orgId+plan
  sur l'abonnement), `POST /api/billing/portal` (gérer/annuler, factures).
- **`POST /api/webhooks/stripe-platform`** : webhook séparé avec son propre secret
  (`STRIPE_PLATFORM_WEBHOOK_SECRET`) — synchronise `Organization.plan`, retombe sur FREE à
  l'annulation. Jamais mélangé avec le webhook des entreprises clientes de la Phase 9.
- **`/dashboard/billing`** : plan actuel, jauges d'usage (couleur selon proximité de la limite),
  grille des 4 plans avec Checkout intégré.
- Essai gratuit et coupons : gérés nativement par Stripe (trial sur le prix, codes promo sur
  Checkout), documenté sur la page plutôt que réimplémenté.

### Tester sans compte Stripe
Les limites fonctionnent sans aucune configuration Stripe : en FREE, crée une entreprise puis
tente d'en créer une deuxième → message de limite explicite. Lance 20 runs → le 21e est refusé.
Pour tester le Checkout : créer deux prix récurrents dans Stripe (test mode), renseigner
`STRIPE_PRICE_PRO` / `STRIPE_PRICE_BUSINESS`, et `stripe listen --forward-to
localhost:3000/api/webhooks/stripe-platform`.

### Limitations assumées
- Les délégations internes entre agents (`agent_delegation`) et les workflows ne comptent pas
  dans le quota mensuel — seuls les runs initiés par l'utilisateur sont comptés. Un plafond
  global côté worker serait la prochaine étape pour borner aussi les chaînes de délégation.
- Le plafond d'agents dans `create_business_plan` duplique les valeurs de `plans.ts` (frontière
  de package) ; à unifier si un package `@aios/config` partagé est créé.

## Phase 11 — Marketplace & pages globales ✅

Chaque lien de la sidebar mène maintenant à une vraie page, alimentée par de vraies données —
plus aucun 404 dans la navigation.

- **`/dashboard/agents`** : tous les agents déployés de l'organisation, avec statut, nombre de
  runs, budget IA consommé et dernier objectif traité.
- **`/dashboard/projects`** : projets et tâches de toutes les entreprises, avec progression
  (tâches terminées / total).
- **`/dashboard/marketing`** : tout le contenu généré, toutes entreprises confondues, avec lien
  vers la vue par entreprise.
- **`/dashboard/analytics`** : vue consolidée — MRR total, coût IA total (somme réelle des
  `budgetUsedUsd`), et tableau par entreprise (MRR, churn, leads, tickets, contenus, coût IA).
- **`/dashboard/marketplace`** : catalogue des 12 agents (prompt, outils, compteur de
  déploiements) avec **déploiement en un clic** sur l'entreprise de son choix via
  `POST /api/agents/deploy` — vérification de propriété (l'entreprise doit appartenir à
  l'organisation de l'utilisateur), de doublon, et de la limite d'agents du plan. Les templates
  de workflows y sont aussi listés (installation depuis la page Automatisation de chaque
  entreprise, où le contexte du businessId est déjà présent).
- **`/dashboard/settings`** : organisation, plan, état des intégrations (détection des variables
  d'environnement configurées), renvoi vers Clerk pour le profil.

### Sécurité notable
Toutes ces pages filtrent par `business: { orgId }` — un utilisateur ne voit jamais les données
d'une autre organisation, et `deploy` vérifie explicitement la propriété de l'entreprise cible.

## Phase 12 — Durcissement production ✅

Correction de la dette accumulée pendant la construction rapide des phases 3-11.

### Autorisation (la dette la plus importante)
- **`lib/authz.ts`** : `requireOrg`, `requireBusinessAccess` (renvoie 404 plutôt que 403 pour ne
  pas révéler l'existence d'un businessId d'une autre organisation), `authErrorResponse`.
- Routes durcies : `POST /api/kpis` et `GET /api/agents` acceptaient auparavant n'importe quel
  `businessId` d'un utilisateur connecté. Elles vérifient maintenant la propriété (l'entreprise
  de démo reste lisible par tous, comme donnée de démonstration partagée).

### Validation des sorties LLM (dette de la Phase 3)
- **`tool-schemas.ts`** : schémas Zod pour chaque outil qui écrit des données structurées.
  `executeTool` valide l'input AVANT toute écriture Prisma ; un input malformé produit une
  `AgentStep` d'erreur claire au lieu d'une exception Prisma opaque au milieu du run.

### Rate limiting sur les routes publiques
- **`lib/rate-limit.ts`** : limiteur Redis fail-open (autorise si Redis indisponible plutôt que
  de bloquer tout le trafic). Appliqué à `/api/tickets` et `/api/leads` (10/min/IP) et
  `/api/webhooks/custom/*` (60/min/IP).

### Tests
- **Vitest** sur les fonctions pures critiques : moteur de conditions de workflow
  (`workflow-logic.test.ts`) et validation d'outils (`tool-schemas.test.ts`) — 15 tests, tous
  verts (`pnpm test`).
- Au passage, `interpolate` et `matchesConditions` ont été extraits dans `workflow-logic.ts`
  (importés par `events.ts` au lieu d'être dupliqués) — plus testable ET moins de duplication.

### Ce qui reste avant une vraie mise en production (honnêtement)
Cette phase réduit le risque mais ne rend pas le projet "prêt pour la prod" au sens strict. Il
resterait notamment : appliquer `requireBusinessAccess` aux quelques routes des phases 3-8 non
revues ici (le helper existe, il faut l'appliquer partout) ; des tests d'intégration avec une
base réelle (les tests actuels couvrent les fonctions pures, pas les chemins Prisma) ; une
boucle ReAct multi-tours pour les agents (toujours single-shot depuis la Phase 2) ; et une revue
de sécurité complète (secrets, CORS, en-têtes). Ces points sont réels et volontairement non
masqués.

## Phase 12.1 — Autorisation complète sur toutes les routes ✅

Suite directe de la Phase 12 : la dette d'autorisation identifiée (routes faisant confiance au
`businessId` reçu) est maintenant soldée. Audit complet des 15 routes API, avec correction des
failles réelles de type IDOR (Insecure Direct Object Reference).

### Failles corrigées
- **`POST /api/agents/run`** : un utilisateur pouvait lancer un run sur l'`agentInstanceId` d'une
  autre organisation (et débiter son quota). Vérifie maintenant la propriété de l'entreprise cible
  et refuse un instanceId qui n'appartient pas à l'org.
- **`POST /api/workflows`** : création de workflow sur n'importe quel businessId → propriété
  vérifiée.
- **`POST /api/workflows/[id]/toggle`** : activation/désactivation d'un workflow d'une autre org
  → charge le workflow avec son entreprise et vérifie l'org.
- **`POST /api/tickets/[id]/reply`** : un utilisateur pouvait répondre au ticket d'une autre
  entreprise → propriété du ticket vérifiée.

### Routes confirmées déjà sûres (audit)
- `POST /api/businesses`, `POST /api/agents/deploy`, `billing/*` : résolvent le businessId depuis
  l'org de l'utilisateur (jamais depuis un input non vérifié) — déjà correct.
- `POST /api/kpis`, `GET /api/agents` : durcies en Phase 12.
- `leads`, `tickets`, `webhooks/*` : publiques par nature (client/service externe ≠ utilisateur),
  protégées par rate limiting + signature Stripe le cas échéant.

### Règle d'autorisation unifiée et testée
- **`packages/agent-core/authz-logic.ts`** : `decideResourceAccess` — la règle "orgId doit
  correspondre, sinon 404 (pas 403, pour ne pas révéler l'existence de la ressource)" est
  maintenant une fonction pure unique, importée par le helper `lib/authz.ts` côté web.
- **4 tests** verrouillent cette politique anti-énumération (`authz-logic.test.ts`).
- Total : **19 tests, tous verts** (`pnpm test`).

### Tableau récapitulatif des routes

| Route | Type | Protection |
|---|---|---|
| `businesses` (POST/GET) | Authentifiée | Résolution via org |
| `agents` (GET) | Authentifiée | `requireBusinessAccess` (sauf démo) |
| `agents/run` | Authentifiée | `requireBusinessAccess` + garde instanceId |
| `agents/deploy` | Authentifiée | Comparaison `business.orgId` |
| `kpis` | Authentifiée | `requireBusinessAccess` |
| `workflows` (POST) | Authentifiée | `requireBusinessAccess` |
| `workflows/[id]/toggle` | Authentifiée | Propriété via `business.orgId` |
| `tickets/[id]/reply` | Authentifiée | Propriété via `business.orgId` |
| `billing/*` | Authentifiée | Résolution via org |
| `leads`, `tickets` (POST) | Publiques | Rate limit |
| `webhooks/custom/*` | Publiques | Rate limit |
| `webhooks/stripe*` | Publiques | Signature Stripe |

## État du projet

12 phases, chacune fonctionnelle et testable, construites de façon incrémentale sur une base
commune (monorepo, orchestrateur d'agents, moteur d'événements). Le système couvre : création
d'entreprise par IA, 12 agents spécialisés avec 7 outils réels, mémoire persistante, exécution
asynchrone (les agents tournent déconnecté), workflows événementiels, intégrations externes
(Stripe, GitHub, webhooks), monétisation avec limites appliquées, et une UI complète sans lien
mort. Les limites assumées sont documentées à chaque phase plutôt que masquées.
