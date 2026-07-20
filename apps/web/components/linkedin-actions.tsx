"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Linkedin } from "lucide-react";

export function ConnectLinkedInButton({ businessId }: { businessId: string }) {
  return (
    
      href={`/api/integrations/linkedin/connect?businessId=${businessId}`}
      className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs text-secondary transition-colors hover:border-border-strong hover:text-primary"
    >
      <Linkedin className="h-3.5 w-3.5" />
      Connecter LinkedIn
    </a>
  );
}

export function PublishLinkedInButton({ contentId }: { contentId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handlePublish() {
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch(`/api/content/${contentId}/publish-linkedin`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur inconnue");
      router.refresh();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      return;
    }
    setStatus("idle");
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handlePublish}
        disabled={status === "sending"}
        className="flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        <Linkedin className="h-3.5 w-3.5" />
        {status === "sending" ? "Publication..." : "Publier sur LinkedIn"}
      </button>
      {error && <p className="max-w-[220px] text-right text-[11px] text-danger">{error}</p>}
    </div>
  );
}