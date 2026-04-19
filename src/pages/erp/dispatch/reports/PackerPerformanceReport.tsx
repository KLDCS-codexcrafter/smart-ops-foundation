/**
 * PackerPerformanceReport.tsx — Sprint 15b
 * MODULE ID: dh-r-packer-performance
 */

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Download, Trophy, AlertTriangle } from 'lucide-react';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import {
  type PackingBOMActual, packingBOMActualsKey,
} from '@/types/packing-bom';
import { type PackingMaterial, packingMaterialsKey } from '@/types/packing-material';
import { toast } from 'sonner';

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T[]) : []; }
  catch { return []; }
}
function daysAgo(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

interface PackerRow {
  packer_id: string; packer_name: string;
  dlns: number; avg_variance_pct: number; total_excess_paise: number;
  flag: 'best' | 'ok' | 'review' | 'urgent';
}

export function PackerPerformanceReportPanel() {
  const { entityCode } = useCardEntitlement();
  const [actuals, setActuals] = useState<PackingBOMActual[]>([]);
  const [materials, setMaterials] = useState<PackingMaterial[]>([]);
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(daysAgo(0));
  const [detail, setDetail] = useState<PackerRow | null>(null);

  useEffect(() => {
    setActuals(ls<PackingBOMActual>(packingBOMActualsKey(entityCode)));
    setMaterials(ls<PackingMaterial>(packingMaterialsKey(entityCode)));
  }, [entityCode]);

  const filtered = useMemo(() => actuals.filter(a => {
    const d = a.captured_at.slice(0, 10);
    return d >= from && d <= to && a.packer_id;
  }), [actuals, from, to]);

  const rows: PackerRow[] = useMemo(() => {
    const map = new Map<string, { name: string; dlns: Set<string>; vars: number[]; excess: number }>();
    for (const a of filtered) {
      const id = a.packer_id!;
      const ex = map.get(id);
      const mat = materials.find(m => m.id === a.material_id);
      const cost = Math.max(0, a.variance_qty) * (mat?.cost_per_uom_paise ?? 0);
      if (ex) {
        ex.dlns.add(a.dln_voucher_id);
        ex.vars.push(a.variance_pct);
        ex.excess += cost;
      } else {
        map.set(id, {
          name: a.packer_name ?? id,
          dlns: new Set([a.dln_voucher_id]),
          vars: [a.variance_pct], excess: cost,
        });
      }
    }
    const result: PackerRow[] = Array.from(map.entries()).map(([packer_id, v]) => {
      const avg = v.vars.reduce((s, x) => s + x, 0) / (v.vars.length || 1);
      const absAvg = Math.abs(avg);
      let flag: PackerRow['flag'] = 'ok';
      if (absAvg > 20) flag = 'urgent';
      else if (absAvg > 10) flag = 'review';
      return {
        packer_id, packer_name: v.name,
        dlns: v.dlns.size,
        avg_variance_pct: Math.round(avg * 100) / 100,
        total_excess_paise: Math.round(v.excess),
        flag,
      };
    }).sort((a, b) => Math.abs(a.avg_variance_pct) - Math.abs(b.avg_variance_pct));

    // Mark top 3 as 'best'
    result.slice(0, 3).forEach(r => { if (r.flag === 'ok') r.flag = 'best'; });
    return result;
  }, [filtered, materials]);

  const insights = useMemo(() => {
    const best = rows[0];
    const needTraining = rows.filter(r => r.flag === 'review' || r.flag === 'urgent');
    // Material most-wasted by team
    const matWaste = new Map<string, { code: string; excess: number }>();
    for (const a of filtered) {
      if (a.variance_qty <= 0) continue;
      const mat = materials.find(m => m.id === a.material_id);
      const ex = matWaste.get(a.material_id);
      if (ex) ex.excess += a.variance_qty;
      else matWaste.set(a.material_id, { code: mat?.code ?? a.material_id, excess: a.variance_qty });
    }
    const topWasteMat = Array.from(matWaste.values()).sort((a, b) => b.excess - a.excess)[0];
    return { best, needTraining, topWasteMat };
  }, [rows, filtered, materials]);

  const detailRows = useMemo(() => {
    if (!detail) return [];
    return filtered.filter(a => a.packer_id === detail.packer_id);
  }, [detail, filtered]);

  const exportCSV = () => {
    const header = 'Rank,Packer,DLNs,Avg Variance %,Total Excess Cost (₹),Training Flag\n';
    const csv = rows.map((r, i) =>
      `${i + 1},${r.packer_name},${r.dlns},${r.avg_variance_pct.toFixed(2)},${(r.total_excess_paise / 100).toFixed(2)},${r.flag}`
    ).join('\n');
    const blob = new Blob([header + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `packer-performance-${from}-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground">Packer Performance</h1>
          <p className="text-xs text-muted-foreground">Variance leaderboard for HR/ops review</p>
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

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Leaderboard</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Rank</TableHead>
                <TableHead>Packer</TableHead>
                <TableHead className="text-right">DLNs</TableHead>
                <TableHead className="text-right">Avg Variance %</TableHead>
                <TableHead className="text-right">Total Excess (₹)</TableHead>
                <TableHead>Training Flag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => {
                const rowClass =
                  r.flag === 'best' ? 'bg-green-500/5'
                  : r.flag === 'urgent' ? 'bg-destructive/5'
                  : r.flag === 'review' ? 'bg-amber-500/5' : '';
                return (
                  <TableRow key={r.packer_id} className={`cursor-pointer ${rowClass}`}
                    onClick={() => setDetail(r)}>
                    <TableCell className="font-mono">
                      {i < 3 && <Trophy className="inline h-3.5 w-3.5 mr-1 text-amber-500" />}
                      {i + 1}
                    </TableCell>
                    <TableCell className="font-semibold">{r.packer_name}</TableCell>
                    <TableCell className="text-right font-mono">{r.dlns}</TableCell>
                    <TableCell className={`text-right font-mono ${
                      Math.abs(r.avg_variance_pct) > 20 ? 'text-destructive' :
                      Math.abs(r.avg_variance_pct) > 10 ? 'text-amber-600' : 'text-green-600'
                    }`}>{r.avg_variance_pct.toFixed(2)}%</TableCell>
                    <TableCell className="text-right font-mono">{(r.total_excess_paise / 100).toFixed(2)}</TableCell>
                    <TableCell>
                      {r.flag === 'best' && <Badge variant="outline" className="text-[10px] text-green-600 border-green-600/40">Top performer</Badge>}
                      {r.flag === 'ok' && <Badge variant="outline" className="text-[10px]">OK</Badge>}
                      {r.flag === 'review' && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-600/40">Training</Badge>}
                      {r.flag === 'urgent' && <Badge variant="outline" className="text-[10px] text-destructive border-destructive/40">URGENT</Badge>}
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No packer overrides in this period.
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Team Insights</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {insights.best && (
              <p>
                <span className="text-muted-foreground">Best-performing packer: </span>
                <span className="font-semibold">{insights.best.packer_name}</span>
                <span className="text-muted-foreground"> — </span>
                <span className="font-mono">{insights.best.avg_variance_pct.toFixed(2)}%</span>
              </p>
            )}
            {insights.topWasteMat && (
              <p>
                <span className="text-muted-foreground">Most-wasted material: </span>
                <span className="font-mono">{insights.topWasteMat.code}</span>
                <span className="text-muted-foreground"> — </span>
                <span className="font-mono">{insights.topWasteMat.excess.toFixed(2)} units over standard</span>
              </p>
            )}
            {insights.needTraining.length > 0 && (
              <p className="flex items-start gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                <span>
                  <span className="text-muted-foreground">Training recommended for: </span>
                  <span className="font-semibold">
                    {insights.needTraining.map(p => p.packer_name).join(', ')}
                  </span>
                </span>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detail?.packer_name} — Variance History</DialogTitle></DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Captured</TableHead>
                <TableHead>Material</TableHead>
                <TableHead className="text-right">Standard</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Variance %</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detailRows.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="text-xs">{d.captured_at.slice(0, 10)}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {materials.find(m => m.id === d.material_id)?.code ?? d.material_id}
                  </TableCell>
                  <TableCell className="text-right font-mono">{d.standard_qty.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{d.actual_qty.toFixed(2)}</TableCell>
                  <TableCell className={`text-right font-mono ${
                    Math.abs(d.variance_pct) > 20 ? 'text-destructive' :
                    Math.abs(d.variance_pct) > 10 ? 'text-amber-600' : 'text-green-600'
                  }`}>{d.variance_pct.toFixed(1)}%</TableCell>
                  <TableCell className="text-xs">{d.reason ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PackerPerformanceReportPanel;
