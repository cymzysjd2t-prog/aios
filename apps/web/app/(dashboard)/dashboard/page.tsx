import { AgentRail } from "@/components/agent-rail";
import { RunAgentForm } from "@/components/run-agent-form";
import { ActivityFeed } from "@/components/activity-feed";
import { ProjectsTable } from "@/components/projects-table";
import { KpiCards } from "@/components/kpi-cards";
import { UpdateKpisForm } from "@/components/update-kpis-form";

const DEMO_BUSINESS_ID = "demo-business";

export default function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-medium text-primary">Tableau de bord — démo</h1>
        <p className="text-sm text-secondary">
          Entreprise de démo (créée par <code className="text-xs">pnpm db:seed</code>). Pour tes
          propres entreprises, va dans « Entreprises ».
        </p>
      </div>

      <RunAgentForm />

      <KpiCards businessId={DEMO_BUSINESS_ID} />

      <UpdateKpisForm businessId={DEMO_BUSINESS_ID} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <ProjectsTable />
          <ActivityFeed />
        </div>
        <AgentRail />
      </div>
    </div>
  );
}
