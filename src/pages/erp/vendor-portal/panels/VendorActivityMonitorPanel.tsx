/**
 * @file        src/pages/erp/vendor-portal/panels/VendorActivityMonitorPanel.tsx
 * @purpose     Vendor Activity Monitor · composite recent-activity feed
 * @sprint      T-Phase-1.A-b.1-VendorPortal-Performance-Triad
 * @decisions   D-NEW-DN · A-b-Q2=A · A-b-Q8=C · A-b-Q9=C
 * @reuses      vendor-onboarding-engine · vendor-scoring-engine (consume only · 0-diff)
 * @[JWT]       N/A (panel reads via engines)
 */
import { useMemo, useState } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Activity, MessageSquare, UserPlus, Award, FileSignature, Bot,
  Filter, RefreshCw,
} from 'lucide-react';
import { getOnboardingState } from '@/lib/vendor-onboarding-engine';
import { getTopVendorsByScore } from '@/lib/vendor-scoring-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

type ActivityKind = 'onboarding' | 'communication' | 'scoring' | 'agreement';

interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  vendor_id?: string;
  vendor_name: string;
  message: string;
  timestamp: string;
  severity: 'info' | 'success' | 'attention';
}

function buildActivityFeed(entityCode: string): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  const onboarding = getOnboardingState();
  if (onboarding) {
    events.push({
      id: `ob-${onboarding.vendor_id}`,
      kind: 'onboarding',
      vendor_id: onboarding.vendor_id,
      vendor_name: 'Pending onboarding',
      message: onboarding.is_first_time_vendor
        ? 'First-time vendor · awaiting quote submission'
        : 'Vendor pending password change',
      timestamp: new Date().toISOString(),
      severity: 'attention',
    });
  }

  const topScores = getTopVendorsByScore(entityCode, 10);
  const top3 = topScores.slice(0, 3);
  const bottom3 = topScores.slice(-3).reverse();

  top3.forEach((v, idx) => {
    events.push({
      id: `score-top-${v.vendor_id}`,
      kind: 'scoring',
      vendor_id: v.vendor_id,
      vendor_name: v.vendor_name,
      message: `Top performer · rank #${idx + 1} · score ${v.total_score.toFixed(1)}/100`,
      timestamp: v.computed_at,
      severity: 'success',
    });
  });

  bottom3.forEach((v) => {
    if (v.total_score >= 50) return;
    events.push({
      id: `score-bot-${v.vendor_id}`,
      kind: 'scoring',
      vendor_id: v.vendor_id,
      vendor_name: v.vendor_name,
      message: `Underperforming · score ${v.total_score.toFixed(1)}/100 · review recommended`,
      timestamp: v.computed_at,
      severity: 'attention',
    });
  });

  try {
    const rawThreads = localStorage.getItem(`vendor_commlog_threads_${entityCode}`);
    if (rawThreads) {
      const threads = JSON.parse(rawThreads) as Array<{
        rfq_no: string; vendor_name: string; last_updated_at?: string; unread_count?: number;
      }>;
      threads.slice(0, 5).forEach(t => {
        if ((t.unread_count ?? 0) > 0) {
          events.push({
            id: `comm-${t.rfq_no}`,
            kind: 'communication',
            vendor_name: t.vendor_name,
            message: `${t.unread_count} unread message(s) on RFQ ${t.rfq_no}`,
            timestamp: t.last_updated_at ?? new Date().toISOString(),
            severity: 'info',
          });
        }
      });
    }
  } catch { /* noop */ }

  try {
    const rawAgreements = localStorage.getItem(`erp_vendor_agreements_${entityCode}`);
    if (rawAgreements) {
      const agreements = JSON.parse(rawAgreements) as Array<{
        id: string; vendor_name?: string; agreement_type?: string; created_at?: string; status?: string;
      }>;
      agreements
        .filter(a => a.status === 'active' || a.status === 'pending')
        .slice(0, 5)
        .forEach(a => {
          events.push({
            id: `agr-${a.id}`,
            kind: 'agreement',
            vendor_name: a.vendor_name ?? 'Unknown vendor',
            message: `${a.agreement_type ?? 'Agreement'} · ${a.status}`,
            timestamp: a.created_at ?? new Date().toISOString(),
            severity: 'info',
          });
        });
    }
  } catch { /* noop */ }

  return events.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

function kindIcon(kind: ActivityKind): JSX.Element {
  switch (kind) {
    case 'onboarding':    return <UserPlus className="h-4 w-4" />;
    case 'communication': return <MessageSquare className="h-4 w-4" />;
    case 'scoring':       return <Award className="h-4 w-4" />;
    case 'agreement':     return <FileSignature className="h-4 w-4" />;
  }
}

function severityClasses(s: 'info' | 'success' | 'attention'): string {
  if (s === 'success') return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30';
  if (s === 'attention') return 'bg-amber-500/10 text-amber-700 border-amber-500/30';
  return 'bg-blue-500/10 text-blue-700 border-blue-500/30';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function VendorActivityMonitorPanel(): JSX.Element {
  const entityCode = useMemo(() => {
    try {
      return localStorage.getItem('active_entity_code') ?? DEFAULT_ENTITY_SHORTCODE;
    } catch { return DEFAULT_ENTITY_SHORTCODE; }
  }, []);

  const [kindFilter, setKindFilter] = useState<ActivityKind | 'all'>('all');
  const [refreshCounter, setRefreshCounter] = useState(0);

  const allEvents = useMemo(
    () => buildActivityFeed(entityCode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, refreshCounter]
  );

  const filtered = useMemo(
    () => kindFilter === 'all' ? allEvents : allEvents.filter(e => e.kind === kindFilter),
    [allEvents, kindFilter]
  );

  const handleRefresh = (): void => setRefreshCounter(c => c + 1);

  const kindCounts = useMemo(() => {
    const counts: Record<ActivityKind, number> = {
      onboarding: 0, communication: 0, scoring: 0, agreement: 0,
    };
    allEvents.forEach(e => { counts[e.kind] += 1; });
    return counts;
  }, [allEvents]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-slate-500/15 flex items-center justify-center">
            <Activity className="h-6 w-6 text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Vendor Activity Monitor
              <Badge variant="outline" className="text-[10px]">{allEvents.length} events</Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              Composite feed · onboarding + communications + scoring + agreements · sorted recent-first
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Bot className="h-3 w-3" />Saathi · suggested actions · Phase 2
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {(['all', 'onboarding', 'communication', 'scoring', 'agreement'] as const).map(k => {
          const isActive = kindFilter === k;
          const count = k === 'all' ? allEvents.length : kindCounts[k];
          const labels: Record<typeof k, string> = {
            all: 'All',
            onboarding: 'Onboarding',
            communication: 'Communications',
            scoring: 'Scoring',
            agreement: 'Agreements',
          };
          return (
            <button
              key={k}
              onClick={() => setKindFilter(k)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-slate-600 text-white'
                  : 'bg-slate-500/10 text-slate-700 hover:bg-slate-500/20'
              }`}
            >
              {labels[k]} <span className="opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Recent Activity · {filtered.length} {filtered.length === 1 ? 'event' : 'events'}
          </CardTitle>
          <CardDescription>Click any event to view related entity (Phase 2)</CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No activity yet · events appear as vendors interact with the system
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(event => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 rounded-lg border border-border/50 p-3 hover:bg-slate-500/5 transition-colors"
                >
                  <div className={`h-8 w-8 rounded-md flex items-center justify-center flex-shrink-0 ${severityClasses(event.severity)}`}>
                    {kindIcon(event.kind)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{event.vendor_name}</p>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {timeAgo(event.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{event.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
