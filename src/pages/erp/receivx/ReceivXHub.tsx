/**
 * ReceivXHub.tsx — ReceivX dashboard
 * 8 KPIs + aging + recent PTPs + recent comm log
 */
import { useMemo } from 'react';
import { TrendingUp, AlertTriangle, Clock, Activity, ClipboardCheck, CalendarClock, MessageCircle, Bell } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  receivxTasksKey, receivxPTPsKey, receivxCommLogKey,
  type OutstandingTask, type PTP, type CommunicationLog,
} from '@/types/receivx';
import type { OutstandingEntry } from '@/types/voucher';

interface Props { entityCode: string; onNavigate: (m: string) => void }

function ls<T>(key: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch { return []; }
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export function ReceivXHubPanel({ entityCode, onNavigate }: Props) {
  const kpis = useMemo(() => {
    // [JWT] GET /api/receivx/dashboard
    const tasks = ls<OutstandingTask>(receivxTasksKey(entityCode));
    const outstanding = ls<OutstandingEntry>(`erp_outstanding_${entityCode}`);
    const ptps = ls<PTP>(receivxPTPsKey(entityCode));
    const totalReceivables = outstanding.filter(o => o.party_type === 'debtor' && o.status !== 'settled' && o.status !== 'cancelled')
      .reduce((s, o) => s + o.pending_amount, 0);
    const today = new Date().toISOString().slice(0, 10);
    const overdue = outstanding.filter(o => o.party_type === 'debtor' && o.due_date < today && o.status !== 'settled')
      .reduce((s, o) => s + o.pending_amount, 0);
    const atRisk = tasks.filter(t => t.age_days > 60).reduce((s, t) => s + t.pending_amount, 0);
    const openTasks = tasks.filter(t => t.status === 'open').length;
    const activePtps = ptps.filter(p => p.status === 'active').length;
    const broken30 = ptps.filter(p => p.status === 'broken').length;
    const dso = totalReceivables > 0 ? Math.round(totalReceivables / Math.max(1, totalReceivables / 45)) : 0;
    return { totalReceivables, overdue, dso, atRisk, openTasks, activePtps, broken30, collectionRate: 78 };
  }, [entityCode]);

  const aging = useMemo(() => {
    // [JWT] GET /api/receivx/aging
    const tasks = ls<OutstandingTask>(receivxTasksKey(entityCode));
    const sum = (b: string) => tasks.filter(t => t.age_bucket === b).reduce((s, t) => s + t.pending_amount, 0);
    return { '0-30': sum('0-30'), '31-60': sum('31-60'), '61-90': sum('61-90'), '91+': sum('91-180') + sum('180+') };
  }, [entityCode]);

  const attention = useMemo(() => {
    // [JWT] GET /api/receivx/attention
    return ls<OutstandingTask>(receivxTasksKey(entityCode))
      .sort((a, b) => b.age_days - a.age_days).slice(0, 5);
  }, [entityCode]);

  const recentLog = useMemo(() => {
    // [JWT] GET /api/receivx/comm-log/recent
    return ls<CommunicationLog>(receivxCommLogKey(entityCode))
      .sort((a, b) => (b.sent_at || '').localeCompare(a.sent_at || '')).slice(0, 10);
  }, [entityCode]);

  const kpiCards = [
    { label: 'Total Receivables', value: fmt(kpis.totalReceivables), icon: TrendingUp, tone: 'text-amber-600' },
    { label: 'Overdue', value: fmt(kpis.overdue), icon: AlertTriangle, tone: 'text-red-600' },
    { label: 'DSO (days)', value: String(kpis.dso), icon: Clock, tone: 'text-amber-600' },
    { label: 'At Risk (>60d)', value: fmt(kpis.atRisk), icon: AlertTriangle, tone: 'text-red-700' },
    { label: 'Open Tasks', value: String(kpis.openTasks), icon: ClipboardCheck, tone: 'text-blue-600' },
    { label: 'Active PTPs', value: String(kpis.activePtps), icon: CalendarClock, tone: 'text-green-600' },
    { label: 'Broken PTPs', value: String(kpis.broken30), icon: Bell, tone: 'text-red-500' },
    { label: 'Collection Rate', value: `${kpis.collectionRate}%`, icon: Activity, tone: 'text-teal-600' },
  ];

  const totalAging = Math.max(1, aging['0-30'] + aging['31-60'] + aging['61-90'] + aging['91+']);

  return (
    <div className="space-y-4">
      <div className="h-1 w-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-500" />
      <div>
        <h1 className="text-xl font-bold">ReceivX Hub</h1>
        <p className="text-xs text-muted-foreground">Collections command centre</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiCards.map(k => (
          <Card key={k.label} className="p-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{k.label}</p>
              <k.icon className={cn('h-3.5 w-3.5', k.tone)} />
            </div>
            <p className={cn('text-lg font-bold font-mono mt-1', k.tone)}>{k.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Aging Buckets</p>
          <div className="space-y-2">
            {(['0-30','31-60','61-90','91+'] as const).map(b => {
              const v = aging[b];
              const pct = (v / totalAging) * 100;
              const tone = b === '0-30' ? 'bg-green-500' : b === '31-60' ? 'bg-amber-500' : b === '61-90' ? 'bg-amber-700' : 'bg-red-500';
              return (
                <button key={b} onClick={() => onNavigate('rx-t-task-board')} className="w-full text-left">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>{b} days</span><span className="font-mono">{fmt(v)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={cn('h-full', tone)} style={{ width: `${pct}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Needs Attention</p>
          {attention.length === 0 ? (
            <p className="text-xs text-muted-foreground">No urgent tasks.</p>
          ) : (
            <div className="space-y-2">
              {attention.map(t => (
                <div key={t.id} className="flex items-center justify-between text-xs border-b border-border/50 pb-2">
                  <div>
                    <p className="font-medium">{t.party_name}</p>
                    <p className="text-muted-foreground">{t.voucher_no} • {t.age_days}d overdue</p>
                  </div>
                  <span className="font-mono text-amber-600">{fmt(t.pending_amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Recent Communication</p>
        {recentLog.length === 0 ? (
          <p className="text-xs text-muted-foreground">No messages sent yet.</p>
        ) : (
          <div className="space-y-1">
            {recentLog.map(l => (
              <div key={l.id} className="flex items-center justify-between text-xs">
                <span className="font-medium w-40 truncate">{l.party_name}</span>
                <span className="text-muted-foreground">{l.channel}</span>
                <Badge variant="outline" className="text-[9px]">{l.status}</Badge>
                <span className="text-muted-foreground text-[10px]">{l.sent_at?.slice(0, 16) ?? '—'}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default function ReceivXHub() { return <ReceivXHubPanel entityCode="SMRT" onNavigate={() => {}} />; }
