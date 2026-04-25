/**
 * PackingConsumptionReport.tsx — Sprint 15b
 * MODULE ID: dh-r-packing-consumption
 */

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Download, AlertTriangle } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { Voucher } from '@/types/voucher';
import { vouchersKey } from '@/lib/finecore-engine';
import {
  type PackingBOM, type PackingBOMActual,
  packingBOMsKey, packingBOMActualsKey, classifyVariance,
} from '@/types/packing-bom';
import { type PackingMaterial, packingMaterialsKey } from '@/types/packing-material';
import { expandDLN } from '@/lib/packing-bom-engine';
import { toast } from 'sonner';

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T[]) : []; }
  catch { return []; }
}

function daysAgo(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function PackingConsumptionReportPanel() {
  const { entityCode } = useCardEntitlement();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [boms, setBoms] = useState<PackingBOM[]>([]);
  const [actuals, setActuals] = useState<PackingBOMActual[]>([]);
  const [materials, setMaterials] = useState<PackingMaterial[]>([]);
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(daysAgo(0));

  useEffect(() => {
    setVouchers(ls<Voucher>(vouchersKey(entityCode)));
    setBoms(ls<PackingBOM>(packingBOMsKey(entityCode)));
    setActuals(ls<PackingBOMActual>(packingBOMActualsKey(entityCode)));
    setMaterials(ls<PackingMaterial>(packingMaterialsKey(entityCode)));
  }, [entityCode]);

  const dlns = useMemo(() => vouchers.filter(v =>
    v.base_voucher_type === 'Delivery Note' &&
    v.status !== 'cancelled' &&
    v.date >= from && v.date <= to,
  ), [vouchers, from, to]);

  // Aggregate standard consumption per material
  const matAgg = useMemo(() => {
    const map = new Map<string, {
      material_id: string; code: string; name: string; uom: string;
      standard: number; actual: number; cost_paise: number;
    }>();
    const itemsMissing = new Map<string, { item_id: string; item_code: string; item_name: string }>();

    for (const dln of dlns) {
      const { materials: ms, itemsWithoutBOM } = expandDLN(dln, boms);
      itemsWithoutBOM.forEach(i => itemsMissing.set(i.item_id, i));
      for (const m of ms) {
        const existing = map.get(m.material_id);
        const mat = materials.find(x => x.id === m.material_id);
        const costPerUnit = mat?.cost_per_uom_paise ?? 0;
        if (existing) {
          existing.standard += m.qty;
          existing.cost_paise += m.qty * costPerUnit;
        } else {
          map.set(m.material_id, {
            material_id: m.material_id, code: m.material_code, name: m.material_name,
            uom: m.material_uom, standard: m.qty, actual: m.qty, cost_paise: m.qty * costPerUnit,
          });
        }
      }
    }

    // Apply actuals
    const dlnIds = new Set(dlns.map(d => d.id));
    for (const a of actuals) {
      if (!dlnIds.has(a.dln_voucher_id)) continue;
      const row = map.get(a.material_id);
      if (row) {
        row.actual += (a.actual_qty - a.standard_qty);
      }
    }

    return { rows: Array.from(map.values()), itemsMissing: Array.from(itemsMissing.values()) };
  }, [dlns, boms, materials, actuals]);

  const totals = useMemo(() => {
    const totalCost = matAgg.rows.reduce((s, r) => s + r.cost_paise, 0);
    const totalStd = matAgg.rows.reduce((s, r) => s + r.standard, 0);
    const totalAct = matAgg.rows.reduce((s, r) => s + r.actual, 0);
    const variancePct = totalStd === 0 ? 0 : ((totalAct - totalStd) / totalStd) * 100;
    return { dlns: dlns.length, materials: matAgg.rows.length, totalCost, variancePct };
  }, [matAgg, dlns]);

  // Top waste items
  const topWaste = useMemo(() => {
    const itemMap = new Map<string, {
      item_id: string; item_code: string; item_name: string;
      standard: number; actual: number; excess_paise: number;
    }>();
    for (const a of actuals) {
      if (!dlns.some(d => d.id === a.dln_voucher_id)) continue;
      if (a.variance_qty <= 0) continue;
      const dln = dlns.find(d => d.id === a.dln_voucher_id);
      const line = dln?.inventory_lines?.find(l => l.item_id === a.item_id);
      if (!line) continue;
      const mat = materials.find(m => m.id === a.material_id);
      const cost = (mat?.cost_per_uom_paise ?? 0) * a.variance_qty;
      const ex = itemMap.get(a.item_id);
      if (ex) {
        ex.standard += a.standard_qty; ex.actual += a.actual_qty; ex.excess_paise += cost;
      } else {
        itemMap.set(a.item_id, {
          item_id: a.item_id, item_code: line.item_code, item_name: line.item_name,
          standard: a.standard_qty, actual: a.actual_qty, excess_paise: cost,
        });
      }
    }
    return Array.from(itemMap.values()).sort((a, b) => b.excess_paise - a.excess_paise).slice(0, 10);
  }, [actuals, dlns, materials]);

  // Monthly trend
  const monthly = useMemo(() => {
    const buckets = new Map<string, { month: string; std: number; act: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      buckets.set(key, { month: key, std: 0, act: 0 });
    }
    for (const a of actuals) {
      const month = a.captured_at.slice(0, 7);
      const b = buckets.get(month);
      if (!b) continue;
      b.std += a.standard_qty; b.act += a.actual_qty;
    }
    return Array.from(buckets.values()).map(b => ({
      month: b.month,
      variance_pct: b.std === 0 ? 0 : Math.round(((b.act - b.std) / b.std) * 1000) / 10,
    }));
  }, [actuals]);

  const exportCSV = () => {
    const header = 'Material,UOM,Standard,Actual,Variance,Variance %,Cost (₹)\n';
    const rows = matAgg.rows.map(r => {
      const v = r.actual - r.standard;
      const vp = r.standard === 0 ? 0 : (v / r.standard) * 100;
      return `${r.code},${r.uom},${r.standard.toFixed(3)},${r.actual.toFixed(3)},${v.toFixed(3)},${vp.toFixed(2)}%,${(r.cost_paise / 100).toFixed(2)}`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `packing-consumption-${from}-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground">Packing Consumption Report</h1>
          <p className="text-xs text-muted-foreground">Standard vs actual material usage</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-[150px]" />
          <span className="text-xs text-muted-foreground">to</span>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-[150px]" />
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5 mr-1" /> CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total DLNs</p>
          <p className="text-2xl font-bold font-mono text-foreground">{totals.dlns}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Materials Consumed</p>
          <p className="text-2xl font-bold font-mono text-foreground">{totals.materials}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Packing Cost</p>
          <p className="text-2xl font-bold font-mono text-foreground">₹ {(totals.totalCost / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Overall Variance</p>
          <p className={`text-2xl font-bold font-mono ${
            Math.abs(totals.variancePct) < 5 ? 'text-green-600' :
            Math.abs(totals.variancePct) < 10 ? 'text-amber-600' : 'text-destructive'
          }`}>{totals.variancePct.toFixed(1)}%</p>
        </CardContent></Card>
      </div>

      {matAgg.itemsMissing.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                {matAgg.itemsMissing.length} items dispatched without packing BOM — consumption unrecorded
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                {matAgg.itemsMissing.slice(0, 8).map(i => i.item_code).join(', ')}
                {matAgg.itemsMissing.length > 8 && ` +${matAgg.itemsMissing.length - 8} more`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">By Material</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead className="text-right">Standard</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="text-right">Var %</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead className="text-right">Cost (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matAgg.rows.map(r => {
                const v = r.actual - r.standard;
                const vp = r.standard === 0 ? 0 : (v / r.standard) * 100;
                const sev = classifyVariance(vp);
                const sevColor = sev === 'acceptable' ? 'text-green-600 border-green-600/40'
                  : sev === 'concerning' ? 'text-amber-600 border-amber-600/40'
                  : 'text-destructive border-destructive/40';
                return (
                  <TableRow key={r.material_id}>
                    <TableCell><span className="font-mono text-xs">{r.code}</span> · {r.name}</TableCell>
                    <TableCell className="text-xs">{r.uom}</TableCell>
                    <TableCell className="text-right font-mono">{r.standard.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{r.actual.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{v.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{vp.toFixed(1)}%</TableCell>
                    <TableCell><Badge variant="outline" className={`text-[10px] ${sevColor}`}>{sev}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{(r.cost_paise / 100).toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
              {matAgg.rows.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No DLN consumption in this period.
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {topWaste.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top 10 Waste Items</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Standard</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Excess</TableHead>
                  <TableHead className="text-right">Excess Cost (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topWaste.map(t => (
                  <TableRow key={t.item_id}>
                    <TableCell><span className="font-mono text-xs">{t.item_code}</span> · {t.item_name}</TableCell>
                    <TableCell className="text-right font-mono">{t.standard.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{t.actual.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-amber-600">{(t.actual - t.standard).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{(t.excess_paise / 100).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Monthly Variance % (last 6 months)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip />
              <Line type="monotone" dataKey="variance_pct" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

export default PackingConsumptionReportPanel;
