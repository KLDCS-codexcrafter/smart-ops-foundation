/**
 * @file        PeqFollowupPanel.tsx
 * @purpose     PEQ Followup (Action) · interactive tracker for pending enquiries.
 * @who         Lovable · Procurement desk
 * @when        2026-05-08
 * @sprint      T-Phase-1.A.3.c-Procure360-OOB-Polish-PEQ-FU
 * @iso         25010 · Functional Suitability + Usability
 * @whom        Procurement department (FR-40)
 * @decisions   D-NEW-AQ (PEQ followup · separate from register · interactive panel)
 * @disciplines FR-19 · FR-30 · FR-50 · FR-53
 * @reuses      procurement-enquiry-engine · cross-card-activity-engine · sonner toast
 * @[JWT]       PATCH /api/procurement-enquiries/{id}/status — localStorage in Phase 1
 */

import { useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  listEnquiries,
  transitionEnquiryStatus,
} from '@/lib/procurement-enquiry-engine';
import { recordActivity } from '@/lib/cross-card-activity-engine';
import type { ProcurementEnquiry, ProcurementEnquiryStatus } from '@/types/procurement-enquiry';

const ACTIONABLE: ProcurementEnquiryStatus[] = [
  'rfqs_dispatched',
  'quotations_pending',
  'quotations_received',
  'award_pending',
];

const fmtDate = (iso: string): string =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const ageDays = (iso: string): number => {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
};

export function PeqFollowupPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [version, setVersion] = useState(0);

  const items = useMemo<ProcurementEnquiry[]>(
    () => {
      void version;
      return listEnquiries(entityCode).filter((e) => ACTIONABLE.includes(e.status));
    },
    [entityCode, version],
  );

  const kpis = useMemo(() => ({
    pending: items.filter((e) => e.status === 'quotations_pending').length,
    awaitingAward: items.filter((e) => e.status === 'award_pending').length,
    avgAge: items.length === 0
      ? 0
      : Math.round(items.reduce((s, e) => s + ageDays(e.created_at), 0) / items.length),
  }), [items]);

  function sendReminder(enq: ProcurementEnquiry): void {
    recordActivity(entityCode, enq.requested_by_user_id, {
      card_id: 'procure360',
      kind: 'module',
      ref_id: enq.id,
      title: `Reminder sent: ${enq.enquiry_no}`,
      subtitle: `Status: ${enq.status}`,
      deep_link: `/erp/procure-hub#enquiry-list?id=${enq.id}`,
    });
    toast.success(`Reminder sent for ${enq.enquiry_no}`);
  }

  function escalate(enq: ProcurementEnquiry): void {
    try {
      transitionEnquiryStatus(enq.id, 'pending_approval', entityCode, enq.requested_by_user_id);
      toast.success(`${enq.enquiry_no} escalated to HOD`);
      setVersion((n) => n + 1);
    } catch (err) {
      toast.error(`Escalation rejected: ${(err as Error).message}`);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">PEQ Followup (Action)</h1>
        <p className="text-sm text-muted-foreground">
          Pending procurement enquiries · escalate or remind.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Quotations Pending</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-mono">{kpis.pending}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Awaiting Award</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-mono text-warning">{kpis.awaitingAward}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg Age (days)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-mono">{kpis.avgAge}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No actionable enquiries.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">Enquiry #</th>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-right p-2">Age (d)</th>
                  <th className="text-right p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((enq) => (
                  <tr key={enq.id} className="border-t">
                    <td className="p-2 font-mono">{enq.enquiry_no}</td>
                    <td className="p-2">{fmtDate(enq.enquiry_date)}</td>
                    <td className="p-2"><Badge variant="secondary">{enq.status}</Badge></td>
                    <td className="p-2 text-right font-mono">{ageDays(enq.created_at)}</td>
                    <td className="p-2 text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => sendReminder(enq)}>
                        <Send className="h-3 w-3 mr-1" /> Remind
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => escalate(enq)}>
                        <AlertCircle className="h-3 w-3 mr-1" /> Escalate
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
