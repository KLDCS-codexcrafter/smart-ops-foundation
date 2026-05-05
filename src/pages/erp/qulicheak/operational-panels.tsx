/**
 * operational-panels.tsx (QualiCheck) — Sprint 5-pre-2 · Block G
 * 5 NEW operational panels: Closure Log · Vendor Scorecard · CoA Register ·
 * Pending Alerts · Bulk Plan Assignment.
 *
 * SIBLING DISCIPLINE: 5-pre-1 panels.tsx is BYTE-IDENTICAL preserved.
 * PATTERN: deliberate [list, setList] + refresh() · NO [tick, setTick] anti-pattern.
 *
 * [JWT] GET /api/qa/closure-log · /api/qa/vendor-scorecard · /api/qa/coa
 *       /api/qa/pending-alerts · POST /api/qa/plans/bulk-assign
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, Award, FileCheck, AlertTriangle, Layers, FileDown } from 'lucide-react';

// Sprint 6-pre-1 · Block 0 · D-359 · 5-pre-3 polish absorption
// 3-row skeleton + icon-decorated empty state · matches panels.tsx 5-pre-3 Block F precedent
function LoadingRows(): JSX.Element {
  return (
    <div className="p-4 space-y-2">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

function EmptyState(props: {
  Icon: React.ComponentType<{ className?: string }>;
  heading: string;
  description: string;
}): JSX.Element {
  const { Icon, heading, description } = props;
  return (
    <div className="py-12 text-center space-y-3">
      <Icon className="w-12 h-12 mx-auto text-muted-foreground" />
      <h3 className="text-lg font-semibold">{heading}</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
    </div>
  );
}
import { toast } from 'sonner';
import { listClosureLog } from '@/lib/qa-closure-resolver';
import { computeVendorScorecard } from '@/lib/oob/vendor-quality-scorecard-engine';
import { listGeneratedCoA, generateAndCacheCoA } from '@/lib/qa-coa-print-engine';
import {
  getPendingInspectionAlerts, DEFAULT_PENDING_THRESHOLD_HOURS,
} from '@/lib/oob/qa-pending-inspection-alerts';
import { listQaPlans, updateQaPlanStatus, createQaPlan } from '@/lib/qa-plan-engine';
import { listQaSpecs } from '@/lib/qa-spec-engine';
import { listQaInspections } from '@/lib/qa-inspection-engine';
import type { QaClosureLogEntry } from '@/types/qa-closure-log';
import type { VendorScorecardMetrics } from '@/lib/oob/vendor-quality-scorecard-engine';
import type { CoARegisterRow } from '@/lib/qa-coa-print-engine';
import type { QaPendingAlert } from '@/lib/oob/qa-pending-inspection-alerts';
import type { QaPlan } from '@/types/qa-plan';
import type { QaSpec } from '@/types/qa-spec';

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

// ── 1) CLOSURE LOG ───────────────────────────────────────────────────

export function ClosureLogPanel(): JSX.Element {
  const entityCode = getActiveEntityCode();
  const [list, setList] = useState<QaClosureLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const refresh = useCallback((): void => {
    setLoading(true);
    setList(listClosureLog(entityCode));
    setLoading(false);
  }, [entityCode]);
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" /> Closure Log
        </h1>
        <p className="text-sm text-muted-foreground">
          {list.length} closure{list.length === 1 ? '' : 's'} · auto-routed Stock Journals (D-338)
        </p>
      </header>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingRows />
          ) : list.length === 0 ? (
            <EmptyState
              Icon={FileCheck}
              heading="No closure log entries yet"
              description="When inspections complete, their stock journal vouchers appear here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>QA No</TableHead>
                  <TableHead>Closed</TableHead>
                  <TableHead>Approved Qty</TableHead>
                  <TableHead>Sample Qty</TableHead>
                  <TableHead>Rejection Qty</TableHead>
                  <TableHead>Vouchers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map(e => {
                  const vouchers = [
                    e.approved_voucher_id && 'A',
                    e.sample_voucher_id && 'S',
                    e.rejection_voucher_id && 'R',
                  ].filter(Boolean) as string[];
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs">{e.qa_no}</TableCell>
                      <TableCell className="font-mono text-xs">{fmtDate(e.closed_at)}</TableCell>
                      <TableCell className="font-mono text-xs">{e.approved_qty}</TableCell>
                      <TableCell className="font-mono text-xs">{e.sample_qty}</TableCell>
                      <TableCell className="font-mono text-xs">{e.rejection_qty}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-wrap gap-1">
                          {vouchers.map(v => (
                            <Badge key={`${e.id}-${v}`} variant="outline">{v}</Badge>
                          ))}
                        </div>
                      </TableCell>
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

// ── 2) VENDOR SCORECARD ──────────────────────────────────────────────

export function VendorScorecardPanel(): JSX.Element {
  const entityCode = getActiveEntityCode();
  const [list, setList] = useState<VendorScorecardMetrics[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const refresh = useCallback((): void => {
    setLoading(true);
    setList(computeVendorScorecard(entityCode));
    setLoading(false);
  }, [entityCode]);
  useEffect(() => { refresh(); }, [refresh]);

  const grade = (acc: number): { label: string; v: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    if (acc >= 95) return { label: 'A', v: 'default' };
    if (acc >= 85) return { label: 'B', v: 'secondary' };
    if (acc >= 70) return { label: 'C', v: 'outline' };
    return { label: 'D', v: 'destructive' };
  };

  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Award className="h-5 w-5" /> Vendor Quality Scorecard
        </h1>
        <p className="text-sm text-muted-foreground">
          {list.length} vendor{list.length === 1 ? '' : 's'} · 5 metrics (D-340 OOB-58)
        </p>
      </header>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingRows />
          ) : list.length === 0 ? (
            <EmptyState
              Icon={Award}
              heading="No vendor scorecards yet"
              description="Vendor scorecards appear after their inspections are completed."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Inspections</TableHead>
                  <TableHead>Acceptance</TableHead>
                  <TableHead>Rejection</TableHead>
                  <TableHead>Critical Defect</TableHead>
                  <TableHead>Avg Lab TAT</TableHead>
                  <TableHead>Discrepancy</TableHead>
                  <TableHead>Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map(v => {
                  const g = grade(v.acceptance_rate_pct);
                  return (
                    <TableRow key={v.vendor_id}>
                      <TableCell className="text-sm">{v.vendor_name}</TableCell>
                      <TableCell className="font-mono text-xs">{v.total_inspections}</TableCell>
                      <TableCell className="font-mono text-xs">{v.acceptance_rate_pct.toFixed(1)}%</TableCell>
                      <TableCell className="font-mono text-xs">{v.rejection_rate_pct.toFixed(1)}%</TableCell>
                      <TableCell className="font-mono text-xs">{v.critical_defect_rate_pct.toFixed(1)}%</TableCell>
                      <TableCell className="font-mono text-xs">
                        {v.avg_external_lab_tat_days !== null ? `${v.avg_external_lab_tat_days}d` : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{v.sample_bulk_discrepancy_count}</TableCell>
                      <TableCell><Badge variant={g.v}>{g.label}</Badge></TableCell>
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

// ── 3) COA REGISTER ──────────────────────────────────────────────────

export function CoARegisterPanel(): JSX.Element {
  const entityCode = getActiveEntityCode();
  const [generated, setGenerated] = useState<CoARegisterRow[]>([]);
  const [pending, setPending] = useState<{ id: string; qa_no: string; item_name: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback((): void => {
    setLoading(true);
    setGenerated(listGeneratedCoA(entityCode));
    const completed = listQaInspections(entityCode).filter(q =>
      (q.status === 'passed' || q.status === 'failed' || q.status === 'partial_pass')
      && !q.coa_url,
    );
    setPending(completed.map(q => ({
      id: q.id, qa_no: q.qa_no, item_name: q.lines?.[0]?.item_name ?? '',
    })));
    setLoading(false);
  }, [entityCode]);
  useEffect(() => { refresh(); }, [refresh]);

  const onGenerate = (qaId: string): void => {
    const r = generateAndCacheCoA(qaId, entityCode);
    if (r.ok) { toast.success('CoA generated'); refresh(); }
    else { toast.error('CoA generation failed'); }
  };

  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <FileCheck className="h-5 w-5" /> Certificate of Analysis Register
        </h1>
        <p className="text-sm text-muted-foreground">
          {generated.length} generated · {pending.length} pending · D-341 on-demand
        </p>
      </header>

      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending CoA Generation</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>QA No</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.qa_no}</TableCell>
                    <TableCell className="text-sm">{p.item_name}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => onGenerate(p.id)}>
                        <FileDown className="h-3 w-3 mr-1" /> Generate CoA
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generated</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <LoadingRows />
          ) : generated.length === 0 ? (
            <EmptyState
              Icon={FileCheck}
              heading="No generated CoAs"
              description="Generate CoAs from completed inspections to send to customers."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>QA No</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead>URL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generated.map(r => (
                  <TableRow key={r.qa_id}>
                    <TableCell className="font-mono text-xs">{r.qa_no}</TableCell>
                    <TableCell className="text-sm">{r.item_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.party_name ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{fmtDate(r.generated_at)}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{r.coa_url}</TableCell>
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

// ── 4) PENDING ALERTS ────────────────────────────────────────────────

export function PendingAlertsPanel(): JSX.Element {
  const entityCode = getActiveEntityCode();
  const [threshold, setThreshold] = useState<number>(DEFAULT_PENDING_THRESHOLD_HOURS);
  const [list, setList] = useState<QaPendingAlert[]>([]);
  const refresh = useCallback((): void => {
    setList(getPendingInspectionAlerts(entityCode, threshold));
  }, [entityCode, threshold]);
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" /> Pending Inspection Alerts
          </h1>
          <p className="text-sm text-muted-foreground">
            {list.length} alert{list.length === 1 ? '' : 's'} · blocking 4-way Match · OOB-59
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="threshold" className="text-sm">Threshold (hrs)</Label>
          <Input id="threshold" type="number" min={1} value={threshold}
                 onChange={e => setThreshold(Math.max(1, Number(e.target.value) || 1))}
                 className="w-24 font-mono" />
        </div>
      </header>

      <Card>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No pending inspections older than {threshold}h.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>QA No</TableHead>
                  <TableHead>Bill</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Inspector</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map(a => (
                  <TableRow key={a.qa_id}>
                    <TableCell className="font-mono text-xs">{a.qa_no}</TableCell>
                    <TableCell className="font-mono text-xs">{a.bill_no}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.vendor_name ?? '—'}</TableCell>
                    <TableCell className="text-sm">{a.inspector_user_id}</TableCell>
                    <TableCell className="font-mono text-xs">
                      <Badge variant={a.age_hours >= 72 ? 'destructive' : 'secondary'}>
                        {a.age_hours}h
                      </Badge>
                    </TableCell>
                    <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
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

// ── 5) BULK PLAN ASSIGNMENT ──────────────────────────────────────────

export function BulkPlanAssignmentPanel(): JSX.Element {
  const entityCode = getActiveEntityCode();
  const [plans, setPlans] = useState<QaPlan[]>([]);
  const [specs, setSpecs] = useState<QaSpec[]>([]);
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<QaPlan['status']>('active');
  const [partyKind, setPartyKind] = useState<'vendor' | 'customer'>('vendor');
  const [partyId, setPartyId] = useState('');
  const [specId, setSpecId] = useState('');

  const refresh = useCallback((): void => {
    setPlans(listQaPlans(entityCode));
    setSpecs(listQaSpecs(entityCode));
  }, [entityCode]);
  useEffect(() => { refresh(); }, [refresh]);

  const allSelected = useMemo(
    () => plans.length > 0 && plans.every(p => selectedPlanIds.has(p.id)),
    [plans, selectedPlanIds],
  );

  const toggleAll = (): void => {
    if (allSelected) setSelectedPlanIds(new Set());
    else setSelectedPlanIds(new Set(plans.map(p => p.id)));
  };

  const toggleOne = (id: string): void => {
    const next = new Set(selectedPlanIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedPlanIds(next);
  };

  const onApplyStatus = (): void => {
    if (selectedPlanIds.size === 0) {
      toast.error('Select at least one plan');
      return;
    }
    let n = 0;
    for (const id of selectedPlanIds) {
      if (updateQaPlanStatus(id, bulkStatus, entityCode)) n++;
    }
    toast.success(`${n} plan${n === 1 ? '' : 's'} updated to '${bulkStatus}'`);
    setSelectedPlanIds(new Set());
    refresh();
  };

  const onCreatePartyVariant = (): void => {
    if (!partyId || !specId) {
      toast.error('Party ID and Spec are required');
      return;
    }
    const code = `QP-${partyKind.toUpperCase()}-${Date.now().toString(36).slice(-5)}`;
    createQaPlan({
      code,
      name: `Bulk variant · ${partyKind} ${partyId}`,
      plan_type: partyKind === 'vendor' ? 'incoming' : 'outgoing',
      spec_id: specId,
      vendor_id: partyKind === 'vendor' ? partyId : null,
      vendor_name: partyKind === 'vendor' ? partyId : null,
      customer_id: partyKind === 'customer' ? partyId : null,
      customer_name: partyKind === 'customer' ? partyId : null,
      applicable_voucher_kinds: [],
    }, entityCode);
    toast.success(`Created ${code}`);
    setPartyId('');
    refresh();
  };

  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Layers className="h-5 w-5" /> Bulk Plan Assignment
        </h1>
        <p className="text-sm text-muted-foreground">
          Bulk status change + per-party variant creation (D-336 + D-340)
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bulk Status Update</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end gap-3">
            <div>
              <Label className="text-xs">New status</Label>
              <Select value={bulkStatus} onValueChange={v => setBulkStatus(v as QaPlan['status'])}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">draft</SelectItem>
                  <SelectItem value="active">active</SelectItem>
                  <SelectItem value="archived">archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={onApplyStatus} disabled={selectedPlanIds.size === 0}>
              Apply to {selectedPlanIds.size} selected
            </Button>
          </div>

          {plans.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No plans to manage.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Checkbox checked={selectedPlanIds.has(p.id)}
                                onCheckedChange={() => toggleOne(p.id)} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.code}</TableCell>
                    <TableCell className="text-sm">{p.name}</TableCell>
                    <TableCell><Badge variant="outline">{p.plan_type}</Badge></TableCell>
                    <TableCell><Badge variant={p.status === 'active' ? 'default' : 'outline'}>{p.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create Per-Party Variant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <Label className="text-xs">Party kind</Label>
              <Select value={partyKind} onValueChange={v => setPartyKind(v as 'vendor' | 'customer')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendor">vendor</SelectItem>
                  <SelectItem value="customer">customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Party ID</Label>
              <Input value={partyId} onChange={e => setPartyId(e.target.value)}
                     placeholder="e.g. V-001" />
            </div>
            <div>
              <Label className="text-xs">Spec</Label>
              <Select value={specId} onValueChange={setSpecId}>
                <SelectTrigger><SelectValue placeholder="Select spec" /></SelectTrigger>
                <SelectContent>
                  {specs.filter(s => s.status === 'active').map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={onCreatePartyVariant}>Create variant</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
