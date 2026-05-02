/**
 * @file     SourceVoucherPickerDialog.tsx — OOB-8 multi-select source picker
 * @sprint   T-Phase-1.2.6e-tally-1 · Q4-d · multi-select + pending-qty inline
 * @purpose  "Add Source" dialog · shows ALL open source vouchers from same party
 *           with pending qty · ₹ value · multi-select returns refs to caller.
 *
 *   [JWT] GET /api/sources?type=:sourceType&entity=:entityCode&party=:partyId
 */

import { useState, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { MultiSourceRef } from '@/types/multi-source-ref';

export type SourceVoucherType = 'po' | 'so' | 'enquiry' | 'srm' | 'dm' | 'grn';

interface SourceOption {
  voucher_id: string;
  voucher_no: string;
  voucher_date: string;
  party_name: string;
  total_amount: number;
  pending_amount: number;
  pending_qty: number;
  total_qty: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  sourceType: SourceVoucherType;
  partyId: string | null;
  excludeIds?: string[];
  entityCode: string;
  onSelect: (refs: MultiSourceRef[]) => void;
}

const fmtINR = (n: number) =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

const TITLES: Record<SourceVoucherType, string> = {
  po: 'Select Purchase Orders',
  so: 'Select Sales Orders',
  enquiry: 'Select Enquiries',
  srm: 'Select Supply Request Memos',
  dm: 'Select Delivery Memos',
  grn: 'Select GRNs',
};

function loadSourceOptions(
  entityCode: string,
  sourceType: SourceVoucherType,
  partyId: string | null,
): SourceOption[] {
  try {
    if (sourceType === 'po' || sourceType === 'so') {
      const orders: Array<Record<string, unknown>> = JSON.parse(
        localStorage.getItem(`erp_orders_${entityCode}`) || '[]'
      );
      const targetType = sourceType === 'po' ? 'Purchase Order' : 'Sales Order';
      return orders
        .filter(o =>
          o.base_voucher_type === targetType &&
          (o.status === 'open' || o.status === 'partial') &&
          (!partyId || o.party_id === partyId)
        )
        .map(o => {
          const lines = (o.lines as Array<{ qty: number; pending_qty: number; rate: number }>) ?? [];
          const totalQty = lines.reduce((s, l) => s + (l.qty ?? 0), 0);
          const pendingQty = lines.reduce((s, l) => s + (l.pending_qty ?? l.qty ?? 0), 0);
          const totalAmt = lines.reduce((s, l) => s + (l.qty ?? 0) * (l.rate ?? 0), 0);
          const pendingAmt = lines.reduce((s, l) => s + (l.pending_qty ?? l.qty ?? 0) * (l.rate ?? 0), 0);
          return {
            voucher_id: String(o.id ?? ''),
            voucher_no: String(o.order_no ?? o.voucher_no ?? ''),
            voucher_date: String(o.date ?? ''),
            party_name: String(o.party_name ?? ''),
            total_amount: totalAmt,
            pending_amount: pendingAmt,
            total_qty: totalQty,
            pending_qty: pendingQty,
          };
        });
    }

    let key: string;
    let partyField: string;
    let noField: string;
    let dateField: string;
    switch (sourceType) {
      case 'enquiry':
        key = `erp_enquiries_${entityCode}`;
        partyField = 'customer_id';
        noField = 'enquiry_no';
        dateField = 'enquiry_date';
        break;
      case 'srm':
        key = `erp_supply_request_memos_${entityCode}`;
        partyField = 'customer_id';
        noField = 'memo_no';
        dateField = 'memo_date';
        break;
      case 'dm':
        key = `erp_delivery_memos_${entityCode}`;
        partyField = 'customer_id';
        noField = 'memo_no';
        dateField = 'memo_date';
        break;
      case 'grn':
        key = `erp_grns_${entityCode}`;
        partyField = 'vendor_id';
        noField = 'grn_no';
        dateField = 'receipt_date';
        break;
      default:
        return [];
    }

    const records: Array<Record<string, unknown>> = JSON.parse(localStorage.getItem(key) || '[]');
    return records
      .filter(r => r.status !== 'cancelled' && (!partyId || r[partyField] === partyId))
      .map(r => {
        const total = typeof r.total_amount === 'number' ? r.total_amount : 0;
        return {
          voucher_id: String(r.id ?? ''),
          voucher_no: String(r[noField] ?? ''),
          voucher_date: String(r[dateField] ?? ''),
          party_name: String(r.customer_name ?? r.vendor_name ?? ''),
          total_amount: total,
          pending_amount: total,
          total_qty: 0,
          pending_qty: 0,
        };
      });
  } catch {
    return [];
  }
}

export function SourceVoucherPickerDialog({
  open, onClose, sourceType, partyId, excludeIds = [], entityCode, onSelect,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const options = useMemo(() => {
    return loadSourceOptions(entityCode, sourceType, partyId)
      .filter(o => !excludeIds.includes(o.voucher_id))
      .filter(o => !search || o.voucher_no.toLowerCase().includes(search.toLowerCase()));
  }, [entityCode, sourceType, partyId, excludeIds, search]);

  const toggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const confirm = () => {
    const selected = options.filter(o => selectedIds.has(o.voucher_id));
    const refs: MultiSourceRef[] = selected.map(o => ({
      voucher_id: o.voucher_id,
      voucher_no: o.voucher_no,
      voucher_date: o.voucher_date,
      amount: o.pending_amount,
      type: 'against_ref',
    }));
    onSelect(refs);
    setSelectedIds(new Set());
    setSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{TITLES[sourceType]}</DialogTitle>
          <DialogDescription>
            {options.length} open {sourceType.toUpperCase()}{options.length === 1 ? '' : 's'} found · multi-select supported
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Search voucher no..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-2"
        />
        <ScrollArea className="max-h-[50vh]">
          {options.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No open {sourceType.toUpperCase()} vouchers for this party.
            </p>
          ) : (
            <div className="space-y-1">
              {options.map(o => (
                <label
                  key={o.voucher_id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 rounded cursor-pointer"
                >
                  <Checkbox
                    checked={selectedIds.has(o.voucher_id)}
                    onCheckedChange={() => toggle(o.voucher_id)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-mono font-medium">{o.voucher_no}</span>
                      <span className="text-xs text-muted-foreground">{o.voucher_date}</span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3">
                      <span>{o.party_name}</span>
                      {o.pending_qty > 0 && (
                        <Badge variant="secondary" className="font-mono text-xs">
                          {o.pending_qty} of {o.total_qty} pending
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-mono">{fmtINR(o.pending_amount)}</div>
                    {o.pending_amount !== o.total_amount && (
                      <div className="text-xs text-muted-foreground">
                        of {fmtINR(o.total_amount)}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="button" disabled={selectedIds.size === 0} onClick={confirm}>
            Add {selectedIds.size > 0 ? `${selectedIds.size} source${selectedIds.size === 1 ? '' : 's'}` : 'Sources'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
