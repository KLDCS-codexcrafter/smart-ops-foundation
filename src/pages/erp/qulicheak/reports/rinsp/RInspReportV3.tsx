/**
 * @file src/pages/erp/qulicheak/reports/rinsp/RInspReportV3.tsx
 * @purpose Trident RInspReport v3 layout · grouped-by-vendor variant (per RInspReport2.txt).
 * @who Receiving Inspector · QA Manager
 * @when 2026-05-09
 * @sprint T-Phase-1.A.5.d-1-Trident-Reports-Reprocess-Bridge · Block D
 * @iso ISO 9001:2015 · Trident TDL RInspReport2.txt
 * @whom Audit Owner
 * @decisions Q-LOCK-7a (ViewModeSelector pattern) · D-NEW-BW (memoization)
 * @disciplines FR-30 · FR-50
 * @reuses useReceivingInspections hook (consumes parent prop)
 * @[JWT] reads inspection rows via parent hook · localStorage erp_qa_inspections_${entityCode}
 */
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { QaInspectionRecord } from '@/types/qa-inspection';

export function RInspReportV3({ rows }: { rows: QaInspectionRecord[] }): JSX.Element {
  const buckets = useMemo(() => {
    const map = new Map<string, { vendor: string; count: number; passed: number; failed: number }>();
    for (const r of rows) {
      const key = r.vendor_id ?? r.vendor_name ?? '—';
      const v = map.get(key) ?? { vendor: r.vendor_name ?? key, count: 0, passed: 0, failed: 0 };
      v.count += 1;
      if (r.status === 'passed') v.passed += 1;
      if (r.status === 'failed') v.failed += 1;
      map.set(key, v);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [rows]);

  return (
    <Card><CardContent className="p-0">
      {buckets.length === 0 ? (
        <div className="p-12 text-center text-sm text-muted-foreground">No vendor activity.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Inspections</TableHead>
              <TableHead className="text-right">Passed</TableHead>
              <TableHead className="text-right">Failed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {buckets.map((b) => (
              <TableRow key={b.vendor}>
                <TableCell className="text-xs">{b.vendor}</TableCell>
                <TableCell className="text-right font-mono text-xs">{b.count}</TableCell>
                <TableCell className="text-right font-mono text-xs text-success">{b.passed}</TableCell>
                <TableCell className="text-right font-mono text-xs text-destructive">{b.failed}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </CardContent></Card>
  );
}
