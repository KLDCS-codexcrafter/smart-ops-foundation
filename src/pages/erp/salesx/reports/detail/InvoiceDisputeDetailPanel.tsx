/**
 * InvoiceDisputeDetailPanel.tsx — UPRA-1 Phase A · T1-7
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import {
  DISPUTE_STATUS_LABELS, DISPUTE_STATUS_COLOURS, DISPUTE_REASON_LABELS,
  type InvoiceDispute,
} from '@/types/invoice-dispute';

const fmtINR = (paise: number | null): string =>
  paise == null ? '—' : `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(paise / 100)}`;

interface Props { dispute: InvoiceDispute; onPrint: () => void }

export function InvoiceDisputeDetailPanel({ dispute, onPrint }: Props) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-mono">{dispute.dispute_no}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Against invoice {dispute.voucher_no} · {dispute.dispute_date}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-[10px] ${DISPUTE_STATUS_COLOURS[dispute.status]}`}>
              {DISPUTE_STATUS_LABELS[dispute.status]}
            </Badge>
            <Button size="sm" variant="outline" onClick={onPrint}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Reason</div><div>{DISPUTE_REASON_LABELS[dispute.reason]}</div></div>
          <div><div className="text-xs text-muted-foreground">Billed Qty</div><div className="font-mono">{dispute.billed_quantity}</div></div>
          <div><div className="text-xs text-muted-foreground">Received Qty</div><div className="font-mono">{dispute.received_quantity}</div></div>
          <div><div className="text-xs text-muted-foreground">Disputed ₹</div><div className="font-mono font-semibold">{fmtINR(dispute.disputed_amount_paise)}</div></div>
          <div><div className="text-xs text-muted-foreground">Approved ₹</div><div className="font-mono">{fmtINR(dispute.approved_amount_paise)}</div></div>
          <div><div className="text-xs text-muted-foreground">Reviewed By</div><div>{dispute.reviewed_by ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Resolution</div><div>{dispute.resolution_type ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">CN Voucher</div><div className="font-mono">{dispute.credit_note_voucher_id ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">FY</div><div>{dispute.fiscal_year_id ?? '—'}</div></div>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Distributor Remarks</div>
          <div className="text-sm bg-muted/30 rounded p-2">{dispute.distributor_remarks || '—'}</div>
        </div>
        {dispute.internal_remarks && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Internal Remarks</div>
            <div className="text-sm bg-muted/30 rounded p-2">{dispute.internal_remarks}</div>
          </div>
        )}
        {dispute.rejection_reason && (
          <div className="bg-destructive/10 border border-destructive/30 rounded p-2 text-sm">
            <p className="font-semibold text-destructive">Rejection</p>
            <p className="mt-1">{dispute.rejection_reason}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
