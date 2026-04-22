/**
 * TODO (T10-pre.1+): Integrate TallyVoucherHeader + PartyDispatchDialog +
 * ItemAllocationDialog + ItemParametersDialog into this shared shell so
 * subsequent voucher types (Receipt, Payment, JV, etc.) inherit the pattern
 * without re-wiring.
 */
/**
 * VoucherFormShell.tsx — Shared voucher entry form shell
 * Renders narration + optional terms/payment template fields in a collapsible section
 * [JWT] Voucher CRUD will move to /api/accounting/vouchers
 */
import { useState, useMemo } from 'react';
import { Save, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { onEnterNext } from '@/lib/keyboard';
import { TemplateField } from '@/components/finecore/TemplateField';
import { resolveVars, vouchersKey } from '@/lib/finecore-engine';
import type { Voucher } from '@/types/voucher';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';

interface VoucherFormShellProps {
  voucherTypeName: string;
  title: string;
  showTerms: boolean;
  showPaymentTerms: boolean;
  defaultOpen?: boolean;
  entityCode: string;
}

export function VoucherFormPanel({
  voucherTypeName, title, showTerms, showPaymentTerms, defaultOpen = false, entityCode,
}: VoucherFormShellProps) {
  const [form, setForm] = useState<Partial<Voucher>>({
    voucher_type_name: voucherTypeName,
    date: new Date().toISOString().split('T')[0],
    party_name: '',
    ref_voucher_no: '',
    vendor_bill_no: '',
    net_amount: 0,
    narration: '',
    terms_conditions: '',
    payment_enforcement: '',
    payment_instrument: '',
    from_ledger_name: '',
    to_ledger_name: '',
    from_godown_name: '',
    to_godown_name: '',
    status: 'draft',
  });
  const [collapseOpen, setCollapseOpen] = useState(defaultOpen);

  const vars = useMemo(() => resolveVars(form, null, null, 'Current User'), [
    form.party_name, form.date, form.net_amount, form.ref_voucher_no,
    form.vendor_bill_no, form.payment_instrument,
    form.from_ledger_name, form.to_ledger_name,
    form.from_godown_name, form.to_godown_name,
  ]);

  const handleSave = () => {
    // [JWT] POST /api/accounting/vouchers
    const key = vouchersKey(entityCode);
    try {
      // [JWT] GET /api/accounting/vouchers
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const now = new Date().toISOString();
      const voucher: Voucher = {
        id: `v-${Date.now()}`,
        voucher_no: `${voucherTypeName.replace(/\s/g, '')}-${String(existing.length + 1).padStart(4, '0')}`,
        voucher_type_id: '',
        voucher_type_name: voucherTypeName,
        base_voucher_type: 'Sales',
        entity_id: '',
        date: form.date ?? now.split('T')[0],
        party_name: form.party_name ?? '',
        ref_voucher_no: form.ref_voucher_no ?? '',
        vendor_bill_no: form.vendor_bill_no ?? '',
        net_amount: form.net_amount ?? 0,
        narration: form.narration ?? '',
        terms_conditions: form.terms_conditions ?? '',
        payment_enforcement: form.payment_enforcement ?? '',
        payment_instrument: form.payment_instrument ?? '',
        from_ledger_name: form.from_ledger_name ?? '',
        to_ledger_name: form.to_ledger_name ?? '',
        from_godown_name: form.from_godown_name ?? '',
        to_godown_name: form.to_godown_name ?? '',
        ledger_lines: [],
        gross_amount: 0,
        total_discount: 0,
        total_taxable: 0,
        total_cgst: 0,
        total_sgst: 0,
        total_igst: 0,
        total_cess: 0,
        total_tax: 0,
        round_off: 0,
        tds_applicable: false,
        status: 'draft',
        created_by: 'current-user',
        created_at: now,
        updated_at: now,
      };
      // [JWT] POST /api/accounting/vouchers
      localStorage.setItem(key, JSON.stringify([...existing, voucher]));
      toast.success(`${voucherTypeName} saved as draft`);
    } catch { toast.error('Failed to save voucher'); }
  };

  const update = (field: keyof Voucher, val: string | number) =>
    setForm(f => ({ ...f, [field]: val }));

  return (
    <div data-keyboard-form className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">Create a new {voucherTypeName}</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4" data-keyboard-form>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={form.date ?? ''} onChange={e => update('date', e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Party Name</Label>
              <Input value={form.party_name ?? ''} onChange={e => update('party_name', e.target.value)} onKeyDown={onEnterNext} placeholder="Party name" />
            </div>
            <div>
              <Label className="text-xs">Amount (₹)</Label>
              <Input type="number" value={form.net_amount ?? 0} onChange={e => update('net_amount', Number(e.target.value))} onKeyDown={onEnterNext} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Reference No.</Label>
              <Input value={form.ref_voucher_no ?? ''} onChange={e => update('ref_voucher_no', e.target.value)} onKeyDown={onEnterNext} placeholder="Ref / Bill No." />
            </div>
            <div>
              <Label className="text-xs">Payment Mode</Label>
              <Input value={form.payment_instrument ?? ''} onChange={e => update('payment_instrument', e.target.value)} onKeyDown={onEnterNext} placeholder="NEFT / RTGS / Cash" />
            </div>
          </div>
          {(voucherTypeName === 'Contra' || voucherTypeName === 'Journal') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">From Ledger</Label>
                <Input value={form.from_ledger_name ?? ''} onChange={e => update('from_ledger_name', e.target.value)} onKeyDown={onEnterNext} />
              </div>
              <div>
                <Label className="text-xs">To Ledger</Label>
                <Input value={form.to_ledger_name ?? ''} onChange={e => update('to_ledger_name', e.target.value)} onKeyDown={onEnterNext} />
              </div>
            </div>
          )}
          {(voucherTypeName === 'Stock Transfer' || voucherTypeName === 'Delivery Note' || voucherTypeName === 'Receipt Note') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">From Godown</Label>
                <Input value={form.from_godown_name ?? ''} onChange={e => update('from_godown_name', e.target.value)} onKeyDown={onEnterNext} />
              </div>
              <div>
                <Label className="text-xs">To Godown</Label>
                <Input value={form.to_godown_name ?? ''} onChange={e => update('to_godown_name', e.target.value)} onKeyDown={onEnterNext} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Narration & Print Settings (Collapsible) ── */}
      <Collapsible open={collapseOpen} onOpenChange={setCollapseOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between px-6 py-3 text-sm font-medium text-foreground hover:bg-accent/50 transition-colors rounded-t-lg">
              Narration & Print Settings
              <ChevronDown className={`h-4 w-4 transition-transform ${collapseOpen ? 'rotate-180' : ''}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <TemplateField
                type="narration"
                voucherTypeName={voucherTypeName}
                value={form.narration ?? ''}
                onChange={v => setForm(f => ({ ...f, narration: v }))}
                label="Narration"
                vars={vars}
                rows={2}
              />
              {showTerms && (
                <TemplateField
                  type="terms_conditions"
                  voucherTypeName={voucherTypeName}
                  value={form.terms_conditions ?? ''}
                  onChange={v => setForm(f => ({ ...f, terms_conditions: v }))}
                  label="Terms & Conditions"
                  vars={vars}
                  rows={5}
                />
              )}
              {showPaymentTerms && (
                <TemplateField
                  type="payment_enforcement"
                  voucherTypeName={voucherTypeName}
                  value={form.payment_enforcement ?? ''}
                  onChange={v => setForm(f => ({ ...f, payment_enforcement: v }))}
                  label="Payment Terms"
                  vars={vars}
                  rows={3}
                />
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ── Actions ── */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => toast.info('Discarded')}>Cancel</Button>
        <Button data-primary onClick={handleSave}><Save className="h-4 w-4 mr-2" />Save Draft</Button>
        <Button data-primary variant="default" onClick={() => { handleSave(); toast.success('Posted'); }}>
          <Send className="h-4 w-4 mr-2" />Post
        </Button>
      </div>
    </div>
  );
}

export default function VoucherFormShell(props: VoucherFormShellProps) {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader breadcrumbs={[
          { label: 'Accounting', href: '/erp/accounting' },
          { label: props.title },
        ]} showDatePicker={false} showCompany={false} />
        <main>
          <VoucherFormPanel {...props} />
        </main>
      </div>
    </SidebarProvider>
  );
}
