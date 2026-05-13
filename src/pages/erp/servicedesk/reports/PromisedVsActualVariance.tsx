/**
 * @file        src/pages/erp/servicedesk/reports/PromisedVsActualVariance.tsx
 * @purpose     C.1e · Carry-forward UI from C.1d T2 · 4-axis variance + trust score
 * @sprint      T-Phase-1.C.1e · Block C
 * @iso         Functional Suitability + Usability
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  computeTicketVariance,
  listServiceTickets,
} from '@/lib/servicedesk-engine';
import type { ServiceTicket } from '@/types/service-ticket';

const ENTITY = 'OPRX';
type GroupBy = 'engineer' | 'customer' | 'product';

interface VarianceRow {
  key: string;
  label: string;
  timeline_variance_days: number;
  cost_variance_paise: number;
  route_changed_pct: number;
  spares_variance_qty: number;
  trust_score: number;
  ticket_count: number;
}

function aggregate(tickets: ServiceTicket[], groupBy: GroupBy): VarianceRow[] {
  const buckets = new Map<string, VarianceRow>();
  for (const t of tickets) {
    if (!t.closed_at) continue;
    const v = computeTicketVariance(
      t.id,
      { timeline_days: 1, cost_paise: 100000, route_type: 'in_warranty', spares_qty: 0 },
      ENTITY,
    );
    if (!v) continue;
    const key =
      groupBy === 'engineer' ? (t.assigned_engineer_id ?? 'unassigned')
      : groupBy === 'customer' ? t.customer_id
      : t.call_type_code;
    const existing = buckets.get(key) ?? {
      key,
      label: key,
      timeline_variance_days: 0,
      cost_variance_paise: 0,
      route_changed_pct: 0,
      spares_variance_qty: 0,
      trust_score: 0,
      ticket_count: 0,
    };
    existing.timeline_variance_days += v.timeline_variance_days;
    existing.cost_variance_paise += v.cost_variance_paise;
    existing.route_changed_pct += v.route_changed ? 100 : 0;
    existing.spares_variance_qty += v.spares_variance_qty;
    existing.trust_score += v.trust_score;
    existing.ticket_count += 1;
    buckets.set(key, existing);
  }
  return Array.from(buckets.values()).map((b) => ({
    ...b,
    trust_score: b.ticket_count ? Math.round(b.trust_score / b.ticket_count) : 0,
    route_changed_pct: b.ticket_count ? Math.round(b.route_changed_pct / b.ticket_count) : 0,
  }));
}

export function PromisedVsActualVariance(): JSX.Element {
  const [groupBy, setGroupBy] = useState<GroupBy>('engineer');
  const tickets = listServiceTickets({ entity_id: ENTITY });
  const rows = useMemo(() => aggregate(tickets, groupBy), [tickets, groupBy]);
  const outliers = useMemo(
    () => [...rows].sort((a, b) => a.trust_score - b.trust_score).slice(0, 5),
    [rows],
  );

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Promised vs Actual · Variance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            4-axis variance + weighted trust score · {rows.length} groups · {tickets.filter(t => t.closed_at).length} closed tickets
          </p>
        </div>
        <div className="flex gap-2">
          {(['engineer', 'customer', 'product'] as GroupBy[]).map((g) => (
            <Button key={g} variant={groupBy === g ? 'default' : 'outline'} size="sm" onClick={() => setGroupBy(g)}>
              By {g}
            </Button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <Card className="glass-card p-12 text-center text-muted-foreground">
          No closed tickets in range yet
        </Card>
      ) : (
        <>
          <Card className="glass-card p-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Legend />
                  <Bar dataKey="timeline_variance_days" fill="hsl(var(--primary))" name="Timeline Δ days" />
                  <Bar dataKey="cost_variance_paise" fill="hsl(var(--destructive))" name="Cost Δ paise" />
                  <Bar dataKey="route_changed_pct" fill="hsl(var(--warning))" name="Route changed %" />
                  <Bar dataKey="spares_variance_qty" fill="hsl(var(--success))" name="Spares Δ qty" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="glass-card p-4">
            <h2 className="text-lg font-semibold mb-3">Top 5 Outliers · Lowest Trust</h2>
            <div className="space-y-2">
              {outliers.map((o) => (
                <div key={o.key} className="flex items-center justify-between border border-border/50 rounded-lg p-3">
                  <div>
                    <p className="font-mono text-xs">{o.label}</p>
                    <p className="text-xs text-muted-foreground">{o.ticket_count} tickets</p>
                  </div>
                  <Badge variant={o.trust_score < 50 ? 'destructive' : 'secondary'}>
                    Trust {o.trust_score}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
