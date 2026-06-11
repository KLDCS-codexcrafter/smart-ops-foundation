/**
 * @file src/pages/erp/qualicheck/reports/StkIqcStRemarks.tsx
 * @purpose Trident C8 · QC Stock Remarks register · inspections with non-empty notes.
 * @who QA Manager · Quality Inspector (remarks audit)
 * @when 2026-05-09
 * @sprint T-Phase-1.A.5.d-1-Trident-Reports-Reprocess-Bridge · Block C
 * @iso ISO 9001:2015 Clause 8.7 · ISO 25010 Auditability
 * @whom Audit Owner
 * @decisions D-NEW-BW (memoization) · D-NEW-CD (no external links)
 * @disciplines FR-30 · FR-50
 * @reuses listQaInspections · useEntityCode · useEntityChangeEffect
 * @[JWT] reads erp_qa_inspections_${entityCode}
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, ShieldCheck } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityChangeEffect } from '@/hooks/useEntityChangeEffect';
import { listQaInspections } from '@/lib/qa-inspection-engine';
import { TableChartToggle } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';

export function StkIqcStRemarks(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [search, setSearch] = useState('');
  const [version, setVersion] = useState(0);
  useEntityChangeEffect(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    const onFocus = (): void => setVersion((v) => v + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const rows = useMemo(() => {
    void version;
    const all = listQaInspections(entityCode).filter((r) => (r.notes ?? '').trim().length > 0);
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((r) =>
      [r.qa_no, r.notes, r.inspector_user_id].some((f) => (f ?? '').toLowerCase().includes(q)),
    );
  }, [entityCode, search, version]);

  // RPT-5d · toggle recipe (additive) — group remarks by inspection status (remark-category proxy)
  const chartRows = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.status, (map.get(r.status) ?? 0) + 1);
    return Array.from(map.entries()).map(([category, count]) => ({ category, count }));
  }, [rows]);
  const chartConfig = getKpi('qc-iqc-remarks')?.defaultChart ?? defaultChartConfig({
    chartType: 'column', xKey: 'category',
    series: [{ key: 'count', label: 'Remarks' }],
    title: 'IQC remarks by category',
  });
  const integrityHash = useMemo(() => signReport(chartRows), [chartRows]);
  const shortHash = integrityHash.replace('fnv1a:', '').slice(0, 10);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">QC Stock Remarks</h1>
        <p className="text-sm text-muted-foreground mt-1">{rows.length} inspections with remarks · Entity {entityCode}</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search QA No, remarks, inspector…" className="pl-8"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">No inspection-level remarks.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono">QA No</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Inspector</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.qa_no}</TableCell>
                    <TableCell className="text-xs">{r.status}</TableCell>
                    <TableCell className="text-xs">{r.inspector_user_id}</TableCell>
                    <TableCell className="text-xs font-mono">{r.inspection_date}</TableCell>
                    <TableCell className="text-xs">{r.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="p-3 space-y-2" data-testid="qc-iqc-remarks-toggle-host">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] font-mono" data-testid="qc-iqc-remarks-integrity-badge" title={integrityHash}>
            <ShieldCheck className="h-3 w-3 mr-1" />{shortHash}
          </Badge>
        </div>
        <TableChartToggle
          rows={chartRows}
          columns={[
            { key: 'category', label: 'Remark Category' },
            { key: 'count', label: 'Remarks', align: 'right' },
          ]}
          chartConfig={chartConfig}
          defaultView="table"
          emptyLabel="No inspection-level remarks"
        />
      </Card>
    </div>
  );
}
