/**
 * @file        src/pages/erp/vendor-portal/panels/VendorDcnPanel.tsx
 * @purpose     Vendor Debit / Credit Notes · intent registry (NOT a voucher)
 * @sprint      T-VPG-VendorPortal-Gaps
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import { createDcn, listDcn, updateDcnStatus } from '@/lib/vendor-risk-compliance-engine';
import type { VendorDebitCreditNote } from '@/types/vendor-dcn';

export function VendorDcnPanel(): JSX.Element {
  const entityCode = useMemo(() => {
    try { return localStorage.getItem('active_entity_code') ?? DEFAULT_ENTITY_SHORTCODE; }
    catch { return DEFAULT_ENTITY_SHORTCODE; }
  }, []);
  const [rows, setRows] = useState<VendorDebitCreditNote[]>(() => listDcn(entityCode));
  const [form, setForm] = useState<{ vendor_id: string; type: 'debit' | 'credit'; dcn_no: string; fiscal_year_id: string; reason: string; amount: string }>({
    vendor_id: '', type: 'debit', dcn_no: '', fiscal_year_id: 'FY-2026-27', reason: '', amount: '',
  });

  const submit = (): void => {
    const amt = Number(form.amount);
    if (!form.vendor_id || !form.dcn_no || !Number.isFinite(amt)) { toast.error('Vendor, DCN no & numeric amount required'); return; }
    createDcn(entityCode, {
      vendor_id: form.vendor_id, type: form.type, dcn_no: form.dcn_no,
      fiscal_year_id: form.fiscal_year_id, reason: form.reason,
      lines: [{ id: `ln-${Date.now()}`, description: form.reason || 'DCN line', amount: amt }],
    });
    setRows(listDcn(entityCode));
    setForm({ ...form, dcn_no: '', reason: '', amount: '' });
    toast.success(`${form.type === 'debit' ? 'Debit' : 'Credit'} note created (retention floor: companies_act_8yr)`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-purple-500/15 flex items-center justify-center">
          <FileText className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Vendor Debit / Credit Notes</h1>
          <p className="text-sm text-muted-foreground">Intent registry only · accounting flows through existing voucher path</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New DCN</CardTitle>
          <CardDescription>FY-stamped · retention floor honored at birth</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <Input placeholder="Vendor ID" value={form.vendor_id} onChange={e => setForm({ ...form, vendor_id: e.target.value })} />
          <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as 'debit' | 'credit' })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="debit">Debit</SelectItem>
              <SelectItem value="credit">Credit</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="DCN No" value={form.dcn_no} onChange={e => setForm({ ...form, dcn_no: e.target.value })} />
          <Input placeholder="FY (FY-2026-27)" value={form.fiscal_year_id} onChange={e => setForm({ ...form, fiscal_year_id: e.target.value })} />
          <Input placeholder="Reason" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
          <Input placeholder="Amount (₹)" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
          <div className="md:col-span-6"><Button onClick={submit}><Plus className="h-4 w-4 mr-1" /> Create DCN</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>DCN Register ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No DCNs yet.</p>
          ) : (
            <div className="space-y-2">
              {rows.map(d => (
                <div key={d.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <div>
                    <div className="font-medium">
                      <Badge variant={d.type === 'debit' ? 'destructive' : 'default'}>{d.type}</Badge>
                      <span className="ml-2 font-mono">{d.dcn_no}</span> · {d.reason}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      vendor={d.vendor_id} · {d.fiscal_year_id} · ₹{d.amount.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{d.status}</Badge>
                    {d.status === 'draft' && (
                      <Button size="sm" variant="outline" onClick={() => { updateDcnStatus(entityCode, d.id, 'approved'); setRows(listDcn(entityCode)); }}>
                        Approve
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
