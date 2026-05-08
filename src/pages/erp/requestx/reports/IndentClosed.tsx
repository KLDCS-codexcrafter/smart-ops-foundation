/**
 * @file        IndentClosed.tsx
 * @sprint      T-Phase-1.2.6f-pre-2 · Block B
 *              T-Phase-1.A.3.d-Procure360-Variance-Trident-Polish (Q17=a cross-card enhance · D-NEW-AT)
 */
import { useMemo, useState } from 'react';
import { SkeletonRows } from '@/components/ui/SkeletonRows';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMaterialIndents } from '@/hooks/useMaterialIndents';
import { useServiceRequests } from '@/hooks/useServiceRequests';
import { useCapitalIndents } from '@/hooks/useCapitalIndents';
import { useEntityCode } from '@/hooks/useEntityCode';
import { STATUS_LABEL } from '@/types/requisition-common';
import { computeFulfillmentScore, inrFmt } from '@/lib/requestx-report-engine';
import { isAlreadyEnquiryLinked } from '@/lib/procurement-pr-receiver';

const CLOSED_STATUSES = new Set(['closed', 'pre_closed', 'cancelled', 'auto_pre_closed']);

export function IndentClosedPanel(): JSX.Element {
  const mi = useMaterialIndents();
  const sr = useServiceRequests();
  const ci = useCapitalIndents();
  const { entityCode } = useEntityCode();
  const [tab, setTab] = useState<'all' | 'with_enquiry' | 'without_enquiry'>('all');

  const rows = useMemo(() => {
    const all = [
      ...mi.map(x => ({ ...x, kind: 'material' as const })),
      ...sr.map(x => ({ ...x, kind: 'service' as const })),
      ...ci.map(x => ({ ...x, kind: 'capital' as const })),
    ];
    return all.filter(r => CLOSED_STATUSES.has(r.status)).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }, [mi, sr, ci]);

  const enrichedRows = useMemo(
    () => rows.map((r) => ({ ...r, has_enquiry: isAlreadyEnquiryLinked(r.id, entityCode) })),
    [rows, entityCode],
  );

  const filteredRows = useMemo(() => {
    if (tab === 'with_enquiry') return enrichedRows.filter((r) => r.has_enquiry);
    if (tab === 'without_enquiry') return enrichedRows.filter((r) => !r.has_enquiry);
    return enrichedRows;
  }, [enrichedRows, tab]);

  const withCount = useMemo(() => enrichedRows.filter((r) => r.has_enquiry).length, [enrichedRows]);
  const withoutCount = enrichedRows.length - withCount;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Closed Indents</h1>
        <p className="text-sm text-muted-foreground">Closed · Pre-Closed · Auto-Pre-Closed · Cancelled — with fulfillment score and Procure360 link</p>
      </div>

      <div className="flex items-center gap-2 border-b">
        <button type="button" onClick={() => setTab('all')}
          className={`px-3 py-2 text-sm font-medium border-b-2 ${tab === 'all' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
          All ({enrichedRows.length})
        </button>
        <button type="button" onClick={() => setTab('with_enquiry')}
          className={`px-3 py-2 text-sm font-medium border-b-2 ${tab === 'with_enquiry' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
          With Enquiry ({withCount})
        </button>
        <button type="button" onClick={() => setTab('without_enquiry')}
          className={`px-3 py-2 text-sm font-medium border-b-2 ${tab === 'without_enquiry' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
          Without Enquiry ({withoutCount})
        </button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Closed register ({filteredRows.length})</CardTitle></CardHeader>
        <CardContent>
          <SkeletonRows><Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voucher</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Fulfillment</TableHead>
                <TableHead className="text-right">Procure360</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground">
                  No closed indents in this view.
                </TableCell></TableRow>
              )}
              {filteredRows.map(r => {
                const fulfill = r.kind === 'material' ? computeFulfillmentScore(r) : null;
                return (
                  <TableRow key={`${r.kind}-${r.id}`}>
                    <TableCell className="font-mono text-xs">{r.voucher_no}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{r.kind}</Badge></TableCell>
                    <TableCell className="text-xs">{r.originating_department_name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{STATUS_LABEL[r.status]}</Badge></TableCell>
                    <TableCell className="font-mono text-xs text-right">{inrFmt(r.total_estimated_value)}</TableCell>
                    <TableCell className="font-mono text-xs text-right">
                      {fulfill ? `${fulfill.final_pct}%` : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.has_enquiry ? (
                        <a href={`/erp/procure-hub#po-list?indent_id=${r.id}`}
                           className="text-xs text-primary hover:underline">
                          View →
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table></SkeletonRows>
        </CardContent>
      </Card>
    </div>
  );
}
