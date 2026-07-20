import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "neutral";
  icon: LucideIcon;
}

export function KpiCard({ label, value, delta, trend = "neutral", icon: Icon }: KpiCardProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-secondary">{label}</span>
        <Icon className="h-4 w-4 text-muted" strokeWidth={1.75} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-2xl font-medium text-primary">{value}</span>
        {delta && (
          <span
            className={cn(
              "text-xs font-medium",
              trend === "up" && "text-agent-running",
              trend === "down" && "text-danger",
              trend === "neutral" && "text-muted"
            )}
          >
            {delta}
          </span>
        )}
      </div>
    </Card>
  );
}
