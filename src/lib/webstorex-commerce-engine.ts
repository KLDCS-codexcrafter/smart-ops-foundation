/**
 * @file        src/lib/webstorex-commerce-engine.ts
 * @realizes    WebStoreX Commerce Engines · DP-WS-4/9/10/11/16/17/19.3 · price resolution ·
 *              scheme evaluation · APPEND-ONLY ledgers (S148 canon).
 * @reads-from  webstorex-engine (READ/CALL only) · party-master (READ-ONLY) ·
 *              audit-trail-engine.
 * @sprint      Sprint 150 · T-WebStoreX-A11.2
 * @[JWT]       P2BB: public redemption · wallet view · abandoned-cart automation (DP-WS-20 register)
 *
 * APPEND-ONLY CANON (S148 precedent): ws_points · ws_voucher_entries · ws_credit_entries
 * never expose an update or delete path. Corrections ride reverseEntry/reverseVoucherEntry/
 * reverseCreditEntry (mandatory reason · double-reversal throws).
 *
 * TIME-ROBUST: every evaluator (effective price · campaign window · scheme window ·
 * point expiry · voucher expiry) accepts an injectable nowISO.
 *
 * DESIGN-DECISION-FLAG (architect default): effective price = LOWEST of
 * {listPrice · active-campaign offerPrice · party price-list rate}; source reported.
 * COUPON usedCount increments ONLY at commitCouponUse — never during evaluation.
 *
 * §H 0-DIFF: approval-workflow-engine · Comply360 · push-notification-bridge UNTOUCHED.
 */
import { logAudit } from '@/lib/audit-trail-engine';
import { getStoreItem } from '@/lib/webstorex-engine';
import type {
  WsPriceList, WsScheme, AppliedScheme, CartEvaluation,
  WsLoyaltyRule, WsPointsEntry, WsGiftVoucher, WsVoucherEntry,
  WsCreditEntry, WsCampaign, WsTestimonial, EffectivePriceResult,
  SchemeType,
} from '@/types/webstorex';
import {
  wsPriceListsKey, wsSchemesKey, wsLoyaltyRuleKey, wsPointsKey,
  wsGiftVouchersKey, wsVoucherEntriesKey, wsCreditEntriesKey,
  wsCampaignsKey, wsTestimonialsKey,
} from '@/types/webstorex';

