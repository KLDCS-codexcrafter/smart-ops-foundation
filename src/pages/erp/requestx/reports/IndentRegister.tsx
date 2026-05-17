/**
 * IndentRegister.tsx — UPRA-4 Phase C · Tier-2 V2 in-place migration · THE FINAL UPRA ARC CLOSURE
 *
 * Cross-record-type consolidated Register (Material + Service + Capital Indents).
 * Migrated to UniversalRegisterGrid<IndentUnionRow>. Cancel workflow EXTRACTED to IndentActionsDialog (M12 canonical).
 * 4-Tab kind filter via customFilters slot + external useMemo (matches IRN V2 customFilters precedent).
 * STATUS_LABEL + STATUS_COLOR imported from requisition-common (PF-Q7=(A) · file 0-diff).
 * Health Score + Strategy Badge + Vendor Pool features preserved byte-identical (PF-Q6=(A)).
 * Export signature preserved: IndentRegisterPanel() no-Props · RequestXPage consumer 0-diff.
 *
 * [JWT] GET /api/requestx/indents (consolidated)
 */

import { useCallback, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { UniversalRegisterGrid } from '@/components/registers/UniversalRegisterGrid';
import type { RegisterColumn, RegisterMeta, StatusOption, SummaryCard } from '@/components/registers/UniversalRegisterTypes';
import { useMaterialIndents } from '@/hooks/useMaterialIndents';
import { useServiceRequests } from '@/hooks/useServiceRequests';
import { useCapitalIndents } from '@/hooks/useCapitalIndents';
import { useEntityCode } from '@/hooks/useEntityCode';
import { STATUS_LABEL, STATUS_COLOR } from '@/types/requisition-common';
import type { IndentStatus, MaterialIndent } from '@/types/material-indent';
import type { ServiceRequest } from '@/types/service-request';
import type { CapitalIndent } from '@/types/capital-indent';
import { computeIndentHealthScore, inrFmt } from '@/lib/requestx-report-engine';
import { bandFromScore } from '@/lib/indent-health-score-engine';
import {
  recommendStrategy,
  type VendorPoolEntry,
  type SourcingStrategy,
} from '@/lib/multi-sourcing-strategy-engine';
import { IndentActionsDialog, type IndentAction } from './actions/IndentActionsDialog';
import { IndentDetailPanel } from './detail/IndentDetailPanel';
import { IndentPrint } from './print/IndentPrint';

// Discriminated union row · exported for Detail+Print consumption
export type IndentUnionRow =
  | (MaterialIndent & { kind: 'material'; health: number; strategy: SourcingStrategy })
  | (ServiceRequest & { kind: 'service'; health: number; strategy: SourcingStrategy })
  | (CapitalIndent & { kind: 'capital'; health: number; strategy: SourcingStrategy });

type Kind = 'all' | 'material' | 'service' | 'capital';

// PF-Q7=(A) · Tailwind class adapter for STATUS_COLOR theme names
const statusBadgeClass = (status: IndentStatus): string => {
  const tone = STATUS_COLOR[status];
  if (tone === 'muted') return 'bg-muted text-muted-foreground';
  if (tone === 'primary') return 'bg-primary/10 text-primary';
  if (tone === 'warning') return 'bg-warning/10 text-warning';
  if (tone === 'success') return 'bg-success/10 text-success';
  if (tone === 'destructive') return 'bg-destructive/10 text-destructive';
  return 'bg-muted text-muted-foreground';
};

// PF-Q6=(A) · Health band color (preserved byte-identical from legacy)
const bandColor = (b: ReturnType<typeof bandFromScore>): string => {
  if (b === 'excellent') return 'text-success';
  if (b === 'good') return 'text-primary';
  if (b === 'warning') return 'text-warning';
  return 'text-destructive';
};

// PF-Q6=(A) · Strategy presentation (preserved byte-identical from legacy)
const strategyLabel = (s: SourcingStrategy): string => {
  if (s === 'single_source') return 'Single Source';
  if (s === 'reverse_auction') return 'Reverse Auction';
  return 'Multi Quote';
};

const strategyBadge = (s: SourcingStrategy): JSX.Element => {
  if (s === 'reverse_auction') return <Badge className="text-[10px]">{strategyLabel(s)}</Badge>;
  if (s === 'single_source') return <Badge variant="secondary" className="text-[10px]">{strategyLabel(s)}</Badge>;
  return <Badge variant="outline" className="text-[10px]">{strategyLabel(s)}</Badge>;
};

// PF-Q6=(A) · Vendor pool loader (D-249 zero-touch · byte-identical to legacy lines 56-67)
function loadVendorPool(): VendorPoolEntry[] {
  try {
    const raw = localStorage.getItem('erp_group_vendor_master');
    if (!raw) return [];
    const arr = JSON.parse(raw) as Array<Record<string, unknown>>;
    return arr.map((v) => ({
      id: String(v.id ?? ''),
      name: typeof v.name === 'string' ? v.name : undefined,
      status: typeof v.status === 'string' ? v.status : undefined,
      is_preferred: Boolean(v.is_preferred),
      categories: Array.isArray(v.categories) ? (v.categories as string[]) : undefined,
    }));
  } catch { return []; }
}

export function IndentRegisterPanel(): JSX.Element {
  const mi = useMaterialIndents();
  const sr = useServiceRequests();
  const ci = useCapitalIndents();
  const { entityCode } = useEntityCode();
  const safeEntity = entityCode || 'SMRT';
  const [tab, setTab] = useState<Kind>('all');
  const [selected, setSelected] = useState<IndentUnionRow | null>(null);
  const [printing, setPrinting] = useState<IndentUnionRow | null>(null);
  const [action, setAction] = useState<IndentAction | null>(null);

  const vendorPool = useMemo(() => loadVendorPool(), []);

  const allRows = useMemo<IndentUnionRow[]>(() => [
    ...mi.map(x => ({
      ...x,
      kind: 'material' as const,
      health: computeIndentHealthScore(x),
      strategy: recommendStrategy(x, vendorPool, safeEntity).strategy,
    })),
    ...sr.map(x => ({
      ...x,
      kind: 'service' as const,
      health: 100,
      strategy: recommendStrategy(x, vendorPool, safeEntity).strategy,
    })),
    ...ci.map(x => ({
      ...x,
      kind: 'capital' as const,
      health: 100,
      strategy: recommendStrategy(x, vendorPool, safeEntity).strategy,
    })),
  ], [mi, sr, ci, vendorPool, safeEntity]);

  const filteredRows = useMemo(
    () => tab === 'all' ? allRows : allRows.filter(r => r.kind === tab),
    [allRows, tab],
  );

  const meta: RegisterMeta<IndentUnionRow> = {
    registerCode: 'indent_register',
    title: 'Indent Register',
    description: 'All indents · Material · Service · Capital · with health score and sourcing strategy',
    dateAccessor: r => r.date,
  };

  const columns: RegisterColumn<IndentUnionRow>[] = [
    { key: 'voucher_no', label: 'Voucher', render: r => r.voucher_no, exportKey: 'voucher_no' },
    { key: 'date', label: 'Date', render: r => r.date, exportKey: 'date' },
    {
      key: 'kind', label: 'Kind',
      render: r => <Badge variant="outline" className="text-[10px]">{r.kind}</Badge>,
      exportKey: 'kind',
    },
    { key: 'dept', label: 'Department', render: r => r.originating_department_name, exportKey: 'originating_department_name' },
    { key: 'requester', label: 'Requester', render: r => r.requested_by_name, exportKey: 'requested_by_name' },
    {
      key: 'value', label: 'Value', align: 'right',
      render: r => inrFmt(r.total_estimated_value),
      exportKey: r => r.total_estimated_value,
    },
    {
      key: 'status', label: 'Status',
      render: r => <Badge variant="outline" className={statusBadgeClass(r.status)}>{STATUS_LABEL[r.status]}</Badge>,
      exportKey: 'status',
    },
    {
      key: 'strategy', label: 'Strategy',
      render: r => strategyBadge(r.strategy),
      exportKey: r => r.strategy,
    },
    {
      key: 'health', label: 'Health', align: 'right',
      render: r => {
        const band = bandFromScore(r.health);
        return (
          <span className={`font-mono text-xs ${bandColor(band)}`}>
            {r.kind === 'material' ? r.health : '—'}
          </span>
        );
      },
      exportKey: r => r.kind === 'material' ? r.health : '',
    },
    {
      key: 'actions', label: 'Actions', align: 'right',
      render: r => (
        <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
          {r.status === 'draft' && (
            <button
              className="h-7 px-2 text-[10px] rounded border border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => setAction({ kind: 'cancel', record: r })}
            >
              Cancel
            </button>
          )}
        </div>
      ),
      exportKey: () => '',
    },
  ];

  const statusOptions: StatusOption[] = (Object.keys(STATUS_LABEL) as IndentStatus[])
    .map(s => ({ value: s, label: STATUS_LABEL[s] }));

  const summaryBuilder = (f: IndentUnionRow[]): SummaryCard[] => {
    const draft = f.filter(r => r.status === 'draft').length;
    const submitted = f.filter(r => r.status === 'submitted').length;
    const approved = f.filter(r => r.status === 'approved').length;
    const closed = f.filter(r => r.status === 'closed').length;
    const totalValue = f.reduce((a, r) => a + r.total_estimated_value, 0);
    return [
      { label: 'Total Indents', value: String(f.length) },
      { label: 'Draft', value: String(draft) },
      { label: 'Submitted', value: String(submitted), tone: 'warning' },
      { label: 'Approved', value: String(approved), tone: 'positive' },
      { label: 'Closed', value: String(closed) },
      { label: 'Total Value', value: inrFmt(totalValue) },
    ];
  };

  const kindTabsUI = (
    <Tabs value={tab} onValueChange={v => setTab(v as Kind)}>
      <TabsList>
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="material">Material</TabsTrigger>
        <TabsTrigger value="service">Service</TabsTrigger>
        <TabsTrigger value="capital">Capital</TabsTrigger>
      </TabsList>
    </Tabs>
  );

  const handleActionComplete = useCallback(() => {
    setAction(null);
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-6">
      <UniversalRegisterGrid<IndentUnionRow>
        entityCode={safeEntity}
        meta={meta}
        rows={filteredRows}
        columns={columns}
        statusOptions={statusOptions}
        statusKey="status"
        summaryBuilder={summaryBuilder}
        customFilters={kindTabsUI}
        onNavigateToRecord={setSelected}
      />
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selected && <IndentDetailPanel row={selected} onPrint={() => setPrinting(selected)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!printing} onOpenChange={o => !o && setPrinting(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {printing && <IndentPrint row={printing} onClose={() => setPrinting(null)} />}
        </DialogContent>
      </Dialog>
      <IndentActionsDialog
        action={action}
        open={action !== null}
        entityCode={safeEntity}
        onClose={() => setAction(null)}
        onActionComplete={handleActionComplete}
      />
    </div>
  );
}
