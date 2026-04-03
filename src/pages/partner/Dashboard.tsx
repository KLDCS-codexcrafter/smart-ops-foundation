import { AppLayout } from "@/components/layout/AppLayout";

export default function PartnerDashboard() {
  return (
    <AppLayout title="Partner Panel" breadcrumbs={[{ label: "Partner Panel" }]}>
      <div className="glass-card p-8 text-center">
        <p className="text-muted-foreground">Partner Panel — coming soon</p>
      </div>
    </AppLayout>
  );
}
