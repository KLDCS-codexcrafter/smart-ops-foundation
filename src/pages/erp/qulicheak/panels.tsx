/**
 * panels.tsx (QualiCheck) — Sprint T-Phase-1.2.6f-d-2-card5-5-pre-1 · Block F · D-326
 * 5 panels: Welcome · Pending Inspections · Quality Plans · Quality Specs · Inspection Register.
 *
 * PATTERN NOTE — DELIBERATE [list, setList] + refresh() · NO [tick, setTick] + useMemo anti-pattern.
 * Mirrors 4-pre-3 alerts-panels.tsx precedent. Self-documenting: each panel reads once, refresh()
 * reloads on state change, no derived-cache pitfalls.
 *
 * [JWT] GET /api/qa/inspections · /api/qa/plans · /api/qa/specs
 */
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ClipboardCheck, FileText, Beaker, ListChecks, ShieldCheck, FlaskConical,
  Activity, AlertCircle, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { listQaInspections, listPendingQa } from '@/lib/qa-inspection-engine';
import { listQaPlans } from '@/lib/qa-plan-engine';
import { listQaSpecs } from '@/lib/qa-spec-engine';
import { getPendingInspectionAlerts } from '@/lib/oob/qa-pending-inspection-alerts';
import type { QaInspectionRecord, QaInspectionStatus } from '@/types/qa-inspection';
import type { QaPlan } from '@/types/qa-plan';
import type { QaSpec } from '@/types/qa-spec';
import type { QualiCheckModule } from './QualiCheckSidebar.types';

// ── Helpers ──────────────────────────────────────────────────────────

