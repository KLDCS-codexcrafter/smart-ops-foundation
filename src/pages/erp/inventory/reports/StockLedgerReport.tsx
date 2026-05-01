/**
 * StockLedgerReport.tsx — Stock per godown per item with departmental custody view
 * Sprint T-Phase-1.2.1 · Inventory Hub · Tier 1 Card #2 sub-sprint 1/3
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ListOrdered, IndianRupee, Search } from 'lucide-react';
import { useGodowns } from '@/hooks/useGodowns';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { stockBalanceKey, type StockBalanceEntry } from '@/types/grn';
import { DEPARTMENT_LABELS, DEPARTMENT_BADGE_COLORS } from '@/types/godown';
import { dSum, round2 } from '@/lib/decimal-helpers';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

function loadBalances(entityCode: string): StockBalanceEntry[] {
  try {
    // [JWT] GET /api/inventory/stock-balance/:entityCode
    return JSON.parse(localStorage.getItem(stockBalanceKey(entityCode)) || '[]');
  } catch { return []; }
}

export function StockLedgerReportPanel() {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const { godowns } = useGodowns();
  const balances = useMemo(() => loadBalances(safeEntity), [safeEntity]);

  const [search, setSearch] = useState('');
  const [view, setView] = useState<'summary' | 'godown'>('summary');

  const summary = useMemo(() => {
    const byItem = new Map<string, { item_id: string; item_name: string; qty: number; value: number }>();
    for (const b of balances) {
      const ex = byItem.get(b.item_id) ?? { item_id: b.item_id, item_name: b.item_name, qty: 0, value: 0 };
      ex.qty = round2(ex.qty + b.qty);
      ex.value = round2(ex.value + b.value);
      byItem.set(b.item_id, ex);
    }
    return Array.from(byItem.values())
      .filter(r => !search || r.item_name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.value - a.value);
  }, [balances, search]);

  const totalValue = useMemo(() => round2(dSum(balances, b => b.value)), [balances]);

  const deptCustody = useMemo(() => {
    const byGodown = new Map<string, number>();
    for (const b of balances) {
      byGodown.set(b.godown_id, (byGodown.get(b.godown_id) ?? 0) + b.value);
    }
    return godowns
      .filter(g => g.department_code)
      .map(g => ({
        godown: g,
        value: byGodown.get(g.id) ?? 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [godowns, balances]);

  return (
    <div className="max-w-6xl mx-auto space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ListOrdered className="h-6 w-6 text-cyan-500" />
            Stock Ledger Report
          </h1>
          <p className="text-sm text-muted-foreground">Live position · departmental custody view</p>
        </div>
        <Button variant="outline" size="sm" disabled>Export · Phase 1.4</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total SKUs</CardDescription>
          <CardTitle className="text-2xl font-mono">{summary.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Total Stock Value</CardDescription>
          <CardTitle className="text-2xl font-mono flex items-center gap-1">
            <IndianRupee className="h-5 w-5" />{fmtINR(totalValue).slice(1)}
          </CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Locations With Stock</CardDescription>
          <CardTitle className="text-2xl font-mono">{new Set(balances.map(b => b.godown_id)).size}</CardTitle></CardHeader></Card>
      </div>

      {/* Departmental custody strip */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Departmental Custody</CardTitle>
          <CardDescription>The accountability picture</CardDescription></CardHeader>
        <CardContent>
          {deptCustody.length === 0 ? (
            <p className="text-xs text-muted-foreground">No departmental godowns configured.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {deptCustody.map(d => (
                <div key={d.godown.id} className="flex items-center justify-between p-2 rounded border border-border/50 text-xs">
                  <div className="min-w-0">
                    <Badge className={`text-[9px] ${DEPARTMENT_BADGE_COLORS[d.godown.department_code!]}`}>
                      {DEPARTMENT_LABELS[d.godown.department_code!]}
                    </Badge>
                    <p className="font-medium truncate mt-1">{d.godown.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {d.godown.responsible_person_name ?? '— No owner —'}
                    </p>
                  </div>
                  <p className="font-mono text-xs shrink-0 ml-2">{fmtINR(d.value)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="Search items..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={view} onValueChange={v => setView(v as 'summary' | 'godown')}>
          <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="summary">Item Summary</SelectItem>
            <SelectItem value="godown">By Godown</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card><CardContent className="p-0">
        {view === 'summary' ? (
          <Table>
            <TableHeader><TableRow className="bg-muted/40">
              {['Item', 'On-Hand Qty', 'Stock Value'].map(h =>
                <TableHead key={h} className="text-xs uppercase">{h}</TableHead>)}
            </TableRow></TableHeader>
            <TableBody>
              {summary.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground text-sm">
                  No stock balance yet — post a GRN to credit stock
                </TableCell></TableRow>
              ) : summary.map(r => (
                <TableRow key={r.item_id}>
                  <TableCell className="text-sm">{r.item_name}</TableCell>
                  <TableCell className="text-xs font-mono">{r.qty}</TableCell>
                  <TableCell className="text-xs font-mono">{fmtINR(r.value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader><TableRow className="bg-muted/40">
              {['Item', 'Godown', 'Department', 'Qty', 'Value'].map(h =>
                <TableHead key={h} className="text-xs uppercase">{h}</TableHead>)}
            </TableRow></TableHeader>
            <TableBody>
              {balances
                .filter(b => !search || b.item_name.toLowerCase().includes(search.toLowerCase()))
                .map(b => {
                  const g = godowns.find(x => x.id === b.godown_id);
                  return (
                    <TableRow key={`${b.item_id}-${b.godown_id}`}>
                      <TableCell className="text-sm">{b.item_name}</TableCell>
                      <TableCell className="text-xs">{b.godown_name}</TableCell>
                      <TableCell>
                        {g?.department_code ? (
                          <Badge className={`text-[9px] ${DEPARTMENT_BADGE_COLORS[g.department_code]}`}>
                            {DEPARTMENT_LABELS[g.department_code]}
                          </Badge>
                        ) : <span className="text-[10px] text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{b.qty}</TableCell>
                      <TableCell className="text-xs font-mono">{fmtINR(b.value)}</TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  );
}
