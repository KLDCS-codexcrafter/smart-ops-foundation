/**
 * @file src/pages/erp/qualicheck/reports/QCStkTrnsfer.tsx
 * @purpose Trident C16 · QC-passed-to-stock transfer list (passed inspections).
 * @who Stores Manager · QA Manager (QC-to-stock movement)
 * @when 2026-05-09
 * @sprint T-Phase-1.A.5.d-1-Trident-Reports-Reprocess-Bridge · Block C
 * @iso ISO 9001:2015 Clause 8.7 · ISO 25010 Auditability
 * @whom Audit Owner
 * @decisions D-NEW-BW · D-NEW-CD
 * @disciplines FR-30 · FR-50
 * @reuses listQaInspections · godown source/dest lookup (D-NEW-BW)
 * @[JWT] reads erp_qa_inspections_${entityCode}
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityChangeEffect } from '@/hooks/useEntityChangeEffect';
import { listQaInspections } from '@/lib/qa-inspection-engine';
import { TableChartToggle } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';

export function QCStkTrnsfer(): JSX.Element {
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
    return listQaInspections(entityCode).filter((r) => r.status === 'passed' || r.status === 'partial_pass');
  }, [entityCode, version]);

  // RPT-5d · toggle recipe (additive) — qty (line count) per status
  const chartRows = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.status, (map.get(r.status) ?? 0) + r.lines.length);
    return Array.from(map.entries()).map(([status, qty]) => ({ status, qty }));
  }, [rows]);
  const chartConfig = getKpi('qc-stk-transfer')?.defaultChart ?? defaultChartConfig({
    chartType: 'column', xKey: 'status',
    series: [{ key: 'qty', label: 'Lines' }],
    title: 'QC stock-transfer lines by status',
  });
  const integrityHash = useMemo(() => signReport(chartRows), [chartRows]);
  const shortHash = integrityHash.replace('fnv1a:', '').slice(0, 10);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">QC Stock Transfer</h1>
        <p className="text-sm text-muted-foreground mt-1">{rows.length} approved transfers · Entity {entityCode}</p>
      </div>
      <Card><CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No QC-passed transfers yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-mono">QA No</TableHead>
                <TableHead>From (QC Hold)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Inspector</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Lines</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.qa_no}</TableCell>
                  <TableCell className="text-xs">{r.inspection_location}</TableCell>
                  <TableCell><Badge variant="default">{r.status}</Badge></TableCell>
                  <TableCell className="text-xs">{r.inspector_user_id}</TableCell>
                  <TableCell className="text-xs font-mono">{r.inspection_date}</TableCell>
                  <TableCell className="text-right text-xs font-mono">{r.lines.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>

      <Card className="p-3 space-y-2" data-testid="qc-stk-transfer-toggle-host">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] font-mono" data-testid="qc-stk-transfer-integrity-badge" title={integrityHash}>
            <ShieldCheck className="h-3 w-3 mr-1" />{shortHash}
          </Badge>
        </div>
        <TableChartToggle
          rows={chartRows}
          columns={[
            { key: 'status', label: 'Status' },
            { key: 'qty', label: 'Lines', align: 'right' },
          ]}
          chartConfig={chartConfig}
          defaultView="table"
          emptyLabel="No QC-passed transfers"
        />
      </Card>
    </div>
  );
}
