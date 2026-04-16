/**
 * FAReports.tsx — FC Sprint 4
 * fc-fa-reports: 2 tabs — IT Act WDV Report | Companies Act Report
 * [JWT] Replace with GET /api/fixed-assets/reports
 */
import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { BarChart3 } from 'lucide-react';
import { onEnterNext } from '@/lib/keyboard';
import type { AssetUnitRecord } from '@/types/fixed-asset';
import { faUnitsKey } from '@/types/fixed-asset';
import { computeITActReport, computeCompaniesActReport } from '@/lib/depreciationEngine';

const ls = <T,>(k: string): T[] => {
  try {
    // [JWT] GET /api/fixed-assets/units
    const r = localStorage.getItem(k);
    return r ? JSON.parse(r) : [];
  } catch { return []; }
};

interface Props { entityCode: string; }

export function FAReportsPanel({ entityCode }: Props) {
  const defaultFY = (() => {
    const now = new Date();
    const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `${String(y).slice(2)}-${String(y + 1).slice(2)}`;
  })();
  const [fy, setFy] = useState(defaultFY);
  const [tab, setTab] = useState('itact');

  const units = useMemo(() => ls<AssetUnitRecord>(faUnitsKey(entityCode)).filter(u => u.entity_id === entityCode), [entityCode]);
  const itActRows = useMemo(() => computeITActReport(units, fy), [units, fy]);
  const compActRows = useMemo(() => computeCompaniesActReport(units, fy), [units, fy]);

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

  return (
    <div className="p-6 space-y-4 animate-fade-in" data-keyboard-form>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-teal-500" /> FA Reports
          </h2>
          <p className="text-xs text-muted-foreground">IT Act WDV Schedule & Companies Act Schedule II</p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Financial Year</Label>
          <Input value={fy} onChange={e => setFy(e.target.value)} onKeyDown={onEnterNext} className="h-8 w-24 font-mono text-xs" placeholder="25-26" />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="itact">IT Act WDV Report</TabsTrigger>
          <TabsTrigger value="companyact">Companies Act Report</TabsTrigger>
        </TabsList>

        <TabsContent value="itact">
          <div className="rounded-xl border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Sr</TableHead>
                  <TableHead className="text-xs">Rate (%)</TableHead>
                  <TableHead className="text-xs">Block</TableHead>
                  <TableHead className="text-xs text-right">WDV Apr 1</TableHead>
                  <TableHead className="text-xs text-right">Add &gt;180d</TableHead>
                  <TableHead className="text-xs text-right">Add &lt;180d</TableHead>
                  <TableHead className="text-xs text-right">WDV+&gt;180d</TableHead>
                  <TableHead className="text-xs text-right">Total</TableHead>
                  <TableHead className="text-xs text-right">Depr Full</TableHead>
                  <TableHead className="text-xs text-right">Depr Half</TableHead>
                  <TableHead className="text-xs text-right">Total Depr</TableHead>
                  <TableHead className="text-xs text-right">WDV Mar 31</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itActRows.length === 0 && (
                  <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-8">No asset data for FY {fy}</TableCell></TableRow>
                )}
                {itActRows.map((r, i) => (
                  <TableRow key={r.block}>
                    <TableCell className="text-xs font-mono">{i + 1}</TableCell>
                    <TableCell className="text-xs font-mono">{r.rate}%</TableCell>
                    <TableCell className="text-xs">{r.block}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(r.opening_wdv)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(r.additions_gt_180)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(r.additions_lt_180)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(r.wdv_plus_gt180)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(r.total)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(r.depr_full_rate)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(r.depr_half_rate)}</TableCell>
                    <TableCell className="text-xs text-right font-mono font-bold">{fmt(r.total_depreciation)}</TableCell>
                    <TableCell className="text-xs text-right font-mono font-bold">{fmt(r.closing_wdv)}</TableCell>
                  </TableRow>
                ))}
                {itActRows.length > 0 && (
                  <TableRow className="font-bold border-t-2">
                    <TableCell colSpan={3} className="text-xs">Total</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(itActRows.reduce((s, r) => s + r.opening_wdv, 0))}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(itActRows.reduce((s, r) => s + r.additions_gt_180, 0))}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(itActRows.reduce((s, r) => s + r.additions_lt_180, 0))}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(itActRows.reduce((s, r) => s + r.wdv_plus_gt180, 0))}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(itActRows.reduce((s, r) => s + r.total, 0))}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(itActRows.reduce((s, r) => s + r.depr_full_rate, 0))}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(itActRows.reduce((s, r) => s + r.depr_half_rate, 0))}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(itActRows.reduce((s, r) => s + r.total_depreciation, 0))}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(itActRows.reduce((s, r) => s + r.closing_wdv, 0))}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="companyact">
          <div className="rounded-xl border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Asset Class</TableHead>
                  <TableHead className="text-xs text-right">Gross Opening</TableHead>
                  <TableHead className="text-xs text-right">Additions</TableHead>
                  <TableHead className="text-xs text-right">Disposals</TableHead>
                  <TableHead className="text-xs text-right">Gross Closing</TableHead>
                  <TableHead className="text-xs text-right">Accum Opening</TableHead>
                  <TableHead className="text-xs text-right">Current Depr</TableHead>
                  <TableHead className="text-xs text-right">Accum Closing</TableHead>
                  <TableHead className="text-xs text-right">Net Block</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compActRows.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No asset data for FY {fy}</TableCell></TableRow>
                )}
                {compActRows.map(r => (
                  <TableRow key={r.ledger_name}>
                    <TableCell className="text-xs">{r.ledger_name}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(r.gross_opening)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(r.additions)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(r.disposals)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(r.gross_closing)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(r.accum_opening)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(r.current_depr)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmt(r.accum_closing)}</TableCell>
                    <TableCell className="text-xs text-right font-mono font-bold">{fmt(r.net_block)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function FAReports() { return <FAReportsPanel entityCode="SMRT" />; }
