/**
 * SmokeTestRunner.tsx — End-to-end health dashboard
 * Traverses every hub, checks storage keys populated, runs engine fns,
 * shows pass/fail matrix.
 * [JWT] GET /api/diagnostics/smoke-test
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { CheckCircle2, XCircle, Loader2, RefreshCw, Play, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  seedEntityDemoData, detectArchetype,
} from '@/lib/demo-seed-orchestrator';
import type { DemoArchetype } from '@/data/demo-customers-vendors';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import { computeCustomerKPIs } from '@/features/party-master/lib/customer-kpi-engine';
import { findCrossSellCandidates } from '@/features/party-master/lib/cross-sell-finder';

type CheckStatus = 'pending' | 'pass' | 'fail';
interface CheckResult {
  id: string; section: string; name: string;
  status: CheckStatus; expected: number | string; actual: number | string;
  details: string;
}

function readArray(key: string): unknown[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function readObj(key: string): unknown {
  try {
    // [JWT] GET /api/entity/storage/:key
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

interface CheckSpec {
  id: string; section: string; name: string;
  run: (entityCode: string) => { actual: number | string; expected: number | string; pass: boolean; details: string };
}

const CHECKS: CheckSpec[] = [
  // Foundation
  { id: 'fnd-1', section: 'Foundation', name: 'Entity registry populated',
    run: () => { const n = readArray('erp_group_entities').length;
      return { actual: n, expected: '≥1', pass: n >= 1, details: `${n} entities found` }; } },
  { id: 'fnd-2', section: 'Foundation', name: 'Customer master populated',
    run: () => { const n = readArray('erp_group_customer_master').length;
      return { actual: n, expected: '≥10', pass: n >= 10, details: `${n} customers` }; } },
  { id: 'fnd-3', section: 'Foundation', name: 'Vendor master populated',
    run: () => { const n = readArray('erp_group_vendor_master').length;
      return { actual: n, expected: '≥5', pass: n >= 5, details: `${n} vendors` }; } },
  { id: 'fnd-4', section: 'Foundation', name: 'Inventory items populated',
    run: () => { const n = readArray('erp_inventory_items').length;
      return { actual: n, expected: '≥5', pass: n >= 5, details: `${n} items` }; } },

  // FineCore
  { id: 'fc-1', section: 'FineCore', name: 'Vouchers exist for entity',
    run: (e) => { const n = readArray(`erp_group_vouchers_${e}`).length;
      return { actual: n, expected: '≥20', pass: n >= 20, details: `${n} vouchers` }; } },
  { id: 'fc-2', section: 'FineCore', name: 'Outstanding entries exist',
    run: (e) => { const n = readArray(`erp_outstanding_${e}`).length;
      return { actual: n, expected: '≥10', pass: n >= 10, details: `${n} outstanding records` }; } },
  { id: 'fc-3', section: 'FineCore', name: 'Sales invoices present',
    run: (e) => {
      const v = readArray(`erp_group_vouchers_${e}`) as Array<{ voucher_type?: string }>;
      const n = v.filter(x => x.voucher_type === 'sales_invoice').length;
      return { actual: n, expected: '≥20', pass: n >= 20, details: `${n} sales invoices` };
    } },
  { id: 'fc-4', section: 'FineCore', name: 'Receipts present',
    run: (e) => {
      const v = readArray(`erp_group_vouchers_${e}`) as Array<{ voucher_type?: string }>;
      const n = v.filter(x => x.voucher_type === 'receipt').length;
      return { actual: n, expected: '≥10', pass: n >= 10, details: `${n} receipts` };
    } },

  // SalesX
  { id: 'sx-1', section: 'SalesX', name: 'SAM persons',
    run: (e) => { const n = readArray(`erp_sam_persons_${e}`).length;
      return { actual: n, expected: '≥3', pass: n >= 3, details: `${n} persons` }; } },
  { id: 'sx-2', section: 'SalesX', name: 'SAM hierarchy',
    run: (e) => { const n = readArray(`erp_sam_hierarchy_${e}`).length;
      return { actual: n, expected: '≥3', pass: n >= 3, details: `${n} levels` }; } },
  { id: 'sx-3', section: 'SalesX', name: 'Enquiry sources',
    run: (e) => { const n = readArray(`erp_enquiry_sources_${e}`).length;
      return { actual: n, expected: '≥5', pass: n >= 5, details: `${n} sources` }; } },
  { id: 'sx-4', section: 'SalesX', name: 'Campaigns',
    run: (e) => { const n = readArray(`erp_campaigns_${e}`).length;
      return { actual: n, expected: '≥3', pass: n >= 3, details: `${n} campaigns` }; } },
  { id: 'sx-5', section: 'SalesX', name: 'Enquiries',
    run: (e) => { const n = readArray(`erp_enquiries_${e}`).length;
      return { actual: n, expected: '≥10', pass: n >= 10, details: `${n} enquiries` }; } },
  { id: 'sx-6', section: 'SalesX', name: 'Quotations',
    run: (e) => { const n = readArray(`erp_quotations_${e}`).length;
      return { actual: n, expected: '≥8', pass: n >= 8, details: `${n} quotations` }; } },
  { id: 'sx-7', section: 'SalesX', name: 'Targets',
    run: (e) => { const n = readArray(`erp_sam_targets_${e}`).length;
      return { actual: n, expected: '≥3', pass: n >= 3, details: `${n} targets` }; } },
  { id: 'sx-8', section: 'SalesX', name: 'Commission register',
    run: (e) => { const n = readArray(`erp_commission_register_${e}`).length;
      return { actual: n, expected: '≥10', pass: n >= 10, details: `${n} entries` }; } },

  // Sprint 7 — Field Force
  { id: 'sx-territories', section: 'SalesX', name: 'Territories',
    run: (e) => {
      // [JWT] GET /api/salesx/territories
      const n = readArray(`erp_territories_${e}`).length;
      return { actual: n, expected: '≥8', pass: n >= 8, details: `${n} territories` };
    } },
  { id: 'sx-beats', section: 'SalesX', name: 'Beat routes',
    run: (e) => {
      // [JWT] GET /api/salesx/beat-routes
      const n = readArray(`erp_beat_routes_${e}`).length;
      return { actual: n, expected: '≥20', pass: n >= 20, details: `${n} beats` };
    } },
  { id: 'sx-visit-logs', section: 'SalesX', name: 'Visit logs',
    run: (e) => {
      // [JWT] GET /api/salesx/visit-logs
      const n = readArray(`erp_visit_logs_${e}`).length;
      return { actual: n, expected: '≥50', pass: n >= 50, details: `${n} logs` };
    } },
  { id: 'sx-secondary-sales', section: 'SalesX', name: 'Secondary sales',
    run: (e) => {
      // [JWT] GET /api/salesx/secondary-sales
      const n = readArray(`erp_secondary_sales_${e}`).length;
      return { actual: n, expected: '≥20', pass: n >= 20, details: `${n} rows` };
    } },

  // ReceivX
  { id: 'rx-1', section: 'ReceivX', name: 'ReceivX config',
    run: (e) => { const o = readObj(`erp_receivx_config_${e}`);
      return { actual: o ? 'present' : 'missing', expected: 'present', pass: !!o, details: o ? 'Config loaded' : 'Missing' }; } },
  { id: 'rx-2', section: 'ReceivX', name: 'Reminder templates',
    run: (e) => { const n = readArray(`erp_receivx_templates_${e}`).length;
      return { actual: n, expected: '≥1', pass: n >= 1, details: `${n} templates` }; } },
  { id: 'rx-3', section: 'ReceivX', name: 'Collection execs',
    run: (e) => { const n = readArray(`erp_receivx_execs_${e}`).length;
      return { actual: n, expected: '≥1', pass: n >= 1, details: `${n} execs` }; } },
  { id: 'rx-4', section: 'ReceivX', name: 'Incentive schemes',
    run: (e) => { const n = readArray(`erp_receivx_schemes_${e}`).length;
      return { actual: n, expected: '≥1', pass: n >= 1, details: `${n} schemes` }; } },
  { id: 'rx-5', section: 'ReceivX', name: 'PTPs present',
    run: (e) => { const n = readArray(`erp_receivx_ptps_${e}`).length;
      return { actual: n, expected: '≥3', pass: n >= 3, details: `${n} PTPs` }; } },
  { id: 'rx-6', section: 'ReceivX', name: 'Communication log',
    run: (e) => { const n = readArray(`erp_receivx_comm_log_${e}`).length;
      return { actual: n, expected: '≥5', pass: n >= 5, details: `${n} log rows` }; } },

  // Pay Hub
  { id: 'ph-1', section: 'Pay Hub', name: 'Employees',
    run: () => { const n = readArray('erp_employees').length;
      return { actual: n, expected: '≥5', pass: n >= 5, details: `${n} employees` }; } },
  { id: 'ph-2', section: 'Pay Hub', name: 'Salary structures',
    run: () => { const n = readArray('erp_salary_structures').length;
      return { actual: n, expected: '≥1', pass: n >= 1, details: `${n} structures` }; } },
  { id: 'ph-3', section: 'Pay Hub', name: 'Pay grades',
    run: () => { const n = readArray('erp_pay_grades').length;
      return { actual: n, expected: '≥1', pass: n >= 1, details: `${n} grades` }; } },

  // T-H1.5-C-S4 — Customer Master regression checks
  { id: 'cm-1', section: 'Customer Master (S4)', name: 'Interface shape preserved — contacts[] is array',
    run: () => {
      const arr = readArray('erp_group_customer_master') as Array<{ contacts?: unknown }>;
      if (arr.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No customers to check' };
      const bad = arr.filter(c => !Array.isArray(c.contacts)).length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} customers with non-array contacts` };
    } },
  { id: 'cm-2', section: 'Customer Master (S4)', name: 'Interface shape preserved — addresses[] is array',
    run: () => {
      const arr = readArray('erp_group_customer_master') as Array<{ addresses?: unknown }>;
      if (arr.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No customers' };
      const bad = arr.filter(c => !Array.isArray(c.addresses)).length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} customers with non-array addresses` };
    } },
  { id: 'cm-3', section: 'Customer Master (S4)', name: 'Credit-hold field present (credit_hold_mode)',
    run: () => {
      const arr = readArray('erp_group_customer_master') as Array<{ credit_hold_mode?: unknown }>;
      if (arr.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No customers' };
      const missing = arr.filter(c => c.credit_hold_mode === undefined).length;
      return { actual: missing, expected: 0, pass: missing === 0, details: `${missing} missing credit_hold_mode` };
    } },
  { id: 'cm-4', section: 'Customer Master (S4)', name: 'Sales-force linkage preserved (territory_id, beat_ids)',
    run: () => {
      const arr = readArray('erp_group_customer_master') as Array<{ territory_id?: unknown; beat_ids?: unknown }>;
      if (arr.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No customers' };
      const bad = arr.filter(c => c.territory_id === undefined || !Array.isArray(c.beat_ids)).length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} customers with broken SF linkage` };
    } },
  { id: 'cm-5', section: 'Customer Master (S4)', name: 'Distributor hierarchy linkage preserved',
    run: () => {
      const arr = readArray('erp_group_customer_master') as Array<{ hierarchy_node_id?: unknown; hierarchy_role?: unknown; portal_enabled?: unknown }>;
      if (arr.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No customers' };
      const bad = arr.filter(c => c.hierarchy_node_id === undefined || c.portal_enabled === undefined).length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} customers with broken hierarchy linkage` };
    } },
  { id: 'cm-6', section: 'Customer Master (S4)', name: 'Two-tier credit fields intact (creditLimit + warningLimit)',
    run: () => {
      const arr = readArray('erp_group_customer_master') as Array<{ creditLimit?: unknown; warningLimit?: unknown }>;
      if (arr.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No customers' };
      const bad = arr.filter(c => typeof c.creditLimit !== 'number' || typeof c.warningLimit !== 'number').length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} customers with broken credit fields` };
    } },
  { id: 'cm-7', section: 'Customer Master (S4)', name: 'PartyPickerRow contract compatible',
    run: () => {
      const arr = readArray('erp_group_customer_master') as Array<{ id?: unknown; partyName?: unknown; partyCode?: unknown; gstin?: unknown }>;
      if (arr.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No customers' };
      const bad = arr.filter(c =>
        typeof c.id !== 'string' || typeof c.partyName !== 'string' ||
        typeof c.partyCode !== 'string').length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} customers with broken PartyPicker fields` };
    } },
  { id: 'cm-8', section: 'Customer Master (S4)', name: 'Deprecated fields retained (referredBy/associatedDealer/otherReference)',
    run: () => {
      const arr = readArray('erp_group_customer_master') as Array<Record<string, unknown>>;
      const bad = arr.filter(c => !('referredBy' in c) || !('associatedDealer' in c) || !('otherReference' in c)).length;
      return { actual: bad, expected: 0, pass: bad === 0, details: `${bad} customers missing deprecated fields` };
    } },

  // Customer Intelligence Layer (S4.5)
  { id: 'cm-kpi-1', section: 'Customer Intelligence (S4.5)',
    name: 'KPI engine returns finite numbers for seeded customer',
    run: (e) => {
      const customers = readArray('erp_group_customer_master') as Array<{ id?: string }>;
      if (customers.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No customers' };
      const first = customers[0].id;
      if (!first) return { actual: 'missing id', expected: 'id', pass: false, details: 'First customer has no id' };
      const kpi = computeCustomerKPIs(first, e);
      const allFinite = [kpi.revenueMTD, kpi.revenueYTD, kpi.lifetimeRevenue, kpi.outstandingAmount, kpi.daysSalesOutstanding].every(Number.isFinite);
      return { actual: allFinite ? 'ok' : 'NaN detected', expected: 'all finite', pass: allFinite, details: JSON.stringify(kpi) };
    } },
  { id: 'cm-kpi-2', section: 'Customer Intelligence (S4.5)',
    name: 'Cross-sell finder returns array (never null/undefined)',
    run: () => {
      const out = findCrossSellCandidates({ customers: [], kpis: new Map() });
      return { actual: Array.isArray(out) ? 'array' : 'not-array', expected: 'array', pass: Array.isArray(out), details: `length=${out.length}` };
    } },
  { id: 'cm-kpi-3', section: 'Customer Intelligence (S4.5)',
    name: 'KPI healthStatus enum correct',
    run: (e) => {
      const customers = readArray('erp_group_customer_master') as Array<{ id?: string }>;
      if (customers.length === 0) return { actual: 'skip', expected: 'skip', pass: true, details: 'No customers' };
      const allOk = customers.slice(0, 10).every(c => {
        if (!c.id) return false;
        const kpi = computeCustomerKPIs(c.id, e);
        return ['green', 'amber', 'red', 'new'].includes(kpi.healthStatus);
      });
      return { actual: allOk ? 'ok' : 'bad enum', expected: 'valid', pass: allOk, details: 'Sampled first 10' };
    } },
];

function useCtrlS(handler: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handler(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handler]);
}

export function SmokeTestRunnerPanel() { return <SmokeTestRunner />; }

export default function SmokeTestRunner() {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [running, setRunning] = useState(false);
  const [entityCode, setEntityCode] = useState<string>(DEFAULT_ENTITY_SHORTCODE);
  const [archetype, setArchetype] = useState<DemoArchetype>('trading');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const sections = useMemo(() => Array.from(new Set(CHECKS.map(c => c.section))), []);

  const runAll = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const next: CheckResult[] = CHECKS.map(c => {
        try {
          const r = c.run(entityCode);
          return {
            id: c.id, section: c.section, name: c.name,
            status: r.pass ? 'pass' : 'fail',
            expected: r.expected, actual: r.actual, details: r.details,
          };
        } catch (err) {
          return { id: c.id, section: c.section, name: c.name,
            status: 'fail', expected: '-', actual: 'error', details: (err as Error).message };
        }
      });
      setResults(next);
      setRunning(false);
      const passed = next.filter(r => r.status === 'pass').length;
      toast.success(`Smoke test complete: ${passed}/${next.length} passed`);
    }, 300);
  }, [entityCode]);

  const reseed = useCallback(() => {
    try {
      const result = seedEntityDemoData(entityCode, archetype);
      toast.success(`${entityCode} reseeded: ${result.customers} cust, ${result.salesInvoices} inv, ${result.ptps} PTPs`);
      runAll();
    } catch (err) {
      toast.error(`Re-seed failed: ${(err as Error).message}`);
    }
  }, [entityCode, archetype, runAll]);

  const exportReport = useCallback(() => {
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `smoke-test-${entityCode}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [results, entityCode]);

  useEffect(() => { runAll(); }, [runAll]);
  useCtrlS(runAll);

  const passed = results.filter(r => r.status === 'pass').length;
  const total = results.length;
  const score = total > 0 ? Math.round((passed / total) * 100) : 0;
  const healthColor = score >= 90 ? 'text-emerald-500' : score >= 70 ? 'text-amber-500' : 'text-destructive';

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Detect archetype from entity (best effort)
  useEffect(() => {
    try {
      const entities = readArray('erp_group_entities') as Array<{ shortCode?: string; businessActivity?: string }>;
      const ent = entities.find(e => e.shortCode === entityCode);
      if (ent?.businessActivity) setArchetype(detectArchetype(ent.businessActivity));
    } catch { /* ignore */ }
  }, [entityCode]);

  return (
    <div data-keyboard-form className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Smoke Test Runner</h1>
          <p className="text-sm text-muted-foreground mt-1">
            End-to-end health checks across every hub. Validates seeded data integrity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={entityCode} onValueChange={setEntityCode}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(readArray('erp_group_entities') as Array<{ shortCode: string; name: string }>)
                .map(e => <SelectItem key={e.shortCode} value={e.shortCode}>{e.shortCode}</SelectItem>)}
              {readArray('erp_group_entities').length === 0 && <SelectItem value={DEFAULT_ENTITY_SHORTCODE}>{DEFAULT_ENTITY_SHORTCODE}</SelectItem>}
            </SelectContent>
          </Select>
          <Select value={archetype} onValueChange={(v) => setArchetype(v as DemoArchetype)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="trading">Trading</SelectItem>
              <SelectItem value="services">Services</SelectItem>
              <SelectItem value="manufacturing">Manufacturing</SelectItem>
            </SelectContent>
          </Select>
          <Button data-primary onClick={runAll} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Run All Checks
          </Button>
          <Button variant="outline" onClick={reseed} className="border-amber-500/40 text-amber-600 hover:bg-amber-500/10">
            <RefreshCw className="h-4 w-4 mr-2" />
            Re-Seed Demo Data
          </Button>
          <Button variant="ghost" onClick={exportReport} disabled={results.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-6 flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Overall health score</div>
            <div className={`text-4xl font-mono font-bold ${healthColor}`}>{passed}/{total}</div>
            <div className="text-xs text-muted-foreground mt-1">{score}% checks passed</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={score >= 90 ? 'default' : 'destructive'} className={score >= 70 && score < 90 ? 'bg-amber-500' : ''}>
              {score >= 90 ? 'HEALTHY' : score >= 70 ? 'DEGRADED' : 'CRITICAL'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {sections.map(section => {
        const sectionResults = results.filter(r => r.section === section);
        const sectionPass = sectionResults.filter(r => r.status === 'pass').length;
        return (
          <Card key={section}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{section}</span>
                <Badge variant="outline">{sectionPass}/{sectionResults.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sectionResults.map(r => (
                <div key={r.id} className="border-b border-border/40 last:border-0 pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {r.status === 'pass'
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                      <span className="text-sm">{r.name}</span>
                    </div>
                    <Badge variant={r.status === 'pass' ? 'default' : 'destructive'}
                           className={r.status === 'pass' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' : ''}>
                      {r.status === 'pass' ? 'PASS' : 'FAIL'}
                    </Badge>
                    <Button size="sm" variant="ghost" onClick={() => toggle(r.id)} className="text-xs">
                      Details
                    </Button>
                  </div>
                  {expanded.has(r.id) && (
                    <div className="text-xs text-muted-foreground mt-1 ml-6 font-mono">
                      Expected: {r.expected} · Actual: {r.actual} · {r.details}
                    </div>
                  )}
                </div>
              ))}
              {sectionResults.length === 0 && (
                <div className="text-sm text-muted-foreground italic">No results yet — run checks</div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
