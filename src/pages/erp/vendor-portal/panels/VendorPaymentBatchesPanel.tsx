/**
 * @file        src/pages/erp/vendor-portal/panels/VendorPaymentBatchesPanel.tsx
 * @purpose     Vendor payment batches · GROUPS payment requisitions · NO duplicate accounting
 * @sprint      T-VPG-VendorPortal-Gaps
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Wallet, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import {
  createPaymentBatch, listPaymentBatches, updatePaymentBatchStatus,
} from '@/lib/vendor-risk-compliance-engine';
import { listRequisitions } from '@/lib/payment-requisition-engine';
import type { VendorPaymentBatch } from '@/types/vendor-payment-batch';

export function VendorPaymentBatchesPanel(): JSX.Element {
  const entityCode = useMemo(() => {
    try { return localStorage.getItem('active_entity_code') ?? DEFAULT_ENTITY_SHORTCODE; }
    catch { return DEFAULT_ENTITY_SHORTCODE; }
  }, []);
  const reqs = useMemo(() => listRequisitions(entityCode), [entityCode]);
  const [batches, setBatches] = useState<VendorPaymentBatch[]>(() => listPaymentBatches(entityCode));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchNo, setBatchNo] = useState('');
  const [fy, setFy] = useState('FY-2026-27');

  const toggle = (id: string): void => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const submit = (): void => {
    if (!batchNo || selected.size === 0) { toast.error('Batch no & at least one requisition required'); return; }
    createPaymentBatch(entityCode, {
      batch_no: batchNo, fiscal_year_id: fy, requisition_ids: Array.from(selected),
    });
    setBatches(listPaymentBatches(entityCode));
    setSelected(new Set());
    setBatchNo('');
    toast.success('Batch created (consumes existing requisitions · no duplicate accounting)');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-green-500/15 flex items-center justify-center">
          <Wallet className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Payment Batches</h1>
          <p className="text-sm text-muted-foreground">Group existing payment requisitions for bulk release</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Batch</CardTitle>
          <CardDescription>Select requisitions · FY-stamped · companies_act_8yr retention floor</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input placeholder="Batch no" value={batchNo} onChange={e => setBatchNo(e.target.value)} />
            <Input placeholder="FY" value={fy} onChange={e => setFy(e.target.value)} />
            <Button onClick={submit}><Plus className="h-4 w-4 mr-1" /> Create batch ({selected.size})</Button>
          </div>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {reqs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payment requisitions in this entity.</p>
            ) : reqs.map(r => (
              <label key={r.id} className="flex items-center gap-3 rounded-md border p-2 text-sm cursor-pointer">
                <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                <span className="font-mono text-xs">{r.id}</span>
                <span className="ml-auto font-mono">₹{Number(r.amount).toLocaleString('en-IN')}</span>
                <Badge variant="outline">{r.status}</Badge>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Batches ({batches.length})</CardTitle></CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No batches yet.</p>
          ) : (
            <div className="space-y-2">
              {batches.map(b => (
                <div key={b.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <div>
                    <div className="font-medium font-mono">{b.batch_no}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {b.fiscal_year_id} · {b.requisition_ids.length} req · ₹{b.total_amount.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{b.status}</Badge>
                    {b.status === 'draft' && (
                      <Button size="sm" variant="outline" onClick={() => { updatePaymentBatchStatus(entityCode, b.id, 'approved'); setBatches(listPaymentBatches(entityCode)); }}>Approve</Button>
                    )}
                    {b.status === 'approved' && (
                      <Button size="sm" onClick={() => { updatePaymentBatchStatus(entityCode, b.id, 'released'); setBatches(listPaymentBatches(entityCode)); }}>Release</Button>
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
