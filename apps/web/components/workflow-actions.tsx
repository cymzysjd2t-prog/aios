"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InstallWorkflowButton({ businessId, templateId }: { businessId: string; templateId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleInstall() {
    setLoading(true);
    try {
      await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, templateId }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleInstall}
      disabled={loading}
      className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
    >
      {loading ? "Installation..." : "Installer"}
    </button>
  );
}

export function ToggleWorkflowButton({ workflowId, isActive }: { workflowId: string; isActive: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      await fetch(`/api/workflows/${workflowId}/toggle`, { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="rounded-md border border-border px-3 py-1.5 text-xs text-secondary transition-colors hover:border-border-strong hover:text-primary disabled:opacity-50"
    >
      {isActive ? "Désactiver" : "Activer"}
    </button>
  );
}
