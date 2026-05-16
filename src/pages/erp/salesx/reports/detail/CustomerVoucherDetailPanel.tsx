/**
 * CustomerVoucherDetailPanel.tsx — UPRA-1 Phase A · T1-2
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import type { CustomerVoucherUnified } from '../CustomerVoucherRegister';

const fmtINR = (paise: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(paise / 100)}`;

interface Props { voucher: CustomerVoucherUnified; onPrint: () => void }

export function CustomerVoucherDetailPanel({ voucher, onPrint }: Props) {
  const isIn = voucher._kind === 'in';
  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-mono">{voucher.voucher_no}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Ticket {voucher.ticket_id} · {voucher._date}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-[10px] ${isIn
              ? 'bg-primary/10 text-primary border-primary/30'
              : 'bg-warning/10 text-warning border-warning/30'}`}>{isIn ? 'In' : 'Out'}</Badge>
            <Button size="sm" variant="outline" onClick={onPrint}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isIn ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><div className="text-xs text-muted-foreground">Received</div><div className="font-mono">{voucher.received_at.slice(0, 16).replace('T', ' ')}</div></div>
              <div><div className="text-xs text-muted-foreground">Serial</div><div className="font-mono">{voucher.serial}</div></div>
              <div><div className="text-xs text-muted-foreground">Internal No</div><div className="font-mono">{voucher.internal_no}</div></div>
              <div><div className="text-xs text-muted-foreground">Warranty</div><div className="capitalize">{voucher.warranty_status_at_intake.replace(/_/g, ' ')}</div></div>
              <div><div className="text-xs text-muted-foreground">Received By</div><div>{voucher.received_by}</div></div>
              <div><div className="text-xs text-muted-foreground">Branch</div><div>{voucher.branch_id}</div></div>
              <div><div className="text-xs text-muted-foreground">FY</div><div>{voucher.fiscal_year_id ?? '—'}</div></div>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Condition</div>
              <div className="text-sm bg-muted/30 rounded p-2">{voucher.condition_notes || '—'}</div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><div className="text-xs text-muted-foreground">Delivered</div><div className="font-mono">{voucher.delivered_at.slice(0, 16).replace('T', ' ')}</div></div>
              <div><div className="text-xs text-muted-foreground">Old → New Serial</div><div className="font-mono">{voucher.old_serial} → {voucher.new_serial}</div></div>
              <div><div className="text-xs text-muted-foreground">Charges</div><div className="font-mono font-semibold">{fmtINR(voucher.charges_paise)}</div></div>
              <div><div className="text-xs text-muted-foreground">Payment</div><div>{voucher.paid ? `Paid · ${voucher.payment_method ?? '—'}` : 'Unpaid'}</div></div>
              <div><div className="text-xs text-muted-foreground">Delivered To</div><div>{voucher.delivered_to}</div></div>
              <div><div className="text-xs text-muted-foreground">Signed</div><div>{voucher.acknowledgement_signed ? 'Yes' : 'No'}</div></div>
              <div><div className="text-xs text-muted-foreground">FY</div><div>{voucher.fiscal_year_id ?? '—'}</div></div>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Resolution Summary</div>
              <div className="text-sm bg-muted/30 rounded p-2">{voucher.resolution_summary || '—'}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Spares Consumed</div>
              <div className="text-sm bg-muted/30 rounded p-2">{voucher.spares_consumed_summary || '—'}</div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
