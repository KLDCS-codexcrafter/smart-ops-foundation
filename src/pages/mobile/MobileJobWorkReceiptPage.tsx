/**
 * @file     MobileJobWorkReceiptPage.tsx
 * @sprint   T-Phase-1.3-3a-pre-3 · Block H · D-563 · Q17=a
 *           Block H wiring · creates real JWR via job-work-receipt-engine
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useGodowns } from '@/hooks/useGodowns';
import { listJobWorkOutOrders } from '@/lib/job-work-out-engine';
import { createJobWorkReceipt, confirmJobWorkReceipt } from '@/lib/job-work-receipt-engine';
import { DEFAULT_QC_CONFIG } from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';

interface SessionLite { user_id: string | null; display_name: string }
function readSession(): SessionLite | null {
  try {
    // [JWT] GET /api/mobile/auth/session
    const raw = sessionStorage.getItem('opx_mobile_session');
    return raw ? (JSON.parse(raw) as SessionLite) : null;
  } catch { return null; }
}

export default function MobileJobWorkReceiptPage(): JSX.Element {
  const navigate = useNavigate();
  const session = readSession();
  const { entityCode } = useEntityCode();
  const { godowns } = useGodowns();
  const jwos = useMemo(
    () => listJobWorkOutOrders(entityCode).filter(j => j.status === 'sent' || j.status === 'partially_received'),
    [entityCode],
  );

  const [jwoId, setJwoId] = useState('');
  const [receivedQty, setReceivedQty] = useState('');
  const [rejectedQty, setRejectedQty] = useState('0');
  const [destGodownId, setDestGodownId] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSave = async (): Promise<void> => {
    const recv = Number(receivedQty);
    const rej = Number(rejectedQty);
    if (!jwoId || (recv + rej) <= 0 || !destGodownId) {
      toast.error('Select JWO, destination godown, and qty');
      return;
    }
    setBusy(true);
    try {
      const jwo = jwos.find(j => j.id === jwoId);
      if (!jwo) throw new Error('JWO not found');
      const firstLine = jwo.lines[0];
      if (!firstLine) throw new Error('JWO has no lines');
      const dest = godowns.find(g => g.id === destGodownId);
      const today = new Date().toISOString().slice(0, 10);
      const jwr = createJobWorkReceipt({
        entity_id: entityCode,
        job_work_out_order: jwo,
        receipt_date: today,
        department_id: jwo.department_id,
        department_name: jwo.department_name,
        received_by_user_id: session?.user_id ?? 'mobile',
        received_by_name: session?.display_name ?? 'Mobile User',
        lines: [{
          job_work_out_order_line_id: firstLine.id,
          item_id: firstLine.expected_output_item_id,
          item_code: firstLine.expected_output_item_code,
          item_name: firstLine.expected_output_item_name,
          uom: firstLine.expected_output_uom,
          expected_qty: firstLine.expected_output_qty,
          received_qty: recv,
          rejected_qty: rej,
          destination_godown_id: destGodownId,
          destination_godown_name: dest?.name ?? '',
          qc_required: false,
          batch_no: null,
          serial_nos: [],
          remarks: 'Mobile capture',
        }],
        notes: 'Mobile entry',
      }, DEFAULT_QC_CONFIG);
      confirmJobWorkReceipt(jwr, { id: session?.user_id ?? 'mobile', name: session?.display_name ?? 'Mobile User' });
      toast.success(`JWR ${jwr.doc_no} confirmed`);
      navigate('/operix-go');
    } catch (e) {
      toast.error(`Failed: ${(e as Error).message}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go')}>
        <ArrowLeft className="h-4 w-4 mr-1" />Back
      </Button>
      <h1 className="text-xl font-bold">Job Work Receipt (Mobile)</h1>
      <Card className="p-4 space-y-3">
        <div>
          <Label>Open JWO</Label>
          <Select value={jwoId} onValueChange={setJwoId}>
            <SelectTrigger><SelectValue placeholder="Select JWO..." /></SelectTrigger>
            <SelectContent>
              {jwos.map(j => <SelectItem key={j.id} value={j.id}>{j.doc_no} · {j.vendor_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Received Qty</Label><Input type="number" inputMode="decimal" value={receivedQty} onChange={e => setReceivedQty(e.target.value)} className="font-mono" /></div>
        <div><Label>Rejected Qty</Label><Input type="number" inputMode="decimal" value={rejectedQty} onChange={e => setRejectedQty(e.target.value)} className="font-mono" /></div>
        <div>
          <Label>Destination Godown</Label>
          <Select value={destGodownId} onValueChange={setDestGodownId}>
            <SelectTrigger><SelectValue placeholder="Select godown..." /></SelectTrigger>
            <SelectContent>
              {godowns.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button className="w-full" size="lg" onClick={handleSave} disabled={busy}>
          <Save className="h-4 w-4 mr-1" /> {busy ? 'Saving…' : 'Confirm Receipt'}
        </Button>
      </Card>
    </div>
  );
}
