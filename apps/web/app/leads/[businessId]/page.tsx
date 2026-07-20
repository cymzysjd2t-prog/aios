"use client";

import { useState } from "react";
import { Handshake } from "lucide-react";

export default function PublicLeadPage({ params }: { params: { businessId: string } }) {
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: params.businessId, ...form }),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-base px-6">
        <div className="max-w-md rounded-lg border border-border bg-surface p-6 text-center">
          <Handshake className="mx-auto mb-3 h-8 w-8 text-accent" strokeWidth={1.5} />
          <p className="font-display text-sm font-medium text-primary">Merci !</p>
          <p className="mt-2 text-sm text-secondary">Quelqu&apos;un de l&apos;équipe te recontacte très vite.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-base px-6">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-border bg-surface p-6"
      >
        <div className="flex items-center gap-2">
          <Handshake className="h-4 w-4 text-accent" strokeWidth={1.75} />
          <h1 className="font-display text-sm font-medium text-primary">Demander une démo</h1>
        </div>

        <label className="flex flex-col gap-1 text-xs text-secondary">
          Nom
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-secondary">
          Email professionnel
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-secondary">
          Société
          <input
            type="text"
            value={form.company}
            onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            className="rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-secondary">
          Ton besoin
          <textarea
            rows={3}
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            className="resize-none rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none"
          />
        </label>

        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {status === "sending" ? "Envoi..." : "Envoyer"}
        </button>
        {status === "error" && <p className="text-xs text-danger">Une erreur est survenue, réessaie.</p>}
      </form>
    </main>
  );
}
