/**
 * @file     MobileJobWorkOutPage.tsx
 * @sprint   T-Phase-1.3-3a-pre-3 · Block H · D-563 · Q17=a
 *           Block H wiring · creates real JWO via job-work-out-engine
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
import { useInventoryItems } from '@/hooks/useInventoryItems';
import { createJobWorkOutOrder } from '@/lib/job-work-out-engine';

interface SessionLite { user_id: string | null; display_name: string }
function readSession(): SessionLite | null {
  try {
    // [JWT] GET /api/mobile/auth/session
    const raw = sessionStorage.getItem('opx_mobile_session');
    return raw ? (JSON.parse(raw) as SessionLite) : null;
  } catch { return null; }
}

export default function MobileJobWorkOutPage(): JSX.Element {
  const navigate = useNavigate();
  const session = readSession();
  const { entityCode } = useEntityCode();
  const { godowns } = useGodowns();
  const { items } = useInventoryItems();

  const [vendorName, setVendorName] = useState('');
  const [vendorGstin, setVendorGstin] = useState('');
  const [itemId, setItemId] = useState('');
  const [sentQty, setSentQty] = useState('');
  const [sourceGodownId, setSourceGodownId] = useState('');
  const [busy, setBusy] = useState(false);

  const itemOptions = useMemo(() => items.slice(0, 100), [items]);

  const handleSave = async (): Promise<void> => {
    const qty = Number(sentQty);
    if (!vendorName || !itemId || qty <= 0 || !sourceGodownId) {
      toast.error('Fill all required fields');
      return;
    }
    setBusy(true);
    try {
      const item = items.find(i => i.id === itemId);
      if (!item) throw new Error('Item not found');
      const src = godowns.find(g => g.id === sourceGodownId);
      const today = new Date().toISOString().slice(0, 10);
      const expected = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const jwo = createJobWorkOutOrder({
        entity_id: entityCode,
        jwo_date: today,
        expected_return_date: expected,
        vendor_id: `vend-mobile-${Date.now()}`,
        vendor_name: vendorName.trim(),
        vendor_gstin: vendorGstin.trim() || null,
        production_order_id: null,
        production_order_no: null,
        department_id: 'dept-production',
        department_name: 'Production',
        raised_by_user_id: session?.user_id ?? 'mobile',
        raised_by_name: session?.display_name ?? 'Mobile User',
        lines: [{
          item_id: item.id,
          item_code: item.code,
          item_name: item.name,
          uom: item.primary_uom_symbol ?? '',
          sent_qty: qty,
          source_godown_id: sourceGodownId,
          source_godown_name: src?.name ?? '',
          job_work_godown_id: sourceGodownId,
          job_work_godown_name: src?.name ?? '',
          expected_output_item_id: item.id,
          expected_output_item_code: item.code,
          expected_output_item_name: item.name,
          expected_output_qty: qty,
          expected_output_uom: item.primary_uom_symbol ?? '',
          job_work_rate: 0,
          remarks: 'Mobile entry',
        }],
        notes: 'Mobile capture',
      });
      toast.success(`JWO ${jwo.doc_no} drafted`);
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
      <h1 className="text-xl font-bold">Job Work Out (Mobile)</h1>
      <Card className="p-4 space-y-3">
        <div><Label>Vendor Name</Label><Input value={vendorName} onChange={e => setVendorName(e.target.value)} /></div>
        <div><Label>Vendor GSTIN</Label><Input value={vendorGstin} onChange={e => setVendorGstin(e.target.value)} className="font-mono uppercase" /></div>
        <div>
          <Label>Item</Label>
          <Select value={itemId} onValueChange={setItemId}>
            <SelectTrigger><SelectValue placeholder="Select item..." /></SelectTrigger>
            <SelectContent>
              {itemOptions.map(i => <SelectItem key={i.id} value={i.id}>{i.code} · {i.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Sent Qty</Label><Input type="number" inputMode="decimal" value={sentQty} onChange={e => setSentQty(e.target.value)} className="font-mono" /></div>
        <div>
          <Label>Source Godown</Label>
          <Select value={sourceGodownId} onValueChange={setSourceGodownId}>
            <SelectTrigger><SelectValue placeholder="Select godown..." /></SelectTrigger>
            <SelectContent>
              {godowns.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button className="w-full" size="lg" onClick={handleSave} disabled={busy}>
          <Save className="h-4 w-4 mr-1" /> {busy ? 'Saving…' : 'Save Draft'}
        </Button>
        <p className="text-xs text-muted-foreground">Full JWO entry with rate &amp; line-level sub-contract is on the desk console.</p>
      </Card>
    </div>
  );
}
