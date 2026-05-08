/**
 * @file        EnquiryDetailsReportPanel.tsx
 * @purpose     Comprehensive enquiry detail · header / lines / vendor matrix / approval / award / timeline.
 * @sprint      T-Phase-1.A.3.d-Procure360-Variance-Trident-Polish
 * @decisions   D-NEW-AS
 * @reuses      procurement-enquiry-engine.listEnquiries · getEnquiry · useEntityCode · UI primitives
 * @[JWT]       GET /api/procure360/enquiries/:id — localStorage in Phase 1
 */
import { useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { listEnquiries, getEnquiry } from '@/lib/procurement-enquiry-engine';

const fmtDate = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtMoney = (n: number | null): string =>
  n === null ? '—' : `₹${n.toLocaleString('en-IN')}`;

export function EnquiryDetailsReportPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const enquiries = useMemo(() => listEnquiries(entityCode), [entityCode]);
  const [selectedId, setSelectedId] = useState<string>(enquiries[0]?.id ?? '');

  const peq = useMemo(
    () => (selectedId ? getEnquiry(selectedId, entityCode) : null),
    [selectedId, entityCode],
  );

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Enquiry Details Report</h1>
        <p className="text-sm text-muted-foreground">Comprehensive enquiry form-style view · header · lines · matrix · approval · award · timeline.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Select Enquiry</CardTitle></CardHeader>
        <CardContent>
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

      {!peq ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          {enquiries.length === 0 ? 'No enquiries yet.' : 'Pick an enquiry to view details.'}
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Header</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div><div className="text-xs text-muted-foreground">Enquiry No</div><div className="font-mono">{peq.enquiry_no}</div></div>
              <div><div className="text-xs text-muted-foreground">Date</div><div>{fmtDate(peq.enquiry_date)}</div></div>
              <div><div className="text-xs text-muted-foreground">Status</div><Badge variant="outline">{peq.status}</Badge></div>
              <div><div className="text-xs text-muted-foreground">Vendor Mode</div><div>{peq.vendor_mode}</div></div>
              <div><div className="text-xs text-muted-foreground">Standalone</div><div>{peq.is_standalone ? 'Yes' : 'No'}</div></div>
              <div><div className="text-xs text-muted-foreground">Approval Stage</div><div>{peq.approval_stage ?? '—'}</div></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Lines ({peq.lines.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              {peq.lines.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No lines.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">#</th>
                      <th className="text-left p-2">Item</th>
                      <th className="text-right p-2">Qty</th>
                      <th className="text-left p-2">UoM</th>
                      <th className="text-right p-2">Est. Rate</th>
                      <th className="text-right p-2">Est. Value</th>
                      <th className="text-left p-2">Required</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {peq.lines.map((l) => (
                      <tr key={l.id} className="border-t">
                        <td className="p-2 font-mono text-xs">{l.line_no}</td>
                        <td className="p-2">{l.item_name}</td>
                        <td className="p-2 text-right font-mono">{l.required_qty}</td>
                        <td className="p-2 text-xs">{l.uom}</td>
                        <td className="p-2 text-right font-mono">{fmtMoney(l.estimated_rate)}</td>
                        <td className="p-2 text-right font-mono">{fmtMoney(l.estimated_value)}</td>
                        <td className="p-2 text-xs">{fmtDate(l.required_date)}</td>
                        <td className="p-2"><Badge variant="outline" className="text-xs">{l.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Vendor Matrix</CardTitle></CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground mb-2">Selected vendors: {peq.selected_vendor_ids.length}</div>
              {peq.item_vendor_matrix.length === 0 ? (
                <div className="text-sm text-muted-foreground">No vendor matrix entries.</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {peq.item_vendor_matrix.slice(0, 30).map((m, i) => (
                    <div key={`${m.line_id}-${m.vendor_id}-${i}`} className="rounded-md border p-2">
                      <div className="font-mono">L:{m.line_id.slice(0, 6)} · V:{m.vendor_id.slice(0, 6)}</div>
                      <div className={m.is_matched ? 'text-success' : 'text-muted-foreground'}>
                        {m.is_matched ? 'matched' : 'unmatched'}
                      </div>
                      {m.override_reason && <div className="text-muted-foreground truncate">{m.override_reason}</div>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Award & Timeline</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div><div className="text-xs text-muted-foreground">RFQs Generated</div><div className="font-mono">{peq.rfq_ids.length}</div></div>
              <div><div className="text-xs text-muted-foreground">Awarded Quotations</div><div className="font-mono">{peq.awarded_quotation_ids.length}</div></div>
              <div><div className="text-xs text-muted-foreground">Awarded At</div><div>{fmtDate(peq.awarded_at)}</div></div>
              <div className="col-span-2 md:col-span-3">
                <div className="text-xs text-muted-foreground">Award Notes</div>
                <div className="text-sm whitespace-pre-wrap">{peq.award_notes || '—'}</div>
              </div>
              <div><div className="text-xs text-muted-foreground">Created</div><div>{fmtDate(peq.created_at)}</div></div>
              <div><div className="text-xs text-muted-foreground">Updated</div><div>{fmtDate(peq.updated_at)}</div></div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
