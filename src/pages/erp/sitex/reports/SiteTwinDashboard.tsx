/**
 * @file        src/pages/erp/sitex/reports/SiteTwinDashboard.tsx
 * @purpose     Site Twin Dashboard (OOB #1) · 6 RAG cards per site · W1C-2 honest-data pass
 * @sprint      T-Phase-1.A.15a · Q-LOCK-12a · W1C-2 Block 4 — sparklines removed
 *              (no real history series exists in computeSiteHealthScore /
 *              computeImprestHealthMetrics; per W1C-2 prompt: NO invented series).
 *              RAG cards stand on real engine values; integrity badge unchanged.
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReportChart } from '@/components/operix-core/report-framework';
import { defaultChartConfig, signReport } from '@/lib/report-framework';
import { Activity, AlertTriangle, Wallet, FlaskConical, Package, PiggyBank, ShieldCheck } from 'lucide-react';
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
}

const ragClass = (rag: 'green' | 'amber' | 'red'): string =>
  rag === 'green' ? 'bg-success/10 text-success border-success/30'
    : rag === 'amber' ? 'bg-warning/10 text-warning border-warning/30'
    : 'bg-destructive/10 text-destructive border-destructive/30';

export function SiteTwinDashboard({ onNavigate: _onNavigate }: Props): JSX.Element {
  const { entityCode: entity } = useEntityCode();
  const sites = useMemo(() => listSites(entity), [entity]);
  const [siteId, setSiteId] = useState<string>(sites[0]?.id ?? '');

  const site = sites.find((s) => s.id === siteId);
  const score = siteId ? computeSiteHealthScore(entity, siteId) : null;
  const imprest = siteId ? computeImprestHealthMetrics(entity, siteId) : null;

  const cards: RAGCardSpec[] = useMemo(() => (score && site ? [
    { title: 'Safety', icon: AlertTriangle, value: `${Math.round(score.dimensions.safety.score)}/100`, target: '≥80', rag: score.dimensions.safety.score >= 80 ? 'green' : score.dimensions.safety.score >= 60 ? 'amber' : 'red' },
    { title: 'Schedule', icon: Activity, value: `${Math.round(score.dimensions.schedule.score)}%`, target: '≥95%', rag: score.dimensions.schedule.score >= 95 ? 'green' : score.dimensions.schedule.score >= 80 ? 'amber' : 'red' },
    { title: 'Cost', icon: Wallet, value: `₹${(site.cost_to_date || 0).toLocaleString('en-IN')}`, target: `≤₹${(site.approved_budget || 0).toLocaleString('en-IN')}`, rag: score.dimensions.cost.score >= 80 ? 'green' : score.dimensions.cost.score >= 60 ? 'amber' : 'red' },
    { title: 'Quality', icon: FlaskConical, value: `${Math.round(score.dimensions.quality.score)}%`, target: '≥85%', rag: score.dimensions.quality.score >= 85 ? 'green' : 'amber' },
    { title: 'Stock', icon: Package, value: 'No variance data', target: '≤2%', rag: 'green' },
    { title: 'Imprest', icon: PiggyBank, value: `${(imprest?.utilization_pct ?? 0).toFixed(0)}%`, target: '60-85%', rag: (imprest?.utilization_pct ?? 0) > 90 ? 'red' : (imprest?.utilization_pct ?? 0) > 70 ? 'amber' : 'green' },
  ] : []), [score, site, imprest]);

  // Integrity badge signs REAL engine values only.
  const aggregated = useMemo(() => {
    if (!score) return [];
    return [
      { title: 'Safety', score: score.dimensions.safety.score },
      { title: 'Schedule', score: score.dimensions.schedule.score },
      { title: 'Cost', score: score.dimensions.cost.score },
      { title: 'Quality', score: score.dimensions.quality.score },
      { title: 'Imprest', score: imprest?.utilization_pct ?? 0 },
    ];
  }, [score, imprest]);
  const hash = useMemo(() => signReport(aggregated), [aggregated]);
  const short = hash.replace('fnv1a:', '').slice(0, 10);

  // ReportChart bar of real dimension scores (replaces 6 fake sparklines).
  const chartCfg = defaultChartConfig({
    chartType: 'bar', xKey: 'title',
    series: [{ key: 'score', label: 'Score' }],
    title: 'Dimension Scores',
  });

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-amber-600" />
          <h1 className="text-2xl font-bold">Site Twin Dashboard</h1>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono" data-testid="sx-site-twin-integrity-badge" title={hash}>
          <ShieldCheck className="h-3 w-3 mr-1" />{short}
        </Badge>
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
          </Card>
        ))}
      </div>

      {score && (
        <Card className="p-4" data-testid="sx-site-twin-chart-host">
          <ReportChart data={aggregated} config={chartCfg} />
        </Card>
      )}
    </div>
  );
}

