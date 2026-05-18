/**
 * @file        src/pages/erp/vendor-portal/panels/VendorScoringPanel.tsx
 * @purpose     Vendor Scoring Dashboard · 6-factor radar + top vendors + drill-down
 * @sprint      T-Phase-1.A-b.1-VendorPortal-Performance-Triad
 * @decisions   D-NEW-DN · A-b-Q2=A · A-b-Q5=B · A-b-Q8=C · A-b-Q9=C
 * @reuses      vendor-scoring-engine (consume only · 0-diff)
 * @[JWT]       N/A (panel reads via engine)
 */
import { useMemo, useState } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { Award, TrendingUp, TrendingDown, Minus, Bot, X } from 'lucide-react';
import {
  getTopVendorsByScore,
  type VendorScore, type ScoreFactorName,
} from '@/lib/vendor-scoring-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

const FACTOR_LABELS: Record<ScoreFactorName, string> = {
  price: 'Price',
  quality: 'Quality',
  delivery: 'Delivery',
  responsiveness: 'Response',
  payment_terms: 'Payment',
  compliance: 'Compliance',
};

function scoreStatusBand(score: number): { label: string; className: string } {
  if (score >= 80) return { label: 'Top Performer', className: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' };
  if (score >= 65) return { label: 'Solid', className: 'bg-blue-500/15 text-blue-700 border-blue-500/30' };
  if (score >= 50) return { label: 'Mid-tier', className: 'bg-amber-500/15 text-amber-700 border-amber-500/30' };
  return { label: 'Underperforming', className: 'bg-red-500/15 text-red-700 border-red-500/30' };
}

function trendIcon(_score: number): JSX.Element {
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}

export function VendorScoringPanel(): JSX.Element {
  const entityCode = useMemo(() => {
    try {
      return localStorage.getItem('active_entity_code') ?? DEFAULT_ENTITY_SHORTCODE;
    } catch { return DEFAULT_ENTITY_SHORTCODE; }
  }, []);

  const topVendors = useMemo(() => getTopVendorsByScore(entityCode, 10), [entityCode]);
  const [selectedVendor, setSelectedVendor] = useState<VendorScore | null>(null);

  const totalVendors = topVendors.length;
  const avgScore = totalVendors > 0
    ? Math.round((topVendors.reduce((s, v) => s + v.total_score, 0) / totalVendors) * 100) / 100
    : 0;
  const topPerformerCount = topVendors.filter(v => v.total_score >= 80).length;
  const underperformerCount = topVendors.filter(v => v.total_score < 50).length;

  const radarData = useMemo(() => {
    const source = selectedVendor ?? topVendors[0];
    if (!source) return [];
    return source.factor_breakdown.map(f => ({
      metric: FACTOR_LABELS[f.name],
      score: f.raw_score,
      fullMark: 100,
    }));
  }, [selectedVendor, topVendors]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-slate-500/15 flex items-center justify-center">
            <Award className="h-6 w-6 text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Vendor Scoring Dashboard
              <Badge variant="outline" className="text-[10px]">6-Factor Weighted</Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              Multi-factor vendor performance · price 30% · quality 25% · delivery 20% · responsiveness 10% · payment 10% · compliance 5%
            </p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1 text-[10px]">
          <Bot className="h-3 w-3" />Saathi · negotiation coaching · Phase 2
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Total Vendors</p>
              <Award className="h-4 w-4 text-slate-600" />
            </div>
            <p className="text-2xl font-bold font-mono">{totalVendors}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Avg Score</p>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold font-mono">{avgScore.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Top Performers</p>
              <Award className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold font-mono text-emerald-700">{topPerformerCount}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Score ≥ 80</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Underperformers</p>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </div>
            <p className="text-2xl font-bold font-mono text-red-700">{underperformerCount}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Score &lt; 50</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4" />
              {selectedVendor ? selectedVendor.vendor_name : (topVendors[0]?.vendor_name ?? 'No data')}
              <span className="text-xs text-muted-foreground font-normal">· Performance Radar</span>
            </CardTitle>
            <CardDescription>
              {selectedVendor ? 'Click X to clear selection' : 'Showing #1 ranked vendor · click any vendor on right to drill down'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {radarData.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="rgb(71, 85, 105)"
                      fill="rgb(71, 85, 105)"
                      fillOpacity={0.35}
                    />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">
                No scoring data yet · vendors appear once RFQs are issued + quotations received
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top Vendors by Score</CardTitle>
            <CardDescription>Click any vendor to view radar breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {topVendors.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No vendor scores yet · ranking populates after RFQ + quotation activity
              </div>
            ) : (
              topVendors.map((v, idx) => {
                const band = scoreStatusBand(v.total_score);
                const isSelected = selectedVendor?.vendor_id === v.vendor_id;
                return (
                  <button
                    key={v.vendor_id}
                    onClick={() => setSelectedVendor(isSelected ? null : v)}
                    className={`w-full text-left rounded-lg border p-3 transition-colors ${
                      isSelected ? 'border-slate-500 bg-slate-500/10' : 'border-border/50 hover:border-slate-500/40 hover:bg-slate-500/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-mono text-muted-foreground w-6 flex-shrink-0">#{idx + 1}</span>
                        <span className="text-sm font-medium truncate">{v.vendor_name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {trendIcon(v.total_score)}
                        <span className="text-sm font-mono font-bold">{v.total_score.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className={`text-[9px] ${band.className}`}>{band.label}</Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {v.rfq_count} RFQ · {v.quote_count} quote · {v.award_count} award
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {selectedVendor && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Factor Breakdown · {selectedVendor.vendor_name}</CardTitle>
                <CardDescription>Total score = weighted sum of 6 factors</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedVendor(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedVendor.factor_breakdown.map(f => (
              <div key={f.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{FACTOR_LABELS[f.name]}</span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {f.raw_score}/100 × {f.weight}% = {f.weighted_score.toFixed(2)}
                  </span>
                </div>
                <Progress value={f.raw_score} className="h-2" />
              </div>
            ))}
            <div className="pt-3 border-t flex items-center justify-between">
              <span className="text-sm font-medium">Total Score</span>
              <span className="text-lg font-bold font-mono">{selectedVendor.total_score.toFixed(2)}/100</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
