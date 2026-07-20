"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Bot,
  FolderKanban,
  Megaphone,
  LineChart,
  Workflow,
  Store,
  Settings,
  Building2,
  CreditCard,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/dashboard/businesses", label: "Entreprises", icon: Building2 },
  { href: "/dashboard/agents", label: "Agents", icon: Bot },
  { href: "/dashboard/projects", label: "Projets", icon: FolderKanban },
  { href: "/dashboard/marketing", label: "Marketing", icon: Megaphone },
  { href: "/dashboard/analytics", label: "Analytique", icon: LineChart },
  { href: "/dashboard/automation", label: "Automatisation", icon: Workflow },
  { href: "/dashboard/marketplace", label: "Marketplace", icon: Store },
  { href: "/dashboard/billing", label: "Facturation", icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent">
          <Building2 className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="font-display text-sm font-medium text-primary">AIOS</span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-surface-elevated text-primary"
                  : "text-secondary hover:bg-surface-elevated/60 hover:text-primary"
              )}
            >
              <item.icon className="h-4 w-4" strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-secondary transition-colors hover:bg-surface-elevated/60 hover:text-primary"
        >
          <Settings className="h-4 w-4" strokeWidth={1.75} />
          Paramètres
        </Link>
      </div>
    </aside>
  );
}
