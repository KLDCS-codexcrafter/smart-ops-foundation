/**
 * @file        src/pages/vendor-portal/VendorPerformanceView.tsx
 * @purpose     Vendor self-performance · radar + improvement guidance · Superpower #4
 * @sprint      T-Phase-1.A-c.3-VendorPortal-KYC-Invoice-Messages-Performance
 * @decisions   D-272 · A-c-Q5=C transparent + actionable
 * @[JWT]       N/A · reads via vendor-scoring-engine
 */
import { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import VendorPortalLayout from './VendorPortalLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer,
} from 'recharts';
import { BarChart, Award, TrendingUp, Target, CheckCircle, Sparkles } from 'lucide-react';
import { getVendorSession } from '@/lib/vendor-portal-auth-engine';
import {
  computeVendorScore,
  type VendorScore, type ScoreFactorName, type VendorScoreFactor,
} from '@/lib/vendor-scoring-engine';

const FACTOR_LABELS: Record<ScoreFactorName, string> = {
  price: 'Price Competitiveness',
  quality: 'Quality',
  delivery: 'Delivery Performance',
  responsiveness: 'Responsiveness',
  payment_terms: 'Payment Terms',
  compliance: 'Compliance',
};

function scoreBand(total: number): { label: string; className: string; nextThreshold?: number; nextLabel?: string } {
  if (total >= 85) return { label: 'Top Performer', className: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' };
  if (total >= 70) return { label: 'Solid', className: 'bg-blue-500/15 text-blue-700 border-blue-500/30', nextThreshold: 85, nextLabel: 'Top Performer' };
  if (total >= 50) return { label: 'Building', className: 'bg-amber-500/15 text-amber-700 border-amber-500/30', nextThreshold: 70, nextLabel: 'Solid' };
  return { label: 'Watch', className: 'bg-red-500/15 text-red-700 border-red-500/30', nextThreshold: 50, nextLabel: 'Building' };
}

function weakestFactor(score: VendorScore): VendorScoreFactor | null {
  if (score.factor_breakdown.length === 0) return null;
  return score.factor_breakdown.reduce((min, f) => (f.raw_score < min.raw_score ? f : min));
}

export default function VendorPerformanceView(): JSX.Element {
  const session = getVendorSession();

  const score = useMemo(
    () => session ? computeVendorScore(session.vendor_id, session.entity_code) : null,
    [session]
  );

  if (!session) return <Navigate to="/vendor-portal/login" replace />;

  if (!score || score.factor_breakdown.length === 0) {
    return (
      <VendorPortalLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Score not yet computed · complete some RFQs and POs to generate performance data
            </p>
          </CardContent>
        </Card>
      </VendorPortalLayout>
    );
  }

  const band = scoreBand(score.total_score);
  const weakest = weakestFactor(score);
  const radarData = score.factor_breakdown.map((f) => ({
    factor: FACTOR_LABELS[f.name],
    score: f.raw_score,
    fullMark: 100,
  }));

  return (
    <VendorPortalLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Your Performance
              <Badge variant="outline" className="text-[10px] gap-1">
                <Sparkles className="h-3 w-3" /> Operix Superpower #4
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              How procurement scores you · transparent · with improvement guidance
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Overall Score</p>
                <p className="text-5xl font-bold font-mono">{Math.round(score.total_score)}<span className="text-2xl text-muted-foreground">/100</span></p>
                <Badge variant="outline" className={`mt-2 text-xs ${band.className}`}>
                  <Award className="h-3 w-3 mr-1" /> {band.label}
                </Badge>
              </div>
              <div className="text-right space-y-1 text-xs font-mono">
                <div>RFQs received: {score.rfq_count}</div>
                <div>Quotes submitted: {score.quote_count}</div>
                <div>Awards won: {score.award_count}</div>
                <div>On-time delivery: {(score.on_time_delivery_rate * 100).toFixed(0)}%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {band.nextThreshold && band.nextLabel && weakest && (
          <Alert className="border-blue-500/30 bg-blue-500/5">
            <Target className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm">
              <strong>To reach {band.nextLabel} (score ≥ {band.nextThreshold}):</strong> focus on your weakest factor —{' '}
              <strong>{FACTOR_LABELS[weakest.name]}</strong> (currently {Math.round(weakest.raw_score)}/100 ·{' '}
              {weakest.weight}% weight in overall score). Improving this lifts your overall score the most.
            </AlertDescription>
          </Alert>
        )}
        {!band.nextThreshold && (
          <Alert className="border-emerald-500/30 bg-emerald-500/5">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-sm">
              <strong>Top Performer!</strong> Maintain your current factor scores · you're at the highest band.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Factor Breakdown</CardTitle>
            <CardDescription>6 factors scored · radar view</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--muted-foreground))" strokeOpacity={0.3} />
                <PolarAngleAxis dataKey="factor" tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <Radar name="Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Detailed Factors</CardTitle>
            <CardDescription>Per-factor score · weight · weighted contribution to total</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {score.factor_breakdown.map((f) => (
              <div key={f.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{FACTOR_LABELS[f.name]}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {Math.round(f.raw_score)}/100 · weight {f.weight}% · contributes{' '}
                    <span className="font-bold text-foreground">{Math.round(f.weighted_score)}</span>
                  </span>
                </div>
                <Progress value={f.raw_score} className="h-2" />
                {f.factors_used.length > 0 && (
                  <p className="text-[10px] text-muted-foreground">Based on: {f.factors_used.join(', ')}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Why Operix shows this</p>
              <p className="text-xs text-muted-foreground">
                Most procurement systems hide vendor scores · Operix's <strong>Reverse Reputation</strong> principle
                (Superpower #4) believes vendors deserve transparent feedback to improve. Computed{' '}
                {new Date(score.computed_at).toLocaleString('en-IN')}.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </VendorPortalLayout>
  );
}
