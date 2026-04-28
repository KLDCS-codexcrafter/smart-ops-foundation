/**
 * SmartInsightsPanel.tsx — AI-style narrative insights · Canvas Wave 6 (T-Phase-1.1.1j)
 * [JWT] GET /api/salesx/smart-insights
 */
import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles, RefreshCw, TrendingUp, Users, Target,
  Activity, Award, BarChart3,
} from 'lucide-react';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useLeads } from '@/hooks/useLeads';
import { useCallSessions } from '@/hooks/useCallSessions';
import { useGamification } from '@/hooks/useGamification';
import { useLeadDistribution } from '@/hooks/useLeadDistribution';
import { useCallQuality } from '@/hooks/useCallQuality';
import { generateAllInsights } from '@/lib/insight-generators';
import type {
  SmartInsight, InsightCategory,
} from '@/types/smart-insight';
import {
  INSIGHT_CATEGORY_LABELS, INSIGHT_SEVERITY_COLORS,
} from '@/types/smart-insight';
import { cn } from '@/lib/utils';

interface Props { entityCode: string }

const CATEGORY_ICONS = {
  campaign:   Target,
  lead:       Users,
  telecaller: Activity,
  capacity:   BarChart3,
  quality:    Award,
  pipeline:   TrendingUp,
};

export function SmartInsightsPanelComponent({ entityCode }: Props) {
  const { campaigns } = useCampaigns(entityCode);
  const { leads } = useLeads(entityCode);
  const { sessions } = useCallSessions(entityCode);
  const { profiles } = useGamification(entityCode);
  const { capacities } = useLeadDistribution(entityCode);
  const { reviews } = useCallQuality(entityCode);

  const [filter, setFilter] = useState<InsightCategory | 'all'>('all');
  const [refreshTick, setRefreshTick] = useState(0);

  const insights = useMemo<SmartInsight[]>(() => {
    return generateAllInsights({ campaigns, leads, sessions, profiles, capacities, reviews });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns, leads, sessions, profiles, capacities, reviews, refreshTick]);

  const filtered = useMemo(() =>
    filter === 'all' ? insights : insights.filter(i => i.category === filter),
  [insights, filter]);

  const counts = useMemo(() => ({
    total:    insights.length,
    positive: insights.filter(i => i.severity === 'positive').length,
    warning:  insights.filter(i => i.severity === 'warning').length,
    critical: insights.filter(i => i.severity === 'critical').length,
  }), [insights]);

  const regenerate = useCallback(() => setRefreshTick(t => t + 1), []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-orange-500" />
          <h2 className="text-lg font-semibold">Smart Insights</h2>
          <Badge variant="outline" className="text-[10px]">Phase 1 · Heuristic</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={regenerate}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Regenerate
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total Insights</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-mono font-bold">{counts.total}</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Positive</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-mono font-bold text-green-600">{counts.positive}</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Warnings</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-mono font-bold text-amber-600">{counts.warning}</p></CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Critical</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-mono font-bold text-red-600">{counts.critical}</p></CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          variant={filter === 'all' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setFilter('all')}
        >
          All ({insights.length})
        </Badge>
        {(Object.keys(INSIGHT_CATEGORY_LABELS) as InsightCategory[]).map(cat => {
          const count = insights.filter(i => i.category === cat).length;
          if (count === 0) return null;
          return (
            <Badge
              key={cat}
              variant={filter === cat ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilter(cat)}
            >
              {INSIGHT_CATEGORY_LABELS[cat]} ({count})
            </Badge>
          );
        })}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No insights to display. Add data via Campaign Master, Lead Aggregation,
              or Call Quality to start generating insights.
            </CardContent>
          </Card>
        ) : filtered.map(ins => {
          const Icon = CATEGORY_ICONS[ins.category];
          return (
            <Card key={ins.id} className={cn(
              'border-l-4',
              ins.severity === 'positive' && 'border-l-green-500',
              ins.severity === 'warning'  && 'border-l-amber-500',
              ins.severity === 'critical' && 'border-l-red-500',
              ins.severity === 'neutral'  && 'border-l-blue-500',
            )}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm">{ins.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {ins.metric_value !== null && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {ins.metric_value.toFixed(ins.metric_value % 1 === 0 ? 0 : 1)}{ins.metric_label ?? ''}
                      </Badge>
                    )}
                    <Badge variant="outline" className={cn('text-[10px] capitalize', INSIGHT_SEVERITY_COLORS[ins.severity])}>
                      {ins.severity}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <p className="text-xs text-muted-foreground">{ins.narrative}</p>
                {ins.recommendation && (
                  <div className="text-xs bg-muted/40 p-2 rounded border-l-2 border-l-primary/40">
                    <span className="font-semibold">Recommendation: </span>{ins.recommendation}
                  </div>
                )}
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="capitalize">{INSIGHT_CATEGORY_LABELS[ins.category]}</span>
                  <span>·</span>
                  <span>Generated {new Date(ins.generated_at).toLocaleTimeString()}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardContent className="py-3 text-xs text-muted-foreground">
          <span className="font-semibold">Phase 2 preview:</span> heuristic insights will be replaced
          by real LLM-generated narratives via the Anthropic API.
        </CardContent>
      </Card>
    </div>
  );
}

export default SmartInsightsPanelComponent;
