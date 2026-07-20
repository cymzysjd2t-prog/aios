"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export function RunAgentForm({ businessId }: { businessId?: string } = {}) {
  const [goal, setGoal] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "queued" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!goal.trim() || status === "sending") return;

    setStatus("sending");
    try {
      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, businessId }),
      });
      if (!res.ok) throw new Error();
      setStatus("queued");
      setGoal("");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
    }
  }

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" strokeWidth={1.75} />
        <h3 className="font-display text-sm font-medium text-primary">Donnez un objectif au CEO Agent</h3>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Ex : Prépare le lancement de la v2 de la facturation récurrente"
          className="flex-1 rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-primary placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {status === "sending" ? "Envoi..." : "Lancer"}
        </button>
      </form>
      {status === "queued" && (
        <p className="mt-2 text-xs text-agent-running">
          Objectif transmis. Le CEO Agent l'exécute maintenant, même si vous quittez la page.
        </p>
      )}
      {status === "error" && (
        <p className="mt-2 text-xs text-danger">
          Impossible de transmettre l'objectif. Vérifiez que le worker et Redis sont bien lancés.
        </p>
      )}
    </Card>
  );
}
