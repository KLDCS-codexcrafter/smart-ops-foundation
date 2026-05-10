/**
 * @file src/pages/erp/qualicheck/reports/QCGodownSummary.tsx
 * @purpose Trident C15 · per-location pass/fail/conditional/pending counts.
 * @who Stores Manager · QA Manager (per-godown QC view)
 * @when 2026-05-09
 * @sprint T-Phase-1.A.5.d-1-Trident-Reports-Reprocess-Bridge · Block C
 * @iso ISO 9001:2015 Clause 8.7 · ISO 25010 Auditability
 * @whom Audit Owner
 * @decisions D-NEW-BW · D-NEW-CD
 * @disciplines FR-30 · FR-50
 * @reuses listQaInspections · godown counts (D-NEW-BW)
 * @[JWT] reads erp_qa_inspections_${entityCode}
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityChangeEffect } from '@/hooks/useEntityChangeEffect';
import { listQaInspections } from '@/lib/qa-inspection-engine';

interface SummaryRow {
  location: string;
  passed: number;
  failed: number;
  partial: number;
  pending: number;
  total: number;
}

export function QCGodownSummary(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [version, setVersion] = useState(0);
  useEntityChangeEffect(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    const onFocus = (): void => setVersion((v) => v + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const rows = useMemo<SummaryRow[]>(() => {
    void version;
    const map = new Map<string, SummaryRow>();
    for (const r of listQaInspections(entityCode)) {
      const loc = r.inspection_location || '—';
      const s = map.get(loc) ?? { location: loc, passed: 0, failed: 0, partial: 0, pending: 0, total: 0 };
      s.total += 1;
      if (r.status === 'passed') s.passed += 1;
      else if (r.status === 'failed') s.failed += 1;
      else if (r.status === 'partial_pass') s.partial += 1;
      else if (r.status === 'pending' || r.status === 'in_progress') s.pending += 1;
      map.set(loc, s);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [entityCode, version]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">QC Godown Summary</h1>
        <p className="text-sm text-muted-foreground mt-1">{rows.length} locations · Entity {entityCode}</p>
      </div>
      <Card><CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No data.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Passed</TableHead>
                <TableHead className="text-right">Failed</TableHead>
                <TableHead className="text-right">Partial</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.location}>
                  <TableCell className="text-xs">{r.location}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-success">{r.passed}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-destructive">{r.failed}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{r.partial}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">{r.pending}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{r.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  );
}
