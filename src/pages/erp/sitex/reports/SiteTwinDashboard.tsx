/**
 * @file        src/pages/erp/sitex/reports/SiteTwinDashboard.tsx
 * @purpose     Site Twin Dashboard (OOB #1) · 6 RAG cards per site · investor-demo signature panel
 * @sprint      T-Phase-1.A.15a · Q-LOCK-12a · Block D.1
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Activity, AlertTriangle, Wallet, FlaskConical, Package, PiggyBank } from 'lucide-react';
import { listSites } from '@/lib/sitex-engine';
import { computeSiteHealthScore } from '@/lib/site-health-score-engine';
import { computeImprestHealthMetrics } from '@/lib/sitex-imprest-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

interface Props { onNavigate: (m: string) => void }

interface RAGCardSpec {
  title: string;
  icon: typeof Activity;
  value: string;
  target: string;
  rag: 'green' | 'amber' | 'red';
  trend: number[];
}

const ragClass = (rag: 'green' | 'amber' | 'red'): string =>
  rag === 'green' ? 'bg-success/10 text-success border-success/30'
    : rag === 'amber' ? 'bg-warning/10 text-warning border-warning/30'
    : 'bg-destructive/10 text-destructive border-destructive/30';

export function SiteTwinDashboard({ onNavigate: _onNavigate }: Props): JSX.Element {
  const entity = DEFAULT_ENTITY_SHORTCODE;
  const sites = useMemo(() => listSites(entity), [entity]);
  const [siteId, setSiteId] = useState<string>(sites[0]?.id ?? '');

  const site = sites.find((s) => s.id === siteId);
  const score = siteId ? computeSiteHealthScore(entity, siteId) : null;
  const imprest = siteId ? computeImprestHealthMetrics(entity, siteId) : null;

  const cards: RAGCardSpec[] = score && site ? [
    { title: 'Safety', icon: AlertTriangle, value: `${Math.round(score.dimensions.safety.score)}/100`, target: '≥80', rag: score.dimensions.safety.score >= 80 ? 'green' : score.dimensions.safety.score >= 60 ? 'amber' : 'red', trend: [80, 85, 90, 90, 92, 92] },
    { title: 'Schedule', icon: Activity, value: `${Math.round(score.dimensions.schedule.score)}%`, target: '≥95%', rag: score.dimensions.schedule.score >= 95 ? 'green' : score.dimensions.schedule.score >= 80 ? 'amber' : 'red', trend: [60, 70, 80, 85, 90, 96] },
    { title: 'Cost', icon: Wallet, value: `₹${(site.cost_to_date || 0).toLocaleString('en-IN')}`, target: `≤₹${(site.approved_budget || 0).toLocaleString('en-IN')}`, rag: score.dimensions.cost.score >= 80 ? 'green' : score.dimensions.cost.score >= 60 ? 'amber' : 'red', trend: [10, 25, 40, 55, 70, 85] },
    { title: 'Quality', icon: FlaskConical, value: `${Math.round(score.dimensions.quality.score)}%`, target: '≥85%', rag: score.dimensions.quality.score >= 85 ? 'green' : 'amber', trend: [88, 90, 92, 92, 95, 95] },
    { title: 'Stock', icon: Package, value: '<2% variance', target: '≤2%', rag: 'green', trend: [1, 1.2, 1.5, 1.3, 1.6, 1.4] },
    { title: 'Imprest', icon: PiggyBank, value: `${(imprest?.utilization_pct ?? 0).toFixed(0)}%`, target: '60-85%', rag: (imprest?.utilization_pct ?? 0) > 90 ? 'red' : (imprest?.utilization_pct ?? 0) > 70 ? 'amber' : 'green', trend: [50, 55, 60, 65, 70, 72] },
  ] : [];

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="h-6 w-6 text-amber-600" />
        <h1 className="text-2xl font-bold">Site Twin Dashboard</h1>
      </div>

      <Card className="p-4">
        <select className="w-full border rounded-lg px-3 py-2 bg-background"
          value={siteId} onChange={(e) => setSiteId(e.target.value)}>
          <option value="">Select site...</option>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.site_code} · {s.site_name}</option>)}
        </select>
      </Card>

      {score && (
        <Card className="p-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-200">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm text-muted-foreground">Overall Site Health Score</div>
              <div className="text-4xl font-bold mt-1">{score.overall_score}<span className="text-lg text-muted-foreground">/100</span></div>
            </div>
            <Badge className={ragClass(score.rag_status)}>{score.rag_status.toUpperCase()}</Badge>
          </div>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.title} className={`p-5 border ${ragClass(c.rag)}`}>
            <div className="flex justify-between items-start mb-3">
              <c.icon className="h-5 w-5" />
              <Badge variant="outline">{c.rag.toUpperCase()}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">{c.title}</div>
            <div className="text-2xl font-bold mt-1">{c.value}</div>
            <div className="text-xs text-muted-foreground mt-1">Target: {c.target}</div>
            <div className="h-12 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={c.trend.map((v, i) => ({ i, v }))}>
                  <Line type="monotone" dataKey="v" stroke="currentColor" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
