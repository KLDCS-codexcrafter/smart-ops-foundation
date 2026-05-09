/**
 * @file src/pages/erp/qulicheak/reports/StkIqcStRemarks.tsx
 * @purpose Trident C8 · QC Stock Remarks register · inspections with non-empty notes.
 * @sprint T-Phase-1.A.5.d-1-Trident-Reports-Reprocess-Bridge · Block C
 * @decisions D-NEW-BW (memoization) · D-NEW-CD (no external links)
 * @disciplines FR-30 · FR-50
 * @[JWT] reads erp_qa_inspections_${entityCode}
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityChangeEffect } from '@/hooks/useEntityChangeEffect';
import { listQaInspections } from '@/lib/qa-inspection-engine';

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
    </div>
  );
}
