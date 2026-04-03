import { TowerLayout } from "@/components/layout/TowerLayout";
import { Palette, ArrowRight } from "lucide-react";

const FEATURES = [
  "Per-tenant white-label branding — logo, colours, domain",
  "Custom login page with tenant branding",
  "Email template theming — match tenant brand identity",
  "Dark / light / auto mode per tenant preference",
  "Custom CSS overrides for enterprise tenants",
  "Brand asset manager — upload and manage tenant logos",
];

export default function Themes() {
  return (
    <TowerLayout title="Themes & Branding" subtitle="Custom branding and white-label configuration">
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Palette className="h-8 w-8 text-primary" />
          </div>
          <span className="inline-block text-xs font-mono font-semibold uppercase tracking-wider text-warning bg-warning/10 border border-warning/20 rounded-full px-3 py-1">
            Coming in v2
          </span>
          <h2 className="text-2xl font-bold text-foreground">Themes & Branding</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Give each tenant a personalised experience with
            custom branding, colours and domain configuration.
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
            White-label theming available for Growth and
            Enterprise plans only.
          </p>
        </div>
      </div>
    </TowerLayout>
  );
}
