import { AppLayout } from "@/components/layout/AppLayout";

export default function BridgeDashboard() {
  return (
    <AppLayout title="Bridge Console" breadcrumbs={[{ label: "Bridge Console" }]}>
      <div className="glass-card p-8 text-center">
        <p className="text-muted-foreground">Bridge Console — coming soon</p>
      </div>
    </AppLayout>
  );
}
