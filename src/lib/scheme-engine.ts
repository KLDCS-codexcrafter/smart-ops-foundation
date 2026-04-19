/**
 * scheme-engine.ts — Pure evaluation + application
 * No React. No localStorage. Caller hydrates schemes + passes cart.
 * Audience-agnostic: distributor / customer / both.
 */

import type {
  Scheme, SchemeAudience, AppliedScheme, BuyNGetMPayload,
  SlabDiscountPayload, FlatPercentPayload, FlatAmountPayload,
  BundlePayload, FreeSamplePayload,
} from '@/types/scheme';

/** Generic cart line shape the engine understands. */
export interface SchemeLine {
  line_id: string;
  item_id: string;
  category_id?: string;
  qty: number;
  unit_price_paise: number;
  line_total_paise: number;
}

export interface SchemeCart {
  audience: SchemeAudience;
  distributor_tier?: 'gold' | 'silver' | 'bronze';
  customer_segment?: string;
  territory_id?: string | null;
  order_value_paise: number;
  lines: SchemeLine[];
}

function audienceMatches(s: Scheme, a: SchemeAudience): boolean {
  return s.scope.audience === 'both' || s.scope.audience === a;
}

function scopeMatches(s: Scheme, cart: SchemeCart): boolean {
  if (!audienceMatches(s, cart.audience)) return false;
  if (s.scope.min_order_value_paise && cart.order_value_paise < s.scope.min_order_value_paise) return false;
  if (s.scope.distributor_tiers?.length && cart.audience === 'distributor') {
    if (!cart.distributor_tier || !s.scope.distributor_tiers.includes(cart.distributor_tier)) return false;
  }
  if (s.scope.customer_segments?.length && cart.audience === 'customer') {
    if (!cart.customer_segment || !s.scope.customer_segments.includes(cart.customer_segment)) return false;
  }
  if (s.scope.territory_ids?.length) {
    if (!cart.territory_id || !s.scope.territory_ids.includes(cart.territory_id)) return false;
  }
  return true;
}

function lineMatches(line: SchemeLine, s: Scheme): boolean {
  if (s.scope.item_ids?.length && !s.scope.item_ids.includes(line.item_id)) return false;
  if (s.scope.category_ids?.length && line.category_id && !s.scope.category_ids.includes(line.category_id)) return false;
  return true;
}

function isActiveNow(s: Scheme): boolean {
  if (s.status !== 'active') return false;
  const now = new Date().toISOString();
  if (s.valid_from > now) return false;
  if (s.valid_until && s.valid_until < now) return false;
  return true;
}

function applyBuyNGetM(s: Scheme, p: BuyNGetMPayload, cart: SchemeCart, applied: AppliedScheme[]): void {
  const triggerLines = cart.lines.filter(l => l.item_id === p.trigger_item_id);
  const totalTriggerQty = triggerLines.reduce((sum, l) => sum + l.qty, 0);
  if (totalTriggerQty < p.trigger_qty) return;
  const reps = Math.floor(totalTriggerQty / p.trigger_qty);
  const freeQty = reps * p.reward_qty;
  const sampleLine = cart.lines.find(l => l.item_id === p.reward_item_id);
  const freeValuePaise = freeQty * (sampleLine?.unit_price_paise ?? 0);
  applied.push({
    scheme_id: s.id, scheme_code: s.code, scheme_name: s.name,
    applies_to: 'order', discount_paise: freeValuePaise,
    free_items: [{ item_id: p.reward_item_id, qty: freeQty, value_paise: freeValuePaise }],
    note: `Buy ${p.trigger_qty} — get ${p.reward_qty} free x${reps}`,
  });
}

function applySlab(s: Scheme, p: SlabDiscountPayload, cart: SchemeCart, applied: AppliedScheme[]): void {
  for (const line of cart.lines) {
    if (!lineMatches(line, s)) continue;
    const slab = [...p.slabs].reverse().find(sl => line.qty >= sl.min_qty);
    if (!slab) continue;
    const discount = Math.round(line.line_total_paise * slab.discount_percent / 100);
    applied.push({
      scheme_id: s.id, scheme_code: s.code, scheme_name: s.name,
      applies_to: 'line', line_id: line.line_id,
      discount_paise: discount,
      note: `${slab.discount_percent}% slab (${slab.min_qty}+ units)`,
    });
  }
}

