/**
 * DraftTray.tsx — Multi-entry work queue
 * Horizontal strip between ERPHeader and main panel.
 * Max 5 simultaneous drafts. In-memory only (lost on refresh).
 */
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Voucher } from '@/types/voucher';

export type FineCoreModule =
  | 'fc-hub'
  | 'fc-txn-sales-invoice' | 'fc-txn-purchase-invoice'
  | 'fc-txn-receipt' | 'fc-txn-payment'
  | 'fc-txn-journal' | 'fc-txn-contra'
  | 'fc-txn-credit-note' | 'fc-txn-debit-note'
  | 'fc-txn-delivery-note' | 'fc-txn-receipt-note'
  | 'fc-inv-stock-adjustment' | 'fc-inv-stock-transfer-dispatch' | 'fc-inv-stock-journal'
  | 'fc-ord-purchase-order' | 'fc-ord-sales-order'
  | 'fc-bnk-reconciliation' | 'fc-bnk-cheque'
  | 'fc-out-receivables' | 'fc-out-payables'
  | 'fc-rpt-daybook' | 'fc-rpt-ledger' | 'fc-rpt-trial-balance'
  | 'fc-rpt-pl' | 'fc-rpt-bs' | 'fc-rpt-stock-summary'
  | 'fc-rpt-outstanding' | 'fc-rpt-26as' | 'fc-rpt-24q' | 'fc-rpt-challan'
  | 'fc-rpt-26q' | 'fc-rpt-27q' | 'fc-tds-analytics'
  | 'fc-gst-gstr1' | 'fc-gst-gstr3b' | 'fc-gst-2a' | 'fc-gst-itc' | 'fc-gst-gstr2' | 'fc-gst-gstr9'
  | 'fc-gst-irn-register' | 'fc-gst-ewb-register'
  | 'fc-tds-advance'
  | 'fc-audit-dashboard' | 'fc-audit-3cd' | 'fc-audit-clause44'
  | 'fc-fa-register' | 'fc-fa-master' | 'fc-fa-depreciation'
  | 'fc-fa-amc' | 'fc-fa-disposal' | 'fc-fa-cwip' | 'fc-fa-reports';

export interface DraftEntry {
  id: string;
  module: FineCoreModule;
  label: string;
  voucherTypeName: string;
  formState: Partial<Voucher>;
  savedAt: string;
}

interface DraftTrayProps {
  drafts: DraftEntry[];
  activeDraftId: string | null;
  onSwitch: (id: string) => void;
  onClose: (id: string) => void;
  onNew?: () => void;
}

export function DraftTray({ drafts, activeDraftId, onSwitch, onClose, onNew }: DraftTrayProps) {
  if (drafts.length === 0) return null;

  return (
    <div className="h-9 border-b border-border/50 bg-muted/30 flex items-center gap-1 px-3 overflow-x-auto shrink-0">
      {drafts.map(d => (
        <button
          key={d.id}
          onClick={() => onSwitch(d.id)}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded text-xs whitespace-nowrap transition-colors',
            activeDraftId === d.id
              ? 'bg-primary/10 text-primary border border-primary/30'
              : 'bg-background border border-border/50 text-muted-foreground hover:bg-accent',
          )}
        >
          <span className="truncate max-w-[140px]">{d.label}</span>
          <span
            role="button"
            onClick={e => { e.stopPropagation(); onClose(d.id); }}
            className="ml-0.5 hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </span>
        </button>
      ))}
      {onNew && (
        <button
          onClick={onNew}
          className="flex items-center gap-0.5 px-2 py-1 rounded text-xs text-muted-foreground hover:bg-accent border border-border/50"
        >
          <Plus className="h-3 w-3" /> New
        </button>
      )}
    </div>
  );
}
