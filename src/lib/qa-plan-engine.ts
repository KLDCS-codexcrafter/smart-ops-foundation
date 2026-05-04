/**
 * @file        qa-plan-engine.ts
 * @sprint      T-Phase-1.2.6f-d-2-card5-5-pre-1 · Block C · D-324 + D-336
 * @purpose     Quality Plan resolver · supports per-vendor (incoming) AND per-customer (outgoing).
 * @decisions   D-324 (5-function API) · D-336 (per-customer variant)
 *              D-330 (voucherKind filter via applicable_voucher_kinds[])
 * @[JWT]       GET/POST /api/qa/plans
 */
import type { QaPlan, QaPlanVoucherKind } from '@/types/qa-plan';
import { qaPlanKey } from '@/types/qa-plan';

const newId = (): string =>
  `qp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function read(entityCode: string): QaPlan[] {
  try {
    // [JWT] GET /api/qa/plans?entityCode=...
    const raw = localStorage.getItem(qaPlanKey(entityCode));
    return raw ? (JSON.parse(raw) as QaPlan[]) : [];
  } catch { return []; }
}

function write(entityCode: string, list: QaPlan[]): void {
  try {
    // [JWT] POST /api/qa/plans
    localStorage.setItem(qaPlanKey(entityCode), JSON.stringify(list));
  } catch { /* quota silent */ }
}

export function listQaPlans(entityCode: string): QaPlan[] {
  return read(entityCode);
}

export function getQaPlan(id: string, entityCode: string): QaPlan | null {
  return read(entityCode).find(p => p.id === id) ?? null;
}

export type PartyKind = 'vendor' | 'customer';

/**
 * D-324 + D-336 · Resolve plan applicable to (item, party, partyKind, voucherKind).
 * Resolution precedence (most specific → least):
 *   1. item + party + voucherKind
 *   2. item + party
 *   3. item + voucherKind
 *   4. item only
 *   5. party + voucherKind
 *   6. party only
 *   7. voucherKind only (fallback default)
 *   8. unrestricted active plan
 * Returns null if nothing matches.
 */
export function findApplicablePlan(
  itemId: string | null,
  partyId: string | null,
  partyKind: PartyKind,
  voucherKind: QaPlanVoucherKind | null,
  entityCode: string,
): QaPlan | null {
  const all = read(entityCode).filter(p => p.status === 'active');
  const matchesParty = (p: QaPlan): boolean => {
    if (!partyId) return p.vendor_id === null && p.customer_id === null;
    if (partyKind === 'vendor') return p.vendor_id === partyId;
    return p.customer_id === partyId;
  };
  const matchesVoucher = (p: QaPlan): boolean =>
    !voucherKind || p.applicable_voucher_kinds.length === 0
      || p.applicable_voucher_kinds.includes(voucherKind);

  // Precedence ladder
  const candidates: QaPlan[][] = [
    all.filter(p => p.item_id === itemId && matchesParty(p) && voucherKind !== null && p.applicable_voucher_kinds.includes(voucherKind)),
    all.filter(p => p.item_id === itemId && matchesParty(p)),
    all.filter(p => p.item_id === itemId && matchesVoucher(p)),
    all.filter(p => p.item_id === itemId && p.vendor_id === null && p.customer_id === null),
    all.filter(p => p.item_id === null && matchesParty(p) && voucherKind !== null && p.applicable_voucher_kinds.includes(voucherKind)),
    all.filter(p => p.item_id === null && matchesParty(p)),
    all.filter(p => p.item_id === null && p.vendor_id === null && p.customer_id === null && voucherKind !== null && p.applicable_voucher_kinds.includes(voucherKind)),
    all.filter(p => p.item_id === null && p.vendor_id === null && p.customer_id === null),
  ];
  for (const tier of candidates) {
    if (tier.length > 0) return tier[0];
  }
  return null;
}

export interface CreateQaPlanInput {
  code: string;
  name: string;
  plan_type: QaPlan['plan_type'];
  spec_id: string;
  acceptance_criteria_id?: string | null;
  item_id?: string | null;
  item_name?: string | null;
  vendor_id?: string | null;
  vendor_name?: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  applicable_voucher_kinds?: QaPlanVoucherKind[];
  notes?: string;
}

export function createQaPlan(input: CreateQaPlanInput, entityCode: string): QaPlan {
  const list = read(entityCode);
  const now = new Date().toISOString();
  const rec: QaPlan = {
    id: newId(),
    code: input.code,
    name: input.name,
    plan_type: input.plan_type,
    item_id: input.item_id ?? null,
    item_name: input.item_name ?? null,
    spec_id: input.spec_id,
    acceptance_criteria_id: input.acceptance_criteria_id ?? null,
    vendor_id: input.vendor_id ?? null,
    vendor_name: input.vendor_name ?? null,
    customer_id: input.customer_id ?? null,
    customer_name: input.customer_name ?? null,
    status: 'active',
    applicable_voucher_kinds: input.applicable_voucher_kinds ?? [],
    notes: input.notes ?? '',
    entity_id: entityCode,
    created_at: now,
    updated_at: now,
  };
  list.push(rec);
  write(entityCode, list);
  return rec;
}

export function updateQaPlanStatus(
  id: string,
  status: QaPlan['status'],
  entityCode: string,
): QaPlan | null {
  const list = read(entityCode);
  const idx = list.findIndex(p => p.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], status, updated_at: new Date().toISOString() };
  write(entityCode, list);
  return list[idx];
}
