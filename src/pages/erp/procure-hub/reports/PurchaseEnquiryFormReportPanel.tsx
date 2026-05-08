/**
 * @file        PurchaseEnquiryFormReportPanel.tsx
 * @purpose     Trident B6 parity · form-style detail view of a single PEQ.
 * @who         Lovable · Procurement desk
 * @when        2026-05-08
 * @sprint      T-Phase-1.A.3.c-Procure360-OOB-Polish-PEQ-FU
 * @iso         25010 · Functional Suitability (Trident parity) + Usability
 * @whom        Procurement (FR-40)
 * @decisions   D-NEW-AQ (Trident B6 form report)
 * @disciplines FR-19 · FR-30 · FR-50
 * @reuses      procurement-enquiry-engine (listEnquiries · getEnquiry)
 * @[JWT]       GET /api/procurement-enquiries/{id} — localStorage in Phase 1
 */

import { useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { listEnquiries, getEnquiry } from '@/lib/procurement-enquiry-engine';
import type { ProcurementEnquiry } from '@/types/procurement-enquiry';

const fmtDate = (iso: string): string =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export function PurchaseEnquiryFormReportPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const enquiries = useMemo<ProcurementEnquiry[]>(() => listEnquiries(entityCode), [entityCode]);
  const [selectedId, setSelectedId] = useState<string>(enquiries[0]?.id ?? '');

  const peq = useMemo<ProcurementEnquiry | null>(
    () => selectedId ? getEnquiry(selectedId, entityCode) : null,
    [selectedId, entityCode],
  );

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Purchase Enquiry Form Report</h1>
        <p className="text-sm text-muted-foreground">Trident B6 parity · form-style detail.</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="text-sm">Select Enquiry</div>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger><SelectValue placeholder="Pick an enquiry" /></SelectTrigger>
            <SelectContent>
              {enquiries.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.enquiry_no} · {fmtDate(e.enquiry_date)} · {e.status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {peq && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>Enquiry #:</strong> <span className="font-mono">{peq.enquiry_no}</span></div>
              <div><strong>Date:</strong> {fmtDate(peq.enquiry_date)}</div>
              <div><strong>Status:</strong> <Badge>{peq.status}</Badge></div>
              <div><strong>Vendor mode:</strong> {peq.vendor_mode}</div>
              <div><strong>Department:</strong> {peq.department_id ?? '—'}</div>
              <div><strong>Standalone:</strong> {peq.is_standalone ? 'Yes' : 'No'}</div>
            </div>

            <div>
              <h3 className="font-semibold mt-2 mb-1">Lines ({peq.lines.length})</h3>
              <table className="w-full text-xs border">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-1">Item</th>
                    <th className="text-right p-1">Qty</th>
                    <th className="text-left p-1">UOM</th>
                  </tr>
                </thead>
                <tbody>
                  {peq.lines.map((l) => (
                    <tr key={l.id} className="border-t">
                      <td className="p-1">{l.item_name ?? l.item_id}</td>
                      <td className="p-1 text-right font-mono">{l.required_qty}</td>
                      <td className="p-1">{l.uom}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>Selected vendors:</strong> <span className="font-mono">{peq.selected_vendor_ids.length}</span></div>
              <div><strong>RFQs generated:</strong> <span className="font-mono">{peq.rfq_ids.length}</span></div>
              <div><strong>Awarded quotations:</strong> <span className="font-mono">{peq.awarded_quotation_ids.length}</span></div>
              <div><strong>Awarded at:</strong> {peq.awarded_at ? fmtDate(peq.awarded_at) : '—'}</div>
            </div>

            {peq.notes && (
              <div>
                <h3 className="font-semibold">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{peq.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!peq && enquiries.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No procurement enquiries yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