function getActiveEntityCode(): string {
  try { return localStorage.getItem('active_entity_code') ?? 'DEMO'; }
  catch { return 'DEMO'; }
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

function statusVariant(s: QaInspectionStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (s === 'passed') return 'default';
  if (s === 'failed' || s === 'cancelled') return 'destructive';
  if (s === 'pending') return 'outline';
  return 'secondary';
}

// ── 1) WELCOME ───────────────────────────────────────────────────────

interface WelcomeProps { onNavigate: (m: QualiCheckModule) => void }

export function QualiCheckWelcome({ onNavigate }: WelcomeProps): JSX.Element {
  const entityCode = getActiveEntityCode();
  const [loading, setLoading] = useState(true);
  const [inspections, setInspections] = useState<QaInspectionRecord[]>([]);
  const [plans, setPlans] = useState<QaPlan[]>([]);
  const [specs, setSpecs] = useState<QaSpec[]>([]);
  const [criticalAlerts, setCriticalAlerts] = useState(0);

  const refresh = useCallback((): void => {
    setInspections(listQaInspections(entityCode));
    setPlans(listQaPlans(entityCode));
    setSpecs(listQaSpecs(entityCode));
    const a = getPendingInspectionAlerts(entityCode);
    setCriticalAlerts(a.filter(x => x.severity === 'critical' || x.severity === 'escalated').length);
    setLoading(false);
  }, [entityCode]);

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 5000);
    return () => clearInterval(i);
  }, [refresh]);

  const pending = inspections.filter(q => q.status === 'pending' || q.status === 'in_progress').length;
  const passed = inspections.filter(q => q.status === 'passed').length;
  const failed = inspections.filter(q => q.status === 'failed').length;

  const kpis = [
    { label: 'Pending Inspections', value: pending, icon: AlertCircle, accent: 'text-warning' },
    { label: 'Critical Alerts', value: criticalAlerts, icon: AlertTriangle, accent: 'text-destructive' },
    { label: 'Passed (all-time)', value: passed, icon: CheckCircle2, accent: 'text-primary' },
    { label: 'Failed (all-time)', value: failed, icon: AlertCircle, accent: 'text-destructive' },
    { label: 'Active Plans', value: plans.filter(p => p.status === 'active').length, icon: FileText, accent: 'text-primary' },
    { label: 'Active Specs', value: specs.filter(s => s.status === 'active').length, icon: Beaker, accent: 'text-primary' },
  ];

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">QualiCheck</h1>
        <p className="text-sm text-muted-foreground">
          Quality control · Plans · Specs · Inspections · Card #5 Foundation
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map(k => (
          <Card key={k.label} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <k.icon className={`h-4 w-4 ${k.accent}`} />
                {k.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-mono font-semibold">{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onNavigate('pending-inspections')}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" /> Pending Inspections
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Inspections awaiting capture · 5-field qty tracking (D-332)
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onNavigate('quality-plans')}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Quality Plans
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Per-item · per-vendor · per-customer variants (D-336)
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onNavigate('inspection-register')}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="h-4 w-4" /> Inspection Register
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Authority badge · external lab tracking (D-335)
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> Recent Inspections
            </CardTitle>
          </CardHeader>
          <CardContent>
            {inspections.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No inspections yet. Configure Plans + Specs to begin.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {inspections.slice(0, 10).map(q => (
                  <li key={q.id} className="py-2 flex items-center justify-between gap-4 text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <ClipboardCheck className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-mono text-xs">{q.qa_no}</span>
                      <span className="truncate text-muted-foreground">{q.bill_no}</span>
                    </div>
                    <Badge variant={statusVariant(q.status)}>{q.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

// ── 2) PENDING INSPECTIONS ───────────────────────────────────────────

export function PendingInspectionsPanel(): JSX.Element {
  const entityCode = getActiveEntityCode();
  const [list, setList] = useState<QaInspectionRecord[]>([]);

  const refresh = useCallback((): void => {
    setList(listPendingQa(entityCode));
  }, [entityCode]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" /> Pending Inspections
        </h1>
        <p className="text-sm text-muted-foreground">
          {list.length} inspection{list.length === 1 ? '' : 's'} awaiting capture · D-332 5-field qty tracking
        </p>
      </header>

      <Card>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No pending inspections. Plans auto-trigger inspections when GRN/MIN/Sample posts.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>QA No</TableHead>
                  <TableHead>Bill</TableHead>
                  <TableHead>Inspector</TableHead>
                  <TableHead>Inspected</TableHead>
                  <TableHead>Sample</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map(q => {
                  const totals = q.lines.reduce((acc, l) => ({
                    insp: acc.insp + l.qty_inspected,
                    samp: acc.samp + (l.qty_sample ?? 0),
                    pend: acc.pend + (l.qty_pending ?? 0),
                  }), { insp: 0, samp: 0, pend: 0 });
                  return (
                    <TableRow key={q.id}>
                      <TableCell className="font-mono text-xs">{q.qa_no}</TableCell>
                      <TableCell className="font-mono text-xs">{q.bill_no}</TableCell>
                      <TableCell className="text-sm">{q.inspector_user_id}</TableCell>
                      <TableCell className="font-mono text-xs">{totals.insp}</TableCell>
                      <TableCell className="font-mono text-xs">{totals.samp}</TableCell>
                      <TableCell className="font-mono text-xs">{totals.pend}</TableCell>
                      <TableCell><Badge variant={statusVariant(q.status)}>{q.status}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── 3) QUALITY PLANS ─────────────────────────────────────────────────

export function QualityPlansPanel(): JSX.Element {
  const entityCode = getActiveEntityCode();
  const [list, setList] = useState<QaPlan[]>([]);
  const [filter, setFilter] = useState('');

  const refresh = useCallback((): void => {
    setList(listQaPlans(entityCode));
  }, [entityCode]);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = list.filter(p => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5" /> Quality Plans
          </h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} plan{filtered.length === 1 ? '' : 's'} · per-vendor + per-customer variants
          </p>
        </div>
        <Input
          placeholder="Search code, name…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="w-72"
        />
      </header>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No quality plans yet. Section 8k demo seed creates 2 sample plans on entity setup.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>Voucher Kinds</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.code}</TableCell>
                    <TableCell className="text-sm">{p.name}</TableCell>
                    <TableCell><Badge variant="outline">{p.plan_type}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.item_name ?? <span className="italic">all items</span>}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-wrap gap-1">
                        {p.vendor_id && <Badge variant="secondary">V: {p.vendor_name ?? p.vendor_id}</Badge>}
                        {p.customer_id && <Badge variant="secondary">C: {p.customer_name ?? p.customer_id}</Badge>}
                        {!p.vendor_id && !p.customer_id && <span className="italic text-muted-foreground">default</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.applicable_voucher_kinds.length > 0
                        ? p.applicable_voucher_kinds.join(', ')
                        : 'all'}
                    </TableCell>
                    <TableCell><Badge variant={p.status === 'active' ? 'default' : 'outline'}>{p.status}</Badge></TableCell>
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

// ── 4) QUALITY SPECS ─────────────────────────────────────────────────

export function QualitySpecsPanel(): JSX.Element {
  const entityCode = getActiveEntityCode();
  const [list, setList] = useState<QaSpec[]>([]);

  const refresh = useCallback((): void => {
    setList(listQaSpecs(entityCode));
  }, [entityCode]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Beaker className="h-5 w-5" /> Quality Specs
        </h1>
        <p className="text-sm text-muted-foreground">
          {list.length} spec{list.length === 1 ? '' : 's'} · 4 parameter types incl. master_lookup (D-331)
        </p>
      </header>

      <Card>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No specs yet. Section 8k demo seed creates 2 sample specs.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Parameters</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.code}</TableCell>
                    <TableCell className="text-sm">{s.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.item_name ?? <span className="italic">generic</span>}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-wrap gap-1">
                        {s.parameters.map(p => (
                          <Badge key={p.id} variant="outline" className="text-[10px]">
                            {p.name} ({p.parameter_type})
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={s.status === 'active' ? 'default' : 'outline'}>{s.status}</Badge></TableCell>
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

// ── 5) INSPECTION REGISTER ───────────────────────────────────────────

export function InspectionRegisterPanel(): JSX.Element {
  const entityCode = getActiveEntityCode();
  const [list, setList] = useState<QaInspectionRecord[]>([]);
  const [filter, setFilter] = useState('');

  const refresh = useCallback((): void => {
    setList(listQaInspections(entityCode));
  }, [entityCode]);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = list.filter(q => {
    if (!filter) return true;
    const s = filter.toLowerCase();
    return q.qa_no.toLowerCase().includes(s) || q.bill_no.toLowerCase().includes(s);
  });

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ListChecks className="h-5 w-5" /> Inspection Register
          </h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} inspection{filtered.length === 1 ? '' : 's'} · authority badge per D-335
          </p>
        </div>
        <Input
          placeholder="Search QA no, bill no…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="w-72"
        />
      </header>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No inspections recorded.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>QA No</TableHead>
                  <TableHead>Bill</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Authority</TableHead>
                  <TableHead>Lab Report</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(q => {
                  const auth = q.inspection_authority ?? 'internal';
                  const isLab = auth === 'external_lab';
                  return (
                    <TableRow key={q.id}>
                      <TableCell className="font-mono text-xs">{q.qa_no}</TableCell>
                      <TableCell className="font-mono text-xs">{q.bill_no}</TableCell>
                      <TableCell className="font-mono text-xs">{fmtDate(q.inspection_date)}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant={isLab ? 'secondary' : 'outline'} className="gap-1">
                          {isLab && <FlaskConical className="h-3 w-3" />}
                          {auth === 'customer_witnessed' && <ShieldCheck className="h-3 w-3" />}
                          {auth.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {q.external_lab_report_received_date
                          ? fmtDate(q.external_lab_report_received_date)
                          : '—'}
                      </TableCell>
                      <TableCell><Badge variant={statusVariant(q.status)}>{q.status}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
