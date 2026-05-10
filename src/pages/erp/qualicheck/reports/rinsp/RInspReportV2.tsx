/**
 * @file src/pages/erp/qualicheck/reports/rinsp/RInspReportV2.tsx
 * @purpose Trident RInspReport v2 layout · alternate column grouping (per RInspReport1.txt).
 * @who Receiving Inspector · QA Manager
 * @when 2026-05-09
 * @sprint T-Phase-1.A.5.d-1-Trident-Reports-Reprocess-Bridge · Block D
 * @iso ISO 9001:2015 · Trident TDL RInspReport1.txt
 * @whom Audit Owner
 * @decisions Q-LOCK-7a (ViewModeSelector pattern) · D-NEW-BW (memoization)
 * @disciplines FR-30 · FR-50
 * @reuses useReceivingInspections hook (consumes parent prop)
 * @[JWT] reads inspection rows via parent hook · localStorage erp_qa_inspections_${entityCode}
 */
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { QaInspectionRecord } from '@/types/qa-inspection';

export function RInspReportV2({ rows }: { rows: QaInspectionRecord[] }): JSX.Element {
  const lines = rows.flatMap((r) => r.lines.map((l) => ({ qa_no: r.qa_no, vendor: r.vendor_name ?? '—', date: r.inspection_date, ...l })));
  return (
    <Card><CardContent className="p-0">
      {lines.length === 0 ? (
        <div className="p-12 text-center text-sm text-muted-foreground">No inspection lines.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-mono">QA No</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Insp</TableHead>
              <TableHead className="text-right">Pass</TableHead>
              <TableHead className="text-right">Fail</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l, i) => (
              <TableRow key={`${l.qa_no}-${l.id}-${i}`}>
                <TableCell className="font-mono text-xs">{l.qa_no}</TableCell>
                <TableCell className="text-xs">{l.item_name}</TableCell>
                <TableCell className="text-xs">{l.vendor}</TableCell>
                <TableCell className="text-right font-mono text-xs">{l.qty_inspected}</TableCell>
                <TableCell className="text-right font-mono text-xs text-success">{l.qty_passed}</TableCell>
                <TableCell className="text-right font-mono text-xs text-destructive">{l.qty_failed}</TableCell>
                <TableCell className="text-xs font-mono">{l.date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </CardContent></Card>
  );
}
