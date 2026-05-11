/**
 * @file        src/pages/erp/maintainpro/transactions/InternalMaintenanceTicket.tsx
 * @purpose     Internal Maintenance Ticket UI · FULL SLA (28-cell matrix) · 5-state + Reopen · 3-level escalation
 * @sprint      T-Phase-1.A.16b · Block F · Q-LOCK-2
 */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  createInternalTicket,
  listInternalTickets,
  transitionTicketStatus,
  evaluateTicketEscalations,
} from '@/lib/maintainpro-engine';
import type { InternalMaintenanceTicket as Tkt, TicketCategory, TicketSeverity, TicketStatus } from '@/types/maintainpro';
import { SLA_MATRIX } from '@/types/maintainpro';

interface Props { onNavigate: (m: string) => void }
const E = 'DEMO';

const CATEGORIES: TicketCategory[] = ['electrical', 'mechanical', 'pneumatic', 'hydraulic', 'safety', 'calibration', 'housekeeping'];
const SEVERITIES: TicketSeverity[] = ['low', 'medium', 'high', 'critical'];

function levelBadge(level: 0 | 1 | 2 | 3): JSX.Element {
  if (level === 0) return <Badge variant="outline">L0</Badge>;
  if (level === 1) return <Badge className="bg-warning text-warning-foreground">L1</Badge>;
  if (level === 2) return <Badge className="bg-warning text-warning-foreground">L2</Badge>;
  return <Badge variant="destructive">L3</Badge>;
}

export function InternalMaintenanceTicket(_props: Props): JSX.Element {
  const [category, setCategory] = useState<TicketCategory>('electrical');
  const [severity, setSeverity] = useState<TicketSeverity>('medium');
  const [symptom, setSymptom] = useState('');
  const [list, setList] = useState<Tkt[]>(listInternalTickets(E));

  const refresh = (): void => setList(listInternalTickets(E));

  const create = (): void => {
    if (!symptom) { toast.error('Symptom required'); return; }
    createInternalTicket(E, {
      ticket_no: `TKT/26-27/${String(list.length + 1).padStart(4, '0')}`,
      originating_department_id: 'production',
      originating_user_id: 'demo_user',
      equipment_id: null,
      category,
      symptom,
      photo_urls: [],
      severity,
      status: 'open',
      acknowledged_at: null,
      acknowledged_by_user_id: null,
      in_progress_at: null,
      resolved_at: null,
      closed_at: null,
      converted_to_work_order_id: null,
      resolution_notes: '',
      resolved_by_user_id: null,
      parts_used: [],
      project_id: null,
    });
    setSymptom('');
    refresh();
    toast.success('Ticket raised');
  };

  const transition = (id: string, status: TicketStatus): void => {
    transitionTicketStatus(E, id, status, 'demo_user');
    refresh();
  };

  const runEscalation = (): void => {
    const updated = evaluateTicketEscalations(E);
    refresh();
    toast.info(`${updated.length} ticket(s) escalated`);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Internal Maintenance Ticket</h1>
      <p className="text-sm text-muted-foreground">FULL SLA · 28-cell matrix · 3-level escalation · 5-state + Reopen</p>

      <Card><CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Category</Label>
            <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value as TicketCategory)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1"><Label>Severity</Label>
            <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm" value={severity} onChange={(e) => setSeverity(e.target.value as TicketSeverity)}>
              {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-1"><Label>Symptom</Label><Textarea value={symptom} onChange={(e) => setSymptom(e.target.value)} /></div>
        <div className="text-xs text-muted-foreground font-mono">
          SLA: ack {SLA_MATRIX[category][severity].ack_hours}h · resolution {SLA_MATRIX[category][severity].resolution_hours}h
        </div>
        <div className="flex gap-2">
          <Button onClick={create}>Raise Ticket</Button>
          <Button variant="outline" onClick={runEscalation}>Run Escalation Check</Button>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-4">
        <h3 className="text-sm font-medium mb-2">Tickets ({list.length})</h3>
        <div className="space-y-2 text-xs">
          {list.slice().reverse().map((t) => (
            <div key={t.id} className="flex items-center gap-2 py-2 border-b border-border">
              <span className="font-mono w-32">{t.ticket_no}</span>
              <span className="text-muted-foreground w-24">{t.category}</span>
              <span className="text-muted-foreground w-16">{t.severity}</span>
              <Badge variant="outline">{t.status}</Badge>
              {levelBadge(t.escalation_level)}
              {t.is_resolution_breached && <Badge variant="destructive">Breach</Badge>}
              <div className="ml-auto flex gap-1">
                {t.status === 'open' && <Button size="sm" variant="outline" onClick={() => transition(t.id, 'acknowledged')}>Ack</Button>}
                {t.status === 'acknowledged' && <Button size="sm" variant="outline" onClick={() => transition(t.id, 'in_progress')}>Start</Button>}
                {t.status === 'in_progress' && <Button size="sm" variant="outline" onClick={() => transition(t.id, 'resolved')}>Resolve</Button>}
                {t.status === 'resolved' && <>
                  <Button size="sm" variant="outline" onClick={() => transition(t.id, 'closed')}>Close</Button>
                  <Button size="sm" variant="outline" onClick={() => transition(t.id, 'reopened')}>Reopen</Button>
                </>}
              </div>
            </div>
          ))}
          {list.length === 0 && <div className="text-muted-foreground">No tickets</div>}
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-4">
        <h3 className="text-sm font-medium mb-2">SLA Matrix (28 cells · hours · ack/resolution)</h3>
        <div className="overflow-x-auto">
          <table className="text-xs font-mono w-full">
            <thead><tr className="text-muted-foreground">
              <th className="text-left p-1">Category</th>
              {SEVERITIES.map((s) => <th key={s} className="text-left p-1">{s}</th>)}
            </tr></thead>
            <tbody>
              {CATEGORIES.map((c) => (
                <tr key={c} className="border-t border-border">
                  <td className="p-1">{c}</td>
                  {SEVERITIES.map((s) => (
                    <td key={s} className="p-1">{SLA_MATRIX[c][s].ack_hours}/{SLA_MATRIX[c][s].resolution_hours}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent></Card>
    </div>
  );
}

export default InternalMaintenanceTicket;
