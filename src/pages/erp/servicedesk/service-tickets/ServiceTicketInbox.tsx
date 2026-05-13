/**
 * @file        src/pages/erp/servicedesk/service-tickets/ServiceTicketInbox.tsx
 * @purpose     Service Ticket inbox · 8-state filter · channel/severity pills · SLA flash timer
 * @sprint      T-Phase-1.C.1c · Block D.1
 * @iso        Usability + Functional Suitability + Reliability
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Timer } from 'lucide-react';
import { listServiceTickets } from '@/lib/servicedesk-engine';
import type { ServiceTicketStatus, ServiceTicketSeverity, ServiceTicketChannel } from '@/types/service-ticket';

interface Props {
  onOpen: (id: string) => void;
  onRaise?: () => void;
}

const STATUS_OPTIONS: ServiceTicketStatus[] = [
  'raised', 'acknowledged', 'assigned', 'in_progress', 'on_hold', 'resolved', 'closed', 'reopened',
];
const SEVERITY_OPTIONS: ServiceTicketSeverity[] = ['sev1_critical', 'sev2_high', 'sev3_medium', 'sev4_low'];
const CHANNEL_OPTIONS: ServiceTicketChannel[] = ['whatsapp', 'email', 'phone', 'walkin', 'web', 'auto_pms'];

function severityVariant(sev: ServiceTicketSeverity): 'destructive' | 'default' | 'secondary' | 'outline' {
  if (sev === 'sev1_critical') return 'destructive';
  if (sev === 'sev2_high') return 'default';
  if (sev === 'sev3_medium') return 'secondary';
  return 'outline';
}

function statusLabel(s: ServiceTicketStatus): string {
  return s.replace(/_/g, ' ');
}

export function ServiceTicketInbox({ onOpen, onRaise }: Props): JSX.Element {
  const [statusFilter, setStatusFilter] = useState<ServiceTicketStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<ServiceTicketSeverity | 'all'>('all');
  const [channelFilter, setChannelFilter] = useState<ServiceTicketChannel | 'all'>('all');
  const [query, setQuery] = useState('');

  const tickets = useMemo(() => {
    return listServiceTickets({
      status: statusFilter === 'all' ? undefined : statusFilter,
      severity: severityFilter === 'all' ? undefined : severityFilter,
      channel: channelFilter === 'all' ? undefined : channelFilter,
    }).filter((t) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        t.ticket_no.toLowerCase().includes(q) ||
        t.customer_id.toLowerCase().includes(q) ||
        t.call_type_code.toLowerCase().includes(q)
      );
    });
  }, [statusFilter, severityFilter, channelFilter, query]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Service Tickets</h1>
          <p className="text-sm text-muted-foreground">Inbox · {tickets.length} ticket(s)</p>
        </div>
        {onRaise && (
          <Button onClick={onRaise}>
            <Plus className="h-4 w-4 mr-2" /> Raise New
          </Button>
        )}
      </div>

      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search ticket no / customer" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ServiceTicketStatus | 'all')}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as ServiceTicketSeverity | 'all')}>
            <SelectTrigger><SelectValue placeholder="Severity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              {SEVERITY_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={channelFilter} onValueChange={(v) => setChannelFilter(v as ServiceTicketChannel | 'all')}>
            <SelectTrigger><SelectValue placeholder="Channel" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              {CHANNEL_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        {tickets.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <p>No tickets match the current filters.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="p-3 font-medium">Ticket</th>
                <th className="p-3 font-medium">Customer</th>
                <th className="p-3 font-medium">Call Type</th>
                <th className="p-3 font-medium">Severity</th>
                <th className="p-3 font-medium">Channel</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">SLA</th>
                <th className="p-3 font-medium">Engineer</th>
                <th className="p-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => {
                const flashLow = t.flash_timer_minutes_remaining > 0 && t.flash_timer_minutes_remaining <= 30;
                return (
                  <tr key={t.id} className="border-t hover:bg-muted/20">
                    <td className="p-3 font-mono">{t.ticket_no}</td>
                    <td className="p-3">{t.customer_id}</td>
                    <td className="p-3">{t.call_type_code}</td>
                    <td className="p-3"><Badge variant={severityVariant(t.severity)}>{t.severity}</Badge></td>
                    <td className="p-3"><Badge variant="outline">{t.channel}</Badge></td>
                    <td className="p-3"><Badge variant="secondary">{statusLabel(t.status)}</Badge></td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 font-mono text-xs ${flashLow ? 'text-destructive' : 'text-muted-foreground'}`}>
                        <Timer className="h-3 w-3" />
                        {t.flash_timer_minutes_remaining}m
                      </span>
                    </td>
                    <td className="p-3 text-xs">{t.assigned_engineer_id ?? '—'}</td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => onOpen(t.id)}>Open</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
