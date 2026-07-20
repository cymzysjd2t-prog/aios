"use client";

import { useState } from "react";
import { LifeBuoy } from "lucide-react";

export default function PublicSupportPage({ params }: { params: { businessId: string } }) {
  const [form, setForm] = useState({ customerEmail: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/tickets", {
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
          <LifeBuoy className="mx-auto mb-3 h-8 w-8 text-accent" strokeWidth={1.5} />
          <p className="font-display text-sm font-medium text-primary">Ticket envoyé</p>
          <p className="mt-2 text-sm text-secondary">
            Notre équipe (humaine et IA) va traiter ta demande. Tu recevras une réponse par email.
          </p>
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
          <LifeBuoy className="h-4 w-4 text-accent" strokeWidth={1.75} />
          <h1 className="font-display text-sm font-medium text-primary">Contacter le support</h1>
        </div>

        <label className="flex flex-col gap-1 text-xs text-secondary">
          Ton email
          <input
            type="email"
            required
            value={form.customerEmail}
            onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))}
            className="rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-secondary">
          Sujet
          <input
            type="text"
            required
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            className="rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-secondary">
          Message
          <textarea
            required
            rows={4}
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
