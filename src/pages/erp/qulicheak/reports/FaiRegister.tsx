/**
 * @file src/pages/erp/qulicheak/reports/FaiRegister.tsx
 * @purpose FAI list/register · filterable table · CSV export
 * @sprint T-Phase-1.A.5.b-Qulicheak-CAPA-MTC-FAI
 * @decisions D-NEW-BG
 * @disciplines FR-50 · FR-21 · FR-30
 * @[JWT] reads via fai-engine.filterFais · GET /api/qulicheak/fais
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Download, Search } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityChangeEffect } from '@/hooks/useEntityChangeEffect';
import { filterFais } from '@/lib/fai-engine';
import {
  FAI_STATUS_LABELS, FAI_OVERALL_LABELS,
  type FirstArticleInspection, type FaiStatus, type FaiOverall,
} from '@/types/fai';

const STATUS_OPTIONS: FaiStatus[] = ['draft', 'submitted', 'approved', 'rejected', 'archived'];
const OVERALL_OPTIONS: FaiOverall[] = ['pass', 'fail', 'conditional'];

const STATUS_VARIANT: Record<FaiStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  submitted: 'secondary',
  approved: 'default',
  rejected: 'destructive',
  archived: 'outline',
};

const OVERALL_VARIANT: Record<FaiOverall, 'default' | 'secondary' | 'destructive'> = {
  pass: 'default',
  fail: 'destructive',
  conditional: 'secondary',
};

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function toCsv(rows: FirstArticleInspection[]): string {
  const head = [
    'FAI ID', 'Status', 'Overall', 'Part No', 'Part Name',
    'Drawing', 'Supplier', 'PO', 'Sample Qty', 'Inspection Date', 'Inspected At',
  ].join(',');
  const lines = rows.map((f) => [
    f.id, f.status, f.overall, f.part_no,
    `"${f.part_name.replace(/"/g, '""')}"`,
    `${f.drawing_no ?? ''}${f.drawing_rev ? ' Rev ' + f.drawing_rev : ''}`,
    `"${(f.supplier_name ?? '').replace(/"/g, '""')}"`,
    f.related_po_id ?? '', f.sample_qty ?? '',
    f.inspection_date, f.inspected_at,
  ].join(','));
  return [head, ...lines].join('\n');
}

function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function FaiRegister(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [statusF, setStatusF] = useState<Set<FaiStatus>>(new Set());
  const [overallF, setOverallF] = useState<Set<FaiOverall>>(new Set());
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
    return filterFais(entityCode, {
      status: statusF.size ? Array.from(statusF) : undefined,
      overall: overallF.size ? Array.from(overallF) : undefined,
      search: search.trim() || undefined,
    });
  }, [entityCode, statusF, overallF, search, version]);

  const toggle = <T,>(set: Set<T>, val: T, setter: (s: Set<T>) => void): void => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val); else next.add(val);
    setter(next);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">FAI Register</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {rows.length} inspection{rows.length === 1 ? '' : 's'} · Entity {entityCode}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => downloadCsv(`fai-register-${entityCode}-${Date.now()}.csv`, toCsv(rows))}
          disabled={rows.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, part, drawing, supplier, PO…"
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground self-center">Status:</span>
            {STATUS_OPTIONS.map((s) => (
              <Badge
                key={s}
                variant={statusF.has(s) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggle(statusF, s, setStatusF)}
              >
                {FAI_STATUS_LABELS[s]}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground self-center">Overall:</span>
            {OVERALL_OPTIONS.map((s) => (
              <Badge
                key={s}
                variant={overallF.has(s) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggle(overallF, s, setOverallF)}
              >
                {FAI_OVERALL_LABELS[s]}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No FAIs match the current filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono">FAI ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Overall</TableHead>
                  <TableHead>Part No</TableHead>
                  <TableHead>Part Name</TableHead>
                  <TableHead>Drawing</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Inspected</TableHead>
                  <TableHead className="text-right">Dims</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-xs">{f.id}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[f.status]}>{FAI_STATUS_LABELS[f.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={OVERALL_VARIANT[f.overall]}>{FAI_OVERALL_LABELS[f.overall]}</Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{f.part_no}</TableCell>
                    <TableCell className="text-xs">{f.part_name}</TableCell>
                    <TableCell className="text-xs font-mono">
                      {f.drawing_no ?? '—'}{f.drawing_rev ? ` · ${f.drawing_rev}` : ''}
                    </TableCell>
                    <TableCell className="text-xs">{f.supplier_name ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{fmtDate(f.inspected_at)}</TableCell>
                    <TableCell className="text-right text-xs">{f.dimensions.length}</TableCell>
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
