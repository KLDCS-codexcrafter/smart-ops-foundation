/**
 * @file        src/pages/erp/docvault/reports/DocumentsByDeptReport.tsx
 * @purpose     Documents grouped by originating department · type breakdown
 * @who         Document Controller · Department Heads
 * @when        2026-05-09
 * @sprint      T-Phase-1.A.9 BUNDLED · Q-LOCK-5a + Block A.5
 * @iso         ISO 9001:2015 §7.5 · ISO 25010 Usability
 * @whom        Audit Owner
 * @decisions   D-NEW-CJ canonical · D-NEW-BV Phase 1 mock
 * @disciplines FR-30 · FR-25 dept-scoped
 * @reuses      docvault-engine.loadDocuments
 * @[JWT]       Phase 2 reporting endpoint
 */
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEntityCode } from '@/hooks/useEntityCode';
import { loadDocuments } from '@/lib/docvault-engine';

export function DocumentsByDeptReport(): JSX.Element {
  const { entityCode } = useEntityCode();
  const docs = loadDocuments(entityCode);

  const rows = useMemo(() => {
    const m = new Map<string, { total: number; byType: Record<string, number> }>();
    for (const d of docs) {
      const dept = d.originating_department_id || '—';
      if (!m.has(dept)) m.set(dept, { total: 0, byType: {} });
      const e = m.get(dept)!;
      e.total += 1;
      e.byType[d.document_type] = (e.byType[d.document_type] ?? 0) + 1;
    }
    return Array.from(m.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [docs]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Documents by Department</h1>
        <p className="text-sm text-muted-foreground">Originating-department roll-up · type breakdown.</p>
      </div>
      <Card><CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Department</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Type breakdown</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">No documents.</TableCell></TableRow>
            ) : rows.map(([dept, e]) => (
              <TableRow key={dept}>
                <TableCell className="font-mono text-xs">{dept}</TableCell>
                <TableCell className="text-right font-mono">{e.total}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {Object.entries(e.byType).map(([t, c]) => `${t}: ${c}`).join(' · ')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

export default DocumentsByDeptReport;
