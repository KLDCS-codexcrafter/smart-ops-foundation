/**
 * DisputeStatsReport.tsx — Dispute volume, resolution time, per-reason breakdown
 * Module id: dh-r-dispute-stats
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import {
  disputesKey, DISPUTE_REASON_LABELS,
  type InvoiceDispute,
} from '@/types/invoice-dispute';

const ENTITY = DEFAULT_ENTITY_SHORTCODE;

const COLOURS = ['#4F46E5', '#F59E0B', '#EF4444', '#10B981', '#8B5CF6', '#64748B'];

const RESOLVED_STATUSES = new Set(['credit_noted', 'rejected', 'partial']);

export function DisputeStatsReportPanel() {
  const stats = useMemo(() => {
    let disputes: InvoiceDispute[] = [];
    try {
      // [JWT] GET /api/reports/distributor-disputes
      const raw = localStorage.getItem(disputesKey(ENTITY));
      disputes = raw ? JSON.parse(raw) : [];
    } catch { /* ignore */ }

    const open = disputes.filter(d => d.status === 'open' || d.status === 'under_review').length;
    const resolved = disputes.filter(d => RESOLVED_STATUSES.has(d.status)).length;

    const byReason = new Map<string, number>();
    for (const d of disputes) {
      const label = DISPUTE_REASON_LABELS[d.reason] ?? d.reason;
      byReason.set(label, (byReason.get(label) ?? 0) + 1);
    }
    const reasonSeries = Array.from(byReason.entries()).map(([reason, count]) => ({ reason, count }));

    const resolvedWithDates = disputes.filter(d =>
      RESOLVED_STATUSES.has(d.status) && d.reviewed_at && d.created_at,
    );
    const avgDays = resolvedWithDates.length === 0
      ? 0
      : Math.round(resolvedWithDates.reduce((sum, d) =>
          sum + (new Date(d.reviewed_at!).getTime() - new Date(d.created_at).getTime()) / 86_400_000,
        0) / resolvedWithDates.length * 10) / 10;

    return { total: disputes.length, open, resolved, avgDays, reasonSeries };
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold">Dispute Statistics</h2>
        <p className="text-sm text-muted-foreground">Volume, resolution time, reason breakdown.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3">
          <span className="text-xs text-muted-foreground">Total</span>
          <p className="text-2xl font-bold font-mono">{stats.total}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <span className="text-xs text-muted-foreground">Open</span>
          <p className="text-2xl font-bold font-mono text-amber-600">{stats.open}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <span className="text-xs text-muted-foreground">Resolved</span>
          <p className="text-2xl font-bold font-mono text-emerald-600">{stats.resolved}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <span className="text-xs text-muted-foreground">Avg resolution (days)</span>
          <p className="text-2xl font-bold font-mono">{stats.avgDays}</p>
        </CardContent></Card>
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">By reason</CardTitle></CardHeader>
        <CardContent>
          <div style={{ width: '100%', height: 260 }}>
            {stats.reasonSeries.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No disputes recorded yet.
              </div>
            ) : (
              <ResponsiveContainer>
                <BarChart data={stats.reasonSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="reason" fontSize={10} />
                  <YAxis fontSize={10} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count">
                    {stats.reasonSeries.map((_, i) => (
                      <Cell key={i} fill={COLOURS[i % COLOURS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DisputeStatsReportPanel;
