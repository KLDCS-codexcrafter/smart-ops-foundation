/**
 * @file        IndentRegister.tsx
 * @sprint      T-Phase-1.2.6f-pre-2 · Block B
 *              T-Phase-1.2.6f-d-2 · Block D · D-299 · Strategy badge column added
 * @purpose     Unified register (Material/Service/Capital) · health column · drill-in.
 *              Adds sourcing-strategy recommendation badge per indent (Q3=A · 3 strategies).
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useMaterialIndents } from '@/hooks/useMaterialIndents';
import { useServiceRequests } from '@/hooks/useServiceRequests';
import { useCapitalIndents } from '@/hooks/useCapitalIndents';
import { useEntityCode } from '@/hooks/useEntityCode';
import { STATUS_LABEL } from '@/types/requisition-common';
import { computeIndentHealthScore } from '@/lib/requestx-report-engine';
import { bandFromScore } from '@/lib/indent-health-score-engine';
import { inrFmt } from '@/lib/requestx-report-engine';
import { cancelIndent, type IndentKind } from '@/lib/request-engine';
import { SkeletonRows } from '@/components/ui/SkeletonRows';
import {
  recommendStrategy,
  type VendorPoolEntry,
  type SourcingStrategy,
} from '@/lib/multi-sourcing-strategy-engine';

type Kind = 'all' | 'material' | 'service' | 'capital';

const bandColor = (b: ReturnType<typeof bandFromScore>): string => {
  if (b === 'excellent') return 'text-success';
  if (b === 'good') return 'text-primary';
  if (b === 'warning') return 'text-warning';
  return 'text-destructive';
};

// Block D · D-299 · Strategy badge presentation
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

// Block D · read group-wide vendor pool (D-249 zero-touch · structural typing only)
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
  const [tab, setTab] = useState<Kind>('all');
  const [q, setQ] = useState('');

  const [cancelTarget, setCancelTarget] = useState<{ id: string; kind: IndentKind; voucher_no: string } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const vendorPool = useMemo(() => loadVendorPool(), []);

  const rows = useMemo(() => {
    const all = [
      ...mi.map(x => ({
        ...x,
        kind: 'material' as const,
        health: computeIndentHealthScore(x),
        strategy: recommendStrategy(x, vendorPool, entityCode).strategy,
      })),
      ...sr.map(x => ({
        ...x,
        kind: 'service' as const,
        health: 100,
        strategy: recommendStrategy(x, vendorPool, entityCode).strategy,
      })),
      ...ci.map(x => ({
        ...x,
        kind: 'capital' as const,
        health: 100,
        strategy: recommendStrategy(x, vendorPool, entityCode).strategy,
      })),
    ];
    const filtered = tab === 'all' ? all : all.filter(r => r.kind === tab);
    if (!q.trim()) return filtered;
    const needle = q.toLowerCase();
    return filtered.filter(r =>
      r.voucher_no.toLowerCase().includes(needle) ||
      r.requested_by_name.toLowerCase().includes(needle) ||
      r.originating_department_name.toLowerCase().includes(needle),
    );
    // refreshTick triggers re-evaluation after cancel
  }, [mi, sr, ci, tab, q, vendorPool, entityCode, refreshTick]);

  const handleCancel = (): void => {
    if (!cancelTarget || !cancelReason.trim()) return;
    setCancelling(true);
    const result = cancelIndent(cancelTarget.id, cancelTarget.kind, 'current-user', 'department_head', cancelReason, entityCode);
    if (result.ok) {
      toast.success(`${cancelTarget.voucher_no} cancelled`);
      setCancelTarget(null);
      setCancelReason('');
      setRefreshTick(t => t + 1);
    } else {
      toast.error(`Cancel failed: ${result.reason ?? 'unknown'}`);
    }
    setCancelling(false);
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Indent Register</h1>
        <p className="text-sm text-muted-foreground">All indents · Material · Service · Capital · with health score and sourcing strategy</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Indents ({rows.length})</CardTitle>
          <Input
            placeholder="Search voucher / requester / department"
            value={q}
            onChange={e => setQ(e.target.value)}
            className="max-w-xs"
          />
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={v => setTab(v as Kind)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="material">Material</TabsTrigger>
              <TabsTrigger value="service">Service</TabsTrigger>
              <TabsTrigger value="capital">Capital</TabsTrigger>
            </TabsList>
            <TabsContent value={tab}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Voucher</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Strategy</TableHead>
                    <TableHead className="text-right">Health</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-xs text-muted-foreground">
                      No indents found.
                    </TableCell></TableRow>
                  )}
                  {rows.map(r => {
                    const band = bandFromScore(r.health);
                    return (
                      <TableRow key={`${r.kind}-${r.id}`}>
                        <TableCell className="font-mono text-xs">{r.voucher_no}</TableCell>
                        <TableCell className="font-mono text-xs">{r.date}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{r.kind}</Badge></TableCell>
                        <TableCell className="text-xs">{r.originating_department_name}</TableCell>
                        <TableCell className="text-xs">{r.requested_by_name}</TableCell>
                        <TableCell className="font-mono text-xs text-right">{inrFmt(r.total_estimated_value)}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{STATUS_LABEL[r.status]}</Badge></TableCell>
                        <TableCell>{strategyBadge(r.strategy)}</TableCell>
                        <TableCell className={`font-mono text-xs text-right ${bandColor(band)}`}>
                          {r.kind === 'material' ? r.health : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
