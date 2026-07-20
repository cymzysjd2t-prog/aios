import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { getOrCreateOrganization } from "@/lib/tenant";
import { PLAN_LIMITS } from "@/lib/plans";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function EnvStatus({ label, configured }: { label: string; configured: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-secondary">{label}</span>
      <Badge variant={configured ? "success" : "default"}>{configured ? "Configuré" : "Non configuré"}</Badge>
    </div>
  );
}

export default async function SettingsPage() {
  const { userId } = auth();
  if (!userId) return null;

  const org = await getOrCreateOrganization(userId);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-medium text-primary">Paramètres</h1>
        <p className="text-sm text-secondary">Organisation, intégrations et configuration.</p>
      </div>

      <Card className="flex flex-col gap-3">
        <h2 className="font-display text-sm font-medium text-primary">Organisation</h2>
        <div className="flex items-center justify-between text-sm">
          <span className="text-secondary">Nom</span>
          <span className="text-primary">{org.name}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-secondary">Plan</span>
          <span className="text-primary">{PLAN_LIMITS[org.plan].label}</span>
        </div>
        <Link href="/dashboard/billing" className="text-xs text-accent hover:underline">
          Gérer le plan et la facturation →
        </Link>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-display text-sm font-medium text-primary">Intégrations & clés API</h2>
        <p className="text-xs text-muted">
          Configurées via les variables d&apos;environnement du serveur (`.env`) — voir
          `.env.example` pour la liste complète.
        </p>
        <EnvStatus label="Anthropic (Claude)" configured={Boolean(process.env.ANTHROPIC_API_KEY)} />
        <EnvStatus label="Stripe (paiements plateforme)" configured={Boolean(process.env.STRIPE_SECRET_KEY)} />
        <EnvStatus label="GitHub (PR du Dev Agent)" configured={Boolean(process.env.GITHUB_TOKEN)} />
        <EnvStatus label="Redis (file d'attente des agents)" configured={Boolean(process.env.REDIS_URL)} />
      </Card>

      <Card>
        <h2 className="mb-2 font-display text-sm font-medium text-primary">Compte</h2>
        <p className="text-xs text-secondary">
          Profil, email et sécurité du compte sont gérés via le menu utilisateur (avatar en haut à
          droite), fourni par Clerk.
        </p>
      </Card>
    </div>
  );
}
