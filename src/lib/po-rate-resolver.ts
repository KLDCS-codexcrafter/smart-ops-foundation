/**
 * @file        po-rate-resolver.ts
 * @sprint      T-Phase-1.2.6f-d-1 · Block F · D-297 (NEW · Q4=A SIBLING PATTERN)
 * @purpose     Sibling wrapper around createPOFromAward · auto-resolves rates from
 *              active Rate Contracts for the awarded vendor and patches each PurchaseOrderLine
 *              with auto_resolved + rate_contract_id flags.
 * @decisions   D-297 (auto-resolve from RC) · D-285+D-286+D-287 lesson (NEVER modify audited engines)
 * @disciplines FR-22 · FR-50 · D-249 zero-touch institutional engines
 * @reuses      po-management-engine.createPOFromAward (UNMODIFIED) ·
 *              rate-contract-engine.findActiveRate (UNMODIFIED) ·
 *              audit-trail-hash-chain.appendAuditEntry · decimal-helpers
 * @[JWT]       POST /api/procure360/purchase-orders/from-award (with rate-resolver wrap)
 */

import type { PurchaseOrderRecord } from '@/types/po';
import { purchaseOrdersKey } from '@/types/po';
import {
  createPOFromAward,
  type CreatePoFromAwardOptions,
} from './po-management-engine';
import { findActiveRate } from './rate-contract-engine';
import { appendAuditEntry } from './audit-trail-hash-chain';
import { round2 } from './decimal-helpers';

export interface ResolvedLineSummary {
  line_id: string;
  item_id: string;
  resolved: boolean;
  rate_contract_id: string | null;
  agreed_rate: number | null;
}

export interface PoRateResolverResult {
  po: PurchaseOrderRecord;
  resolved_count: number;
  total_lines: number;
  summary: ResolvedLineSummary[];
}

/**
 * Wraps createPOFromAward · post-creation patches lines with rate-contract metadata.
 *
 * Behaviour:
 *  1. Calls createPOFromAward (unmodified — 3-c-1 audited-clean preserved).
 *  2. For each line, looks up an active Rate Contract for (vendor_id · item_id).
 *  3. If found · sets line.auto_resolved=true · line.rate_contract_id=contract.id ·
 *     OPTIONALLY rewrites line.rate to contract.agreed_rate when caller opts in.
 *  4. Recomputes basic/tax/after_tax for any rewritten line.
 *  5. Persists patched PO via direct localStorage write-through.
 *  6. Emits an audit entry summarising resolution outcome.
 */
export async function createPOFromAwardWithRateResolution(
  awardedQuotationId: string,
  entityCode: string,
  byUserId: string,
  opts: CreatePoFromAwardOptions & { applyAgreedRate?: boolean } = {},
): Promise<PoRateResolverResult | null> {
  const po = await createPOFromAward(awardedQuotationId, entityCode, byUserId, opts);
  if (!po) return null;

  const summary: ResolvedLineSummary[] = [];
  let resolvedCount = 0;

  const patchedLines = po.lines.map((line) => {
    const found = findActiveRate(entityCode, po.vendor_id, line.item_id);
    if (!found) {
      summary.push({
        line_id: line.id, item_id: line.item_id,
        resolved: false, rate_contract_id: null, agreed_rate: null,
      });
      return { ...line, auto_resolved: false, rate_contract_id: null };
    }
    resolvedCount += 1;
    summary.push({
      line_id: line.id, item_id: line.item_id,
      resolved: true,
      rate_contract_id: found.contract.id,
      agreed_rate: found.line.agreed_rate,
    });
    if (opts.applyAgreedRate) {
      const newRate = found.line.agreed_rate;
      const basic = round2(line.qty * newRate);
      const taxValue = round2((basic * line.tax_pct) / 100);
      const afterTax = round2(basic + taxValue);
      return {
        ...line,
        rate: newRate,
        basic_value: basic,
        tax_value: taxValue,
        amount_after_tax: afterTax,
        auto_resolved: true,
        rate_contract_id: found.contract.id,
      };
    }
    return { ...line, auto_resolved: true, rate_contract_id: found.contract.id };
  });

  // Recompute totals if any line was rewritten.
  let totalBasic = 0; let totalTax = 0; let totalAfter = 0;
  for (const l of patchedLines) {
    totalBasic = round2(totalBasic + l.basic_value);
    totalTax = round2(totalTax + l.tax_value);
    totalAfter = round2(totalAfter + l.amount_after_tax);
  }

  const patchedPo: PurchaseOrderRecord = {
    ...po,
    lines: patchedLines,
    total_basic_value: totalBasic,
    total_tax_value: totalTax,
    total_after_tax: totalAfter,
    updated_at: new Date().toISOString(),
  };

  // Write-through patch via localStorage (sibling pattern · do NOT modify po-management-engine).
  try {
    // [JWT] PATCH /api/procure360/purchase-orders/:id (rate-resolver overlay)
    const raw = localStorage.getItem(purchaseOrdersKey(entityCode));
    const list: PurchaseOrderRecord[] = raw ? (JSON.parse(raw) as PurchaseOrderRecord[]) : [];
    const idx = list.findIndex((p) => p.id === patchedPo.id);
    if (idx >= 0) {
      list[idx] = patchedPo;
      localStorage.setItem(purchaseOrdersKey(entityCode), JSON.stringify(list));
    }
  } catch {
    /* quota silent · po still exists in baseline state */
  }

  await appendAuditEntry({
    entityCode,
    entityId: patchedPo.entity_id,
    voucherId: patchedPo.id,
    voucherKind: 'vendor_quotation',
    action: 'po_rate_auto_resolved',
    actorUserId: byUserId,
    payload: {
      po_no: patchedPo.po_no,
      total_lines: patchedPo.lines.length,
      resolved: resolvedCount,
      apply_agreed_rate: !!opts.applyAgreedRate,
    },
  });

  return {
    po: patchedPo,
    resolved_count: resolvedCount,
    total_lines: patchedPo.lines.length,
    summary,
  };
}
