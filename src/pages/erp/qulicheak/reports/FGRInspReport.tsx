/**
 * @file src/pages/erp/qulicheak/reports/FGRInspReport.tsx
 * @purpose Trident C17 · Finished-Goods Receiving Inspection Report.
 * @who Production Manager · QA Manager (FG outgoing inspection audit)
 * @when 2026-05-09
 * @sprint T-Phase-1.A.5.d-1-Trident-Reports-Reprocess-Bridge · Block F · T1-AuditFix Block A (useMemo dep fix)
 * @iso ISO 9001:2015 Clause 8.6 (release of products) · Trident TDL FGRInspReport.txt
 * @whom Audit Owner
 * @decisions D-NEW-BW · D-NEW-CD
 * @disciplines FR-30 · FR-50
 * @reuses listQaInspections · PC lookup map (D-NEW-BW)
 * @[JWT] reads erp_qa_inspections_${entityCode} · erp_production_confirmations_${entityCode}
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityChangeEffect } from '@/hooks/useEntityChangeEffect';
import { listQaInspections } from '@/lib/qa-inspection-engine';

interface PcLite { id: string; doc_no: string }

export function FGRInspReport(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [version, setVersion] = useState(0);
  useEntityChangeEffect(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    const onFocus = (): void => setVersion((v) => v + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const rows = useMemo(() => {
    void version;
    return listQaInspections(entityCode).filter((r) => r.inspection_type === 'outgoing');
  }, [entityCode, version]);

  // D-NEW-BW · build PC lookup once
  const pcMap = useMemo<Map<string, string>>(() => {
    void version;
    const map = new Map<string, string>();
    if (typeof window === 'undefined') return map;
    try {
      const raw = localStorage.getItem(`erp_production_confirmations_${entityCode}`);
      if (!raw) return map;
      const list = JSON.parse(raw) as PcLite[];
      for (const pc of list) map.set(pc.id, pc.doc_no);
    } catch { /* silent */ }
    return map;
  }, [entityCode, version]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">FG Receiving Inspection Report</h1>
        <p className="text-sm text-muted-foreground mt-1">{rows.length} outgoing/FG inspections · Entity {entityCode}</p>
      </div>
      <Card><CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No FG inspections yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono">QA No</TableHead>
                <TableHead>PC</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Inspector</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.qa_no}</TableCell>
                  <TableCell className="text-xs font-mono">
                    {r.production_confirmation_id ? (pcMap.get(r.production_confirmation_id) ?? r.production_confirmation_id) : '—'}
                  </TableCell>
                  <TableCell className="text-xs">{r.status}</TableCell>
                  <TableCell className="text-xs">{r.inspector_user_id}</TableCell>
                  <TableCell className="text-xs">{r.customer_name ?? '—'}</TableCell>
                  <TableCell className="text-xs font-mono">{r.inspection_date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  );
}
