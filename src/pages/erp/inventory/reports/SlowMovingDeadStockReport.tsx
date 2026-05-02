/**
 * SlowMovingDeadStockReport.tsx — Identifies slow-moving + dead stock items.
 * Sprint T-Phase-1.2.5
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Clock, Archive } from 'lucide-react';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { InventoryItem } from '@/types/inventory-item';
import { stockBalanceKey, type StockBalanceEntry } from '@/types/grn';
import { dAdd, dMul, round2 } from '@/lib/decimal-helpers';

const IKEY = 'erp_inventory_items';

function loadJson<T>(k: string): T[] {
  try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; }
}

const FMT = (n: number): string => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const CLASS_BADGE = (cls: 'A' | 'B' | 'C' | null): string => {
  if (cls === 'A') return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30';
  if (cls === 'B') return 'bg-amber-500/10 text-amber-700 border-amber-500/30';
  if (cls === 'C') return 'bg-blue-500/10 text-blue-700 border-blue-500/30';
  return 'bg-muted text-muted-foreground';
};

interface Row {
  item_id: string;
  item_name: string;
  last_issued_at: string | null;
  days_since: number;
  current_qty: number;
  value: number;
  abc_class: 'A' | 'B' | 'C' | null;
}

interface SlowMovingDeadStockReportPanelProps {
  onNavigate?: (module: import('../InventoryHubSidebar.types').InventoryHubModule, ctx?: import('@/types/drill-context').DrillNavigationContext) => void;
}

export function SlowMovingDeadStockReportPanel({ onNavigate }: SlowMovingDeadStockReportPanelProps = {}) {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';

  const [tab, setTab] = useState<'slow' | 'dead'>('slow');

  const rows = useMemo<Row[]>(() => {
    const items = loadJson<InventoryItem>(IKEY);
    const balances = loadJson<StockBalanceEntry>(stockBalanceKey(safeEntity));
    // Total qty + value per item (sum across godowns)
    const byItem = new Map<string, { qty: number; value: number }>();
    for (const b of balances) {
      const cur = byItem.get(b.item_id) ?? { qty: 0, value: 0 };
      byItem.set(b.item_id, {
        qty: round2(dAdd(cur.qty, b.qty)),
        value: round2(dAdd(cur.value, b.value)),
      });
    }
    const now = Date.now();
    return items
      .filter(it => {
        const bal = byItem.get(it.id);
        return bal && bal.qty > 0;
      })
      .map(it => {
        const bal = byItem.get(it.id) ?? { qty: 0, value: 0 };
        const lastIso = it.last_issued_at ?? null;
        const lastT = lastIso ? Date.parse(lastIso) : null;
        const days = lastT && !Number.isNaN(lastT)
          ? Math.floor((now - lastT) / (24 * 60 * 60 * 1000))
          : 9999; // never-issued = max
        const value = bal.value > 0
          ? bal.value
          : round2(dMul(bal.qty, it.std_purchase_rate ?? 0));
        return {
          item_id: it.id,
          item_name: it.name,
          last_issued_at: lastIso,
          days_since: days,
          current_qty: bal.qty,
          value,
          abc_class: it.abc_class ?? null,
        } as Row;
      });
  }, [safeEntity]);

  const slow90 = rows.filter(r => r.days_since >= 90 && r.days_since < 180);
  const slow180 = rows.filter(r => r.days_since >= 180 && r.days_since < 365);
  const slow365 = rows.filter(r => r.days_since >= 365 && r.days_since < 730);
  const dead = rows.filter(r => r.days_since >= 730);

  const sumValue = (arr: Row[]): number =>
    round2(arr.reduce((s, r) => dAdd(s, r.value), 0));

  const slowAll = [...slow90, ...slow180, ...slow365].sort((a, b) => b.days_since - a.days_since);

  const writeOff = (r: Row) => {
    toast.info(`Write-off intent recorded for ${r.item_name} · Phase 2 will trigger Stock Journal voucher (purpose=Write Off)`);
  };

  const renderTable = (data: Row[], showRecommendation: boolean) => (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Last Issued</TableHead>
            <TableHead>Days Since</TableHead>
            <TableHead>Current Qty</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>ABC</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 && (
            <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-6">No items</TableCell></TableRow>
          )}
          {data.map(r => (
            <TableRow key={r.item_id}>
              <TableCell className="text-sm">{r.item_name}</TableCell>
              <TableCell className="text-xs">{r.last_issued_at?.slice(0, 10) ?? 'Never'}</TableCell>
              <TableCell className="font-mono text-xs">{r.days_since >= 9999 ? '∞' : `${r.days_since}d`}</TableCell>
              <TableCell className="font-mono text-xs">{r.current_qty}</TableCell>
              <TableCell className="font-mono text-xs">{FMT(r.value)}</TableCell>
              <TableCell><Badge variant="outline" className={CLASS_BADGE(r.abc_class)}>{r.abc_class ?? '—'}</Badge></TableCell>
              <TableCell>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => writeOff(r)}>
                  {showRecommendation ? 'Initiate Write-off' : 'Suggest Action'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-cyan-500" />
        <h2 className="text-xl font-bold">Slow-Moving / Dead Stock</h2>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3"><p className="text-[10px] uppercase text-muted-foreground">Slow ≥ 90d</p><p className="text-lg font-bold text-amber-600">{slow90.length}</p><p className="text-xs text-muted-foreground">{FMT(sumValue(slow90))}</p></Card>
        <Card className="p-3"><p className="text-[10px] uppercase text-muted-foreground">Slow ≥ 180d</p><p className="text-lg font-bold text-orange-600">{slow180.length}</p><p className="text-xs text-muted-foreground">{FMT(sumValue(slow180))}</p></Card>
        <Card className="p-3"><p className="text-[10px] uppercase text-muted-foreground">Slow ≥ 365d</p><p className="text-lg font-bold text-red-500">{slow365.length}</p><p className="text-xs text-muted-foreground">{FMT(sumValue(slow365))}</p></Card>
        <Card className="p-3"><p className="text-[10px] uppercase text-muted-foreground">Dead ≥ 730d</p><p className="text-lg font-bold text-red-700">{dead.length}</p><p className="text-xs text-muted-foreground">{FMT(sumValue(dead))} · write-off</p></Card>
      </div>

      <Tabs value={tab} onValueChange={v => setTab(v as 'slow' | 'dead')}>
        <TabsList>
          <TabsTrigger value="slow" className="gap-1"><Clock className="h-3.5 w-3.5" /> Slow-Moving</TabsTrigger>
          <TabsTrigger value="dead" className="gap-1"><Archive className="h-3.5 w-3.5" /> Dead Stock</TabsTrigger>
        </TabsList>
        <TabsContent value="slow">{renderTable(slowAll, false)}</TabsContent>
        <TabsContent value="dead">{renderTable(dead, true)}</TabsContent>
      </Tabs>
    </div>
  );
}
