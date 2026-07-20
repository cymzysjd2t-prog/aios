"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { LineChart } from "lucide-react";

export function UpdateKpisForm({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [values, setValues] = useState({ mrr: "", arr: "", churn: "", traffic: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "saved" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/kpis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          mrr: values.mrr ? Number(values.mrr) : undefined,
          arr: values.arr ? Number(values.arr) : undefined,
          churn: values.churn ? Number(values.churn) : undefined,
          traffic: values.traffic ? Number(values.traffic) : undefined,
        }),
      });
      if (!res.ok) throw new Error();
      setStatus("saved");
      router.refresh();
      setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("error");
    }
  }

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <LineChart className="h-4 w-4 text-accent" strokeWidth={1.75} />
        <h3 className="font-display text-sm font-medium text-primary">Relevé de KPIs du jour</h3>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        {(
          [
            { key: "mrr", label: "MRR (€)" },
            { key: "arr", label: "ARR (€)" },
            { key: "churn", label: "Churn (%)" },
            { key: "traffic", label: "Trafic (visites)" },
          ] as const
        ).map((field) => (
          <label key={field.key} className="flex flex-col gap-1 text-xs text-secondary">
            {field.label}
            <input
              type="number"
              value={values[field.key]}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              className="w-32 rounded-md border border-border bg-surface-elevated px-2 py-1.5 text-sm text-primary focus:border-accent focus:outline-none"
            />
          </label>
        ))}
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {status === "sending" ? "Enregistrement..." : "Enregistrer"}
        </button>
        {status === "saved" && <span className="text-xs text-agent-running">Relevé enregistré.</span>}
        {status === "error" && <span className="text-xs text-danger">Échec de l&apos;enregistrement.</span>}
      </form>
      <p className="mt-3 text-xs text-muted">
        Saisie manuelle pour l&apos;instant. La synchronisation automatique via Stripe (webhooks
        sur le compte de l&apos;entreprise) est prévue mais pas encore branchée — voir le README.
      </p>
    </Card>
  );
}
