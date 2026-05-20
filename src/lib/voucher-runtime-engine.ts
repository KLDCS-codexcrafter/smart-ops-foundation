/**
 * @file        src/lib/voucher-runtime-engine.ts
 * @purpose     D-NEW-FG RESOLUTION · architectural keystone · ORCHESTRATES FinCore voucher engines + AutoPostedVoucher
 * @sprint      T-Phase-1.EX-8-TT-Hedge-MonthEnd-DayBook-VoucherRuntime
 * @decisions   EX-8-Q5=a · all FinCore voucher engines READ-ONLY · auto-posted-voucher.ts 0-diff · sibling orchestration pattern
 *
 * IMPORTANT: SIBLING extension orchestrating EX-6 primitives. 5 FinCore voucher engines
 * (use-last-voucher · non-fincore-voucher-type-registry · voucher-hash · voucher-org-tag-engine
 *  · voucher-version-engine) STAY 0-DIFF. auto-posted-voucher.ts (EX-6 type) STAYS 0-DIFF.
 * This engine ONLY READS from them and orchestrates runtime voucher creation.
 * D-NEW-FG was registered in EX-6 · resolved here.
 */
import type { AutoPostedVoucher, AutoPostedVoucherKind } from '@/types/auto-posted-voucher';
import { computeVoucherHash } from '@/lib/voucher-hash';
import { tagVoucher } from '@/lib/voucher-org-tag-engine';
import { findVoucherTypeById } from '@/lib/non-fincore-voucher-type-registry';

export interface VoucherRuntimeRequest {
  source_kind: AutoPostedVoucherKind | 'tt_outward' | 'month_end_reval' | 'hedge_settlement';
  source_ref_id: string;
  amount_inr: number;
  ledger_name: string;
  entity_id: string;
  branch_id?: string;
  notes: string;
}

export interface VoucherRuntimeResult {
  posted_voucher_id: string;
  posted_voucher_hash: string;
  voucher_org_tag: string;
  ledger_impact_inr: number;
  posted_at: string;
  source_kind: string;
  source_ref_id: string;
}

/**
 * Resolve D-NEW-FG · orchestrate FinCore engines READ-ONLY · produce runtime voucher entry.
 * Reads from: voucher-hash · voucher-org-tag-engine · non-fincore-voucher-type-registry.
 * Produces records matching AutoPostedVoucher shape · no type modification.
 */
export function postRuntimeVoucher(req: VoucherRuntimeRequest): VoucherRuntimeResult {
  const now = new Date().toISOString();
  const voucherId = `vrt-${req.source_kind}-${Date.now()}`;

  // Step 1: Look up voucher type (READ-ONLY registry consume) · placeholder id is fine
  const lookedUp = findVoucherTypeById(req.entity_id, 'auto-posted-runtime');
  const voucherTypeId = lookedUp?.id ?? 'auto-posted-runtime';

  // Step 2: Build record for hashing
  const record: Record<string, unknown> = {
    id: voucherId,
    source_kind: req.source_kind,
    source_ref_id: req.source_ref_id,
    amount_inr: req.amount_inr,
    ledger_name: req.ledger_name,
    posted_at: now,
    voucher_type_id: voucherTypeId,
  };

  // Step 3: Compute hash (READ-ONLY consume voucher-hash.ts)
  const voucher_hash = computeVoucherHash(record);

  // Step 4: Tag with org context (READ-ONLY consume voucher-org-tag-engine.ts)
  tagVoucher(voucherId, {
    entity_id: req.entity_id,
    branch_id: req.branch_id ?? 'default',
    business_unit_id: 'default',
    division_id: 'default',
    department_id: 'default',
  });

  return {
    posted_voucher_id: voucherId,
    posted_voucher_hash: voucher_hash,
    voucher_org_tag: req.entity_id,
    ledger_impact_inr: req.amount_inr,
    posted_at: now,
    source_kind: req.source_kind,
    source_ref_id: req.source_ref_id,
  };
}

/** Convert AutoPostedVoucher (EX-6 type · 0-diff) to runtime voucher request · adapter pattern */
export function autoPostedToRuntime(apv: AutoPostedVoucher, entityId: string): VoucherRuntimeRequest {
  return {
    source_kind: apv.kind,
    source_ref_id: apv.boe_id,
    amount_inr: apv.amount_inr,
    ledger_name: apv.ledger_name,
    entity_id: entityId,
    notes: `Auto-posted from BoE ${apv.boe_id}`,
  };
}
