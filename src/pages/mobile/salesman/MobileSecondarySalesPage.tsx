/**
 * MobileSecondarySalesPage.tsx — Capture a secondary sale (single-line)
 * Sprint T-Phase-1.1.1l-a · Reuses SecondarySales type
 */
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { MobileSession } from '../MobileRouter';
import {
  type SecondarySales, type EndCustomerType,
  secondarySalesKey, END_CUSTOMER_LABELS,
} from '@/types/secondary-sales';

function readSession(): MobileSession | null {
  try {
    const raw = sessionStorage.getItem('opx_mobile_session');
    return raw ? (JSON.parse(raw) as MobileSession) : null;
  } catch { return null; }
}

function loadList(entityCode: string): SecondarySales[] {
  try {
    const raw = localStorage.getItem(secondarySalesKey(entityCode));
    return raw ? (JSON.parse(raw) as SecondarySales[]) : [];
  } catch { return []; }
}

function saveList(entityCode: string, list: SecondarySales[]): void {
  // [JWT] POST /api/salesx/secondary-sales
  localStorage.setItem(secondarySalesKey(entityCode), JSON.stringify(list));
}

export default function MobileSecondarySalesPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  const [distName, setDistName] = useState('');
  const [endType, setEndType] = useState<EndCustomerType>('retailer');
  const [endName, setEndName] = useState('');
  const [itemName, setItemName] = useState('');
  const [qty, setQty] = useState('1');
  const [rate, setRate] = useState('0');
  const [busy, setBusy] = useState(false);

  const handleSubmit = useCallback(() => {
    if (!session) return;
    if (!distName.trim()) { toast.error('Distributor name required'); return; }
    if (!itemName.trim()) { toast.error('Item required'); return; }

    const qtyN = Number(qty) || 0;
    const rateN = Number(rate) || 0;
    if (qtyN <= 0 || rateN <= 0) { toast.error('Qty and rate required'); return; }

    setBusy(true);
    const now = new Date().toISOString();
    const id = `ss-${Date.now()}`;
    const all = loadList(session.entity_code);
    const seq = all.length + 1;
    const fy = new Date().getFullYear().toString().slice(-2);

    const record: SecondarySales = {
      id,
      entity_id: session.entity_code,
      secondary_code: `SEC/${fy}-${(Number(fy) + 1).toString().padStart(2, '0')}/${String(seq).padStart(4, '0')}`,
      sale_date: now.slice(0, 10),
      distributor_id: `dist-${distName.replace(/\s+/g, '-').toLowerCase()}`,
      distributor_name: distName,
      end_customer_type: endType,
      end_customer_name: endName || null,
      end_customer_code: null,
      lines: [{
        id: `ssl-${Date.now()}`,
        item_code: itemName.toUpperCase().replace(/\s+/g, '-').slice(0, 20),
        item_name: itemName,
        qty: qtyN,
        uom: 'NOS',
        rate: rateN,
        amount: qtyN * rateN,
      }],
      total_amount: qtyN * rateN,
      capture_mode: 'manual',
      api_request_id: null,
      notes: `Captured via OperixGo by ${session.display_name}`,
      created_at: now,
      updated_at: now,
    };

    all.push(record);
    saveList(session.entity_code, all);
    setBusy(false);
    toast.success(`Secondary sale ${record.secondary_code} captured`);
    navigate('/mobile/salesman');
  }, [session, distName, endType, endName, itemName, qty, rate, navigate]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/salesman')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Secondary Sales</h1>
      </div>

      <Card className="p-3 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Distributor <span className="text-red-500">*</span></Label>
          <Input value={distName} onChange={e => setDistName(e.target.value)} placeholder="Distributor name" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">End Type</Label>
            <Select value={endType} onValueChange={v => setEndType(v as EndCustomerType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(END_CUSTOMER_LABELS).map(([k, lbl]) => (
                  <SelectItem key={k} value={k}>{lbl}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">End Customer</Label>
            <Input value={endName} onChange={e => setEndName(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Item <span className="text-red-500">*</span></Label>
          <Input value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Item name" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Qty</Label>
            <Input type="number" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Rate (₹)</Label>
            <Input type="number" inputMode="decimal" value={rate} onChange={e => setRate(e.target.value)} />
          </div>
        </div>
      </Card>

      <Button className="w-full" disabled={busy} onClick={handleSubmit}>
        {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        Save Secondary Sale
      </Button>
    </div>
  );
}