function applyFlatPercent(s: Scheme, p: FlatPercentPayload, cart: SchemeCart, applied: AppliedScheme[]): void {
  const eligible = cart.lines.filter(l => lineMatches(l, s));
  const sum = eligible.reduce((t, l) => t + l.line_total_paise, 0);
  if (sum === 0) return;
  applied.push({
    scheme_id: s.id, scheme_code: s.code, scheme_name: s.name,
    applies_to: 'order', discount_paise: Math.round(sum * p.discount_percent / 100),
    note: `Flat ${p.discount_percent}% off`,
  });
}

function applyFlatAmount(s: Scheme, p: FlatAmountPayload, _cart: SchemeCart, applied: AppliedScheme[]): void {
  applied.push({
    scheme_id: s.id, scheme_code: s.code, scheme_name: s.name,
    applies_to: 'order', discount_paise: p.discount_paise,
    note: `Flat ₹${(p.discount_paise / 100).toFixed(0)} off`,
  });
}

function applyBundle(s: Scheme, p: BundlePayload, cart: SchemeCart, applied: AppliedScheme[]): void {
  const hasAll = p.components.every(c => {
    const line = cart.lines.find(l => l.item_id === c.item_id);
    return line && line.qty >= c.qty;
  });
  if (!hasAll) return;
  const individualSum = p.components.reduce((t, c) => {
    const line = cart.lines.find(l => l.item_id === c.item_id);
    return t + (line ? line.unit_price_paise * c.qty : 0);
  }, 0);
  const discount = Math.max(0, individualSum - p.bundle_price_paise);
  applied.push({
    scheme_id: s.id, scheme_code: s.code, scheme_name: s.name,
    applies_to: 'order', discount_paise: discount,
    note: `Bundle — ₹${(discount / 100).toFixed(0)} off`,
  });
}

function applyFreeSample(s: Scheme, p: FreeSamplePayload, cart: SchemeCart, applied: AppliedScheme[]): void {
  if (cart.order_value_paise < p.min_purchase_value_paise) return;
  applied.push({
    scheme_id: s.id, scheme_code: s.code, scheme_name: s.name,
    applies_to: 'order', discount_paise: 0,
    free_items: [{ item_id: p.sample_item_id, qty: p.sample_qty, value_paise: 0 }],
    note: `Free sample x${p.sample_qty}`,
  });
}

/** Main entry — apply all eligible schemes to a cart. */
export function applySchemes(cart: SchemeCart, allSchemes: Scheme[]): AppliedScheme[] {
  const applied: AppliedScheme[] = [];
  const eligible = allSchemes
    .filter(isActiveNow)
    .filter(s => scopeMatches(s, cart))
    .sort((a, b) => b.priority - a.priority);

  for (const s of eligible) {
    if (!s.stackable && applied.length > 0) break;
    switch (s.type) {
      case 'buy_n_get_m':   applyBuyNGetM(s, s.payload as BuyNGetMPayload, cart, applied); break;
      case 'slab_discount': applySlab(s, s.payload as SlabDiscountPayload, cart, applied); break;
      case 'flat_percent':  applyFlatPercent(s, s.payload as FlatPercentPayload, cart, applied); break;
      case 'flat_amount':   applyFlatAmount(s, s.payload as FlatAmountPayload, cart, applied); break;
      case 'bundle':        applyBundle(s, s.payload as BundlePayload, cart, applied); break;
      case 'free_sample':   applyFreeSample(s, s.payload as FreeSamplePayload, cart, applied); break;
      // qps_target is period-based — skipped for cart flow
    }
  }
  return applied;
}

/** Sum all applied scheme discounts. */
export function totalSchemeDiscountPaise(applied: AppliedScheme[]): number {
  return applied.reduce((sum, a) => sum + a.discount_paise, 0);
}

/** Hints for 'add X more to unlock' UX. */
export function describeUnlockGap(cart: SchemeCart, allSchemes: Scheme[]): string[] {
  const hints: string[] = [];
  for (const s of allSchemes.filter(isActiveNow).filter(x => audienceMatches(x, cart.audience))) {
    if (s.type === 'flat_amount' && s.scope.min_order_value_paise) {
      const gap = s.scope.min_order_value_paise - cart.order_value_paise;
      if (gap > 0) hints.push(`Add ₹${(gap / 100).toFixed(0)} more to unlock ${s.name}`);
    }
    if (s.type === 'buy_n_get_m') {
      const p = s.payload as BuyNGetMPayload;
      const have = cart.lines
        .filter(l => l.item_id === p.trigger_item_id)
        .reduce((t, l) => t + l.qty, 0);
      if (have > 0 && have < p.trigger_qty) {
        hints.push(`Add ${p.trigger_qty - have} more of ${p.trigger_item_id} to unlock ${s.name}`);
      }
    }
  }
  return hints;
}
