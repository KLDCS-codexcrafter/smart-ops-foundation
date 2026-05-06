/**
 * @file     ProductionConfirmationEntry.tsx
 * @sprint   T-Phase-1.3-3a-pre-2 · Block E
 * @purpose  Production Confirmation entry panel — confirm actual FG output against a PO.
 *           Single-output (3a-pre-2 · multi-output deferred to 3a-pre-2.5).
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Save, AlertTriangle } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useProductionOrders } from '@/hooks/useProductionOrders';
import { useGodowns } from '@/hooks/useGodowns';
import {
  comply360QCKey,
  DEFAULT_QC_CONFIG,
  type QualiCheckConfig,
} from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import {
  createProductionConfirmation,
  confirmProductionConfirmation,
} from '@/lib/production-confirmation-engine';
import type { ProductionOrder } from '@/types/production-order';

export function ProductionConfirmationEntryPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const { orders } = useProductionOrders();
  const { godowns } = useGodowns();

  const [poId, setPoId] = useState<string>('');
  const [confirmDate, setConfirmDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [actualQty, setActualQty] = useState<number>(0);
  const [destinationGodownId, setDestinationGodownId] = useState<string>('');
  const [batchNo, setBatchNo] = useState<string>('');
  const [heatNo, setHeatNo] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const confirmablePOs = useMemo<ProductionOrder[]>(
    () => orders.filter(o => o.status === 'in_progress' || o.status === 'released'),
    [orders],
  );
  const selectedPO = useMemo(() => confirmablePOs.find(o => o.id === poId), [confirmablePOs, poId]);

  const qcConfig: QualiCheckConfig = useMemo(() => {
    try {
      const raw = localStorage.getItem(comply360QCKey(entityCode));
      return raw ? { ...DEFAULT_QC_CONFIG, ...(JSON.parse(raw) as Partial<QualiCheckConfig>) } : DEFAULT_QC_CONFIG;
    } catch { return DEFAULT_QC_CONFIG; }
  }, [entityCode]);

  const willQuarantine = !!(selectedPO?.qc_required && qcConfig.enableOutgoingInspection);

  const yieldPct = selectedPO && selectedPO.planned_qty > 0
    ? (actualQty / selectedPO.planned_qty) * 100
    : 0;

  const handleSave = (confirm: boolean) => {
    if (!selectedPO) { toast.error('Select a Production Order'); return; }
    if (actualQty <= 0) { toast.error('Actual qty must be > 0'); return; }
    const destId = destinationGodownId || selectedPO.output_godown_id;
    const destName = godowns.find(g => g.id === destId)?.name ?? 'FG';
    try {
      const pc = createProductionConfirmation({
        entity_id: entityCode,
        production_order: selectedPO,
        confirmation_date: confirmDate,
        department_id: selectedPO.department_id,
        department_name: selectedPO.department_name,
        confirmed_by_user_id: 'current-user',
        confirmed_by_name: 'Current User',
        actual_qty: actualQty,
        destination_godown_id: destId,
        destination_godown_name: destName,
        batch_no: batchNo || null,
        serial_nos: [],
        heat_no: heatNo || null,
        remarks,
        notes,
      }, qcConfig);
      if (confirm) {
        confirmProductionConfirmation(pc, { id: 'current-user', name: 'Current User' });
        toast.success(`Confirmation ${pc.doc_no} confirmed`);
      } else {
        toast.success(`Confirmation ${pc.doc_no} saved as draft`);
      }
      setPoId('');
      setActualQty(0);
      setBatchNo('');
      setHeatNo('');
      setRemarks('');
      setNotes('');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-primary" />
          Production Confirmation
        </h1>
        <p className="text-sm text-muted-foreground">Confirm actual FG output · auto-quarantine when QC enabled</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Header</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Production Order</Label>
            <Select value={poId} onValueChange={setPoId}>
              <SelectTrigger><SelectValue placeholder="Select PO..." /></SelectTrigger>
              <SelectContent>
                {confirmablePOs.map(o => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.doc_no} · {o.output_item_code} · planned {o.planned_qty} {o.uom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Confirmation Date</Label>
            <Input type="date" className="font-mono" value={confirmDate} onChange={e => setConfirmDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {selectedPO && (
        <Card>
          <CardHeader><CardTitle className="text-base">Output</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Output Item</Label>
              <Input readOnly value={`${selectedPO.output_item_code} · ${selectedPO.output_item_name}`} />
            </div>
            <div className="space-y-2">
              <Label>Planned Qty</Label>
              <Input readOnly className="font-mono" value={`${selectedPO.planned_qty} ${selectedPO.uom}`} />
            </div>
            <div className="space-y-2">
              <Label>Actual Qty</Label>
              <Input
                type="number"
                min={0}
                className="font-mono"
                value={actualQty || ''}
                onChange={e => setActualQty(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Yield %</Label>
              <Input readOnly className="font-mono" value={yieldPct.toFixed(2)} />
            </div>
            <div className="space-y-2">
              <Label>Destination Godown</Label>
              <Select value={destinationGodownId} onValueChange={setDestinationGodownId}>
                <SelectTrigger>
                  <SelectValue placeholder={godowns.find(g => g.id === selectedPO.output_godown_id)?.name ?? 'FG'} />
                </SelectTrigger>
                <SelectContent>
                  {godowns.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.code} · {g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Batch No</Label>
              <Input className="font-mono" value={batchNo} onChange={e => setBatchNo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Heat No</Label>
              <Input className="font-mono" value={heatNo} onChange={e => setHeatNo(e.target.value)} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Remarks</Label>
              <Input value={remarks} onChange={e => setRemarks(e.target.value)} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </CardContent>
        </Card>
      )}

      {willQuarantine && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            FG output will be auto-routed to <span className="font-medium">Quarantine</span> until QC clearance.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => handleSave(false)}>
          <Save className="h-4 w-4 mr-2" /> Save Draft
        </Button>
        <Button onClick={() => handleSave(true)}>
          Save and Confirm
        </Button>
      </div>
    </div>
  );
}

export default ProductionConfirmationEntryPanel;
