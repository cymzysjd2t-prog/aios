"use client";

import { useState } from "react";

export function SubscribeButton({ plan, current }: { plan: "PRO" | "BUSINESS"; current: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur inconnue");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setLoading(false);
    }
  }

  if (current) {
    return (
      <span className="rounded-md border border-agent-running/30 bg-agent-running/10 px-4 py-2 text-center text-sm text-agent-running">
        Plan actuel
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {loading ? "Redirection..." : "Choisir ce plan"}
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.url) window.location.href = data.url;
      else setLoading(false);
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-md border border-border px-4 py-2 text-sm text-secondary transition-colors hover:border-border-strong hover:text-primary disabled:opacity-50"
    >
      {loading ? "Redirection..." : "Gérer mon abonnement"}
    </button>
  );
}
