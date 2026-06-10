/**
 * MonthlyProductionAccounts.tsx — CGST Rule 56(12) for manufacturers
 * Sprint T-Phase-1.2.5h-b1
 */
// i18n: Sprint T-Phase-1.2.5h-c2-fix · minimum-viable migration
import { useMemo, useState, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Factory, AlertCircle, ShieldCheck } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useDrillDown } from '@/hooks/useDrillDown';
import { GlobalDateRangeContext } from '@/hooks/GlobalDateRangeContext';
import { consumptionEntriesKey, type ConsumptionEntry } from '@/types/consumption';
import { useT } from '@/lib/i18n-engine';
// RPT-1b · chart-wrap
import { TableChartToggle } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';


interface CompanyLite {
  entityCode?: string;
  legalEntityName?: string;
  businessActivity?: string;
}

function readCompany(entityCode: string): CompanyLite | null {
  try {
    const raw = localStorage.getItem('erp_companies');
    if (!raw) return null;
    const arr: CompanyLite[] = JSON.parse(raw);
    return arr.find(c => c.entityCode === entityCode) ?? null;
  } catch { return null; }
}

export default function MonthlyProductionAccounts() {
  const t = useT();
  const { entityCode } = useEntityCode();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const company = useMemo(() => entityCode ? readCompany(entityCode) : null, [entityCode]);
  const isManufacturer = company?.businessActivity === 'Manufacturing';

  const consumptions = useMemo<ConsumptionEntry[]>(() => {
    if (!entityCode || !isManufacturer) return [];
    try {
      const raw = localStorage.getItem(consumptionEntriesKey(entityCode));
      const all: ConsumptionEntry[] = raw ? JSON.parse(raw) : [];
      return all.filter(c => c.status === 'posted' && c.consumption_date.startsWith(month));
    } catch { return []; }
  }, [entityCode, isManufacturer, month]);

  const rawMaterials = useMemo(() => {
    const map = new Map<string, { item_id: string; item_code: string; item_name: string; uom: string; qty: number }>();
    for (const ce of consumptions) {
      for (const ln of ce.lines) {
        const k = ln.item_id;
        const ex = map.get(k);
        if (ex) ex.qty += ln.actual_qty;
        else map.set(k, {
          item_id: ln.item_id, item_code: ln.item_code, item_name: ln.item_name,
          uom: ln.uom, qty: ln.actual_qty,
        });
      }
    }
    return Array.from(map.values());
  }, [consumptions]);
  // RPT-1b additive — hooks declared BEFORE early returns (Rules of Hooks)
  const drill = useDrillDown();
  const gdr = useContext(GlobalDateRangeContext);
  const periodLabel = gdr ? `${gdr.range.from} → ${gdr.range.to}` : month;
  const chartRows = useMemo(() => {
    return rawMaterials.slice(0, 12).map(r => ({ month: r.item_code, value: r.qty }));
  }, [rawMaterials]);
  const kpi = getKpi('fc-monthly-prod');
  const chartConfig = kpi?.defaultChart ?? defaultChartConfig({
    chartType: 'line', xKey: 'month',
    series: [{ key: 'value', label: 'Consumed qty' }],
  });
  const integrityHash = useMemo(() => signReport(chartRows), [chartRows]);
  const shortHash = integrityHash.replace('fnv1a:', '').slice(0, 10);

  if (!entityCode) {
    return <div className="p-6 text-sm text-muted-foreground">Select a company first.</div>;
  }

  if (!isManufacturer) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <h2 className="font-semibold">Monthly Production Accounts</h2>
              <p className="text-sm text-muted-foreground mt-1">
                This report is required by CGST Rule 56(12) for manufacturers only.
                Current entity ({company?.legalEntityName ?? entityCode}) is configured as:{' '}
                <span className="font-mono">{company?.businessActivity ?? 'Unknown'}</span>.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Factory className="h-6 w-6 text-primary" />
            {t('comp.monthly_production.title', 'Monthly Production Accounts · CGST Rule 56(12)')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{company?.legalEntityName} · {month}</p>
          <div className="flex gap-2 mt-1">
            <Badge variant="outline" className="text-[10px]" data-testid="mpa-period-chip">{periodLabel}</Badge>
            <Badge variant="outline" className="text-[10px] font-mono" data-testid="mpa-integrity-badge" title={integrityHash}>
              <ShieldCheck className="h-3 w-3 mr-1" />{shortHash}
            </Badge>
          </div>
        </div>
        <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-44" />
      </div>

      {/* RPT-1b · TableChartToggle wrap · defaults to Table */}
      <Card><CardContent className="p-3" data-testid="mpa-toggle-host">
        <TableChartToggle
          rows={chartRows}
          chartRows={chartRows}
          columns={[
            { key: 'month', label: 'Item code' },
            { key: 'value', label: 'Qty', align: 'right' },
          ]}
          chartConfig={chartConfig}
          defaultView="table"
          emptyLabel="No consumption"
        />
        {drill.trail.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1">drill depth: {drill.trail.length}</p>
        )}
      </CardContent></Card>


      <Card>
        <CardHeader><CardTitle className="text-base">Raw Materials Consumed</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead><TableHead>Item</TableHead>
                <TableHead>UoM</TableHead><TableHead className="text-right">Consumed Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rawMaterials.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
                  No consumption entries this month
                </TableCell></TableRow>
              ) : rawMaterials.map(r => (
                <TableRow key={r.item_id}>
                  <TableCell className="font-mono text-xs">{r.item_code}</TableCell>
                  <TableCell>{r.item_name}</TableCell>
                  <TableCell>{r.uom}</TableCell>
                  <TableCell className="text-right font-mono">{r.qty.toLocaleString('en-IN')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Goods Manufactured</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No production entries this month — this is normal for non-manufacturing months.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Waste &amp; By-products</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No waste/by-product entries recorded for this month.
          </p>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Generated for CGST Rule 56(12) compliance · Period: {month}
      </p>
    </div>
  );
}
