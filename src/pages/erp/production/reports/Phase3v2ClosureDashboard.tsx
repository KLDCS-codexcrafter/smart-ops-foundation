/**
 * @file        src/pages/erp/production/reports/Phase3v2ClosureDashboard.tsx
 * @sprint      T-Phase-3.PROD-5 · Theme C Block 10
 * @purpose     Phase 3 v2 Production Arc closure milestone dashboard.
 *              28/28 capability · 39 SIBLINGs · 38 MOATs · 10-streak DOUBLE-DIGIT.
 */
import { getCapabilityScoreFullOnly, getCapabilityScore } from '@/lib/_institutional/capability-scorecard';
import { getCurrentAStreak, SPRINTS } from '@/lib/_institutional/sprint-history';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { MOATS } from '@/lib/_institutional/moat-register';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Leaf, Sparkles, Layers } from 'lucide-react';

export function Phase3v2ClosureDashboardPanel(): JSX.Element {
  const capScore = getCapabilityScoreFullOnly();
  const capBreakdown = getCapabilityScore();
  const aStreak = getCurrentAStreak();
  const siblingCount = SIBLINGS.length;
  const moatCount = MOATS.length;
  const phase3Sprints = SPRINTS.filter(
    (s) => s.sprintNumber >= 55 && s.sprintNumber <= 63 && s.provenance === 'CONFIRMED',
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-semibold flex items-center gap-2">
          <Trophy className="h-8 w-8 text-warning" /> Phase 3 v2 Closure
        </h1>
        <p className="text-sm text-muted-foreground">
          Production Arc 9/9 complete · Sprint 55-63 · institutional pivot to Phase 4 FAR
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card border-success">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-success" /> Capability Scorecard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-3xl text-success">{capScore}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {capBreakdown.full} full · {capBreakdown.partial} partial · {capBreakdown.absent} absent
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4" /> SIBLINGs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-3xl">{siblingCount}</div>
            <div className="text-xs text-muted-foreground mt-1">39th: carbon-planning-engine</div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">MOATs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-3xl">{moatCount}</div>
            <div className="text-xs text-muted-foreground mt-1">MOAT-38: Carbon-aware at SMB price</div>
          </CardContent>
        </Card>

        <Card className="glass-card border-warning">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-warning" /> A-Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-3xl text-warning">{aStreak}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {aStreak >= 10 ? 'DOUBLE-DIGIT NEW RECORD' : 'Streak in progress'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-success">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-success" /> MOAT-38 · World-First Carbon-Aware Production Planning at SMB Price
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Category-defining ESG capability under ₹10L TCO. SAP S/4 partial parity at ₹2-10Cr.
            Operix unlocks Indian SMB pharma, food, chemical, textile, and metal beachheads.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">Carbon-aware scheduling</Badge>
            <Badge variant="outline">BRSR Section A ready</Badge>
            <Badge variant="outline">Scope 1+2 dashboards</Badge>
            <Badge variant="outline">39th SIBLING</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Phase 3 v2 Production Arc · Sprint 55-63</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            {phase3Sprints.map((s) => (
              <div key={s.sprintNumber} className="border rounded-lg p-3 glass">
                <div className="font-mono text-xs text-muted-foreground">Sprint {s.sprintNumber}</div>
                <div className="font-semibold">{s.code}</div>
                <div className="text-xs mt-1">
                  <Badge variant={s.grade?.startsWith('A') ? 'default' : 'outline'}>{s.grade ?? '—'}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Phase3v2ClosureDashboardPanel;
