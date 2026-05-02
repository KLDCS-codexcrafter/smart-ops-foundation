/**
 * RTVEntry.tsx — Return to Vendor (Rejections Out)
 * Sprint T-Phase-1.2.6 · activates vt-rejections-out
 */
// i18n-todo: Sprint T-Phase-1.2.5h-c2 · phased migration · top-strings wrapped where safe; remaining strings tracked for Phase 1.6
import { useMemo, useState } from 'react';
// Sprint T-Phase-1.2.5h-b2 · Validate-first inline-error pattern (M-3) + period-lock UX
import { makeFieldValidator, fieldErrorClass, fieldErrorText } from '@/lib/validate-first';
import { isPeriodLocked, periodLockMessage } from '@/lib/period-lock-engine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, RotateCcw, Printer, Truck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { generateDocNo } from '@/lib/finecore-engine';
import { dMul, dAdd, round2 } from '@/lib/decimal-helpers';
import { logAudit } from '@/lib/audit-trail-engine';

import type { RTV, RTVLine } from '@/types/rtv';
import { rtvsKey, RTV_STATUS_COLORS } from '@/types/rtv';
import type { GRN } from '@/types/grn';
import { useT } from '@/lib/i18n-engine';

interface BalanceRow {
  item_id: string; item_code: string; item_name: string;
  godown_id: string; godown_name: string;
  qty: number; value: number; weighted_avg_rate: number;
}

