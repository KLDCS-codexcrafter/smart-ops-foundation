import { AppLayout } from "@/components/layout/AppLayout";

export default function CustomerDashboard() {
  return (
    <AppLayout title="Customer Panel" breadcrumbs={[{ label: "Customer Panel" }]}>
      <div className="glass-card p-8 text-center">
        <p className="text-muted-foreground">Customer Panel — coming soon</p>
      </div>
    </AppLayout>
  );
}
