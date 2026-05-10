/**
 * @file src/pages/erp/qualicheck/reports/CapaRegister.tsx
 * @purpose CAPA list/register · filter + CSV export · row click drills to CapaDetail
 * @sprint T-Phase-1.A.5.b-QualiCheck-CAPA-MTC-FAI
 * @decisions D-NEW-BD
 * @disciplines FR-50 · FR-21 · FR-30
 * @[JWT] reads via capa-engine.filterCapas
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
import { filterCapas } from '@/lib/capa-engine';
import {
  CAPA_STATUS_LABELS, CAPA_SEVERITY_LABELS, CAPA_SOURCE_LABELS,
  type CorrectiveAndPreventiveAction, type CapaId, type CapaStatus,
  type CapaSeverity, type CapaSource,
} from '@/types/capa';

const STATUS_OPTIONS: CapaStatus[] = ['open', 'investigating', 'actions_assigned', 'verifying', 'effective', 'ineffective', 'closed', 'cancelled'];
const SEV_OPTIONS: CapaSeverity[] = ['minor', 'major', 'critical'];
const SRC_OPTIONS: CapaSource[] = ['ncr', 'audit', 'customer_complaint', 'internal_review', 'preventive_only'];

function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return iso; }
}

function toCsv(rows: CorrectiveAndPreventiveAction[]): string {
  const head = ['CAPA ID', 'Status', 'Severity', 'Source', 'Title', 'NCR Link', 'Raised At'].join(',');
  const lines = rows.map((c) => [
    c.id, c.status, c.severity, c.source,
    `"${c.title.replace(/"/g, '""')}"`,
    c.related_ncr_id ?? '', c.raised_at,
  ].join(','));
  return [head, ...lines].join('\n');
}

function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface Props {
  onOpen?: (capaId: CapaId) => void;
}

export function CapaRegister({ onOpen }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const [statusF, setStatusF] = useState<Set<CapaStatus>>(new Set());
  const [sevF, setSevF] = useState<Set<CapaSeverity>>(new Set());
  const [srcF, setSrcF] = useState<Set<CapaSource>>(new Set());
  const [search, setSearch] = useState('');
  const [version, setVersion] = useState(0);

  useEntityChangeEffect(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    const onFocus = (): void => setVersion((v) => v + 1);
    const onCapaEvent = (): void => setVersion((v) => v + 1);
    window.addEventListener('focus', onFocus);
    window.addEventListener('capa:linked-to-ncr', onCapaEvent);
    window.addEventListener('capa:effective:applied', onCapaEvent);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('capa:linked-to-ncr', onCapaEvent);
      window.removeEventListener('capa:effective:applied', onCapaEvent);
    };
  }, []);

  const rows = useMemo(() => {
    void version;
    const all = filterCapas(entityCode, {
      status: statusF.size ? Array.from(statusF) : undefined,
      severity: sevF.size ? Array.from(sevF) : undefined,
      source: srcF.size ? Array.from(srcF) : undefined,
    });
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter((c) =>
      c.id.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      (c.related_ncr_id ?? '').toLowerCase().includes(q),
    );
  }, [entityCode, statusF, sevF, srcF, search, version]);

  const toggle = <T,>(set: Set<T>, val: T, setter: (s: Set<T>) => void): void => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val); else next.add(val);
    setter(next);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">CAPA Register</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {rows.length} record{rows.length === 1 ? '' : 's'} · Entity {entityCode}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => downloadCsv(`capa-register-${entityCode}-${Date.now()}.csv`, toCsv(rows))}
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
              placeholder="Search by CAPA ID, title, NCR…"
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground self-center">Status:</span>
            {STATUS_OPTIONS.map((s) => (
              <Badge key={s} variant={statusF.has(s) ? 'default' : 'outline'}
                className="cursor-pointer" onClick={() => toggle(statusF, s, setStatusF)}>
                {CAPA_STATUS_LABELS[s]}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground self-center">Severity:</span>
            {SEV_OPTIONS.map((s) => (
              <Badge key={s} variant={sevF.has(s) ? 'default' : 'outline'}
                className="cursor-pointer" onClick={() => toggle(sevF, s, setSevF)}>
                {CAPA_SEVERITY_LABELS[s]}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground self-center">Source:</span>
            {SRC_OPTIONS.map((s) => (
              <Badge key={s} variant={srcF.has(s) ? 'default' : 'outline'}
                className="cursor-pointer" onClick={() => toggle(srcF, s, setSrcF)}>
                {CAPA_SOURCE_LABELS[s]}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No CAPAs match the current filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono">CAPA ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>NCR</TableHead>
                  <TableHead>Raised</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow
                    key={c.id}
                    className={onOpen ? 'cursor-pointer hover:bg-muted/50' : undefined}
                    onClick={() => onOpen?.(c.id)}
                  >
                    <TableCell className="font-mono text-xs">{c.id}</TableCell>
                    <TableCell><Badge>{CAPA_STATUS_LABELS[c.status]}</Badge></TableCell>
                    <TableCell><Badge variant="secondary">{CAPA_SEVERITY_LABELS[c.severity]}</Badge></TableCell>
                    <TableCell className="text-xs">{CAPA_SOURCE_LABELS[c.source]}</TableCell>
                    <TableCell className="max-w-md truncate text-sm">{c.title}</TableCell>
                    <TableCell className="font-mono text-xs">{c.related_ncr_id ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{fmtDate(c.raised_at)}</TableCell>
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
