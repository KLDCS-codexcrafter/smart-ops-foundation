/**
 * TallyVoucherHeader.tsx — Tally Prime-style 2-row voucher header.
 *
 * PURPOSE       Visual-only header. No business logic; consumer owns state.
 * INPUT         voucher type metadata + ref/dates + status + change handlers
 * OUTPUT        rendered header card
 * DEPENDENCIES  shadcn Input / Label / Badge, SmartDateInput, keyboard helper
 * TALLY-ON-TOP BEHAVIOR  none
 * SPEC DOC      D-036 (Tally voucher header pattern)
 */
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { onEnterNext } from '@/lib/keyboard';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import type { VoucherBaseType, VoucherFamily } from '@/types/voucher-type';

interface TallyVoucherHeaderProps {
  voucherTypeName: string;
  baseVoucherType: VoucherBaseType;
  voucherFamily: VoucherFamily;
  voucherNo: string;
  refNo?: string;
  refDate?: string;
  voucherDate: string;
  effectiveDate?: string;
  status?: 'draft' | 'posted' | 'cancelled';
  onRefNoChange?: (v: string) => void;
  onRefDateChange?: (v: string) => void;
  onVoucherDateChange?: (v: string) => void;
  onEffectiveDateChange?: (v: string) => void;
  readOnlyVoucherNo?: boolean;
}

export function TallyVoucherHeader({
  voucherTypeName, baseVoucherType, voucherFamily,
  voucherNo, refNo = '', refDate = '', voucherDate, effectiveDate = '',
  status = 'draft',
  onRefNoChange, onRefDateChange, onVoucherDateChange, onEffectiveDateChange,
  readOnlyVoucherNo = true,
}: TallyVoucherHeaderProps) {
  const statusColor: Record<NonNullable<TallyVoucherHeaderProps['status']>, string> = {
    draft: 'bg-muted text-muted-foreground border-border',
    posted: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
  };

  return (
    <div className="border border-border rounded-lg bg-card">
      <div className="flex items-end gap-6 px-5 pt-4 pb-3 border-b border-border/60">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-muted-foreground">Voucher Type</span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold text-foreground">{voucherTypeName}</span>
            <span className="text-xs text-muted-foreground">
              under <span className="font-medium text-foreground/80">{baseVoucherType}</span>
              <span className="mx-1 opacity-50">·</span>
              {voucherFamily}
            </span>
          </div>
        </div>

        <div className="ml-auto flex items-end gap-4" data-keyboard-form>
          <div className="flex flex-col gap-1 w-44">
            <Label htmlFor="vh-voucher-no" className="text-[11px] text-muted-foreground">Voucher No</Label>
            <Input
              id="vh-voucher-no"
              value={voucherNo || (status === 'draft' ? 'DRAFT' : '')}
              readOnly={readOnlyVoucherNo}
              className="h-8 font-mono text-sm"
            />
          </div>
          <div className="flex flex-col gap-1 w-44">
            <Label htmlFor="vh-ref-no" className="text-[11px] text-muted-foreground">Ref No</Label>
            <Input
              id="vh-ref-no"
              value={refNo}
              onChange={e => onRefNoChange?.(e.target.value)}
              onKeyDown={onEnterNext}
              className="h-8 text-sm"
              placeholder="Optional"
            />
          </div>
          <div className="flex flex-col gap-1 w-40">
            <Label htmlFor="vh-ref-date" className="text-[11px] text-muted-foreground">Ref Date</Label>
            <SmartDateInput
              id="vh-ref-date"
              value={refDate}
              onChange={v => onRefDateChange?.(v)}
              className="h-8"
            />
          </div>
        </div>
      </div>

      <div className="flex items-end gap-4 px-5 pt-3 pb-4" data-keyboard-form>
        <div className="flex flex-col gap-1 w-40">
          <Label htmlFor="vh-voucher-date" className="text-[11px] text-muted-foreground">Voucher Date *</Label>
          <SmartDateInput
            id="vh-voucher-date"
            value={voucherDate}
            onChange={v => onVoucherDateChange?.(v)}
            className="h-8"
          />
        </div>
        <div className="flex flex-col gap-1 w-40">
          <Label htmlFor="vh-effective-date" className="text-[11px] text-muted-foreground">Effective Date</Label>
          <SmartDateInput
            id="vh-effective-date"
            value={effectiveDate || voucherDate}
            onChange={v => onEffectiveDateChange?.(v)}
            className="h-8"
          />
        </div>
        <div className="ml-auto">
          <Badge className={statusColor[status] + ' text-xs font-medium capitalize px-2.5 py-0.5'}>
            {status}
          </Badge>
        </div>
      </div>
    </div>
  );
}
