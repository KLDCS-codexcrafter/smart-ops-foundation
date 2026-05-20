/**
 * @file        src/pages/erp/eximx/import/BoEDetail.tsx
 * @purpose     BoE detail · header + lines + RMS panel + AEO check + voucher preview · Q9=a integration peak
 * @sprint      T-Phase-1.EX-6-BillOfEntry-CustomsDuty-Demurrage-AutoPostedVouchers
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sparkles, Shield, AlertTriangle, FileText } from 'lucide-react';
import { getBoE } from '@/lib/bill-of-entry-engine';
import { BOE_TYPE_DESCRIPTIONS } from '@/types/bill-of-entry';
import { BoEDutyPaymentPanel } from './BoEDutyPaymentPanel';
import { BoESaathiPanel } from '../saathi/BoESaathiPanel';
import { BoELineageBreadcrumb } from './BoELineageBreadcrumb';
import type { BillOfEntry } from '@/types/bill-of-entry';

export function BoEDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const entityCode = 'sinha-steel';
  const [boe, setBoe] = useState<BillOfEntry | null>(null);
  const [showSaathi, setShowSaathi] = useState(false);

  useEffect(() => { if (id) setBoe(getBoE(entityCode, id)); }, [id]);
  if (!boe) return <div className="p-6">BoE not found</div>;

  return (
    <div className="space-y-6">
      <BoELineageBreadcrumb boe={boe} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono">{boe.boe_no}</h1>
          <p className="text-sm text-muted-foreground">{BOE_TYPE_DESCRIPTIONS[boe.boe_type]} · {boe.filing_date} · Port {boe.port_of_clearance}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSaathi(!showSaathi)}>
            <Sparkles className="w-4 h-4 mr-2" />{showSaathi ? 'Hide' : 'Show'} Saathi
          </Button>
        </div>
      </div>

      <div className={`grid ${showSaathi ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
        <div className={showSaathi ? 'lg:col-span-2' : 'lg:col-span-2'}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Status</div><Badge variant="outline">{boe.status.replace(/_/g, ' ')}</Badge></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">RMS Lane</div><Badge variant={boe.icegate_simulated_lane === 'red' ? 'destructive' : 'outline'}>{boe.icegate_simulated_lane ?? 'pending'}</Badge></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground"><Shield className="w-3 h-3 inline mr-1" />AEO</div><div className="font-bold text-sm">{boe.importer_aeo_tier} → {boe.port_aeo_tier_supported}</div>{boe.aeo_fast_track_eligible && <Badge variant="default" className="text-xs mt-1">fast-track</Badge>}</CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground"><AlertTriangle className="w-3 h-3 inline mr-1" />Demurrage</div><div className="font-bold font-mono">{boe.demurrage_chargeable_days} day(s)</div><div className="text-xs font-mono">₹{boe.demurrage_total_inr.toLocaleString('en-IN')}</div></CardContent></Card>
          </div>

          {boe.is_project_import && (
            <Card className="border-primary mb-6">
              <CardHeader><CardTitle className="text-sm"><FileText className="w-4 h-4 inline mr-2" />Project Import (Sec 25 · v7 Compliance Gap #9)</CardTitle></CardHeader>
              <CardContent className="text-sm">
                Notification: <code className="font-mono">{boe.project_import_notification_ref}</code> · Concessional duty @ <strong>{boe.project_import_concessional_duty_pct}%</strong>
              </CardContent>
            </Card>
          )}

          <Card className="mb-6">
            <CardHeader><CardTitle className="text-sm">Cross-Master Lineage</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <div>CI: <a className="underline cursor-pointer font-mono" onClick={() => navigate(`/erp/eximx/import/commercial-invoices/${boe.related_ci_id}`)}>{boe.related_ci_no}</a></div>
              <div>MLGIT: <a className="underline cursor-pointer font-mono" onClick={() => navigate(`/erp/eximx/import/shipments/${boe.related_mlgit_id}`)}>{boe.related_mlgit_no}</a></div>
              <div>RMS: <span className="font-mono">{boe.related_rms_declaration_id ?? '—'}</span></div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader><CardTitle>Lines + Final Duty</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Line</TableHead><TableHead>Item</TableHead><TableHead>CTH</TableHead><TableHead>Qty</TableHead>
                  <TableHead className="text-right">CIF</TableHead><TableHead className="text-right">BCD</TableHead>
                  <TableHead className="text-right">IGST</TableHead><TableHead className="text-right">Landed</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {boe.lines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{l.line_no}</TableCell><TableCell className="font-medium">{l.item_name}</TableCell>
                      <TableCell className="font-mono text-xs">{l.cth_code}</TableCell><TableCell className="font-mono">{l.qty} {l.uom}</TableCell>
                      <TableCell className="text-right font-mono">{l.final_cif_inr.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-right font-mono">{l.bcd_inr.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-right font-mono">{l.igst_inr.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{l.total_landed_inr.toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <BoEDutyPaymentPanel boe={boe} />
        </div>

        {showSaathi && <div className="lg:col-span-1"><BoESaathiPanel boe={boe} /></div>}
      </div>
    </div>
  );
}
