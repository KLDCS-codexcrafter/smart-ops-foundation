/**
 * @file        src/pages/erp/eximx/compliance/CAROTARRoOMatrix.tsx
 * @purpose     CAROTAR FULL · Rules of Origin verification matrix + Form II register
 * @sprint      T-Phase-1.EX-9-Compliance-Suite · RPT-2b-ii additive chart wrap
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, AlertTriangle, ShieldCheck } from 'lucide-react';
import { loadSupplierDeclarations, summarizeSupplierDeclarations } from '@/lib/carotar-roo-engine';
import type { SupplierDeclaration } from '@/types/supplier-declaration';
// RPT-2b-ii · additive chart wrap
import { TableChartToggle } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';
import { useDrillDown } from '@/hooks/useDrillDown';

export function CAROTARRoOMatrix(): JSX.Element {
  const entityCode = 'sinha-steel';
  const [sds, setSds] = useState<SupplierDeclaration[]>([]);
  useEffect(() => { setSds(loadSupplierDeclarations(entityCode)); }, []);
  const summary = summarizeSupplierDeclarations(sds);

  // RPT-2b-ii · additive chart wrap
  const drill = useDrillDown();
  const chartRows = useMemo(() => {
    const byFta: Record<string, number> = {};
    for (const sd of sds) {
      const k = sd.fta_treaty_code || 'unknown';
      byFta[k] = (byFta[k] ?? 0) + 1;
    }
    return Object.entries(byFta).map(([fta, count]) => ({ fta, count }));
  }, [sds]);
  const chartConfig = getKpi('ex-rootar')?.defaultChart ?? defaultChartConfig({
    chartType: 'bar', xKey: 'fta',
    series: [{ key: 'count', label: 'Declarations' }],
  });
  const integrityHash = useMemo(() => signReport(chartRows), [chartRows]);
  const shortHash = integrityHash.replace('fnv1a:', '').slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-xl font-bold"><FileText className="w-5 h-5 inline mr-2" />CAROTAR FULL · Rules of Origin (Moat #11 PRIMARY)</h2>
        <Badge variant="outline" className="text-[10px]" data-testid="ex-roo-period-chip">As of {new Date().toISOString().slice(0, 10)}</Badge>
        <Badge variant="outline" className="text-[10px] font-mono" data-testid="ex-roo-integrity-badge" title={integrityHash}>
          <ShieldCheck className="h-3 w-3 mr-1" />{shortHash}
        </Badge>
        <p className="text-sm text-muted-foreground w-full">Supplier Declaration Form II register · 30-day Customs response tracker · CTH change / value-add / specific process</p>
      </div>

      <Card className="p-3" data-testid="ex-roo-toggle-host">
        <TableChartToggle
          rows={chartRows}
          columns={[
            { key: 'fta', label: 'FTA' },
            { key: 'count', label: 'Declarations', align: 'right' },
          ]}
          chartConfig={chartConfig}
          defaultView="table"
          emptyLabel="No declarations"
        />
        {drill.trail.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1">drill depth: {drill.trail.length}</p>
        )}
      </Card>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{summary.total}</div><div className="text-xs text-muted-foreground">Total Declarations</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-success">{summary.by_status.accepted ?? 0}</div><div className="text-xs text-muted-foreground">Accepted</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-warning">{summary.by_status.queried ?? 0}</div><div className="text-xs text-muted-foreground"><AlertTriangle className="w-3 h-3 inline mr-1" />Under Query</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{summary.pending_customs_response}</div><div className="text-xs text-muted-foreground">Pending Customs Response</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Supplier Declaration Register</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Declaration No</TableHead><TableHead>Vendor</TableHead><TableHead>CTH</TableHead><TableHead>Origin</TableHead><TableHead>RoO Basis</TableHead><TableHead>FTA</TableHead><TableHead>Status</TableHead><TableHead>Deadline</TableHead></TableRow></TableHeader>
            <TableBody>
              {sds.map((sd) => (
                <TableRow key={sd.id}>
                  <TableCell className="font-mono text-xs">{sd.declaration_no}</TableCell>
                  <TableCell className="font-mono text-xs">{sd.related_foreign_vendor_id}</TableCell>
                  <TableCell className="font-mono">{sd.related_cth}</TableCell>
                  <TableCell>{sd.origin_country_code}</TableCell>
                  <TableCell><Badge variant="outline">{sd.roo_classification}{sd.value_add_percentage !== null && ` (${sd.value_add_percentage}%)`}</Badge></TableCell>
                  <TableCell className="text-xs">{sd.fta_treaty_code}</TableCell>
                  <TableCell><Badge variant={sd.status === 'accepted' ? 'default' : sd.status === 'queried' ? 'destructive' : 'outline'}>{sd.status.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="text-xs">{sd.customs_response_deadline ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
