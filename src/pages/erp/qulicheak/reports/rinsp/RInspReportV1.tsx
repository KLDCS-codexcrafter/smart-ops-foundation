/**
 * @file src/pages/erp/qulicheak/reports/rinsp/RInspReportV1.tsx
 * @purpose Trident C13a primary IQC at GRN layout
 * @sprint T-Phase-1.A.5.d-1-Trident-Reports-Reprocess-Bridge · Block D
 */
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { QaInspectionRecord } from '@/types/qa-inspection';

export function RInspReportV1({ rows }: { rows: QaInspectionRecord[] }): JSX.Element {
  return (
    <Card><CardContent className="p-0">
      {rows.length === 0 ? (
        <div className="p-12 text-center text-sm text-muted-foreground">No incoming inspections.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-mono">QA No</TableHead>
              <TableHead>GRN</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.qa_no}</TableCell>
                <TableCell className="text-xs">{r.bill_no}</TableCell>
                <TableCell className="text-xs">{r.vendor_name ?? '—'}</TableCell>
                <TableCell className="text-xs">{r.status}</TableCell>
                <TableCell className="text-xs font-mono">{r.inspection_date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </CardContent></Card>
  );
}
