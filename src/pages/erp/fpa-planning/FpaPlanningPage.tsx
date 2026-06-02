/**
 * @file        src/pages/erp/fpa-planning/FpaPlanningPage.tsx
 * @page        Card landing surface for the NEW 'fpa-planning' card.
 * @sprint      Sprint 116 · T-Phase-7.D.0.1 · 🎬 Phase 7 opener · Arc D.0
 * @purpose     Welcome / hub for the FP&A card. Surfaces the AOP Strategic Plan page
 *              (Standalone Page #43) and reserves space for future D.1 (budget / forecast / scenario)
 *              pages without pre-implementing them (SCOPE WALL).
 */
import { Link } from 'react-router-dom';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, LineChart, ArrowRight } from 'lucide-react';

export default function FpaPlanningPage() {
  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-semibold">FP&amp;A / Planning</h1>
            <Badge variant="outline" className="ml-2">Phase 7 · Arc D.0</Badge>
          </div>
          <p className="text-muted-foreground max-w-3xl">
            Financial Planning &amp; Analysis hub. Home of the Annual Operating Plan (AOP),
            3-year strategic plan, and the revenue / cost target cascade from corporate down to
            every entity, division, and department. Budget / forecast / scenario will land in Arc D.1.
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
                Set revenue + cost targets and cascade them through the org tree. Live now.
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

          <Card className="glass-card opacity-70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                Budget &amp; Forecast
                <Badge variant="secondary" className="ml-auto">Arc D.1</Badge>
              </CardTitle>
              <CardDescription>
                Operational budgets, rolling forecasts, and variance vs targets. Coming next.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="glass-card opacity-70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <LineChart className="h-5 w-5 text-muted-foreground" />
                Scenario Planning
                <Badge variant="secondary" className="ml-auto">Arc D.1</Badge>
              </CardTitle>
              <CardDescription>
                What-if scenarios on top of the approved plan. Coming next.
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
              Targets cascade against the canonical org tree from Foundation:
              entities (Intercompany Group Structure) → divisions → departments.
              The planning engine reads — it does not reimplement — both stores (0-DIFF).
            </p>
            <p className="text-xs">
              Out of scope this sprint: workforce planning, OKR / org cost, and budget /
              forecast / scenario. Those land in S117, S118, and Arc D.1 respectively.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
