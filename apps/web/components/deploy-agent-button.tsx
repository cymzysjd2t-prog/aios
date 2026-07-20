"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface BusinessOption {
  id: string;
  name: string;
}

export function DeployAgentButton({ role, businesses }: { role: string; businesses: BusinessOption[] }) {
  const router = useRouter();
  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? "");
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleDeploy() {
    if (!businessId) return;
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/agents/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur inconnue");
      setStatus("done");
      router.refresh();
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    }
  }

  if (businesses.length === 0) {
    return <p className="text-xs text-muted">Crée d&apos;abord une entreprise pour déployer cet agent.</p>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <select
          value={businessId}
          onChange={(e) => setBusinessId(e.target.value)}
          className="flex-1 rounded-md border border-border bg-surface-elevated px-2 py-1.5 text-xs text-primary focus:border-accent focus:outline-none"
        >
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleDeploy}
          disabled={status === "sending"}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {status === "sending" ? "..." : status === "done" ? "Déployé ✓" : "Déployer"}
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
