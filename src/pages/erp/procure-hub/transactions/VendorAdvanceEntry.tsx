/**
 * @file        VendorAdvanceEntry.tsx
 * @sprint      T-Phase-2.HK-5-2 · Block H · D-NEW-GP
 * @purpose     Vendor Advance entry form · creates a new advance against optional PO
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { loadPartyMaster } from '@/lib/party-master-engine';
import { listPurchaseOrders } from '@/lib/po-management-engine';
import { createVendorAdvance } from '@/lib/vendor-advance-engine';
import { logAudit } from '@/lib/audit-trail-engine';

export function VendorAdvanceEntry(): JSX.Element {
  const { entityCode } = useEntityCode();
  const vendors = useMemo(
    () => loadPartyMaster(entityCode).filter((p) => p.party_type === 'vendor' || p.party_type === 'both'),
    [entityCode],
  );
  const pos = useMemo(() => listPurchaseOrders(entityCode), [entityCode]);

  const [vendorId, setVendorId] = useState<string>('');
  const [poId, setPoId] = useState<string>('none');
  const [amount, setAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const handleSubmit = (): void => {
    if (!vendorId) { toast.error('Select a vendor'); return; }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }

    const vendor = vendors.find((v) => v.id === vendorId);
    if (!vendor) { toast.error('Vendor not found'); return; }

    const po = poId !== 'none' ? pos.find((p) => p.id === poId) : null;

    const advance = createVendorAdvance({
      entity_id: entityCode,
      vendor_id: vendor.id,
      vendor_name: vendor.party_name,
      po_id: po?.id ?? null,
      po_no: po?.po_no ?? null,
      advance_amount: amt,
      notes: notes || undefined,
    });

    // P8.3.T1 · row-68 C-FIXED · vendor advance is a payment-side (treasury) record:
    // createVendorAdvance writes status:'paid' + advance_amount to erp_vendor_advances_<entity>,
    // i.e. a treasury outflow staged for later invoice adjustment. Literal: treasury_event.
    logAudit({
      entityCode,
      action: 'create',
      entityType: 'treasury_event',
      recordId: advance.id,
      recordLabel: `Vendor Advance · ${advance.vendor_name} · ₹${amt.toLocaleString('en-IN')}${advance.po_no ? ` · PO ${advance.po_no}` : ''}`,
      beforeState: null,
      afterState: advance as unknown as Record<string, unknown>,
      reason: 'vendor_advance_paid',
      sourceModule: 'VendorAdvanceEntry',
    });

    toast.success(`Vendor advance of ₹${amt.toLocaleString('en-IN')} recorded`);
    setVendorId(''); setPoId('none'); setAmount(''); setNotes('');
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" /> New Vendor Advance
        </h1>
        <p className="text-sm text-muted-foreground">
          N1 · Record advance paid to vendor · auto-tracks adjustment against invoices.
        </p>
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-sm">Advance Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Vendor *</Label>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
              <SelectContent>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.party_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Linked PO (optional)</Label>
            <Select value={poId} onValueChange={setPoId}>
              <SelectTrigger><SelectValue placeholder="Select PO (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— No PO link —</SelectItem>
                {pos.slice(0, 50).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.po_no} · {p.vendor_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Advance Amount (₹) *</Label>
            <Input
              type="number" inputMode="decimal" value={amount}
              onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <Button onClick={handleSubmit} className="w-full">Record Advance</Button>
        </CardContent>
      </Card>
    </div>
  );
}
