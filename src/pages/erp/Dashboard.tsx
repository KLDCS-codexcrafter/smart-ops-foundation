import { AppLayout } from "@/components/layout/AppLayout";

export default function ErpDashboard() {
  return (
    <AppLayout title="ERP Application" breadcrumbs={[{ label: "ERP Application" }]}>
      <div className="glass-card p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-2xl font-bold text-foreground">
            Operix Udyam Kendra Prism Nexus
          </h2>
          <p className="text-lg text-muted-foreground">
            Business Operations Hub
          </p>
          <p className="text-sm text-muted-foreground">
            Full ERP · Standalone Modules · Small Projects
          </p>
        </div>
        <div className="mt-6">
          <span className="inline-block px-3 py-1 rounded-full bg-amber-400/20 text-amber-400 text-sm font-medium border border-amber-400/30">
            Sprint O1 — Build starting soon
          </span>
        </div>
      </div>
    </AppLayout>
  );
}
