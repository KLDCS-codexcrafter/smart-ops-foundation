/**
 * @file        src/pages/erp/servicedesk/reports/ServiceDayBook.tsx
 * @purpose     C.1d · Service Day Book · daily ticket activity log (raised / resolved / closed)
 * @sprint      T-Phase-1.C.1d · Block D.5
 * @iso         Usability
 */
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { listServiceTickets } from '@/lib/servicedesk-engine';
import type { ServiceTicket } from '@/types/service-ticket';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface DayEvent {
  ticket: ServiceTicket;
  event: 'raised' | 'resolved' | 'closed';
  at: string;
}

export function ServiceDayBook(): JSX.Element {
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [day, setDay] = useState<string>(isoDate(new Date()));
  useEffect(() => setTickets(listServiceTickets()), []);

  const events = useMemo<DayEvent[]>(() => {
    const out: DayEvent[] = [];
    for (const t of tickets) {
      if (t.raised_at && isoDate(new Date(t.raised_at)) === day) out.push({ ticket: t, event: 'raised', at: t.raised_at });
      if (t.resolved_at && isoDate(new Date(t.resolved_at)) === day) out.push({ ticket: t, event: 'resolved', at: t.resolved_at });
      if (t.closed_at && isoDate(new Date(t.closed_at)) === day) out.push({ ticket: t, event: 'closed', at: t.closed_at });
    }
    return out.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [tickets, day]);

  const counts = useMemo(() => ({
    raised: events.filter((e) => e.event === 'raised').length,
    resolved: events.filter((e) => e.event === 'resolved').length,
    closed: events.filter((e) => e.event === 'closed').length,
  }), [events]);

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Service Day Book</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Daily ticket activity · raised · resolved · closed · {fmtDate(day + 'T00:00:00')}
          </p>
        </div>
        <Input
          type="date"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          className="w-44"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card p-4">
          <div className="text-xs text-muted-foreground">Raised</div>
          <div className="text-2xl font-mono mt-1 text-primary">{counts.raised}</div>
        </Card>
        <Card className="glass-card p-4">
          <div className="text-xs text-muted-foreground">Resolved</div>
          <div className="text-2xl font-mono mt-1 text-warning">{counts.resolved}</div>
        </Card>
        <Card className="glass-card p-4">
          <div className="text-xs text-muted-foreground">Closed</div>
          <div className="text-2xl font-mono mt-1 text-success">{counts.closed}</div>
        </Card>
      </div>

      <Card className="glass-card overflow-x-auto">
        {events.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No ticket activity for {fmtDate(day + 'T00:00:00')}.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left p-3 font-medium">Time</th>
                <th className="text-left p-3 font-medium">Event</th>
                <th className="text-left p-3 font-medium">Ticket</th>
                <th className="text-left p-3 font-medium">Severity</th>
                <th className="text-left p-3 font-medium">Customer</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e, idx) => (
                <tr key={`${e.ticket.id}-${e.event}-${idx}`} className="border-b border-border/50">
                  <td className="p-3 font-mono text-xs">{fmtTime(e.at)}</td>
                  <td className="p-3">
                    <Badge
                      variant="outline"
                      className={
                        e.event === 'raised' ? 'border-primary text-primary' :
                        e.event === 'resolved' ? 'border-warning text-warning' :
                        'border-success text-success'
                      }
                    >
                      {e.event}
                    </Badge>
                  </td>
                  <td className="p-3 font-mono text-xs">{e.ticket.ticket_no}</td>
                  <td className="p-3 font-mono text-xs">{e.ticket.severity}</td>
                  <td className="p-3 font-mono text-xs">{e.ticket.customer_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
