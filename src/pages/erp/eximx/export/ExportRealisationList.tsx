/**
 * @file        src/pages/erp/eximx/export/ExportRealisationList.tsx
 * @purpose     List of all Realisations · forex variance + FEMA state badges
 * @sprint      T-Phase-1.EX-7c-ExportRealisation-eBRC-FEMA
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Banknote, AlertTriangle, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import { loadRealisations, summarizeRealisations } from '@/lib/export-realisation-engine';
import type { ExportRealisation, FEMAState } from '@/types/export-realisation';

export function ExportRealisationList(): JSX.Element {
  const navigate = useNavigate();
  const entityCode = 'sinha-trading';
  const [rs, setRs] = useState<ExportRealisation[]>([]);
  useEffect(() => { setRs(loadRealisations(entityCode)); }, []);
  const s = summarizeRealisations(rs);

  const femaBadge = (state: FEMAState) => {
    const colors: Record<FEMAState, string> = { safe: 'bg-green-600', attention: 'bg-yellow-500', warning: 'bg-orange-500', critical: 'bg-red-500', overdue: 'bg-red-700' };
    return <Badge variant="default" className={colors[state]}>{state}</Badge>;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Export Realisations</h1>
          <p className="text-sm text-muted-foreground">Export cycle closure · FEMA 270-day · Forex Triangulation · Buyer Reliability feedback · e-BRC + FIRC reconciliation</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/erp/eximx/saathi/tdl-gaps-atlas')}><Sparkles className="w-4 h-4 mr-2" />Saathi</Button>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{s.total}</div><div className="text-xs text-muted-foreground">Total Realisations</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-green-600">₹{s.total_realised_inr.toLocaleString()}</div><div className="text-xs text-muted-foreground">Realised</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-amber-600">₹{s.total_outstanding_inr.toLocaleString()}</div><div className="text-xs text-muted-foreground"><AlertTriangle className="w-3 h-3 inline mr-1" />Outstanding</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className={`text-2xl font-bold ${s.total_forex_variance_inr >= 0 ? 'text-green-600' : 'text-red-600'}`}>{s.total_forex_variance_inr >= 0 ? <TrendingUp className="w-4 h-4 inline mr-1" /> : <TrendingDown className="w-4 h-4 inline mr-1" />}₹{Math.abs(s.total_forex_variance_inr).toLocaleString()}</div><div className="text-xs text-muted-foreground">Forex Variance</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-blue-600">{s.stpi_count}</div><div className="text-xs text-muted-foreground">STPI (v7 Gap #11)</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle><Banknote className="w-4 h-4 inline mr-2" />Realisation Register</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Realisation No</TableHead><TableHead>SB</TableHead><TableHead>FEMA</TableHead>
              <TableHead>Status</TableHead><TableHead>Days</TableHead>
              <TableHead className="text-right">Invoice (₹)</TableHead><TableHead className="text-right">Realised (₹)</TableHead><TableHead>%</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rs.map((r) => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/erp/eximx/export/realisation/${r.id}`)}>
                  <TableCell className="font-mono">{r.realisation_no}</TableCell>
                  <TableCell className="font-mono text-xs">{r.related_shipping_bill_no}</TableCell>
                  <TableCell>{femaBadge(r.fema_state)}</TableCell>
                  <TableCell><Badge variant="outline">{r.status.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell>{r.days_since_dispatch}</TableCell>
                  <TableCell className="text-right font-mono">{r.invoice_value_inr_at_dispatch.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono text-green-600">{r.total_realised_inr.toLocaleString()}</TableCell>
                  <TableCell><Badge variant={r.realisation_pct === 100 ? 'default' : r.realisation_pct === 0 ? 'destructive' : 'secondary'} className={r.realisation_pct === 100 ? 'bg-green-600' : ''}>{r.realisation_pct}%</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
