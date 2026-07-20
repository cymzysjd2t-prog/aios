import { UserButton } from "@clerk/nextjs";
import { Search } from "lucide-react";

export function Topbar({ businessName }: { businessName: string }) {
  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border px-6">
      <div>
        <p className="text-sm text-primary">{businessName}</p>
      </div>

      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-muted transition-colors hover:border-border-strong hover:text-secondary">
          <Search className="h-3.5 w-3.5" />
          Rechercher
          <kbd className="ml-4 rounded border border-border-strong px-1 font-mono text-[10px] text-muted">
            ⌘K
          </kbd>
        </button>
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}
