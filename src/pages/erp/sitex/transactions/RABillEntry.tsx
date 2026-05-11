/**
 * @file        src/pages/erp/sitex/transactions/RABillEntry.tsx
 * @purpose     RA Bill entry · sub-contractor selector · manual lines (Q-LOCK-5b BOQ deferred)
 * @sprint      T-Phase-1.A.15a · Q-LOCK-4a · Block B.4
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Receipt } from 'lucide-react';
import {
  createRABill, addRABillLineItem, listRABillsBySite, listRABillLineItems,
  submitForApproval,
} from '@/lib/sitex-ra-bill-engine';
import { listSites } from '@/lib/sitex-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

interface Props { onNavigate: (m: string) => void }

export function RABillEntry({ onNavigate: _onNavigate }: Props): JSX.Element {
  const entity = DEFAULT_ENTITY_SHORTCODE;
  const sites = useMemo(() => listSites(entity), [entity]);
  const [siteId, setSiteId] = useState<string>(sites[0]?.id ?? '');
  const [vendorName, setVendorName] = useState<string>('');
  const [billNo, setBillNo] = useState<string>('');
  const [periodFrom, setPeriodFrom] = useState<string>('');
  const [periodTo, setPeriodTo] = useState<string>('');
  const [currentBillId, setCurrentBillId] = useState<string | null>(null);
  const [desc, setDesc] = useState('');
  const [qty, setQty] = useState('');
  const [rate, setRate] = useState('');
  const [refresh, setRefresh] = useState(0);

  const createBill = (): void => {
    if (!siteId || !vendorName || !billNo) return;
    const res = createRABill(entity, {
      site_id: siteId,
      vendor_id: vendorName,
      vendor_type: 'sub_contractor',
      bill_no: billNo,
      period_from: periodFrom,
      period_to: periodTo,
    });
    if (res.ra_bill_id) setCurrentBillId(res.ra_bill_id);
  };

  const addLine = (): void => {
    if (!currentBillId) return;
    addRABillLineItem(entity, currentBillId, {
      description: desc,
      uom: 'nos',
      quantity_this_period: Number(qty),
      rate_per_unit: Number(rate),
      notes: '',
    });
    setDesc(''); setQty(''); setRate('');
    setRefresh((x) => x + 1);
  };

  const bills = siteId ? listRABillsBySite(entity, siteId) : [];
  const lines = currentBillId ? listRABillLineItems(entity, currentBillId) : [];

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Receipt className="h-6 w-6 text-amber-600" />
        <h1 className="text-2xl font-bold">RA Bill Entry · Sub-Contractor Running Account</h1>
      </div>

      <Card className="p-6 space-y-3">
        <h2 className="font-semibold">New RA Bill</h2>
        <select className="w-full border rounded-lg px-3 py-2 bg-background"
          value={siteId} onChange={(e) => setSiteId(e.target.value)}>
          <option value="">Select site...</option>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.site_code} · {s.site_name}</option>)}
        </select>
        <Input placeholder="Sub-contractor name/id" value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
        <Input placeholder="Bill No (e.g. RA-1)" value={billNo} onChange={(e) => setBillNo(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} />
          <Input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} />
        </div>
        <Button onClick={createBill}>Create Draft</Button>
      </Card>

      {currentBillId && (
        <Card className="p-6 space-y-3">
          <h2 className="font-semibold">Add Line Items · Bill {currentBillId}</h2>
          <Input placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Qty" type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
            <Input placeholder="Rate ₹" type="number" value={rate} onChange={(e) => setRate(e.target.value)} />
          </div>
          <Button onClick={addLine}>Add Line</Button>
          <div className="mt-3 text-sm">
            {lines.map((l) => (
              <div key={l.id} className="flex justify-between border-b py-1">
                <span>{l.description} · {l.quantity_this_period} {l.uom} × ₹{l.rate_per_unit}</span>
                <span className="font-mono">₹{l.amount.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
          <Button variant="outline" onClick={() => { submitForApproval(entity, currentBillId, 'demo-user'); setRefresh((x) => x + 1); }}>
            Submit for Approval
          </Button>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="font-semibold mb-3">RA Bills for this Site</h2>
        {bills.length === 0 ? (
          <p className="text-sm text-muted-foreground">No RA bills yet.</p>
        ) : bills.map((b) => (
          <div key={b.id} className="flex justify-between border-b py-2 text-sm">
            <div>{b.bill_no} · {b.period_from} → {b.period_to}</div>
            <div className="font-mono">₹{b.total_value.toLocaleString('en-IN')} · {b.status}</div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground mt-2">Refresh tick: {refresh}</p>
      </Card>
    </div>
  );
}
