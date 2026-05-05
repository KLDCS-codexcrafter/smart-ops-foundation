/**
 * InwardReceiptEntry.tsx — Card #6 Inward Logistic FOUNDATION
 * Sprint T-Phase-1.2.6f-d-2-card6-6-pre-1 · Block D
 * MODULE ID: dh-i-inward-receipt-entry
 *
 * Minimal entry form for inward receipts. Auto-routes lines via decideLineRouting().
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PackageOpen, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { createInwardReceipt, decideLineRouting } from '@/lib/inward-receipt-engine';
import { ROUTING_DECISION_LABELS } from '@/types/inward-receipt';
import type { DispatchHubModule } from '../DispatchHubSidebar';

interface Props { onModuleChange?: (m: DispatchHubModule) => void }

interface LineDraft {
  id: string;
  item_code: string;
  item_name: string;
  uom: string;
  expected_qty: string;
  received_qty: string;
  batch_no: string;
  qa_plan_id: string;
}

const blankLine = (): LineDraft => ({
  id: `l-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  item_code: '', item_name: '', uom: 'NOS',
  expected_qty: '', received_qty: '', batch_no: '', qa_plan_id: '',
});

export function InwardReceiptEntryPanel({ onModuleChange }: Props) {
  const { entityCode, userId } = useCardEntitlement();
  const [vendorName, setVendorName] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [poNo, setPoNo] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [lrNo, setLrNo] = useState('');
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState('');
  const [godownName, setGodownName] = useState('Main Godown');
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([blankLine()]);
  const [saving, setSaving] = useState(false);

  const updateLine = (id: string, patch: Partial<LineDraft>) =>
    setLines(prev => prev.map(l => (l.id === id ? { ...l, ...patch } : l)));
  const addLine = () => setLines(prev => [...prev, blankLine()]);
  const removeLine = (id: string) => setLines(prev => prev.filter(l => l.id !== id));

  const previewRouting = (l: LineDraft) => decideLineRouting({
    expected_qty: Number(l.expected_qty) || 0,
    received_qty: Number(l.received_qty) || 0,
    has_qa_plan: !!l.qa_plan_id.trim(),
  });

  const submit = async () => {
    if (!vendorName.trim()) { toast.error('Vendor name required'); return; }
    const validLines = lines.filter(l => l.item_code.trim() && Number(l.received_qty) > 0);
    if (!validLines.length) { toast.error('At least one line with item code and received qty'); return; }

    setSaving(true);
    try {
      const ir = await createInwardReceipt({
        entity_id: entityCode,
        vendor_id: vendorId.trim() || `v-${Date.now()}`,
        vendor_name: vendorName.trim(),
        vendor_invoice_no: vendorInvoiceNo.trim() || null,
        po_no: poNo.trim() || null,
        vehicle_no: vehicleNo.trim() || null,
        lr_no: lrNo.trim() || null,
        godown_id: 'gd-main',
        godown_name: godownName.trim() || 'Main Godown',
        received_by_id: userId,
        received_by_name: userId,
        narration: narration.trim(),
        lines: validLines.map(l => ({
          item_id: l.item_code.trim(),
          item_code: l.item_code.trim(),
          item_name: l.item_name.trim() || l.item_code.trim(),
          uom: l.uom.trim() || 'NOS',
          expected_qty: Number(l.expected_qty) || 0,
          received_qty: Number(l.received_qty) || 0,
          batch_no: l.batch_no.trim() || null,
          qa_plan_id: l.qa_plan_id.trim() || null,
        })),
      }, entityCode, userId);

      toast.success(`Inward Receipt ${ir.receipt_no} created · ${ir.status}`);
      onModuleChange?.('dh-i-inward-receipt-register');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <PackageOpen className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Inward Receipt Entry</h1>
          <p className="text-xs text-muted-foreground">Capture vendor arrival · auto-routes to quarantine/release</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Vendor & Transport</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><Label>Vendor Name *</Label><Input value={vendorName} onChange={e => setVendorName(e.target.value)} /></div>
          <div><Label>Vendor ID</Label><Input value={vendorId} onChange={e => setVendorId(e.target.value)} /></div>
          <div><Label>PO No</Label><Input value={poNo} onChange={e => setPoNo(e.target.value)} /></div>
          <div><Label>Vendor Invoice No</Label><Input value={vendorInvoiceNo} onChange={e => setVendorInvoiceNo(e.target.value)} /></div>
          <div><Label>Vehicle No</Label><Input value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} /></div>
          <div><Label>LR No</Label><Input value={lrNo} onChange={e => setLrNo(e.target.value)} /></div>
          <div className="md:col-span-3"><Label>Godown</Label><Input value={godownName} onChange={e => setGodownName(e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">Lines</CardTitle>
          <Button size="sm" variant="outline" onClick={addLine}><Plus className="h-3.5 w-3.5 mr-1" />Add Line</Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>QA Plan</TableHead>
                <TableHead>Routing</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map(l => {
                const r = previewRouting(l);
                return (
                  <TableRow key={l.id}>
                    <TableCell><Input value={l.item_code} onChange={e => updateLine(l.id, { item_code: e.target.value })} className="h-8" /></TableCell>
                    <TableCell><Input value={l.item_name} onChange={e => updateLine(l.id, { item_name: e.target.value })} className="h-8" /></TableCell>
                    <TableCell><Input value={l.uom} onChange={e => updateLine(l.id, { uom: e.target.value })} className="h-8 w-16" /></TableCell>
                    <TableCell><Input type="number" value={l.expected_qty} onChange={e => updateLine(l.id, { expected_qty: e.target.value })} className="h-8 text-right font-mono" /></TableCell>
                    <TableCell><Input type="number" value={l.received_qty} onChange={e => updateLine(l.id, { received_qty: e.target.value })} className="h-8 text-right font-mono" /></TableCell>
                    <TableCell><Input value={l.batch_no} onChange={e => updateLine(l.id, { batch_no: e.target.value })} className="h-8" /></TableCell>
                    <TableCell><Input value={l.qa_plan_id} onChange={e => updateLine(l.id, { qa_plan_id: e.target.value })} className="h-8" placeholder="optional" /></TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{ROUTING_DECISION_LABELS[r.decision]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeLine(l.id)} disabled={lines.length === 1}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Narration</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={narration} onChange={e => setNarration(e.target.value)} rows={2} />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button onClick={submit} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Inward Receipt'}
        </Button>
      </div>
    </div>
  );
}

export default InwardReceiptEntryPanel;
