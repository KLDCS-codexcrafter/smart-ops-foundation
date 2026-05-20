/**
 * @file        src/pages/erp/eximx/export/ExportPOList.tsx
 * @purpose     Export PO list · LUT readiness chip · buyer reliability badge · status filter
 * @sprint      T-Phase-1.EX-7a-ExportPO-ForeignCustomer-DocPack
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Award, Sparkles, Plus } from 'lucide-react';
import { loadExportPOs, summarizeExportPOs } from '@/lib/export-po-engine';
import type { ExportPurchaseOrder } from '@/types/export-purchase-order';

export function ExportPOList(): JSX.Element {
  const navigate = useNavigate();
  const entityCode = 'sinha-trading';
  const [pos, setPos] = useState<ExportPurchaseOrder[]>([]);
  useEffect(() => { setPos(loadExportPOs(entityCode)); }, []);
  const summary = summarizeExportPOs(pos);

  const lutBadge = (state: ExportPurchaseOrder['lut_status_at_validation']) => {
    if (state === 'active') return <Badge className="bg-success text-success-foreground">LUT Active</Badge>;
    if (state === 'expiring') return <Badge className="bg-warning text-warning-foreground">LUT Expiring</Badge>;
    if (state === 'expired') return <Badge variant="destructive">LUT Expired</Badge>;
    return <Badge variant="outline">No LUT</Badge>;
  };

  const reliabilityBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-success text-success-foreground font-mono">{score}</Badge>;
    if (score >= 70) return <Badge className="bg-primary text-primary-foreground font-mono">{score}</Badge>;
    if (score >= 50) return <Badge className="bg-warning text-warning-foreground font-mono">{score}</Badge>;
    return <Badge variant="destructive" className="font-mono">{score}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Export Purchase Orders</h1>
          <p className="text-sm text-muted-foreground">First export-side sprint · LUT readiness gate · Buyer Reliability Index · 4-doc Pre-shipment Pack</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/erp/eximx/export/orders/new')}><Plus className="w-4 h-4 mr-2" />New Export PO</Button>
          <Button variant="outline" onClick={() => navigate('/erp/eximx/saathi/tdl-gaps-atlas')}><Sparkles className="w-4 h-4 mr-2" />Saathi</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold font-mono">{summary.total}</div><div className="text-xs text-muted-foreground">Total Export POs</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-destructive font-mono">{summary.lut_blocked_count}</div><div className="text-xs text-muted-foreground"><AlertTriangle className="w-3 h-3 inline mr-1" />LUT-blocked</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-warning font-mono">{summary.high_risk_buyer_count}</div><div className="text-xs text-muted-foreground"><Award className="w-3 h-3 inline mr-1" />High-risk buyer</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold font-mono">₹{summary.total_fob_value_inr.toLocaleString('en-IN')}</div><div className="text-xs text-muted-foreground">Total FOB Value</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Export PO Register</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>PO No</TableHead><TableHead>Buyer Ref</TableHead><TableHead>Country</TableHead>
              <TableHead>Status</TableHead><TableHead>LUT</TableHead><TableHead>Buyer Score</TableHead>
              <TableHead className="text-right">FOB (INR)</TableHead><TableHead>Incoterm</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {pos.map((p) => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/erp/eximx/export/orders/${p.id}`)}>
                  <TableCell className="font-mono">{p.export_po_no}</TableCell>
                  <TableCell className="font-mono text-xs">{p.buyer_po_ref}</TableCell>
                  <TableCell>{p.country_code}</TableCell>
                  <TableCell><Badge variant="outline">{p.status.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell>{lutBadge(p.lut_status_at_validation)}</TableCell>
                  <TableCell>{reliabilityBadge(p.buyer_reliability_score_at_commit)}</TableCell>
                  <TableCell className="text-right font-mono">{p.total_fob_value_inr.toLocaleString('en-IN')}</TableCell>
                  <TableCell><Badge variant="secondary">{p.lines[0]?.target_incoterm ?? '—'}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
