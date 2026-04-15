/**
 * SettlementPanel.tsx — Outstanding bill settlement for Receipt/Payment
 */
import { Badge } from '@/components/ui/badge';

interface SettlementPanelProps {
  partyId: string;
  entityCode: string;
  mode: 'debtor' | 'creditor';
}

interface BillEntry {
  voucher_no: string;
  voucher_date: string;
  pending_amount: number;
}

export function SettlementPanel({ partyId, entityCode, mode }: SettlementPanelProps) {
  // [JWT] GET /api/accounting/outstanding?partyId=...
  let bills: BillEntry[] = [];
  try {
    const raw = localStorage.getItem(`erp_outstanding_${entityCode}`);
    if (raw) {
      const all = JSON.parse(raw);
      bills = all.filter((o: Record<string, unknown>) =>
        o.party_id === partyId && o.status !== 'cancelled' && o.status !== 'settled' &&
        o.party_type === mode
      ).map((o: Record<string, unknown>) => ({
        voucher_no: o.voucher_no as string,
        voucher_date: o.voucher_date as string,
        pending_amount: o.pending_amount as number,
      }));
    }
  } catch { /* empty */ }

  if (!partyId) return null;

  return (
    <div className="border rounded-md p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Open {mode === 'debtor' ? 'Receivables' : 'Payables'}
        </p>
        <Badge variant="outline" className="text-[10px]">{bills.length} bills</Badge>
      </div>
      {bills.length === 0 ? (
        <p className="text-xs text-muted-foreground">No outstanding bills for this party</p>
      ) : (
        <div className="space-y-1">
          {bills.slice(0, 5).map(b => (
            <div key={b.voucher_no} className="flex items-center justify-between text-xs">
              <span className="font-mono">{b.voucher_no}</span>
              <span className="text-muted-foreground">{b.voucher_date}</span>
              <span className="font-mono font-medium">₹{b.pending_amount.toLocaleString('en-IN')}</span>
            </div>
          ))}
          {bills.length > 5 && <p className="text-[10px] text-muted-foreground">+{bills.length - 5} more</p>}
        </div>
      )}
    </div>
  );
}
