import { AppLayout } from "@/components/layout/AppLayout";

export default function ErpDashboard() {
  return (
    <AppLayout title="ERP Application" breadcrumbs={[{ label: "ERP Application" }]}>
      <div className="glass-card p-8 text-center">
        <p className="text-muted-foreground">ERP Application — coming soon</p>
      </div>
    </AppLayout>
  );
}
