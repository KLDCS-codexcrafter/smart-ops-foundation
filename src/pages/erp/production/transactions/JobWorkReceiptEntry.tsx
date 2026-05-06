/**
 * @file     JobWorkReceiptEntry.tsx
 * @sprint   T-Phase-1.3-3a-pre-2 · Block H
 * @purpose  Job Work Receipt — receive processed/finished goods from sub-contractor.
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
import { PackagePlus, Save, AlertTriangle } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useGodowns } from '@/hooks/useGodowns';
import {
  comply360QCKey,
  DEFAULT_QC_CONFIG,
  type QualiCheckConfig,
} from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import {
  createJobWorkReceipt,
  confirmJobWorkReceipt,
} from '@/lib/job-work-receipt-engine';
import { listJobWorkOutOrders } from '@/lib/job-work-out-engine';
import type { JobWorkOutOrder } from '@/types/job-work-out-order';

export function JobWorkReceiptEntryPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const { godowns } = useGodowns();

  const [jwoId, setJwoId] = useState<string>('');
  const [receiptDate, setReceiptDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [departmentId, setDepartmentId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [lineRecv, setLineRecv] = useState<Record<string, number>>({});
  const [lineRej, setLineRej] = useState<Record<string, number>>({});
  const [lineDest, setLineDest] = useState<Record<string, string>>({});
  const [lineQc, setLineQc] = useState<Record<string, boolean>>({});

  const jwos = useMemo<JobWorkOutOrder[]>(() => {
    return listJWOs(entityCode).filter(j => j.status === 'sent' || j.status === 'partially_received');
  }, [entityCode]);

  const selectedJWO = useMemo(() => jwos.find(j => j.id === jwoId), [jwos, jwoId]);

  const qcConfig: QualiCheckConfig = useMemo(() => {
    try {
      const raw = localStorage.getItem(comply360QCKey(entityCode));
      return raw ? { ...DEFAULT_QC_CONFIG, ...(JSON.parse(raw) as Partial<QualiCheckConfig>) } : DEFAULT_QC_CONFIG;
    } catch { return DEFAULT_QC_CONFIG; }
  }, [entityCode]);

  const anyQuarantine = selectedJWO?.lines.some(l => qcConfig.enableIncomingInspection && (lineQc[l.id] ?? false));

  const handleSave = (confirm: boolean) => {
    if (!selectedJWO) { toast.error('Select a Job Work Out Order'); return; }
    if (!departmentId) { toast.error('Department required'); return; }
    const lines = selectedJWO.lines
      .filter(l => (lineRecv[l.id] ?? 0) > 0 || (lineRej[l.id] ?? 0) > 0)
      .map(l => {
        const destId = lineDest[l.id] ?? '';
        const destName = godowns.find(g => g.id === destId)?.name ?? 'FG';
        return {
          job_work_out_order_line_id: l.id,
          item_id: l.expected_output_item_id,
          item_code: l.expected_output_item_code,
          item_name: l.expected_output_item_name,
          uom: l.expected_output_uom,
          expected_qty: l.expected_output_qty,
          received_qty: lineRecv[l.id] ?? 0,
          rejected_qty: lineRej[l.id] ?? 0,
          destination_godown_id: destId,
          destination_godown_name: destName,
          qc_required: lineQc[l.id] ?? false,
          batch_no: null,
          serial_nos: [],
          remarks: '',
        };
      });

    if (lines.length === 0) { toast.error('Enter qty for at least one line'); return; }

    try {
      const jwr = createJobWorkReceipt({
        entity_id: entityCode,
        job_work_out_order: selectedJWO,
        receipt_date: receiptDate,
        department_id: departmentId,
        department_name: selectedJWO.department_name,
        received_by_user_id: 'current-user',
        received_by_name: 'Current User',
        lines,
        notes,
      }, qcConfig);
      if (confirm) {
        confirmJobWorkReceipt(jwr, { id: 'current-user', name: 'Current User' });
        toast.success(`JWR ${jwr.doc_no} confirmed`);
      } else {
        toast.success(`JWR ${jwr.doc_no} saved as draft`);
      }
      setJwoId('');
      setLineRecv({});
      setLineRej({});
      setLineDest({});
      setLineQc({});
      setNotes('');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PackagePlus className="h-5 w-5 text-primary" />
          Job Work Receipt
        </h1>
        <p className="text-sm text-muted-foreground">Receive processed goods from sub-contractor</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Header</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Job Work Out Order</Label>
            <Select value={jwoId} onValueChange={setJwoId}>
              <SelectTrigger><SelectValue placeholder="Select JWO..." /></SelectTrigger>
              <SelectContent>
                {jwos.map(j => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.doc_no} · {j.vendor_name} · {j.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Receipt Date</Label>
            <Input type="date" className="font-mono" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Input value={departmentId} onChange={e => setDepartmentId(e.target.value)} placeholder="Department ID" />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {selectedJWO && (
        <Card>
          <CardHeader><CardTitle className="text-base">Lines</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {selectedJWO.lines.map(l => {
              const remaining = Math.max(0, l.expected_output_qty - l.received_qty);
              return (
                <div key={l.id} className="grid grid-cols-12 gap-2 items-end border rounded-md p-2">
                  <div className="col-span-3">
                    <div className="text-sm font-medium">{l.expected_output_item_code}</div>
                    <div className="text-xs text-muted-foreground">{l.expected_output_item_name}</div>
                  </div>
                  <div className="col-span-2 text-right font-mono text-sm">
                    <div className="text-xs text-muted-foreground">Exp / Recv</div>
                    {l.expected_output_qty.toFixed(2)} / {l.received_qty.toFixed(2)}
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Receive Qty (max {remaining.toFixed(2)})</Label>
                    <Input type="number" min={0} max={remaining} className="font-mono"
                      value={lineRecv[l.id] ?? ''} onChange={e => setLineRecv(s => ({ ...s, [l.id]: Number(e.target.value) }))} />
                  </div>
                  <div className="col-span-1 space-y-1">
                    <Label className="text-xs">Reject</Label>
                    <Input type="number" min={0} className="font-mono"
                      value={lineRej[l.id] ?? ''} onChange={e => setLineRej(s => ({ ...s, [l.id]: Number(e.target.value) }))} />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">Destination Godown</Label>
                    <Select value={lineDest[l.id] ?? ''} onValueChange={v => setLineDest(s => ({ ...s, [l.id]: v }))}>
                      <SelectTrigger><SelectValue placeholder="Dest..." /></SelectTrigger>
                      <SelectContent>
                        {godowns.map(g => <SelectItem key={g.id} value={g.id}>{g.code} · {g.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 flex items-center gap-1 pb-1">
                    <input
                      type="checkbox"
                      checked={lineQc[l.id] ?? false}
                      onChange={e => setLineQc(s => ({ ...s, [l.id]: e.target.checked }))}
                      aria-label="QC required"
                    />
                    <span className="text-xs">QC</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {anyQuarantine && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            QC-flagged lines will be auto-routed to <span className="font-medium">Quarantine</span>.
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

export default JobWorkReceiptEntryPanel;
