/**
 * @file        src/pages/erp/comply360/payments/StatutoryPaymentsPage.tsx
 * @purpose     Sprint 78b · Statutory Payments mega-menu shell · consumes comply360-statutory-payments-engine.
 *              Payment-due register + auto-compute + Mark Paid / Prepare Challan handoff stub.
 * @sprint      Sprint 78b · T-Phase-5.A.1.10-PASS-B · Block 4
 * @decisions   D-S69-1 (NATIVE) · DP-S78-1 (payments = mega-menu) · DP-S78-5 (challan handoff to S79)
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';
import {
  loadPayments,
  computePaymentDue,
  recordPayment,
  prepareChallan,
  type StatutoryPayment,
  type PaymentType,
  type PaymentMode,
} from '@/lib/comply360-statutory-payments-engine';

const ENTITIES = ['DEMO-CORP-01', 'ACME-PVT-LTD', 'BHARAT-AGRO-LLP'];
const FY = '2025-26';
const PAYMENT_TYPES: PaymentType[] = ['gst', 'tds', 'esi', 'pf', 'income-tax-advance', 'late-fee', 'interest', 'penalty'];
const PAYMENT_MODES: PaymentMode[] = ['net-banking', 'neft-rtgs', 'cheque', 'cash', 'challan'];

function inr(paise: number): string {
  return `₹ ${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function fmt(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getUTCDate()).padStart(2, '0')} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function statusClass(s: StatutoryPayment['status']): string {
  switch (s) {
    case 'paid': return 'text-success';
    case 'overdue': return 'text-destructive';
    case 'partial': return 'text-warning';
    default: return 'text-muted-foreground';
  }
}

export default function StatutoryPaymentsPage(): JSX.Element {
  const [entity, setEntity] = useState<string>(ENTITIES[0]);
  const [refresh, setRefresh] = useState<number>(0);
  const [calcType, setCalcType] = useState<PaymentType>('gst');
  const [calcPeriod, setCalcPeriod] = useState<string>('2026-04');
  const [mode, setMode] = useState<PaymentMode>('net-banking');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const payments = useMemo<StatutoryPayment[]>(() => loadPayments(entity, FY), [entity, refresh]);

  const totalDue = payments
    .filter((p) => p.status === 'due' || p.status === 'overdue' || p.status === 'partial')
    .reduce((s, p) => s + p.amount_inr, 0);

  const onCompute = (): void => {
    const p = computePaymentDue(entity, calcType, calcPeriod);
    toast.success(`Computed ${calcType.toUpperCase()} for ${calcPeriod} · ${inr(p.amount_inr)}`);
    setRefresh((n) => n + 1);
  };

  const onMarkPaid = (p: StatutoryPayment): void => {
    const ref = `CHL-${Date.now().toString().slice(-8)}`;
    recordPayment(entity, p.id, p.amount_inr, mode, ref);
    toast.success(`Marked paid · ref ${ref}`);
    setRefresh((n) => n + 1);
  };

  const onPrepareChallan = (p: StatutoryPayment): void => {
    const payload = prepareChallan(p);
    toast.success(`Challan handoff ready · portal ${payload.handoff_payload.portal_endpoint}`);
  };

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Wallet className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Statutory Payments</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Central payment-due register · GST · TDS · ESI · PF · Income Tax advance · late-fee · interest. Challan vault handoff stubbed for Sprint 79.
          </p>
        </div>
        <Card className="px-3 py-2 flex items-center gap-2">
          <IndianRupee className="h-4 w-4 text-warning" />
          <div className="text-[11px] text-muted-foreground">Total open</div>
          <div className="font-mono font-semibold">{inr(totalDue)}</div>
        </Card>
      </div>

      <Card className="p-3 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-[11px] font-medium block mb-1">Entity</label>
          <select className="text-xs bg-background border rounded-md px-2 py-1" value={entity} onChange={(e) => setEntity(e.target.value)}>
            {ENTITIES.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-medium block mb-1">Payment Type</label>
          <select className="text-xs bg-background border rounded-md px-2 py-1" value={calcType} onChange={(e) => setCalcType(e.target.value as PaymentType)}>
            {PAYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-medium block mb-1">Period (YYYY-MM)</label>
          <input
            className="text-xs bg-background border rounded-md px-2 py-1 w-28 font-mono"
            value={calcPeriod}
            onChange={(e) => setCalcPeriod(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[11px] font-medium block mb-1">Mode (for Mark Paid)</label>
          <select className="text-xs bg-background border rounded-md px-2 py-1" value={mode} onChange={(e) => setMode(e.target.value as PaymentMode)}>
            {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <Button size="sm" onClick={onCompute}>Auto-compute due</Button>
      </Card>

      {payments.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No statutory payments recorded for {entity} · FY {FY}. Use Auto-compute to seed.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Period</th>
                <th className="px-3 py-2 font-medium">Due Date</th>
                <th className="px-3 py-2 font-medium text-right">Amount</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Mode</th>
                <th className="px-3 py-2 font-medium">Reference</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t hover:bg-muted/20">
                  <td className="px-3 py-2 uppercase font-medium">{p.payment_type}</td>
                  <td className="px-3 py-2 font-mono">{p.period}</td>
                  <td className="px-3 py-2 font-mono">{fmt(p.due_date)}</td>
                  <td className="px-3 py-2 font-mono text-right">{inr(p.amount_inr)}</td>
                  <td className={`px-3 py-2 font-medium ${statusClass(p.status)}`}>{p.status}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.mode ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">{p.reference ?? '—'}</td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <Button size="sm" variant="outline" disabled={p.status === 'paid'} onClick={() => onMarkPaid(p)}>
                      Mark Paid
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onPrepareChallan(p)}>
                      Prepare Challan
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
