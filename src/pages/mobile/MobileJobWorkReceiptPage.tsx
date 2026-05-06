/**
 * @file     MobileJobWorkReceiptPage.tsx
 * @sprint   T-Phase-1.3-3a-pre-3 · Block H · D-563 · Q17=a
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
import { listJobWorkOutOrders } from '@/lib/job-work-out-engine';

export default function MobileJobWorkReceiptPage(): JSX.Element {
  const navigate = useNavigate();
  const { entityCode } = useEntityCode();
  const jwos = useMemo(() => listJobWorkOutOrders(entityCode).filter(j => j.status === 'sent' || j.status === 'partially_received'), [entityCode]);

  const [jwoId, setJwoId] = useState('');
  const [receivedQty, setReceivedQty] = useState('');
  const [rejectedQty, setRejectedQty] = useState('0');

  const handleSave = (): void => {
    if (!jwoId || Number(receivedQty) <= 0) { toast.error('Select JWO and enter qty'); return; }
    // [JWT] POST /api/production/job-work-receipts (mobile capture stub)
    toast.success(`JWR drafted (received ${receivedQty}, rejected ${rejectedQty})`);
    navigate('/operix-go');
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go')}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
      <h1 className="text-xl font-bold">Job Work Receipt (Mobile)</h1>
      <Card className="p-4 space-y-3">
        <div><Label>Open JWO</Label>
          <Select value={jwoId} onValueChange={setJwoId}>
            <SelectTrigger><SelectValue placeholder="Select JWO..." /></SelectTrigger>
            <SelectContent>{jwos.map(j => <SelectItem key={j.id} value={j.id}>{j.doc_no} · {j.vendor_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Received Qty</Label><Input type="number" inputMode="decimal" value={receivedQty} onChange={e => setReceivedQty(e.target.value)} className="font-mono" /></div>
        <div><Label>Rejected Qty</Label><Input type="number" inputMode="decimal" value={rejectedQty} onChange={e => setRejectedQty(e.target.value)} className="font-mono" /></div>
        <Button className="w-full" size="lg" onClick={handleSave}><Save className="h-4 w-4 mr-1" /> Save Draft</Button>
      </Card>
    </div>
  );
}