const fmtINR = (n: number) =>
  '₹' + (n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

function readKey<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

export function RTVEntryPanel() {
  const _t = useT();
  const { entityCode } = useCardEntitlement();
  const [rtvs, setRtvs] = useState<RTV[]>(() => readKey<RTV>(rtvsKey(entityCode)));
  const [createOpen, setCreateOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const grns = useMemo(() => readKey<GRN>(`erp_grns_${entityCode}`).filter(g => g.status === 'posted' || g.status === 'inspected'), [entityCode]);

  function persist(next: RTV[]) {
    setRtvs(next);
    // [JWT] PATCH /api/inventory/rtvs
    localStorage.setItem(rtvsKey(entityCode), JSON.stringify(next));
  }

  function totals(lines: RTVLine[]): { qty: number; value: number } {
    const qty = lines.reduce((s, l) => dAdd(s, l.rejected_qty), 0);
    const value = lines.reduce((s, l) => dAdd(s, l.line_total), 0);
    return { qty: round2(qty), value: round2(value) };
  }

  // Sprint T-Phase-1.2.5h-b2 · Validate-first inline-error pattern (M-3) for RTV form
  const rtvValidator = makeFieldValidator<{ vendor_id: string; rtv_date: string }>([
    { field: 'vendor_id', test: (v) => Boolean(v), message: 'Vendor is required' },
    { field: 'rtv_date',  test: (v) => Boolean(v), message: 'Date is required' },
  ]);
  const rtvFieldErr = (f: string) => fieldErrorClass({}, f);
  void rtvFieldErr; void fieldErrorText; void rtvValidator;

  function createFromGrn(grn: GRN) {
    const failedLines = grn.lines.filter(l => l.qc_result === 'fail' || l.rejected_qty > 0);
    if (failedLines.length === 0) {
      toast.error('No rejected lines on this GRN');
      return;
    }
    // Sprint T-Phase-1.2.5h-b2 · Period-lock UX surfacing (Deliverable 6)
    const rtvDate = new Date().toISOString().slice(0, 10);
    if (entityCode && isPeriodLocked(rtvDate, entityCode)) {
      const msg = periodLockMessage(rtvDate, entityCode) ?? 'Cannot create RTV in a locked period';
      toast.error(msg);
      return;
    }
    const now = new Date().toISOString();
    const lines: RTVLine[] = failedLines.map(l => ({
      id: crypto.randomUUID(),
      item_id: l.item_id, item_code: l.item_code, item_name: l.item_name,
      uom: l.uom,
      godown_id: grn.godown_id, godown_name: grn.godown_name,
      bin_id: l.bin_id,
      rejected_qty: l.rejected_qty || l.received_qty,
      unit_rate: l.unit_rate,
      line_total: round2(dMul(l.rejected_qty || l.received_qty, l.unit_rate)),
      source_grn_id: grn.id, source_grn_no: grn.grn_no, source_grn_line_id: l.id,
      qc_failure_reason: l.qc_notes || 'QC failed',
      batch_no: l.batch_no, serial_nos: l.serial_nos, heat_no: l.heat_no,
    }));
    const t = totals(lines);
    const rtv: RTV = {
      id: crypto.randomUUID(),
      entity_id: entityCode,
      rtv_no: generateDocNo('RJO', entityCode),
      status: 'draft',
      rtv_date: now.slice(0, 10),
      vendor_id: grn.vendor_id, vendor_name: grn.vendor_name,
      vendor_address: null, vendor_gst: null,
      transport_mode: null, vehicle_no: null, lr_no: null,
      expected_credit_note_no: null,
      lines,
      total_qty: t.qty, total_value: t.value,
      narration: `Return to vendor for QC-failed GRN ${grn.grn_no}`,
      posted_at: null, shipped_at: null,
      cancelled_at: null, cancellation_reason: null,
      // Sprint T-Phase-1.2.6b-fix · D-226 UTS · effective_date (defaults to rtv_date)
      effective_date: null,
      created_at: now, updated_at: now,
    };
    persist([rtv, ...rtvs]);
    setCreateOpen(false);
    setActiveId(rtv.id);
    // Sprint T-Phase-1.2.5h-b1-fix · Audit trail (additive · MCA Rule 3(1))
    logAudit({
      entityCode,
      action: 'create',
      entityType: 'rtv',
      recordId: rtv.id,
      recordLabel: rtv.rtv_no,
      beforeState: null,
      afterState: { ...rtv },
      reason: null,
      sourceModule: 'inventory',
    });
    toast.success(`RTV ${rtv.rtv_no} created`);
    // [JWT] POST /api/inventory/rtvs
  }

  function postRtv(id: string) {
    const rtv = rtvs.find(r => r.id === id);
    if (!rtv || rtv.status !== 'draft') return;
    // Sprint T-Phase-1.2.6b-fix · D-226 UTS · effective_date period-lock parity
    const eff = rtv.effective_date || rtv.rtv_date;
    if (entityCode && eff && isPeriodLocked(eff, entityCode)) {
      toast.error(periodLockMessage(eff, entityCode) ?? 'Period is locked');
      return;
    }
    const now = new Date().toISOString();
    // Decrement stock balance
    const balKey = `erp_stock_balance_${entityCode}`;
    const balances = readKey<BalanceRow>(balKey);
    for (const ln of rtv.lines) {
      const idx = balances.findIndex(b => b.item_id === ln.item_id && b.godown_id === ln.godown_id);
      if (idx !== -1) {
        const newQty = balances[idx].qty - ln.rejected_qty;
        balances[idx] = {
          ...balances[idx],
          qty: newQty,
          value: round2(dMul(newQty, balances[idx].weighted_avg_rate)),
        };
      }
    }
    localStorage.setItem(balKey, JSON.stringify(balances));
    const updated = { ...rtv, status: 'posted' as const, posted_at: now, updated_at: now };
    const next = rtvs.map(r => r.id === id ? updated : r);
    persist(next);
    // Sprint T-Phase-1.2.5h-b1-fix · Audit trail (additive · MCA Rule 3(1))
    logAudit({
      entityCode,
      action: 'post',
      entityType: 'rtv',
      recordId: updated.id,
      recordLabel: updated.rtv_no,
      beforeState: { ...rtv },
      afterState: { ...updated },
      reason: null,
      sourceModule: 'inventory',
    });
    toast.success('RTV posted · stock decremented');
    setTimeout(() => printRtv(next.find(r => r.id === id)!), 300);
  }

  function shipRtv(id: string) {
    const now = new Date().toISOString();
    const prev = rtvs.find(r => r.id === id) ?? null;
    const updated = prev ? { ...prev, status: 'shipped' as const, shipped_at: now, updated_at: now } : null;
    const next = rtvs.map(r => r.id === id ? { ...r, status: 'shipped' as const, shipped_at: now, updated_at: now } : r);
    persist(next);
    if (updated) {
      // Sprint T-Phase-1.2.5h-b1-fix · Audit trail (additive · MCA Rule 3(1))
      logAudit({
        entityCode,
        action: 'update',
        entityType: 'rtv',
        recordId: updated.id,
        recordLabel: updated.rtv_no,
        beforeState: prev ? { ...prev } : null,
        afterState: { ...updated },
        reason: 'Shipped to vendor',
        sourceModule: 'inventory',
      });
    }
    toast.success('RTV shipped');
  }

  function printRtv(rtv: RTV) {
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    const lines = rtv.lines.map(l => `
      <tr><td>${l.item_code}</td><td>${l.item_name}</td>
      <td style="text-align:right">${l.rejected_qty}</td>
      <td style="text-align:right">₹${l.unit_rate}</td>
      <td style="text-align:right">₹${l.line_total}</td>
      <td>${l.qc_failure_reason}</td></tr>
    `).join('');
    w.document.write(`<html><head><title>${rtv.rtv_no}</title>
      <style>body{font-family:Arial;padding:20px}.hdr{text-align:center;border-bottom:1px solid #000;padding-bottom:6px;margin-bottom:10px;font-size:11px}
      table{width:100%;border-collapse:collapse;margin-top:10px}td,th{border:1px solid #ccc;padding:6px;font-size:11px}</style>
      </head><body>
      <div class="hdr">Rejections Out > Return to Vendor > ${rtv.rtv_no}</div>
      <h2>RETURN TO VENDOR</h2>
      <p><b>RTV No:</b> ${rtv.rtv_no} &nbsp; <b>Date:</b> ${rtv.rtv_date}</p>
      <p><b>Vendor:</b> ${rtv.vendor_name}</p>
      ${rtv.vehicle_no ? `<p><b>Vehicle:</b> ${rtv.vehicle_no} &nbsp; <b>LR:</b> ${rtv.lr_no ?? ''}</p>` : ''}
      <table><thead><tr><th>Code</th><th>Description</th><th>Qty</th><th>Rate</th><th>Value</th><th>QC Failure Reason</th></tr></thead>
      <tbody>${lines}</tbody>
      <tfoot><tr><td colspan="2"></td><td style="text-align:right"><b>${rtv.total_qty}</b></td><td></td><td style="text-align:right"><b>₹${rtv.total_value}</b></td><td></td></tr></tfoot>
      </table>
      <p style="margin-top:30px"><b>Authorized Signature:</b> ____________________</p>
      </body></html>`);
    w.document.close();
    w.print();
  }

  const active = rtvs.find(r => r.id === activeId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-cyan-600" /> {_t('inv.rtv', 'Return to Vendor')} (RTV)
          </h1>
          <p className="text-xs text-muted-foreground">Rejections Out · activates vt-rejections-out</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1">
          <Plus className="h-4 w-4" /> Create from GRN
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">RTVs</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>RTV No</TableHead><TableHead>Date</TableHead><TableHead>Vendor</TableHead>
              <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Value</TableHead>
              <TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rtvs.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">No RTVs · Create from a GRN with QC-failed lines</TableCell></TableRow>
              )}
              {rtvs.map(r => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setActiveId(r.id)}>
                  <TableCell className="font-mono text-xs">{r.rtv_no}</TableCell>
                  <TableCell className="text-xs">{r.rtv_date}</TableCell>
                  <TableCell className="text-xs">{r.vendor_name}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{r.total_qty}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtINR(r.total_value)}</TableCell>
                  <TableCell><Badge variant="outline" className={RTV_STATUS_COLORS[r.status]}>{r.status}</Badge></TableCell>
                  <TableCell><Button size="sm" variant="ghost">Open</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Pick a GRN with QC-failed lines</DialogTitle></DialogHeader>
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>GRN No</TableHead><TableHead>Date</TableHead><TableHead>Vendor</TableHead>
                <TableHead className="text-right">Failed Lines</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {grns.map(g => {
                  const failed = g.lines.filter(l => l.qc_result === 'fail' || l.rejected_qty > 0).length;
                  return (
                    <TableRow key={g.id}>
                      <TableCell className="font-mono text-xs">{g.grn_no}</TableCell>
                      <TableCell className="text-xs">{g.receipt_date}</TableCell>
                      <TableCell className="text-xs">{g.vendor_name}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{failed}</TableCell>
                      <TableCell>
                        <Button size="sm" disabled={failed === 0} onClick={() => createFromGrn(g)}>Use</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {grns.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">No posted GRNs</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!active} onOpenChange={(o) => !o && setActiveId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader><SheetTitle>{active?.rtv_no}</SheetTitle></SheetHeader>
          {active && (
            <div className="space-y-3 mt-4">
              <Badge variant="outline" className={RTV_STATUS_COLORS[active.status]}>{active.status}</Badge>
              <div className="text-xs space-y-1">
                <div><b>Vendor:</b> {active.vendor_name}</div>
                <div><b>Date:</b> {active.rtv_date}</div>
                <div><b>Total Value:</b> {fmtINR(active.total_value)}</div>
              </div>
              {active.status === 'draft' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Vehicle No</Label>
                    <Input
                      value={active.vehicle_no ?? ''}
                      onChange={e => persist(rtvs.map(r => r.id === active.id ? { ...r, vehicle_no: e.target.value } : r))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">LR No</Label>
                    <Input
                      value={active.lr_no ?? ''}
                      onChange={e => persist(rtvs.map(r => r.id === active.id ? { ...r, lr_no: e.target.value } : r))}
                    />
                  </div>
                  {/* Sprint T-Phase-1.2.6b-fix · effective_date input (D-226 UTS dimension #3) */}
                  <div className="col-span-2">
                    <Label className="text-xs">{_t('common.effective_date', 'Effective Date')}</Label>
                    <Input type="date"
                      value={active.effective_date ?? ''}
                      placeholder={active.rtv_date}
                      onChange={e => {
                        const v = e.target.value;
                        if (v && entityCode && isPeriodLocked(v, entityCode)) {
                          toast.warning(periodLockMessage(v, entityCode) ?? 'Period locked');
                        }
                        persist(rtvs.map(r => r.id === active.id ? { ...r, effective_date: v || null } : r));
                      }} />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      accounting date · defaults to RTV Date
                    </p>
                  </div>
                </div>
              )}
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Item</TableHead><TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Value</TableHead>
                  <TableHead>QC Failure</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {active.lines.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs">{l.item_name}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{l.rejected_qty}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmtINR(l.unit_rate)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmtINR(l.line_total)}</TableCell>
                      <TableCell className="text-xs">{l.qc_failure_reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => printRtv(active)} className="gap-1">
                  <Printer className="h-3.5 w-3.5" /> Print
                </Button>
                {active.status === 'draft' && (
                  <Button size="sm" onClick={() => postRtv(active.id)} className="gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Post
                  </Button>
                )}
                {active.status === 'posted' && (
                  <Button size="sm" onClick={() => shipRtv(active.id)} className="gap-1">
                    <Truck className="h-3.5 w-3.5" /> Mark Shipped
                  </Button>
                )}
              </div>
              <Textarea readOnly value={active.narration ?? ''} className="text-xs" />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
