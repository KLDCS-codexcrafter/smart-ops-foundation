/**
 * @file        src/pages/erp/eximx/export/ShippingBillList.tsx
 * @purpose     List of all Shipping Bills · dashboard cards
 * @sprint      T-Phase-1.EX-7b-ShippingBill-EGM-LEO-DispatchMirror
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Sparkles, Shield, AlertTriangle, ShieldCheck } from 'lucide-react';
import { loadShippingBills, summarizeShippingBills } from '@/lib/shipping-bill-engine';
import { SB_TYPE_DESCRIPTIONS } from '@/types/shipping-bill';
import type { ShippingBill } from '@/types/shipping-bill';
// RPT-2b-i · additive chart wrap
import { TableChartToggle } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';
import { useDrillDown } from '@/hooks/useDrillDown';


export function ShippingBillList(): JSX.Element {
  const navigate = useNavigate();
  const entityCode = 'sinha-trading';
  const [sbs, setSbs] = useState<ShippingBill[]>([]);
  useEffect(() => { setSbs(loadShippingBills(entityCode)); }, []);
  const s = summarizeShippingBills(sbs);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shipping Bills</h1>
          <p className="text-sm text-muted-foreground">Export chain GL commit · EGM/LEO workflow · CoO legalization · self-sealing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/erp/eximx/saathi/tdl-gaps-atlas')}><Sparkles className="w-4 h-4 mr-2" />Saathi</Button>
          <Button onClick={() => navigate('/erp/eximx/export/shipping-bills/new')}><Plus className="w-4 h-4 mr-2" />New SB</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{s.total}</div><div className="text-xs text-muted-foreground">Total SBs</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-success">₹{s.total_rodtep_inr.toLocaleString('en-IN')}</div><div className="text-xs text-muted-foreground">RoDTEP</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-primary">₹{s.total_drawback_inr.toLocaleString('en-IN')}</div><div className="text-xs text-muted-foreground">Drawback</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{s.self_sealing_count}</div><div className="text-xs text-muted-foreground"><Shield className="w-3 h-3 inline mr-1" />Self-Sealing</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-warning">{s.embassy_legalization_pending}</div><div className="text-xs text-muted-foreground"><AlertTriangle className="w-3 h-3 inline mr-1" />Embassy Pending</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>SB Register</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>SB No</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead>
              <TableHead>Status</TableHead><TableHead>Dest</TableHead><TableHead>CoO</TableHead>
              <TableHead>Self-Seal</TableHead><TableHead className="text-right">FOB (₹)</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {sbs.map((sb) => (
                <TableRow key={sb.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/erp/eximx/export/shipping-bills/${sb.id}`)}>
                  <TableCell className="font-mono">{sb.sb_no}</TableCell>
                  <TableCell><span title={SB_TYPE_DESCRIPTIONS[sb.sb_type]}>{sb.sb_type.replace(/_/g, ' ')}</span></TableCell>
                  <TableCell>{sb.filing_date}</TableCell>
                  <TableCell><Badge variant="outline">{sb.status.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell>{sb.lines[0]?.country_of_destination ?? '—'}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{sb.coo_legalization_state.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell>{sb.is_self_sealing_facility ? <Badge variant="default" className="text-xs">SS</Badge> : '—'}</TableCell>
                  <TableCell className="text-right font-mono">{sb.total_fob_value_inr.toLocaleString('en-IN')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
