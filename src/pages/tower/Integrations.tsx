import { TowerLayout } from "@/components/layout/TowerLayout";
import { Plug, ArrowRight } from "lucide-react";

const FEATURES = [
  "Razorpay payment gateway — auto-reconciliation",
  "Tally Prime API — direct sync without Bridge agent",
  "Zoho CRM — lead and contact sync",
  "WhatsApp Business API — notification delivery",
  "IndiaStack APIs — Aadhaar eKYC, GST verification",
  "Webhook builder — custom event triggers",
];

export default function Integrations() {
  return (
    <TowerLayout title="Integrations" subtitle="Connect with external tools and services">
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Plug className="h-8 w-8 text-primary" />
          </div>
          <span className="inline-block text-xs font-mono font-semibold uppercase tracking-wider text-warning bg-warning/10 border border-warning/20 rounded-full px-3 py-1">
            Coming in v2
          </span>
          <h2 className="text-2xl font-bold text-foreground">Integrations Hub</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Connect 4DSmartOps with your existing tools and services.
            Pre-built connectors with zero-code setup.
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
            Integrations will be available in the v2 release.
            Developer start: post Series A.
          </p>
        </div>
      </div>
    </TowerLayout>
  );
}
