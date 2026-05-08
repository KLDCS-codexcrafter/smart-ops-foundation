/**
 * @file src/pages/erp/qulicheak/reports/NcrRegister.tsx
 * @purpose NCR list/register · filterable table · CSV export · row-click drill-down
 * @who Quality Inspector · QA Manager
 * @when 2026-05-08
 * @sprint T-Phase-1.A.5.a-bis-Qulicheak-NCR-Foundation
 * @iso 25010 Usability + Functional Suitability
 * @whom QA Manager
 * @decisions D-NEW-AV
 * @disciplines FR-50 (Multi-Entity 6-point) · FR-21 (no banned patterns) ·
 *              FR-30 (header)
 * @reuses ncr-engine.filterNcrs · types/ncr labels
 * @[JWT] reads via ncr-engine localStorage · GET /api/qulicheak/ncrs
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Download, Search, ShieldClose } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityChangeEffect } from '@/hooks/useEntityChangeEffect';
import { filterNcrs } from '@/lib/ncr-engine';
import {
  NCR_STATUS_LABELS, NCR_SEVERITY_LABELS, NCR_SOURCE_LABELS,
  type NonConformanceReport, type NcrStatus, type NcrSeverity, type NcrSource,
} from '@/types/ncr';
import { NcrCloseDialog } from '../NcrCloseDialog';

const STATUS_OPTIONS: NcrStatus[] = ['open', 'investigating', 'capa_pending', 'closed', 'cancelled'];
const SEV_OPTIONS: NcrSeverity[] = ['minor', 'major', 'critical'];
const SOURCE_OPTIONS: NcrSource[] = ['iqc', 'inprocess', 'fg', 'customer_complaint', 'audit', 'procure360_match'];

const STATUS_VARIANT: Record<NcrStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  open: 'destructive',
  investigating: 'default',
  capa_pending: 'secondary',
  closed: 'outline',
  cancelled: 'outline',
};

const SEVERITY_VARIANT: Record<NcrSeverity, 'default' | 'secondary' | 'destructive'> = {
  minor: 'secondary',
  major: 'default',
  critical: 'destructive',
};

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function toCsv(rows: NonConformanceReport[]): string {
  const head = [
    'NCR ID', 'Status', 'Severity', 'Source', 'Raised At',
    'Party ID', 'Party Name', 'Item', 'Qty', 'Description',
  ].join(',');
  const lines = rows.map((n) => [
    n.id, n.status, n.severity, n.source, n.raised_at,
    n.related_party_id ?? '', n.related_party_name ?? '',
    n.item_name ?? '', n.qty_affected ?? '',
    `"${(n.description || '').replace(/"/g, '""')}"`,
  ].join(','));
  return [head, ...lines].join('\n');
}

function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function NcrRegister(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [statusF, setStatusF] = useState<Set<NcrStatus>>(new Set());
  const [sevF, setSevF] = useState<Set<NcrSeverity>>(new Set());
  const [srcF, setSrcF] = useState<Set<NcrSource>>(new Set());
  const [search, setSearch] = useState('');
  const [version, setVersion] = useState(0);
  const [closing, setClosing] = useState<NonConformanceReport | null>(null);

  // FR-50 6-point · refresh on entity switch
  useEntityChangeEffect(() => setVersion((v) => v + 1), []);

  // Refresh on focus (cheap reactivity)
  useEffect(() => {
    const onFocus = (): void => setVersion((v) => v + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const rows = useMemo(() => {
    const all = filterNcrs(entityCode, {
      status: statusF.size ? Array.from(statusF) : undefined,
      severity: sevF.size ? Array.from(sevF) : undefined,
      source: srcF.size ? Array.from(srcF) : undefined,
    });
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter((n) =>
      n.id.toLowerCase().includes(q) ||
      n.description.toLowerCase().includes(q) ||
      (n.related_party_name ?? '').toLowerCase().includes(q) ||
      (n.item_name ?? '').toLowerCase().includes(q),
    );
  }, [entityCode, statusF, sevF, srcF, search, version]);

  const toggle = <T,>(set: Set<T>, val: T, setter: (s: Set<T>) => void): void => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setter(next);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">NCR Register</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {rows.length} record{rows.length === 1 ? '' : 's'} · Entity {entityCode}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => downloadCsv(`ncr-register-${entityCode}-${Date.now()}.csv`, toCsv(rows))}
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
              placeholder="Search by NCR ID, description, party, item…"
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
                {NCR_STATUS_LABELS[s]}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground self-center">Severity:</span>
            {SEV_OPTIONS.map((s) => (
              <Badge
                key={s}
                variant={sevF.has(s) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggle(sevF, s, setSevF)}
              >
                {NCR_SEVERITY_LABELS[s]}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground self-center">Source:</span>
            {SOURCE_OPTIONS.map((s) => (
              <Badge
                key={s}
                variant={srcF.has(s) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggle(srcF, s, setSrcF)}
              >
                {NCR_SOURCE_LABELS[s]}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No NCRs match the current filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono">NCR ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Raised</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-mono text-xs">{n.id}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[n.status]}>
                        {NCR_STATUS_LABELS[n.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={SEVERITY_VARIANT[n.severity]}>
                        {NCR_SEVERITY_LABELS[n.severity]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{NCR_SOURCE_LABELS[n.source]}</TableCell>
                    <TableCell className="font-mono text-xs">{fmtDate(n.raised_at)}</TableCell>
                    <TableCell className="text-xs">{n.related_party_name ?? '—'}</TableCell>
                    <TableCell className="max-w-md truncate text-sm">{n.description}</TableCell>
                    <TableCell className="text-right">
                      {n.status !== 'closed' && n.status !== 'cancelled' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setClosing(n)}
                        >
                          <ShieldClose className="h-3.5 w-3.5 mr-1" />
                          Close
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {closing && (
        <NcrCloseDialog
          ncr={closing}
          onClose={() => {
            setClosing(null);
            setVersion((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}
