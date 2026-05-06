/**
 * @file     MobileProductionConfirmationPage.tsx
 * @sprint   T-Phase-1.3-3a-pre-3 · Block H · D-563 · Q17=a
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useProductionOrders } from '@/hooks/useProductionOrders';
import { useGodowns } from '@/hooks/useGodowns';
import { createProductionConfirmation } from '@/lib/production-confirmation-engine';

interface SessionLite { user_id: string | null; display_name: string }
function readSession(): SessionLite | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? JSON.parse(raw) as SessionLite : null; } catch { return null; }
}

export default function MobileProductionConfirmationPage(): JSX.Element {
  const navigate = useNavigate();
  const session = readSession();
  const { orders } = useProductionOrders();
  const { godowns } = useGodowns();
  const inProgressPOs = orders.filter(o => o.status === 'in_progress' || o.status === 'released');

  const [poId, setPoId] = useState('');
  const [actualQty, setActualQty] = useState('');
  const [godownId, setGodownId] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSave = async (): Promise<void> => {
    const qty = Number(actualQty);
    if (!poId || qty <= 0 || !godownId) { toast.error('Fill all fields'); return; }
    setBusy(true);
    try {
      const po = inProgressPOs.find(p => p.id === poId);
      if (!po) throw new Error('PO not found');
      const pc = createProductionConfirmation({
        entity_id: po.entity_id,
        production_order: po,
        confirmation_date: new Date().toISOString().slice(0, 10),
        actual_qty: qty,
        destination_godown_id: godownId,
        destination_godown_name: godowns.find(g => g.id === godownId)?.name ?? '',
        batch_no: batchNo || null,
        serial_nos: [], heat_no: null,
        department_id: po.department_id,
        department_name: po.department_name ?? '',
        confirmed_by_user_id: session?.user_id ?? 'mobile',
        confirmed_by_name: session?.display_name ?? 'Mobile User',
        remarks: 'Mobile capture',
        notes: '',
      }, { enableQualiCheck: false, enableIncomingInspection: false, enableOutgoingInspection: false, quarantineGodownId: null } as never);
      toast.success(`PC ${pc.doc_no} created`);
      navigate('/operix-go');
    } catch (e) {
      toast.error(`Failed: ${(e as Error).message}`);
    } finally { setBusy(false); }
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go')}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
      <h1 className="text-xl font-bold">Production Confirmation</h1>
      <Card className="p-4 space-y-3">
        <div><Label>Production Order</Label>
          <Select value={poId} onValueChange={setPoId}>
            <SelectTrigger><SelectValue placeholder="Select PO..." /></SelectTrigger>
            <SelectContent>{inProgressPOs.map(p => <SelectItem key={p.id} value={p.id}>{p.doc_no}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Actual Qty</Label>
          <Input type="number" inputMode="decimal" value={actualQty} onChange={e => setActualQty(e.target.value)} className="font-mono" />
        </div>
        <div><Label>FG Godown</Label>
          <Select value={godownId} onValueChange={setGodownId}>
            <SelectTrigger><SelectValue placeholder="Select godown..." /></SelectTrigger>
            <SelectContent>{godowns.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Batch No (optional)</Label><Input value={batchNo} onChange={e => setBatchNo(e.target.value)} /></div>
        <Button className="w-full" size="lg" onClick={handleSave} disabled={busy}>
          <Save className="h-4 w-4 mr-1" /> {busy ? 'Saving…' : 'Confirm'}
        </Button>
      </Card>
    </div>
  );
}
