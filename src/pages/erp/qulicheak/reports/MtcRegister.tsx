/**
 * @file src/pages/erp/qulicheak/reports/MtcRegister.tsx
 * @purpose MTC list/register · filterable table · CSV export
 * @sprint T-Phase-1.A.5.b-Qulicheak-CAPA-MTC-FAI
 * @decisions D-NEW-BF
 * @disciplines FR-50 · FR-21 · FR-30
 * @[JWT] reads via mtc-engine.filterMtcs · GET /api/qulicheak/mtcs
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
import { filterMtcs } from '@/lib/mtc-engine';
import { findPcMatchesForHeat, type PcMatch } from '@/lib/qulicheak-bridges';
import {
  MTC_STATUS_LABELS, MTC_OVERALL_LABELS,
  type MaterialTestCertificate, type MtcStatus, type MtcOverall,
} from '@/types/mtc';

const STATUS_OPTIONS: MtcStatus[] = ['draft', 'submitted', 'approved', 'rejected', 'archived'];
const OVERALL_OPTIONS: MtcOverall[] = ['pass', 'fail', 'conditional'];

const STATUS_VARIANT: Record<MtcStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  submitted: 'secondary',
  approved: 'default',
  rejected: 'destructive',
  archived: 'outline',
};

const OVERALL_VARIANT: Record<MtcOverall, 'default' | 'secondary' | 'destructive'> = {
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

function toCsv(rows: MaterialTestCertificate[]): string {
  const head = [
    'MTC ID', 'Status', 'Overall', 'Cert No', 'Issue Date',
    'Supplier', 'GRN', 'Item', 'Lot', 'Heat', 'Uploaded',
  ].join(',');
  const lines = rows.map((m) => [
    m.id, m.status, m.overall, m.certificate_no, m.issue_date,
    `"${m.supplier_name.replace(/"/g, '""')}"`,
    m.related_grn_id ?? '', m.item_name ?? '',
    m.lot_no ?? '', m.heat_no ?? '', m.uploaded_at,
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

export function MtcRegister(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [statusF, setStatusF] = useState<Set<MtcStatus>>(new Set());
  const [overallF, setOverallF] = useState<Set<MtcOverall>>(new Set());
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
    return filterMtcs(entityCode, {
      status: statusF.size ? Array.from(statusF) : undefined,
      overall: overallF.size ? Array.from(overallF) : undefined,
      search: search.trim() || undefined,
    });
  }, [entityCode, statusF, overallF, search, version]);

  // F-3 · O(1) per-row PC match lookup · iterate PC ledger ONCE per (entityCode, version, rows)
  const pcMatchByHeat = useMemo<Map<string, PcMatch[]>>(() => {
    const map = new Map<string, PcMatch[]>();
    const heats = new Set<string>();
    for (const m of rows) if (m.heat_no) heats.add(m.heat_no);
    for (const h of heats) {
      const matches = findPcMatchesForHeat(entityCode, h);
      if (matches.length > 0) map.set(h, matches);
    }
    return map;
  }, [entityCode, rows]);

  const toggle = <T,>(set: Set<T>, val: T, setter: (s: Set<T>) => void): void => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val); else next.add(val);
    setter(next);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">MTC Register</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {rows.length} certificate{rows.length === 1 ? '' : 's'} · Entity {entityCode}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => downloadCsv(`mtc-register-${entityCode}-${Date.now()}.csv`, toCsv(rows))}
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
              placeholder="Search by ID, cert no, supplier, lot, heat, item…"
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
                {MTC_STATUS_LABELS[s]}
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
                {MTC_OVERALL_LABELS[s]}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No MTCs match the current filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono">MTC ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Overall</TableHead>
                  <TableHead>Cert No</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Lot/Heat</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Params</TableHead>
                  <TableHead>PC Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs">{m.id}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[m.status]}>{MTC_STATUS_LABELS[m.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={OVERALL_VARIANT[m.overall]}>{MTC_OVERALL_LABELS[m.overall]}</Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{m.certificate_no}</TableCell>
                    <TableCell className="text-xs">{m.supplier_name}</TableCell>
                    <TableCell className="text-xs">{m.item_name ?? '—'}</TableCell>
                    <TableCell className="text-xs font-mono">
                      {(m.lot_no ?? '—')}{m.heat_no ? ` · ${m.heat_no}` : ''}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{fmtDate(m.uploaded_at)}</TableCell>
                    <TableCell className="text-right text-xs">{m.parameters.length}</TableCell>
                    <TableCell className="text-xs">
                      {(() => {
                        const matches = m.heat_no ? (pcMatchByHeat.get(m.heat_no) ?? []) : [];
                        if (matches.length === 0) return <span className="text-muted-foreground">—</span>;
                        return (
                          <Badge variant="outline" className="font-mono" title={matches.map((p) => p.doc_no).join(' · ')}>
                            {matches.length} PC
                          </Badge>
                        );
                      })()}
                    </TableCell>
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
