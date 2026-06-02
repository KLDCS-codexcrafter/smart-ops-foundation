/**
 * @file        src/pages/erp/fpa-planning/FpaPlanningPage.tsx
 * @page        Card landing surface for the NEW 'fpa-planning' card.
 * @sprint      Sprint 116 · T-Phase-7.D.0.1 · 🎬 Phase 7 opener · Arc D.0
 * @s122-fix    Block 2A (S122 · T-Phase-7.D.1.3) — wrapped in the ERP Shell
 *              (header + sidebar) for consistency with the other card landings.
 *              Carried-over fix from S116/S120 — the landing previously rendered
 *              bare (no shell), unlike Comply360 / ProcureHub / etc.
 * @purpose     Welcome / hub for the FP&A card. Surfaces AOP and other D.0/D.1
 *              modules (Workforce, OKR, Org Design, Budgeting, Forecasting, Scenario).
 */
import { Link } from 'react-router-dom';
import { Shell } from '@/shell';
import { commandCenterShellConfig } from '@/apps/erp/configs/command-center-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, LineChart, Sparkles, ArrowRight } from 'lucide-react';

export default function FpaPlanningPage() {
  const { profile, entitlements } = useCardEntitlement();

  return (
    <Shell
      config={commandCenterShellConfig}
      userProfile={profile}
      tenantEntitlements={entitlements}
      breadcrumbs={[
        { label: 'ERP', href: '/erp/dashboard' },
        { label: 'FP&A / Planning' },
      ]}
    >
      <div className="min-h-full bg-background p-6 md:p-10">
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
          <header className="space-y-2">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-semibold">FP&amp;A / Planning</h1>
              <Badge variant="outline" className="ml-2">Phase 7 · Arc D.0 / D.1</Badge>
            </div>
            <p className="text-muted-foreground max-w-3xl">
              Financial Planning &amp; Analysis hub. Home of the Annual Operating Plan (AOP),
              3-year strategic plan, budgeting, forecasting, and the multi-entity consolidated
              scenario moat.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="glass-card hover:shadow-elevated transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-primary" />
                  AOP &amp; Strategic Plan
                </CardTitle>
                <CardDescription>
                  Set revenue + cost targets and cascade them through the org tree.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="gap-2">
                  <Link to="/erp/command-center#fincore-aop-strategic-plan">
                    Open AOP Workbench
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-card hover:shadow-elevated transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Budgeting &amp; Forecasting
                </CardTitle>
                <CardDescription>
                  Operating / capital / cash budgets · revenue / cash / demand forecasts.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2 flex-wrap">
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <Link to="/erp/command-center#fpa-planning-budgeting">
                    Budgeting <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <Link to="/erp/command-center#fpa-planning-forecasting">
                    Forecasting <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-card hover:shadow-elevated transition-shadow md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Scenario Management
                  <Badge variant="secondary" className="ml-auto">⭐ The Moat · Pt 1</Badge>
                </CardTitle>
                <CardDescription>
                  Best/base/worst scenario modeling across single entity AND multi-entity
                  CONSOLIDATED (multi-currency · eliminations applied) — orchestrates the
                  Phase-6 consolidation stack.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="gap-2">
                  <Link to="/erp/command-center#fpa-planning-scenario">
                    Open Scenario Modeling
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-card opacity-70 md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <LineChart className="h-5 w-5 text-muted-foreground" />
                  Workforce · OKR · Org Design
                  <Badge variant="secondary" className="ml-auto">Arc D.0</Badge>
                </CardTitle>
                <CardDescription>
                  Headcount, OKR cascade, and org-design simulator — open from the sidebar.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Scope &amp; FR-44 Reuse</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                Targets / budgets / forecasts / scenarios cascade against the canonical
                org tree from Foundation. All planning engines READ — they do not
                reimplement — the underlying stores (0-DIFF).
              </p>
              <p className="text-xs">
                Scenario Pt 1 (S122): best/base/worst, single + consolidated.
                FX-matrix / demand / capex scenarios land in S123.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
