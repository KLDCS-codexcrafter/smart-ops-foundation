import { TowerLayout } from "@/components/layout/TowerLayout";
import { BrainCircuit, ArrowRight } from "lucide-react";

const FEATURES = [
  "Churn prediction — identify at-risk tenants 30 days early",
  "Usage anomaly detection — flag unusual platform activity",
  "Revenue forecasting — 90-day MRR projection",
  "Auto-generated executive reports — weekly PDF digest",
  "Smart tenant health scoring — AI-weighted metrics",
  "Natural language query — ask questions about your data",
];

export default function AIInsights() {
  return (
    <TowerLayout title="AI Insights" subtitle="Predictive analytics and intelligent recommendations">
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <BrainCircuit className="h-8 w-8 text-primary" />
          </div>
          <span className="inline-block text-xs font-mono font-semibold uppercase tracking-wider text-warning bg-warning/10 border border-warning/20 rounded-full px-3 py-1">
            Coming in v2
          </span>
          <h2 className="text-2xl font-bold text-foreground">AI Insights</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Predictive analytics and intelligent recommendations
            powered by platform usage data.
          </p>
          <div className="text-left space-y-2">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                <ArrowRight className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                {f}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground/60">
            AI features require minimum 6 months of platform data.
            Estimated availability: Q4 2026.
          </p>
        </div>
      </div>
    </TowerLayout>
  );
}
