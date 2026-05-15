/**
 * PrintNarrationHeader.tsx — Shared print header rendering parent>current>voucher_no.
 * Sprint T-Phase-1.2.4 · Print Narration system
 *
 * Resolves the narration template from VoucherType.behaviour_rules of type 'narration_template'.
 * Default template: '{base_voucher_type} > {voucher_type_name} > {voucher_no}'
 * Renders e.g. "Receipt Note > Goods Receipt Note (Domestic) > DGRN/24-25/0001"
 *
 * [JWT] GET /api/accounting/voucher-types/:id (today reads from localStorage)
 */
import { useMemo } from 'react';
import type { VoucherType, NarrationTemplateConfig } from '@/types/voucher-type';
import { useEntityCode } from '@/hooks/useEntityCode';
import { voucherTypesKey } from '@/hooks/useVoucherTypes';

export interface PrintNarrationHeaderProps {
  voucherTypeId?: string | null;
  voucherTypeName?: string | null;
  baseVoucherType?: string;
  voucherNo: string;
  fallbackTitle?: string;
}

function resolveNarration(props: PrintNarrationHeaderProps, entityCode: string): string {
  const join = (parts: Array<string | undefined | null>) =>
    parts.filter(Boolean).join(' > ');

  if (!props.voucherTypeId) {
    return join([props.baseVoucherType, props.voucherTypeName, props.voucherNo])
      || props.fallbackTitle
      || props.voucherNo;
  }
  try {
    // [JWT] GET /api/accounting/voucher-types
    // Sprint Hardening-B Block 2C-i · Q3.1 scoped-first read with legacy fallback.
    const scopedRaw = localStorage.getItem(voucherTypesKey(entityCode));
    const legacyRaw = localStorage.getItem('erp_voucher_types');
    const allVTs: VoucherType[] = JSON.parse((scopedRaw ?? legacyRaw) || '[]');
    const vt = allVTs.find(v => v.id === props.voucherTypeId);
    if (!vt) {
      return join([props.baseVoucherType, props.voucherTypeName, props.voucherNo])
        || props.fallbackTitle
        || props.voucherNo;
    }
    const tplRule = vt.behaviour_rules.find(r =>
      r.rule_type === 'narration_template' && r.is_active
    );
    const tplStr = (tplRule?.config as NarrationTemplateConfig | undefined)?.template
      ?? '{base_voucher_type} > {voucher_type_name} > {voucher_no}';
    return tplStr
      .replace('{base_voucher_type}', vt.base_voucher_type)
      .replace('{voucher_type_name}', vt.name)
      .replace('{voucher_no}', props.voucherNo);
  } catch {
    return props.fallbackTitle ?? props.voucherNo;
  }
}

export function PrintNarrationHeader(props: PrintNarrationHeaderProps) {
  const { entityCode } = useEntityCode();
  const narration = useMemo(() => resolveNarration(props, entityCode), [props, entityCode]);
  return (
    <div className="print-narration-header text-center text-xs font-medium border-b border-black/30 pb-2 mb-3 print:mb-2 text-black/80">
      {narration}
    </div>
  );
}
