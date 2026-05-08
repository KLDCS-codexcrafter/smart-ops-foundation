/**
 * @file        PeqFollowupRegisterPanel.tsx
 * @purpose     Read-only register · all open procurement enquiries with key timestamps.
 * @sprint      T-Phase-1.A.3.c-Procure360-OOB-Polish-PEQ-FU
 * @decisions   D-NEW-AQ
 * @disciplines FR-19 · FR-30 · FR-50
 * @reuses      procurement-enquiry-engine
 * @[JWT]       n/a · register view
 */

import { useMemo } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { listEnquiries } from '@/lib/procurement-enquiry-engine';
import type { ProcurementEnquiry } from '@/types/procurement-enquiry';

const fmtDate = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const ageDays = (iso: string): number => {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
};

const FINAL: ProcurementEnquiry['status'][] = ['cancelled', 'closed', 'rejected'];

export function PeqFollowupRegisterPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const items = useMemo<ProcurementEnquiry[]>(
    () => listEnquiries(entityCode).filter((e) => !FINAL.includes(e.status)),
    [entityCode],
  );

  const kpis = useMemo(() => ({
    total: items.length,
    pendingQuotes: items.filter((e) => e.status === 'quotations_pending').length,
    pendingAward: items.filter((e) => e.status === 'award_pending').length,
    avgAge: items.length === 0
      ? 0
      : Math.round(items.reduce((s, e) => s + ageDays(e.created_at), 0) / items.length),
  }), [items]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">PEQ Followup Register</h1>
        <p className="text-sm text-muted-foreground">Open procurement enquiries · register view (read-only).</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Open</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-mono">{kpis.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending Quotations</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-mono">{kpis.pendingQuotes}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending Award</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-mono text-warning">{kpis.pendingAward}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg Days Open</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-mono">{kpis.avgAge}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No open enquiries.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">Enquiry #</th>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Department</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-right p-2">Days Open</th>
                  <th className="text-right p-2">RFQs</th>
                  <th className="text-right p-2">Awarded</th>
                  <th className="text-left p-2">Awarded At</th>
                </tr>
              </thead>
              <tbody>
                {items.map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="p-2 font-mono">{e.enquiry_no}</td>
                    <td className="p-2">{fmtDate(e.enquiry_date)}</td>
                    <td className="p-2 text-xs">{e.department_id ?? '—'}</td>
                    <td className="p-2"><Badge variant="secondary">{e.status}</Badge></td>
                    <td className="p-2 text-right font-mono">{ageDays(e.created_at)}</td>
                    <td className="p-2 text-right font-mono">{e.rfq_ids.length}</td>
                    <td className="p-2 text-right font-mono">{e.awarded_quotation_ids.length}</td>
                    <td className="p-2 text-xs">{fmtDate(e.awarded_at)}</td>
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
