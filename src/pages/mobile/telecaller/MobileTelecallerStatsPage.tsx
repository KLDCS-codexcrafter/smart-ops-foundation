/**
 * MobileTelecallerStatsPage.tsx — Self-stats: today + this month
 * Sprint T-Phase-1.1.1l-b
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Phone, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import { type CallSession, type CallDisposition, callSessionsKey } from '@/types/call-session';

function readSession(): MobileSession | null {
  try {
    const raw = sessionStorage.getItem('opx_mobile_session');
    return raw ? (JSON.parse(raw) as MobileSession) : null;
  } catch { return null; }
}

function loadList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}

const DISPOSITION_LABELS: Record<CallDisposition, string> = {
  interested: 'Interested',
  not_interested: 'Not Interested',
  callback: 'Callback',
  no_answer: 'No Answer',
  wrong_number: 'Wrong Number',
  dnd: 'DND',
  converted: 'Converted',
};

function fmtDuration(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

interface Stats {
  total: number;
  converted: number;
  conversionRate: number;
  avgDuration: number;
  byDisposition: Partial<Record<CallDisposition, number>>;
}

function computeStats(calls: CallSession[]): Stats {
  const total = calls.length;
  const converted = calls.filter(c => c.disposition === 'converted').length;
  const totalDuration = calls.reduce((s, c) => s + (c.duration_seconds || 0), 0);
  const byDisposition: Partial<Record<CallDisposition, number>> = {};
  for (const c of calls) {
    byDisposition[c.disposition] = (byDisposition[c.disposition] ?? 0) + 1;
  }
  return {
    total,
    converted,
    conversionRate: total > 0 ? (converted / total) * 100 : 0,
    avgDuration: total > 0 ? Math.round(totalDuration / total) : 0,
    byDisposition,
  };
}

export default function MobileTelecallerStatsPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const calls = useMemo(() => session ? loadList<CallSession>(callSessionsKey(session.entity_code)) : [], [session]);

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';

  const myCalls = useMemo(
    () => calls.filter(c => c.telecaller_id === session?.user_id),
    [calls, session],
  );
  const todayStats = useMemo(() => computeStats(myCalls.filter(c => c.call_date === today)), [myCalls, today]);
  const monthStats = useMemo(() => computeStats(myCalls.filter(c => c.call_date >= monthStart)), [myCalls, monthStart]);

  if (!session) return null;

  const renderBlock = (title: string, stats: Stats) => (
    <Card className="p-3 space-y-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded bg-blue-500/5 border border-blue-500/20">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><Phone className="h-3 w-3" /> Calls</div>
          <p className="text-xl font-mono font-bold text-blue-700">{stats.total}</p>
        </div>
        <div className="p-2 rounded bg-green-500/5 border border-green-500/20">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><CheckCircle2 className="h-3 w-3" /> Converted</div>
          <p className="text-xl font-mono font-bold text-green-700">{stats.converted}</p>
        </div>
        <div className="p-2 rounded bg-amber-500/5 border border-amber-500/20">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><TrendingUp className="h-3 w-3" /> Conv. Rate</div>
          <p className="text-xl font-mono font-bold text-amber-700">{stats.conversionRate.toFixed(1)}%</p>
        </div>
        <div className="p-2 rounded bg-purple-500/5 border border-purple-500/20">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><Clock className="h-3 w-3" /> Avg Time</div>
          <p className="text-lg font-mono font-bold text-purple-700">{fmtDuration(stats.avgDuration)}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {(Object.keys(DISPOSITION_LABELS) as CallDisposition[]).map(d => (
          <Badge key={d} variant="outline" className="text-[10px]">
            {DISPOSITION_LABELS[d]}: {stats.byDisposition[d] ?? 0}
          </Badge>
        ))}
      </div>
    </Card>
  );

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/telecaller')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">My Stats</h1>
      </div>
      {renderBlock('Today', todayStats)}
      {renderBlock('This Month', monthStats)}
    </div>
  );
}
