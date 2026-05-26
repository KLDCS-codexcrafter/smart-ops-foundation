/**
 * MultiGAAPDepreciationReport.tsx
 * Sprint 67 FAR-3 · Block 10 · Q-LOCK-10 A · 3-tab + reconciliation
 */
import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { faUnitsKey } from '@/types/fixed-asset';
import type { AssetUnitRecord } from '@/types/fixed-asset';
import { computeMultiGAAPDepreciation, compareMultiGAAPBooks } from '@/lib/multi-gaap-depreciation-engine';
import { Calculator } from 'lucide-react';

interface MultiGAAPDepreciationReportPanelProps {
  entityCode: string;
}

export function MultiGAAPDepreciationReportPanel({ entityCode }: MultiGAAPDepreciationReportPanelProps) {
  const [fy] = useState('2025-26');

  const result = useMemo(() => {
    // [JWT] Replace with GET /api/fa/multi-gaap-depreciation?fy=
    const units: AssetUnitRecord[] = JSON.parse(localStorage.getItem(faUnitsKey(entityCode)) ?? '[]');
    return computeMultiGAAPDepreciation(units, fy);
  }, [entityCode, fy]);

  const reconciliation = useMemo(() => compareMultiGAAPBooks(result), [result]);

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" />Multi-GAAP Depreciation Report · FY {fy}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div className="rounded-lg border p-3"><div className="text-muted-foreground">IT Act</div><div className="text-lg font-bold">₹{result.totals.itActTotalDepr.toLocaleString('en-IN')}</div></div>
            <div className="rounded-lg border p-3"><div className="text-muted-foreground">Companies Act</div><div className="text-lg font-bold">₹{result.totals.companiesActTotalDepr.toLocaleString('en-IN')}</div></div>
            <div className="rounded-lg border p-3"><div className="text-muted-foreground">Ind AS</div><div className="text-lg font-bold">₹{result.totals.indASTotalDepr.toLocaleString('en-IN')}</div></div>
            <div className="rounded-lg border p-3"><div className="text-warning">Max Differential</div><div className="text-lg font-bold">₹{result.totals.maxAbsoluteDifferential.toLocaleString('en-IN')}</div></div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="itAct">
        <TabsList>
          <TabsTrigger value="itAct">IT Act ({result.itAct.length})</TabsTrigger>
          <TabsTrigger value="companiesAct">Companies Act ({result.companiesAct.length})</TabsTrigger>
          <TabsTrigger value="indAS">Ind AS ({result.indAS.length})</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation ({reconciliation.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="itAct">
          <Table>
            <TableHeader><TableRow><TableHead>Block</TableHead><TableHead>Rate</TableHead><TableHead>Opening WDV</TableHead><TableHead>Total</TableHead><TableHead>Depr Full</TableHead><TableHead>Depr Half</TableHead></TableRow></TableHeader>
            <TableBody>{result.itAct.map((row) => (<TableRow key={row.block}><TableCell>{row.block}</TableCell><TableCell>{row.rate}%</TableCell><TableCell>₹{row.opening_wdv.toLocaleString('en-IN')}</TableCell><TableCell>₹{row.total.toLocaleString('en-IN')}</TableCell><TableCell>₹{row.depr_full_rate.toLocaleString('en-IN')}</TableCell><TableCell>₹{row.depr_half_rate.toLocaleString('en-IN')}</TableCell></TableRow>))}</TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="companiesAct">
          <Table>
            <TableHeader><TableRow><TableHead>Ledger</TableHead><TableHead>Opening</TableHead><TableHead>Additions</TableHead><TableHead>Disposals</TableHead><TableHead>Current Depr</TableHead><TableHead>Accum Closing</TableHead></TableRow></TableHeader>
            <TableBody>{result.companiesAct.map((row, i) => (<TableRow key={`${row.ledger_name}-${i}`}><TableCell>{row.ledger_name}</TableCell><TableCell>₹{row.gross_opening.toLocaleString('en-IN')}</TableCell><TableCell>₹{row.additions.toLocaleString('en-IN')}</TableCell><TableCell>₹{row.disposals.toLocaleString('en-IN')}</TableCell><TableCell>₹{row.current_depr.toLocaleString('en-IN')}</TableCell><TableCell>₹{row.accum_closing.toLocaleString('en-IN')}</TableCell></TableRow>))}</TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="indAS">
          <Table>
            <TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Ledger</TableHead><TableHead>Life</TableHead><TableHead>Method</TableHead><TableHead>Component?</TableHead><TableHead>Depr FY</TableHead><TableHead>Net CV</TableHead></TableRow></TableHeader>
            <TableBody>{result.indAS.map((row) => (<TableRow key={row.asset_unit_id}><TableCell className="font-mono">{row.asset_id}</TableCell><TableCell>{row.ledger_name}</TableCell><TableCell>{row.useful_life_years}y</TableCell><TableCell>{row.depreciation_method}</TableCell><TableCell>{row.is_component_depreciated ? 'Yes' : '–'}</TableCell><TableCell>₹{row.current_depr.toLocaleString('en-IN')}</TableCell><TableCell>₹{row.net_carrying_amount.toLocaleString('en-IN')}</TableCell></TableRow>))}</TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="reconciliation">
          <Table>
            <TableHeader><TableRow><TableHead>Ledger</TableHead><TableHead>IT Act</TableHead><TableHead>Companies Act</TableHead><TableHead>Ind AS</TableHead><TableHead>Max Diff</TableHead></TableRow></TableHeader>
            <TableBody>{reconciliation.map((row, i) => (<TableRow key={`${row.ledger_name}-${i}`}><TableCell>{row.ledger_name}</TableCell><TableCell>₹{row.itActDepr.toLocaleString('en-IN')}</TableCell><TableCell>₹{row.companiesActDepr.toLocaleString('en-IN')}</TableCell><TableCell>₹{row.indASDepr.toLocaleString('en-IN')}</TableCell><TableCell className="font-bold">₹{row.maxAbsoluteDifferential.toLocaleString('en-IN')}</TableCell></TableRow>))}</TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MultiGAAPDepreciationReportPanel;
