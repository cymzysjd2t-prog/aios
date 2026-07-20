"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export default function NewBusinessPage() {
  const router = useRouter();
  const [pitch, setPitch] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pitch.trim() || status === "sending") return;

    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pitch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur inconnue");
      router.push(`/dashboard/businesses/${data.businessId}`);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-medium text-primary">Nouvelle entreprise</h1>
        <p className="text-sm text-secondary">
          Décris ton idée en une phrase. Le CEO Agent structure le plan business, la marque et la
          feuille de route, puis déploie les premiers agents nécessaires.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm text-secondary">
            <Sparkles className="h-4 w-4 text-accent" strokeWidth={1.75} />
            Ton idée
          </div>
          <textarea
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
            placeholder="Ex : Je veux lancer un SaaS de facturation pour freelances, simple et sans jargon comptable."
            rows={4}
            className="resize-none rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {status === "sending" ? "Création en cours..." : "Créer l'entreprise"}
          </button>
          {error && <p className="text-xs text-danger">{error}</p>}
        </form>
      </Card>

      <p className="text-xs text-muted">
        La structuration se fait en tâche de fond (le CEO Agent tourne dans le worker) — tu seras
        redirigé vers le tableau de bord de l&apos;entreprise, où le plan apparaît en quelques
        secondes une fois généré.
      </p>
    </div>
  );
}
