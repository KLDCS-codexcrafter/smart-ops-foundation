/**
 * @file        src/pages/erp/servicedesk/reports/SLAPerformance.tsx
 * @purpose     C.1d · SLA Performance report · response/resolution attainment % by severity
 * @sprint      T-Phase-1.C.1d · Block D.3
 * @iso         Functional Suitability + Usability
 */
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { listServiceTickets } from '@/lib/servicedesk-engine';
import type { ServiceTicket, ServiceTicketSeverity } from '@/types/service-ticket';

const SEVS: ServiceTicketSeverity[] = ['sev1_critical', 'sev2_high', 'sev3_medium', 'sev4_low'];
const SEV_LABEL: Record<ServiceTicketSeverity, string> = {
  sev1_critical: 'Sev1',
  sev2_high: 'Sev2',
  sev3_medium: 'Sev3',
  sev4_low: 'Sev4',
};

interface SLARow {
  severity: string;
  total: number;
  response_met: number;
  resolution_met: number;
  response_pct: number;
  resolution_pct: number;
}

function computeRows(tickets: ServiceTicket[]): SLARow[] {
  return SEVS.map((sv) => {
    const subset = tickets.filter((t) => t.severity === sv);
    const total = subset.length;
    const response_met = subset.filter((t) => {
      if (!t.acked_at || !t.sla_response_due_at) return false;
      return new Date(t.acked_at).getTime() <= new Date(t.sla_response_due_at).getTime();
    }).length;
    const resolution_met = subset.filter((t) => {
      if (!t.resolved_at || !t.sla_resolution_due_at) return false;
      return new Date(t.resolved_at).getTime() <= new Date(t.sla_resolution_due_at).getTime();
    }).length;
    return {
      severity: SEV_LABEL[sv],
      total,
      response_met,
      resolution_met,
      response_pct: total > 0 ? Math.round((response_met / total) * 100) : 0,
      resolution_pct: total > 0 ? Math.round((resolution_met / total) * 100) : 0,
    };
  });
}

export function SLAPerformance(): JSX.Element {
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  useEffect(() => setTickets(listServiceTickets()), []);

  const rows = useMemo(() => computeRows(tickets), [tickets]);
  const empty = rows.every((r) => r.total === 0);
  const overall = useMemo(() => {
    const total = rows.reduce((s, r) => s + r.total, 0);
    const r_met = rows.reduce((s, r) => s + r.response_met, 0);
    const re_met = rows.reduce((s, r) => s + r.resolution_met, 0);
    return {
      total,
      response_pct: total > 0 ? Math.round((r_met / total) * 100) : 0,
      resolution_pct: total > 0 ? Math.round((re_met / total) * 100) : 0,
    };
  }, [rows]);

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold">SLA Performance</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Response + Resolution attainment by severity · all tickets · entity OPRX
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card p-4">
          <div className="text-xs text-muted-foreground">Tickets</div>
          <div className="text-2xl font-mono mt-1">{overall.total}</div>
        </Card>
        <Card className="glass-card p-4">
          <div className="text-xs text-muted-foreground">Response SLA met</div>
          <div className="text-2xl font-mono mt-1 text-success">{overall.response_pct}%</div>
        </Card>
        <Card className="glass-card p-4">
          <div className="text-xs text-muted-foreground">Resolution SLA met</div>
          <div className="text-2xl font-mono mt-1 text-success">{overall.resolution_pct}%</div>
        </Card>
      </div>

      <Card className="glass-card p-4">
        {empty ? (
          <div className="text-center py-12 text-muted-foreground">
            No tickets yet · attainment will populate as tickets are acknowledged and resolved.
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="severity" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                  }}
                />
                <Legend />
                <Bar dataKey="response_pct" name="Response %" fill="hsl(var(--primary))" />
                <Bar dataKey="resolution_pct" name="Resolution %" fill="hsl(var(--success))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr>
              <th className="text-left p-3 font-medium">Severity</th>
              <th className="text-right p-3 font-medium">Tickets</th>
              <th className="text-right p-3 font-medium">Response Met</th>
              <th className="text-right p-3 font-medium">Resolution Met</th>
              <th className="text-right p-3 font-medium">Response %</th>
              <th className="text-right p-3 font-medium">Resolution %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.severity} className="border-b border-border/50">
                <td className="p-3">{r.severity}</td>
                <td className="p-3 text-right font-mono">{r.total}</td>
                <td className="p-3 text-right font-mono">{r.response_met}</td>
                <td className="p-3 text-right font-mono">{r.resolution_met}</td>
                <td className="p-3 text-right font-mono">{r.response_pct}%</td>
                <td className="p-3 text-right font-mono">{r.resolution_pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
