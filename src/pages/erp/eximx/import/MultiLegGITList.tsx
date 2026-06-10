/**
 * @file        src/pages/erp/eximx/import/MultiLegGITList.tsx
 * @purpose     Multi-Leg GIT list · 5-leg badge · 3-bucket totals
 * @sprint      T-Phase-1.EX-4-MultiLeg-GIT-3Bucket-4Method · RPT-2b-ii additive chart wrap
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Ship, AlertCircle, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEntityCode } from '@/hooks/useEntityCode';
import { loadMultiLegGITs, countActiveLegs } from '@/lib/multi-leg-git-engine';
import { SINHA_MULTI_LEG_GITS } from '@/data/sinha-multi-leg-git-seed-data';
import type { MultiLegGITState } from '@/types/multi-leg-git';
import { MultiLegJourneyVisual } from './MultiLegJourneyVisual';
// RPT-2b-ii · additive chart wrap
import { TableChartToggle } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';
import { useDrillDown } from '@/hooks/useDrillDown';

const STATE_CLASS: Record<MultiLegGITState, string> = {
  originating: 'bg-muted text-muted-foreground',
  mid_journey: 'bg-primary/15 text-primary',
  final_leg: 'bg-warning/15 text-warning',
  reconciled: 'bg-success/15 text-success',
  closed: 'bg-muted text-muted-foreground',
};

export function MultiLegGITList(): JSX.Element {
  const navigate = useNavigate();
  const { entityCode } = useEntityCode();
  const [search, setSearch] = useState('');

  const mlgits = useMemo(
    () => (entityCode ? loadMultiLegGITs(entityCode) : SINHA_MULTI_LEG_GITS),
    [entityCode],
  );
  const filtered = mlgits.filter((m) =>
    m.mlgit_no.toLowerCase().includes(search.toLowerCase()) ||
    m.related_import_po_no.toLowerCase().includes(search.toLowerCase()),
  );

  // RPT-2b-ii · additive chart wrap
  const drill = useDrillDown();
  const chartRows = useMemo(() => {
    const byState: Record<string, number> = {};
    for (const m of mlgits) {
      byState[m.overall_state] = (byState[m.overall_state] ?? 0) + m.booked_total_inr;
    }
    return Object.entries(byState).map(([state, git_value]) => ({ state, git_value }));
  }, [mlgits]);
  const chartConfig = getKpi('ex-git')?.defaultChart ?? defaultChartConfig({
    chartType: 'stacked-column', xKey: 'state',
    series: [{ key: 'git_value', label: 'GIT value' }],
  });
  const integrityHash = useMemo(() => signReport(chartRows), [chartRows]);
  const shortHash = integrityHash.replace('fnv1a:', '').slice(0, 10);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 flex-wrap">
          <Ship className="w-6 h-6" /> Shipments + Multi-Leg GIT
          <Badge variant="outline" className="text-[10px]" data-testid="ex-git-period-chip">As of {new Date().toISOString().slice(0, 10)}</Badge>
          <Badge variant="outline" className="text-[10px] font-mono" data-testid="ex-git-integrity-badge" title={integrityHash}>
            <ShieldCheck className="h-3 w-3 mr-1" />{shortHash}
          </Badge>
        </h1>
        <p className="text-sm text-muted-foreground">
          5-leg journey · 3-bucket reconciliation · 4-method allocation · {mlgits.length} active
        </p>
      </div>

      <Card className="p-3" data-testid="ex-git-toggle-host">
        <TableChartToggle
          rows={chartRows}
          columns={[
            { key: 'state', label: 'State' },
            { key: 'git_value', label: 'GIT value (₹)', align: 'right' },
          ]}
          chartConfig={chartConfig}
          defaultView="table"
          emptyLabel="No GIT records"
        />
        {drill.trail.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1">drill depth: {drill.trail.length}</p>
        )}
      </Card>

      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-3 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-primary mt-0.5" />
          <span>
            <strong>Moat #1 Replayable Landed Cost FOUNDATION:</strong> Each MLGIT tracks 5 legs
            (Origin Port → Vessel → Destination Port → CFS/ICD → Customer Warehouse) with
            3-bucket reconciliation (Booked · Custom Revalued · Actual Landed) and 4-method
            cost allocation (consumes LandedCostConfig).
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Multi-Leg GITs ({filtered.length})</span>
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search MLGIT · PO..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>MLGIT No</TableHead>
                <TableHead>Related PO</TableHead>
                <TableHead>Journey</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Booked (₹)</TableHead>
                <TableHead>Custom Reval (₹)</TableHead>
                <TableHead>Actual Landed (₹)</TableHead>
                <TableHead>Active Legs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/erp/eximx/import/shipments/${m.id}`)}>
                  <TableCell className="font-mono font-semibold">{m.mlgit_no}</TableCell>
                  <TableCell className="font-mono text-xs">{m.related_import_po_no}</TableCell>
                  <TableCell><MultiLegJourneyVisual mlgit={m} /></TableCell>
                  <TableCell><Badge className={STATE_CLASS[m.overall_state]}>{m.overall_state}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">₹{m.booked_total_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                  <TableCell className="font-mono text-xs">{m.custom_revalued_total_inr > 0 ? `₹${m.custom_revalued_total_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{m.actual_landed_total_inr > 0 ? `₹${m.actual_landed_total_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}</TableCell>
                  <TableCell className="text-center"><Badge variant="outline">{countActiveLegs(m)}/5</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
