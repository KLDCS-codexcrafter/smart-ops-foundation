/**
 * @file        src/pages/erp/eximx/import/BoEDutyPaymentPanel.tsx
 * @purpose     5-voucher preview · auto-posted on BoE filing · uses FinCore voucher engines READ-ONLY
 * @sprint      T-Phase-1.EX-6-BillOfEntry-CustomsDuty-Demurrage-AutoPostedVouchers
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Receipt } from 'lucide-react';
import { VOUCHER_LEDGER_MAP, type AutoPostedVoucherKind } from '@/types/auto-posted-voucher';
import type { BillOfEntry } from '@/types/bill-of-entry';

export function BoEDutyPaymentPanel({ boe }: { boe: BillOfEntry }): JSX.Element {
  const total_customs_duty = boe.lines.reduce((s, l) => s + l.bcd_inr + l.sws_inr + l.anti_dumping_inr + l.safeguard_inr, 0);
  const total_landing = boe.lines.reduce((s, l) => s + l.landing_inr, 0);

  const vouchers: Array<{ kind: AutoPostedVoucherKind; amount: number; label: string }> = [
    { kind: 'customs_duty', amount: total_customs_duty, label: 'Customs Duty (BCD + SWS + AD + SG)' },
    { kind: 'igst_import', amount: boe.total_igst_inr, label: 'IGST Import' },
    { kind: 'comp_cess', amount: boe.total_comp_cess_inr, label: 'Compensation Cess' },
    { kind: 'landing_handling', amount: total_landing, label: 'Landing/Handling (1% + CHA)' },
    { kind: 'demurrage', amount: boe.total_demurrage_inr, label: 'Demurrage' },
  ];

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm"><Receipt className="w-4 h-4 inline mr-2" />Auto-Posted Vouchers · 5 GL postings</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-2">
          {vouchers.map((v) => (
            <div key={v.kind} className="flex items-center justify-between p-2 border rounded-lg">
              <div>
                <div className="font-medium text-sm">{v.label}</div>
                <code className="text-xs text-muted-foreground">{VOUCHER_LEDGER_MAP[v.kind]}</code>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold">₹{v.amount.toLocaleString('en-IN')}</div>
                {boe.posted_voucher_ids.length > 0 ? <Badge variant="default" className="text-xs">posted</Badge> : <Badge variant="outline" className="text-xs">pending</Badge>}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t flex justify-between items-center">
          <div className="text-sm font-bold">Total GL impact</div>
          <div className="font-mono font-bold text-lg">₹{vouchers.reduce((s, v) => s + v.amount, 0).toLocaleString('en-IN')}</div>
        </div>
      </CardContent>
    </Card>
  );
}