// ─── storage helpers ─────────────────────────────────────────────────
function readJSON<T>(key: string, fallback: T): T {
  try {
    // [JWT] GET /api/webstorex/<resource>
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function writeJSON(key: string, value: unknown): void {
  try {
    // [JWT] PUT /api/webstorex/<resource>
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota */ }
}
const IMAGE_MAX_BYTES = 1_048_576;
function assertImageSize(dataUrl: string | null | undefined, label: string): void {
  if (!dataUrl) return;
  const comma = dataUrl.indexOf(',');
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const bytes = Math.floor(b64.length * 3 / 4);
  if (bytes > IMAGE_MAX_BYTES) {
    throw new Error(`${label} too large (${bytes} bytes > ${IMAGE_MAX_BYTES} cap)`);
  }
}
function genId(p: string): string {
  return `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function nowOf(nowISO?: string): string { return nowISO ?? new Date().toISOString(); }
function inWindow(now: string, from: string, to: string): boolean {
  return now >= from && now <= to;
}

// ─── party-group READ-ONLY surface (Block-0 confirmed: party.group?: string|null) ──
interface PartyRow { id?: string; group?: string | null }
function loadPartyGroup(partyId: string): string | null {
  for (const k of ['erp_group_customer_master', 'erp_group_vendor_master', 'erp_parties']) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const arr = JSON.parse(raw) as PartyRow[];
      const hit = arr.find(p => p.id === partyId);
      if (hit) return hit.group ?? null;
    } catch { /* ignore */ }
  }
  return null;
}

// ─── audit ───────────────────────────────────────────────────────────
function audit(
  entityCode: string, action: 'create' | 'update' | 'cancel',
  recordId: string, label: string,
  before: Record<string, unknown> | null, after: Record<string, unknown> | null,
  reason?: string,
): void {
  try {
    logAudit({
      entityCode, action, entityType: 'webstorex_event',
      recordId, recordLabel: label,
      beforeState: before, afterState: after,
      reason: reason ?? null, sourceModule: 'webstorex-commerce-engine',
    });
  } catch { /* D-AUDIT-SAFE */ }
}

// ═══════════════════════════════════════════════════════════════════════
// PRICE LISTS (DP-WS-4)
// ═══════════════════════════════════════════════════════════════════════
function loadPriceLists(e: string): WsPriceList[] { return readJSON(wsPriceListsKey(e), [] as WsPriceList[]); }
function savePriceLists(e: string, v: WsPriceList[]): void { writeJSON(wsPriceListsKey(e), v); }

export function listPriceLists(entityCode: string): WsPriceList[] { return loadPriceLists(entityCode); }

export function createPriceList(entityCode: string, data: Omit<WsPriceList, 'id'|'entityId'|'createdAt'|'updatedAt'>): WsPriceList {
  if (!data.name?.trim()) throw new Error('Price list name is required');
  if (data.mode === 'percent_off_list') {
    if (data.percentOff == null || data.percentOff <= 0 || data.percentOff > 100) {
      throw new Error('percentOff must be in (0, 100] for percent_off_list mode');
    }
  } else if (data.mode === 'per_item') {
    if (!Array.isArray(data.itemRates)) throw new Error('itemRates required for per_item mode');
  }
  const now = new Date().toISOString();
  const row: WsPriceList = { ...data, id: genId('pl'), entityId: entityCode, createdAt: now, updatedAt: now };
  // single assignment per party — assigning a party that already belongs elsewhere MOVES it
  const all = loadPriceLists(entityCode);
  for (const pid of row.assignedPartyIds) reassignParty(entityCode, all, pid, row.id);
  all.push(row);
  savePriceLists(entityCode, all);
  audit(entityCode, 'create', row.id, `Price list ${row.name}`, null, { name: row.name, mode: row.mode });
  return row;
}

export function updatePriceList(entityCode: string, id: string, patch: Partial<WsPriceList>): WsPriceList {
  const all = loadPriceLists(entityCode);
  const idx = all.findIndex(p => p.id === id);
  if (idx < 0) throw new Error(`Price list ${id} not found`);
  const before = { ...all[idx] };
  const merged = { ...all[idx], ...patch, id, entityId: entityCode, updatedAt: new Date().toISOString() };
  all[idx] = merged;
  savePriceLists(entityCode, all);
  audit(entityCode, 'update', id, `Price list ${merged.name}`, before as unknown as Record<string, unknown>, merged as unknown as Record<string, unknown>);
  return merged;
}

export function deletePriceList(entityCode: string, id: string): void {
  const all = loadPriceLists(entityCode);
  const row = all.find(p => p.id === id);
  if (!row) return;
  savePriceLists(entityCode, all.filter(p => p.id !== id));
  audit(entityCode, 'cancel', id, `Price list ${row.name}`, row as unknown as Record<string, unknown>, null);
}

/** Assign party to price list — moves from any prior list (audited). */
export function assignPartyToPriceList(entityCode: string, listId: string, partyId: string): void {
  const all = loadPriceLists(entityCode);
  if (!all.some(p => p.id === listId)) throw new Error(`Price list ${listId} not found`);
  reassignParty(entityCode, all, partyId, listId);
  savePriceLists(entityCode, all);
}
function reassignParty(entityCode: string, all: WsPriceList[], partyId: string, targetId: string): void {
  for (const pl of all) {
    if (pl.id === targetId) {
      if (!pl.assignedPartyIds.includes(partyId)) {
        pl.assignedPartyIds = [...pl.assignedPartyIds, partyId];
        audit(entityCode, 'update', pl.id, `Assign party ${partyId} → ${pl.name}`, null, { partyId, listId: pl.id });
      }
    } else if (pl.assignedPartyIds.includes(partyId)) {
      pl.assignedPartyIds = pl.assignedPartyIds.filter(x => x !== partyId);
      audit(entityCode, 'update', pl.id, `Move party ${partyId} off ${pl.name}`, { partyId, listId: pl.id }, null);
    }
  }
}

function findPartyPriceList(entityCode: string, partyId: string | undefined): WsPriceList | null {
  if (!partyId) return null;
  return loadPriceLists(entityCode).find(p => p.isActive && p.assignedPartyIds.includes(partyId)) ?? null;
}

// ═══════════════════════════════════════════════════════════════════════
// CAMPAIGNS (DP-WS-11)
// ═══════════════════════════════════════════════════════════════════════
function loadCampaigns(e: string): WsCampaign[] { return readJSON(wsCampaignsKey(e), [] as WsCampaign[]); }
function saveCampaigns(e: string, v: WsCampaign[]): void { writeJSON(wsCampaignsKey(e), v); }

export function listCampaigns(entityCode: string): WsCampaign[] { return loadCampaigns(entityCode); }

export function createCampaign(entityCode: string, data: Omit<WsCampaign, 'id'|'entityId'|'createdAt'>): WsCampaign {
  if (!data.name?.trim()) throw new Error('Campaign name is required');
  if (!(data.endsAt > data.startsAt)) throw new Error('Campaign endsAt must be after startsAt');
  assertImageSize(data.bannerDataUrl, 'Campaign banner');
  const row: WsCampaign = { ...data, id: genId('cmp'), entityId: entityCode, createdAt: new Date().toISOString() };
  const all = loadCampaigns(entityCode); all.push(row); saveCampaigns(entityCode, all);
  audit(entityCode, 'create', row.id, `Campaign ${row.name}`, null, { name: row.name });
  return row;
}

export function updateCampaign(entityCode: string, id: string, patch: Partial<WsCampaign>): WsCampaign {
  const all = loadCampaigns(entityCode);
  const idx = all.findIndex(c => c.id === id);
  if (idx < 0) throw new Error(`Campaign ${id} not found`);
  const merged = { ...all[idx], ...patch, id, entityId: entityCode };
  if (!(merged.endsAt > merged.startsAt)) throw new Error('Campaign endsAt must be after startsAt');
  assertImageSize(merged.bannerDataUrl, 'Campaign banner');
  const before = all[idx]; all[idx] = merged; saveCampaigns(entityCode, all);
  audit(entityCode, 'update', id, `Campaign ${merged.name}`, before as unknown as Record<string, unknown>, merged as unknown as Record<string, unknown>);
  return merged;
}

export function deleteCampaign(entityCode: string, id: string): void {
  const all = loadCampaigns(entityCode);
  const row = all.find(c => c.id === id); if (!row) return;
  saveCampaigns(entityCode, all.filter(c => c.id !== id));
  audit(entityCode, 'cancel', id, `Campaign ${row.name}`, row as unknown as Record<string, unknown>, null);
}

export function getActiveCampaign(entityCode: string, nowISO?: string): WsCampaign | null {
  const now = nowOf(nowISO);
  return loadCampaigns(entityCode).find(c => c.isActive && inWindow(now, c.startsAt, c.endsAt)) ?? null;
}

// ═══════════════════════════════════════════════════════════════════════
// EFFECTIVE PRICE (DESIGN-DECISION-FLAG · lowest-wins)
// ═══════════════════════════════════════════════════════════════════════
export function getEffectivePrice(
  entityCode: string, storeItemId: string, partyId?: string, nowISO?: string,
): EffectivePriceResult {
  const item = getStoreItem(entityCode, storeItemId);
  if (!item) throw new Error(`Store item ${storeItemId} not found`);
  const listPrice = item.listPrice;
  // campaign
  const campaign = getActiveCampaign(entityCode, nowISO);
  const campaignPrice = campaign?.offerPrices.find(o => o.storeItemId === storeItemId)?.offerPrice ?? null;
  // price list
  const pl = findPartyPriceList(entityCode, partyId);
  let priceListPrice: number | null = null;
  if (pl) {
    if (pl.mode === 'per_item') {
      const r = pl.itemRates.find(x => x.storeItemId === storeItemId);
      priceListPrice = r ? r.rate : null;
    } else if (pl.mode === 'percent_off_list' && pl.percentOff != null) {
      priceListPrice = Math.round(listPrice * (100 - pl.percentOff)) / 100;
    }
  }
  // lowest-wins
  const candidates: { value: number; source: EffectivePriceResult['source'] }[] = [
    { value: listPrice, source: 'list' },
  ];
  if (campaignPrice != null) candidates.push({ value: campaignPrice, source: 'campaign' });
  if (priceListPrice != null) candidates.push({ value: priceListPrice, source: 'price_list' });
  candidates.sort((a, b) => a.value - b.value);
  const winner = candidates[0];
  return {
    storeItemId, listPrice, campaignPrice, priceListPrice,
    effective: winner.value, source: winner.source,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// SCHEMES (DP-WS-10 / DP-WS-16)
// ═══════════════════════════════════════════════════════════════════════
function loadSchemes(e: string): WsScheme[] { return readJSON(wsSchemesKey(e), [] as WsScheme[]); }
function saveSchemes(e: string, v: WsScheme[]): void { writeJSON(wsSchemesKey(e), v); }

export function listSchemes(entityCode: string): WsScheme[] { return loadSchemes(entityCode); }

function validateScheme(s: Omit<WsScheme, 'id'|'entityId'|'createdAt'|'updatedAt'|'couponUsedCount'> & { couponUsedCount?: number }): void {
  if (!s.name?.trim()) throw new Error('Scheme name is required');
  if (!(s.validTo > s.validFrom)) throw new Error('Scheme validTo must be after validFrom');
  switch (s.type) {
    case 'buy_x_get_y':
      if (!s.buyStoreItemId || !s.getStoreItemId) throw new Error('buy_x_get_y requires buy/get store item ids');
      if (!s.buyQty || s.buyQty <= 0) throw new Error('buy_x_get_y requires buyQty > 0');
      if (!s.getQty || s.getQty <= 0) throw new Error('buy_x_get_y requires getQty > 0');
      break;
    case 'slab_discount':
      if (!s.slabStoreItemId) throw new Error('slab_discount requires slabStoreItemId');
      if (!s.slabs || s.slabs.length === 0) throw new Error('slab_discount requires at least one slab');
      break;
    case 'order_value_discount':
      if (s.minOrderValue == null || s.minOrderValue <= 0) throw new Error('order_value_discount requires minOrderValue > 0');
      if (s.orderDiscountPct == null || s.orderDiscountPct <= 0) throw new Error('order_value_discount requires orderDiscountPct > 0');
      break;
    case 'coupon': {
      if (!s.couponCode?.trim()) throw new Error('coupon requires couponCode');
      const hasPct = s.couponDiscountPct != null;
      const hasFlat = s.couponDiscountFlat != null;
      if (hasPct === hasFlat) throw new Error('coupon requires exactly one of couponDiscountPct or couponDiscountFlat');
      break;
    }
  }
}

export function createScheme(entityCode: string, data: Omit<WsScheme, 'id'|'entityId'|'createdAt'|'updatedAt'|'couponUsedCount'>): WsScheme {
  validateScheme(data);
  const all = loadSchemes(entityCode);
  if (data.type === 'coupon' && data.couponCode) {
    const code = data.couponCode.trim().toUpperCase();
    if (all.some(s => (s.couponCode ?? '').trim().toUpperCase() === code)) {
      throw new Error(`Coupon code "${code}" already exists`);
    }
  }
  const now = new Date().toISOString();
  const row: WsScheme = { ...data, id: genId('sch'), entityId: entityCode, couponUsedCount: 0, createdAt: now, updatedAt: now };
  all.push(row); saveSchemes(entityCode, all);
  audit(entityCode, 'create', row.id, `Scheme ${row.name}`, null, { type: row.type });
  return row;
}

export function updateScheme(entityCode: string, id: string, patch: Partial<WsScheme>): WsScheme {
  const all = loadSchemes(entityCode);
  const idx = all.findIndex(s => s.id === id);
  if (idx < 0) throw new Error(`Scheme ${id} not found`);
  const merged = { ...all[idx], ...patch, id, entityId: entityCode, updatedAt: new Date().toISOString() };
  validateScheme(merged);
  const before = all[idx]; all[idx] = merged; saveSchemes(entityCode, all);
  audit(entityCode, 'update', id, `Scheme ${merged.name}`, before as unknown as Record<string, unknown>, merged as unknown as Record<string, unknown>);
  return merged;
}

export function deleteScheme(entityCode: string, id: string): void {
  const all = loadSchemes(entityCode);
  const row = all.find(s => s.id === id); if (!row) return;
  saveSchemes(entityCode, all.filter(s => s.id !== id));
  audit(entityCode, 'cancel', id, `Scheme ${row.name}`, row as unknown as Record<string, unknown>, null);
}

// ─── cart evaluation ────────────────────────────────────────────────
interface CartLineInput { storeItemId: string; qty: number }

function schemeEligible(s: WsScheme, now: string, partyGroup: string | null): boolean {
  if (!s.isActive) return false;
  if (!inWindow(now, s.validFrom, s.validTo)) return false;
  if (s.partyGroupFilter && s.partyGroupFilter !== partyGroup) return false;
  return true;
}

function applyOne(s: WsScheme, lines: { storeItemId: string; qty: number; unitPrice: number; lineTotal: number }[], subtotal: number): AppliedScheme | null {
  if (s.type === 'buy_x_get_y') {
    const buy = lines.find(l => l.storeItemId === s.buyStoreItemId);
    if (!buy || !s.buyQty || !s.getQty || !s.getStoreItemId) return null;
    const sets = Math.floor(buy.qty / s.buyQty);
    if (sets <= 0) return null;
    const freeQty = sets * s.getQty;
    return {
      schemeId: s.id, schemeName: s.name, type: s.type,
      freeLines: [{ storeItemId: s.getStoreItemId, qty: freeQty }],
      discountAmount: 0,
      displayText: `${s.name}: ${freeQty} pcs free`,
    };
  }
  if (s.type === 'slab_discount') {
    const ln = lines.find(l => l.storeItemId === s.slabStoreItemId);
    if (!ln || !s.slabs || s.slabs.length === 0) return null;
    const eligible = [...s.slabs].filter(sl => ln.qty >= sl.minQty).sort((a, b) => b.minQty - a.minQty)[0];
    if (!eligible) return null;
    const disc = Math.round(ln.lineTotal * eligible.discountPct) / 100;
    return {
      schemeId: s.id, schemeName: s.name, type: s.type,
      freeLines: [], discountAmount: disc,
      displayText: `${s.name}: ${eligible.discountPct}% off ${ln.qty} units`,
    };
  }
  if (s.type === 'order_value_discount') {
    if (s.minOrderValue == null || s.orderDiscountPct == null) return null;
    if (subtotal < s.minOrderValue) return null;
    const disc = Math.round(subtotal * s.orderDiscountPct) / 100;
    return {
      schemeId: s.id, schemeName: s.name, type: s.type,
      freeLines: [], discountAmount: disc,
      displayText: `${s.name}: ${s.orderDiscountPct}% off order`,
    };
  }
  return null;
}

export interface EvaluateOpts {
  partyId?: string;
  couponCode?: string;
  nowISO?: string;
  loyaltyRedeemed?: number;
  voucherRedeemed?: number;
  creditRedeemed?: number;
}

export function evaluateCart(
  entityCode: string, cartLines: CartLineInput[], opts: EvaluateOpts = {},
): CartEvaluation {
  const now = nowOf(opts.nowISO);
  const partyGroup = opts.partyId ? loadPartyGroup(opts.partyId) : null;

  // resolve per-line effective prices
  const lines = cartLines.map(l => {
    const ep = getEffectivePrice(entityCode, l.storeItemId, opts.partyId, now);
    return { storeItemId: l.storeItemId, qty: l.qty, unitPrice: ep.effective, lineTotal: Math.round(ep.effective * l.qty * 100) / 100 };
  });
  const subtotal = Math.round(lines.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100;

  // eligible non-coupon schemes
  const allSchemes = loadSchemes(entityCode).filter(s => s.type !== 'coupon' && schemeEligible(s, now, partyGroup));
  const candidates: AppliedScheme[] = [];
  for (const s of allSchemes) {
    const a = applyOne(s, lines, subtotal);
    if (a) candidates.push(a);
  }
  // best-single-wins unless stackable
  const stackable = allSchemes.filter(s => s.stackable).map(s => s.id);
  const appliedSchemes: AppliedScheme[] = [];
  const stackedApplied = candidates.filter(c => stackable.includes(c.schemeId));
  const nonStacked = candidates.filter(c => !stackable.includes(c.schemeId));
  appliedSchemes.push(...stackedApplied);
  if (nonStacked.length > 0) {
    nonStacked.sort((a, b) => (b.discountAmount + b.freeLines.reduce((s, f) => s + f.qty, 0) * 0.01)
                            - (a.discountAmount + a.freeLines.reduce((s, f) => s + f.qty, 0) * 0.01));
    appliedSchemes.push(nonStacked[0]);
  }

  const schemeDiscount = Math.round(appliedSchemes.reduce((s, a) => s + a.discountAmount, 0) * 100) / 100;
  const freeLines: { storeItemId: string; qty: number }[] = [];
  for (const a of appliedSchemes) freeLines.push(...a.freeLines);

  // coupon (NO usedCount increment here — see commitCouponUse)
  let couponDiscount = 0;
  if (opts.couponCode) {
    const code = opts.couponCode.trim().toUpperCase();
    const cp = loadSchemes(entityCode).find(s => s.type === 'coupon' && (s.couponCode ?? '').trim().toUpperCase() === code);
    if (!cp) throw new Error(`Coupon "${code}" not found`);
    if (!schemeEligible(cp, now, partyGroup)) throw new Error(`Coupon "${code}" not valid right now`);
    if (cp.couponUsageLimit != null && cp.couponUsedCount >= cp.couponUsageLimit) {
      throw new Error('coupon exhausted');
    }
    if (cp.couponDiscountPct != null) couponDiscount = Math.round(subtotal * cp.couponDiscountPct) / 100;
    else if (cp.couponDiscountFlat != null) couponDiscount = cp.couponDiscountFlat;
    appliedSchemes.push({
      schemeId: cp.id, schemeName: cp.name, type: 'coupon',
      freeLines: [], discountAmount: couponDiscount,
      displayText: `Coupon ${code}: ${cp.couponDiscountPct != null ? cp.couponDiscountPct + '% off' : '₹' + cp.couponDiscountFlat + ' off'}`,
    });
  }

  const loyaltyRedeemed = opts.loyaltyRedeemed ?? 0;
  const voucherRedeemed = opts.voucherRedeemed ?? 0;
  const creditRedeemed = opts.creditRedeemed ?? 0;
  const totalDiscount = Math.round((schemeDiscount + couponDiscount + loyaltyRedeemed + voucherRedeemed + creditRedeemed) * 100) / 100;
  const payable = Math.max(0, Math.round((subtotal - totalDiscount) * 100) / 100);

  return { lines, appliedSchemes, freeLines, schemeDiscount, couponDiscount,
    loyaltyRedeemed, voucherRedeemed, creditRedeemed,
    subtotal, totalDiscount, payable };
}

/** Increment coupon usedCount — call ONLY at order commit, never during evaluation. */
export function commitCouponUse(entityCode: string, schemeId: string): WsScheme {
  const all = loadSchemes(entityCode);
  const idx = all.findIndex(s => s.id === schemeId);
  if (idx < 0) throw new Error(`Scheme ${schemeId} not found`);
  const s = all[idx];
  if (s.type !== 'coupon') throw new Error(`Scheme ${schemeId} is not a coupon`);
  if (s.couponUsageLimit != null && s.couponUsedCount >= s.couponUsageLimit) throw new Error('coupon exhausted');
  const next = { ...s, couponUsedCount: s.couponUsedCount + 1, updatedAt: new Date().toISOString() };
  all[idx] = next; saveSchemes(entityCode, all);
  audit(entityCode, 'update', s.id, `Coupon ${s.couponCode} used`, { used: s.couponUsedCount }, { used: next.couponUsedCount });
  return next;
}

// ═══════════════════════════════════════════════════════════════════════
// LOYALTY (DP-WS-9) · APPEND-ONLY ledger
// ═══════════════════════════════════════════════════════════════════════
function loadPoints(e: string): WsPointsEntry[] { return readJSON(wsPointsKey(e), [] as WsPointsEntry[]); }
function appendPoints(e: string, entry: WsPointsEntry): void {
  const all = loadPoints(e); all.push(entry); writeJSON(wsPointsKey(e), all);
}

export function getLoyaltyRule(entityCode: string): WsLoyaltyRule | null {
  return readJSON<WsLoyaltyRule | null>(wsLoyaltyRuleKey(entityCode), null);
}
export function upsertLoyaltyRule(entityCode: string, rule: Omit<WsLoyaltyRule, 'entityId'|'updatedAt'>): WsLoyaltyRule {
  if (rule.earnPointsPerRupee < 0) throw new Error('earnPointsPerRupee must be ≥ 0');
  if (rule.redeemValuePerPoint <= 0) throw new Error('redeemValuePerPoint must be > 0');
  if (rule.minOrderValue < 0) throw new Error('minOrderValue must be ≥ 0');
  const merged: WsLoyaltyRule = { ...rule, entityId: entityCode, updatedAt: new Date().toISOString() };
  writeJSON(wsLoyaltyRuleKey(entityCode), merged);
  audit(entityCode, 'update', 'loyalty-rule', 'Loyalty rule', null, merged as unknown as Record<string, unknown>);
  return merged;
}

function addMonthsISO(iso: string, months: number): number {
  const d = new Date(iso); d.setMonth(d.getMonth() + months); return d.getTime();
}

export function listPointEntries(entityCode: string, partyId?: string): WsPointsEntry[] {
  const all = loadPoints(entityCode);
  return partyId ? all.filter(e => e.partyId === partyId) : all;
}

export function getPointsBalance(entityCode: string, partyId: string, nowISO?: string): number {
  const rule = getLoyaltyRule(entityCode);
  const nowMs = new Date(nowOf(nowISO)).getTime();
  const all = loadPoints(entityCode).filter(e => e.partyId === partyId);
  const reversedIds = new Set(all.filter(e => e.kind === 'reversal' && e.reversesEntryId).map(e => e.reversesEntryId!));
  let balance = 0;
  for (const e of all) {
    if (reversedIds.has(e.id)) continue; // skip reversed source
    if (e.kind === 'reversal') {
      const src = all.find(x => x.id === e.reversesEntryId);
      if (src?.kind === 'earn') balance -= src.points;
      else if (src?.kind === 'redeem') balance += src.points;
      continue;
    }
    if (e.kind === 'earn') {
      if (rule?.expiryMonths != null && addMonthsISO(e.at, rule.expiryMonths) <= nowMs) continue;
      balance += e.points;
    } else if (e.kind === 'redeem' || e.kind === 'expire') {
      balance -= e.points;
    }
  }
  return Math.max(0, balance);
}

export function earnPoints(entityCode: string, partyId: string, orderValue: number, orderRef: string, userId = 'system', nowISO?: string): WsPointsEntry | null {
  const rule = getLoyaltyRule(entityCode);
  if (!rule || !rule.isActive) return null;
  if (orderValue < rule.minOrderValue) return null;
  const pts = Math.floor(orderValue * rule.earnPointsPerRupee);
  if (pts <= 0) return null;
  const entry: WsPointsEntry = {
    id: genId('pt'), entityId: entityCode, partyId, kind: 'earn',
    points: pts, orderRef, reason: null, reversesEntryId: null,
    at: nowOf(nowISO), byUserId: userId,
  };
  appendPoints(entityCode, entry);
  audit(entityCode, 'create', entry.id, `Earn ${pts} pts party ${partyId}`, null, entry as unknown as Record<string, unknown>);
  return entry;
}

export function redeemPoints(entityCode: string, partyId: string, points: number, orderRef: string, userId = 'system', nowISO?: string): WsPointsEntry {
  if (points <= 0) throw new Error('Redeem points must be > 0');
  const bal = getPointsBalance(entityCode, partyId, nowISO);
  if (points > bal) throw new Error(`Insufficient points (balance ${bal})`);
  const entry: WsPointsEntry = {
    id: genId('pt'), entityId: entityCode, partyId, kind: 'redeem',
    points, orderRef, reason: null, reversesEntryId: null,
    at: nowOf(nowISO), byUserId: userId,
  };
  appendPoints(entityCode, entry);
  audit(entityCode, 'create', entry.id, `Redeem ${points} pts party ${partyId}`, null, entry as unknown as Record<string, unknown>);
  return entry;
}

export function reversePointEntry(entityCode: string, entryId: string, reason: string, userId = 'system', nowISO?: string): WsPointsEntry {
  if (!reason?.trim()) throw new Error('Reversal reason is mandatory');
  const all = loadPoints(entityCode);
  const src = all.find(e => e.id === entryId);
  if (!src) throw new Error(`Point entry ${entryId} not found`);
  if (src.kind === 'reversal') throw new Error('Cannot reverse a reversal entry');
  if (all.some(e => e.kind === 'reversal' && e.reversesEntryId === entryId)) throw new Error('Entry already reversed');
  const entry: WsPointsEntry = {
    id: genId('pt'), entityId: entityCode, partyId: src.partyId, kind: 'reversal',
    points: src.points, orderRef: src.orderRef ?? null, reason, reversesEntryId: entryId,
    at: nowOf(nowISO), byUserId: userId,
  };
  appendPoints(entityCode, entry);
  audit(entityCode, 'create', entry.id, `Reverse ${entryId}`, null, entry as unknown as Record<string, unknown>, reason);
  return entry;
}

// ═══════════════════════════════════════════════════════════════════════
// GIFT VOUCHERS (DP-WS-19.3) · APPEND-ONLY redemption ledger
// ═══════════════════════════════════════════════════════════════════════
function loadVouchers(e: string): WsGiftVoucher[] { return readJSON(wsGiftVouchersKey(e), [] as WsGiftVoucher[]); }
function saveVouchers(e: string, v: WsGiftVoucher[]): void { writeJSON(wsGiftVouchersKey(e), v); }
function loadVoucherEntries(e: string): WsVoucherEntry[] { return readJSON(wsVoucherEntriesKey(e), [] as WsVoucherEntry[]); }
function appendVoucherEntry(e: string, entry: WsVoucherEntry): void {
  const all = loadVoucherEntries(e); all.push(entry); writeJSON(wsVoucherEntriesKey(e), all);
}

export function listVouchers(entityCode: string): WsGiftVoucher[] { return loadVouchers(entityCode); }
export function listVoucherEntries(entityCode: string, voucherId?: string): WsVoucherEntry[] {
  const all = loadVoucherEntries(entityCode);
  return voucherId ? all.filter(v => v.voucherId === voucherId) : all;
}

export function issueVoucher(entityCode: string, data: Omit<WsGiftVoucher, 'id'|'entityId'|'issuedAt'>): WsGiftVoucher {
  if (!data.code?.trim()) throw new Error('Voucher code is required');
  if (data.initialValue <= 0) throw new Error('Voucher value must be > 0');
  const code = data.code.trim().toUpperCase();
  const all = loadVouchers(entityCode);
  if (all.some(v => v.code.trim().toUpperCase() === code)) throw new Error(`Voucher code "${code}" already exists`);
  const row: WsGiftVoucher = { ...data, code, id: genId('gv'), entityId: entityCode, issuedAt: new Date().toISOString() };
  all.push(row); saveVouchers(entityCode, all);
  audit(entityCode, 'create', row.id, `Voucher ${row.code}`, null, { code: row.code, value: row.initialValue });
  return row;
}

export function getVoucherBalance(entityCode: string, code: string, nowISO?: string): { balance: number; expired: boolean; voucher: WsGiftVoucher | null } {
  const v = loadVouchers(entityCode).find(x => x.code.trim().toUpperCase() === code.trim().toUpperCase());
  if (!v) return { balance: 0, expired: false, voucher: null };
  const now = nowOf(nowISO);
  if (v.expiresAt && now > v.expiresAt) return { balance: 0, expired: true, voucher: v };
  if (!v.isActive) return { balance: 0, expired: false, voucher: v };
  const entries = loadVoucherEntries(entityCode).filter(e => e.voucherId === v.id);
  const reversedIds = new Set(entries.filter(e => e.kind === 'reversal' && e.reversesEntryId).map(e => e.reversesEntryId!));
  let bal = v.initialValue;
  for (const e of entries) {
    if (reversedIds.has(e.id)) continue;
    if (e.kind === 'redeem') bal -= e.amount;
    else if (e.kind === 'reversal') bal += e.amount;
  }
  return { balance: Math.max(0, bal), expired: false, voucher: v };
}

export function redeemVoucher(entityCode: string, code: string, amount: number, orderRef: string, userId = 'system', nowISO?: string): WsVoucherEntry {
  if (amount <= 0) throw new Error('Redeem amount must be > 0');
  const { balance, expired, voucher } = getVoucherBalance(entityCode, code, nowISO);
  if (!voucher) throw new Error(`Voucher ${code} not found`);
  if (expired) throw new Error(`Voucher ${code} has expired`);
  if (amount > balance) throw new Error(`Insufficient voucher balance (${balance})`);
  const entry: WsVoucherEntry = {
    id: genId('ve'), entityId: entityCode, voucherId: voucher.id, kind: 'redeem',
    amount, orderRef, reason: null, reversesEntryId: null,
    at: nowOf(nowISO), byUserId: userId,
  };
  appendVoucherEntry(entityCode, entry);
  audit(entityCode, 'create', entry.id, `Redeem voucher ${code}`, null, entry as unknown as Record<string, unknown>);
  return entry;
}

export function reverseVoucherEntry(entityCode: string, entryId: string, reason: string, userId = 'system', nowISO?: string): WsVoucherEntry {
  if (!reason?.trim()) throw new Error('Reversal reason is mandatory');
  const all = loadVoucherEntries(entityCode);
  const src = all.find(e => e.id === entryId);
  if (!src) throw new Error(`Voucher entry ${entryId} not found`);
  if (src.kind === 'reversal') throw new Error('Cannot reverse a reversal entry');
  if (all.some(e => e.kind === 'reversal' && e.reversesEntryId === entryId)) throw new Error('Entry already reversed');
  const entry: WsVoucherEntry = {
    id: genId('ve'), entityId: entityCode, voucherId: src.voucherId, kind: 'reversal',
    amount: src.amount, orderRef: src.orderRef ?? null, reason, reversesEntryId: entryId,
    at: nowOf(nowISO), byUserId: userId,
  };
  appendVoucherEntry(entityCode, entry);
  audit(entityCode, 'create', entry.id, `Reverse voucher entry ${entryId}`, null, entry as unknown as Record<string, unknown>, reason);
  return entry;
}

// ═══════════════════════════════════════════════════════════════════════
// STORE CREDIT (DP-WS-19.3) · APPEND-ONLY
// ═══════════════════════════════════════════════════════════════════════
function loadCredits(e: string): WsCreditEntry[] { return readJSON(wsCreditEntriesKey(e), [] as WsCreditEntry[]); }
function appendCredit(e: string, entry: WsCreditEntry): void {
  const all = loadCredits(e); all.push(entry); writeJSON(wsCreditEntriesKey(e), all);
}

export function listCreditEntries(entityCode: string, partyId?: string): WsCreditEntry[] {
  const all = loadCredits(entityCode);
  return partyId ? all.filter(e => e.partyId === partyId) : all;
}

export function getCreditBalance(entityCode: string, partyId: string): number {
  const all = loadCredits(entityCode).filter(e => e.partyId === partyId);
  const reversedIds = new Set(all.filter(e => e.kind === 'reversal' && e.reversesEntryId).map(e => e.reversesEntryId!));
  let bal = 0;
  for (const e of all) {
    if (reversedIds.has(e.id)) continue;
    if (e.kind === 'issue') bal += e.amount;
    else if (e.kind === 'redeem') bal -= e.amount;
    else if (e.kind === 'reversal') {
      const src = all.find(x => x.id === e.reversesEntryId);
      if (src?.kind === 'issue') bal -= src.amount;
      else if (src?.kind === 'redeem') bal += src.amount;
    }
  }
  return Math.max(0, bal);
}

export function issueCredit(entityCode: string, partyId: string, amount: number, reason: string, userId = 'system', nowISO?: string): WsCreditEntry {
  if (amount <= 0) throw new Error('Credit amount must be > 0');
  if (!reason?.trim()) throw new Error('Reason is mandatory for store credit');
  const entry: WsCreditEntry = {
    id: genId('cr'), entityId: entityCode, partyId, kind: 'issue', amount,
    orderRef: null, reason, reversesEntryId: null,
    at: nowOf(nowISO), byUserId: userId,
  };
  appendCredit(entityCode, entry);
  audit(entityCode, 'create', entry.id, `Issue credit ₹${amount} to ${partyId}`, null, entry as unknown as Record<string, unknown>);
  return entry;
}

export function redeemCredit(entityCode: string, partyId: string, amount: number, reason: string, orderRef?: string, userId = 'system', nowISO?: string): WsCreditEntry {
  if (amount <= 0) throw new Error('Redeem amount must be > 0');
  if (!reason?.trim()) throw new Error('Reason is mandatory for store credit');
  const bal = getCreditBalance(entityCode, partyId);
  if (amount > bal) throw new Error(`Insufficient credit (balance ₹${bal})`);
  const entry: WsCreditEntry = {
    id: genId('cr'), entityId: entityCode, partyId, kind: 'redeem', amount,
    orderRef: orderRef ?? null, reason, reversesEntryId: null,
    at: nowOf(nowISO), byUserId: userId,
  };
  appendCredit(entityCode, entry);
  audit(entityCode, 'create', entry.id, `Redeem credit ₹${amount} from ${partyId}`, null, entry as unknown as Record<string, unknown>);
  return entry;
}

export function reverseCreditEntry(entityCode: string, entryId: string, reason: string, userId = 'system', nowISO?: string): WsCreditEntry {
  if (!reason?.trim()) throw new Error('Reversal reason is mandatory');
  const all = loadCredits(entityCode);
  const src = all.find(e => e.id === entryId);
  if (!src) throw new Error(`Credit entry ${entryId} not found`);
  if (src.kind === 'reversal') throw new Error('Cannot reverse a reversal entry');
  if (all.some(e => e.kind === 'reversal' && e.reversesEntryId === entryId)) throw new Error('Entry already reversed');
  const entry: WsCreditEntry = {
    id: genId('cr'), entityId: entityCode, partyId: src.partyId, kind: 'reversal',
    amount: src.amount, orderRef: src.orderRef ?? null, reason, reversesEntryId: entryId,
    at: nowOf(nowISO), byUserId: userId,
  };
  appendCredit(entityCode, entry);
  audit(entityCode, 'create', entry.id, `Reverse credit entry ${entryId}`, null, entry as unknown as Record<string, unknown>, reason);
  return entry;
}

// ═══════════════════════════════════════════════════════════════════════
// TESTIMONIALS (DP-WS-17)
// ═══════════════════════════════════════════════════════════════════════
function loadTestimonials(e: string): WsTestimonial[] { return readJSON(wsTestimonialsKey(e), [] as WsTestimonial[]); }
function saveTestimonials(e: string, v: WsTestimonial[]): void { writeJSON(wsTestimonialsKey(e), v); }

export function listTestimonials(entityCode: string): WsTestimonial[] { return loadTestimonials(entityCode); }
export function listPublishedTestimonials(entityCode: string): WsTestimonial[] {
  return loadTestimonials(entityCode).filter(t => t.isPublished);
}

export function createTestimonial(entityCode: string, data: Omit<WsTestimonial, 'id'|'entityId'|'createdAt'>): WsTestimonial {
  if (!data.customerName?.trim()) throw new Error('Customer name required');
  if (!data.text?.trim()) throw new Error('Testimonial text required');
  if (data.rating != null && (data.rating < 1 || data.rating > 5)) throw new Error('Rating must be 1-5');
  const row: WsTestimonial = { ...data, id: genId('ts'), entityId: entityCode, createdAt: new Date().toISOString() };
  const all = loadTestimonials(entityCode); all.push(row); saveTestimonials(entityCode, all);
  audit(entityCode, 'create', row.id, `Testimonial ${row.customerName}`, null, row as unknown as Record<string, unknown>);
  return row;
}

export function updateTestimonial(entityCode: string, id: string, patch: Partial<WsTestimonial>): WsTestimonial {
  const all = loadTestimonials(entityCode);
  const idx = all.findIndex(t => t.id === id);
  if (idx < 0) throw new Error(`Testimonial ${id} not found`);
  const merged = { ...all[idx], ...patch, id, entityId: entityCode };
  if (merged.rating != null && (merged.rating < 1 || merged.rating > 5)) throw new Error('Rating must be 1-5');
  const before = all[idx]; all[idx] = merged; saveTestimonials(entityCode, all);
  audit(entityCode, 'update', id, `Testimonial ${merged.customerName}`, before as unknown as Record<string, unknown>, merged as unknown as Record<string, unknown>);
  return merged;
}

export function deleteTestimonial(entityCode: string, id: string): void {
  const all = loadTestimonials(entityCode);
  const row = all.find(t => t.id === id); if (!row) return;
  saveTestimonials(entityCode, all.filter(t => t.id !== id));
  audit(entityCode, 'cancel', id, `Testimonial ${row.customerName}`, row as unknown as Record<string, unknown>, null);
}

export function setTestimonialPublished(entityCode: string, id: string, isPublished: boolean): WsTestimonial {
  return updateTestimonial(entityCode, id, { isPublished });
}

// ─── Re-exports for engine surface convenience ───────────────────────
export type { CartLineInput };
// types are imported from '@/types/webstorex' — consumers do not need re-export here.
// Engine ensures: no exported `updatePointEntry` / `updateVoucherEntry` / `updateCreditEntry`
// (APPEND-ONLY canon · S148). Structural assertion lives in §N tests.
