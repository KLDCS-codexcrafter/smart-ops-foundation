/**
 * @file        src/pages/erp/eximx/export/FEMA270DayTracker.tsx
 * @purpose     Moat #19 FEMA 270-day auto-alert dashboard · PRIMARY surface
 * @sprint      T-Phase-1.EX-7c-ExportRealisation-eBRC-FEMA · RPT-2b-ii additive chart wrap
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Calendar, ShieldCheck } from 'lucide-react';
import { loadRealisations, summarizeRealisations } from '@/lib/export-realisation-engine';
import { FEMA_DAY_BANDS } from '@/types/export-realisation';
import type { ExportRealisation, FEMAState } from '@/types/export-realisation';
// RPT-2b-ii · additive chart wrap
import { TableChartToggle } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';
import { useDrillDown } from '@/hooks/useDrillDown';

export function FEMA270DayTracker(): JSX.Element {
  const entityCode = 'sinha-trading';
  const [rs, setRs] = useState<ExportRealisation[]>([]);
  useEffect(() => { setRs(loadRealisations(entityCode)); }, []);
  const s = summarizeRealisations(rs);

  const stateColors: Record<FEMAState, string> = { safe: 'bg-green-600', attention: 'bg-yellow-500', warning: 'bg-orange-500', critical: 'bg-red-500', overdue: 'bg-red-700' };

  // RPT-2b-ii · additive chart wrap
  const drill = useDrillDown();
  const chartRows = useMemo(() => {
    const buckets: Record<string, number> = { '0-90': 0, '90-180': 0, '180-270': 0, 'overdue': 0 };
    for (const r of rs) {
      const d = r.days_since_dispatch;
      const k = d > 270 ? 'overdue' : d > 180 ? '180-270' : d > 90 ? '90-180' : '0-90';
      buckets[k] += r.outstanding_inr;
    }
    return Object.entries(buckets).map(([bucket, value]) => ({ bucket, value }));
  }, [rs]);
  const chartConfig = getKpi('ex-fema-270')?.defaultChart ?? defaultChartConfig({
    chartType: 'stacked-column', xKey: 'bucket',
    series: [{ key: 'value', label: 'Outstanding' }],
  });
  const integrityHash = useMemo(() => signReport(chartRows), [chartRows]);
  const shortHash = integrityHash.replace('fnv1a:', '').slice(0, 10);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-2xl font-bold">FEMA 270-Day Tracker</h1>
        <Badge variant="outline" className="text-[10px]" data-testid="ex-fema-period-chip">As of {new Date().toISOString().slice(0, 10)}</Badge>
        <Badge variant="outline" className="text-[10px] font-mono" data-testid="ex-fema-integrity-badge" title={integrityHash}>
          <ShieldCheck className="h-3 w-3 mr-1" />{shortHash}
        </Badge>
        <p className="text-sm text-muted-foreground w-full">Moat #19 PRIMARY ANCHORED · 5-state auto-classifier · RBI mandate compliance</p>
      </div>

      <Card className="p-3" data-testid="ex-fema-toggle-host">
        <TableChartToggle
          rows={chartRows}
          columns={[
            { key: 'bucket', label: 'Bucket' },
            { key: 'value', label: 'Outstanding (₹)', align: 'right' },
          ]}
          chartConfig={chartConfig}
          defaultView="table"
          emptyLabel="No realisations"
        />
        {drill.trail.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1">drill depth: {drill.trail.length}</p>
        )}
      </Card>

      <div className="grid grid-cols-5 gap-4">
        {(['safe', 'attention', 'warning', 'critical', 'overdue'] as const).map((state) => (
          <Card key={state}><CardContent className="pt-6">
            <div className="text-2xl font-bold">{s.by_fema_state[state]}</div>
            <Badge variant="default" className={`${stateColors[state]} text-xs mt-1`}>{state}</Badge>
            <div className="text-xs text-muted-foreground mt-1">{FEMA_DAY_BANDS[state].min}-{FEMA_DAY_BANDS[state].max === 99999 ? '∞' : FEMA_DAY_BANDS[state].max}d</div>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle><Calendar className="w-4 h-4 inline mr-2" />FEMA Day-Band Reference (Moat #19)</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-1">
          {(['safe', 'attention', 'warning', 'critical', 'overdue'] as const).map((state) => (
            <div key={state}><Badge variant="default" className={`${stateColors[state]} mr-2`}>{state}</Badge>{FEMA_DAY_BANDS[state].description}</div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle><AlertTriangle className="w-4 h-4 inline mr-2" />Realisations by FEMA State</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Realisation</TableHead><TableHead>FEMA</TableHead><TableHead>Days</TableHead><TableHead>Deadline</TableHead><TableHead>Days Left</TableHead><TableHead className="text-right">Outstanding (₹)</TableHead></TableRow></TableHeader>
            <TableBody>
              {rs.slice().sort((a, b) => b.days_since_dispatch - a.days_since_dispatch).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.realisation_no}</TableCell>
                  <TableCell><Badge variant="default" className={stateColors[r.fema_state]}>{r.fema_state}</Badge></TableCell>
                  <TableCell>{r.days_since_dispatch}</TableCell>
                  <TableCell>{r.fema_270_day_deadline}</TableCell>
                  <TableCell className={270 - r.days_since_dispatch < 30 ? 'text-red-600 font-bold' : ''}>{270 - r.days_since_dispatch}</TableCell>
                  <TableCell className="text-right font-mono">{r.outstanding_inr.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
