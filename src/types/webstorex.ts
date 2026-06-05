/**
 * @file        src/types/webstorex.ts
 * @purpose     WebStoreX PIM + Catalog types · S149 · MOAT #11
 * @decisions   DP-WS-2 PIM publication wrapper (master NEVER duplicated) ·
 *              DP-WS-13/18 PIM + logistics columns adapt to master surface ·
 *              DP-WS-14 variant allocation guard · DP-WS-15 relations.
 * @sprint      Sprint 149 · T-WebStoreX-A11.1
 */

// WebStoreX · S149 · MOAT #11 · DP-WS-2 PIM publication wrapper — master NEVER duplicated
export type StoreVisibility = 'draft' | 'published' | 'hidden';

export interface WsImage {
  id: string; dataUrl: string;        // ≤1MB · throw over
  kind: 'main' | 'gallery' | 'zoom' | 'variant' | 'cutout'; // cutout feeds S152 Visualizer
  variantId?: string | null;
  sortOrder: number;
}

export interface WsSpecRow { label: string; value: string; }
export interface WsFaqRow { question: string; answer: string; }

export interface WebStoreItem {
  id: string; entityId: string;
  itemRefId: string;                  // MASTER REF (read-only · Block-0 surface) · must exist
  itemRefName: string;                // denormalized display
  visibility: StoreVisibility;        // default 'draft'
  // PIM (DP-WS-13):
  storeTitle: string;                 // defaults to master name
  seoName?: string | null;            // url-slug style
  metaTitle?: string | null; metaDescription?: string | null;
  searchKeywords: string[];
  shortDescription?: string | null;
  description?: string | null;
  highlights: string[];
  faqs: WsFaqRow[];
  howToUse?: string | null;
  specifications: WsSpecRow[];
  warrantyText?: string | null;
  returnable: boolean;
  countryOfOrigin?: string | null;
  videoUrl?: string | null;
  // Commerce surface:
  brandId?: string | null;
  categoryId?: string | null;
  listPrice: number;                  // website selling price
  compareAtPrice?: number | null;     // MRP/strike-through
  moq?: number | null;
  // Logistics (DP-WS-18):
  weightKg?: number | null;
  dimensionsCm?: { l: number; w: number; h: number } | null;
  codAvailable: boolean;
  deliveryEtaText?: string | null;    // static zone text NOW · live ETA = P2BB
  // Relations (DP-WS-15):
  crossSellIds: string[]; upsellIds: string[]; frequentlyBoughtIds: string[];
  // Stock display:
  stockDisplayMode: 'count' | 'badge' | 'hidden';
  backorderAllowed: boolean;
  images: WsImage[];
  hasVariants: boolean;
  createdAt: string; createdByUserId: string; updatedAt: string;
}

export interface WsVariant {          // DP-WS-14 · option (b) + ALLOCATION GUARD
  id: string; entityId: string;
  storeItemId: string;
  sku: string;                        // unique per entity · throw on duplicate
  axes: { name: string; value: string }[];   // e.g. [{name:'Size',value:'XL'},{name:'Color',value:'Blue'}]
  priceOverride?: number | null;      // null = item listPrice
  stockAllocation: number;            // ≥0 · Σ allocations ≤ master qty (guard)
  isActive: boolean;
  createdAt: string; updatedAt: string;
}

export interface WsBrand {
  id: string; entityId: string;
  name: string;
  logoDataUrl?: string | null; bannerDataUrl?: string | null;  // ≤1MB each
  description?: string | null;
  isActive: boolean; createdAt: string;
}

export interface WsCategory {
  id: string; entityId: string;
  name: string;
  parentCategoryId?: string | null;   // 3-level tree · cycle throw
  sortOrder: number; isActive: boolean;
}

export interface StoreSettings {
  entityId: string;
  storeName: string; tagline?: string | null;
  logoDataUrl?: string | null;
  supportPhone?: string | null; supportEmail?: string | null; whatsappNumber?: string | null;
  policies: { shipping?: string | null; returns?: string | null; terms?: string | null };
  gstInvoiceNote: string;             // default 'GST invoice available on all orders'
  updatedAt: string; updatedByUserId: string;
}

export interface VariantReconciliationRow {
  storeItemId: string; itemRefName: string;
  masterQty: number; allocatedTotal: number;
  drift: number;                      // masterQty - allocatedTotal (negative = OVER-allocated)
  overAllocated: boolean;
}

// ─── Entity-scoped storage keys ──────────────────────────────────────
export const wsItemsKey      = (e: string): string => `ws_items_${e}`;
export const wsVariantsKey   = (e: string): string => `ws_variants_${e}`;
export const wsBrandsKey     = (e: string): string => `ws_brands_${e}`;
export const wsCategoriesKey = (e: string): string => `ws_categories_${e}`;
export const wsSettingsKey   = (e: string): string => `ws_settings_${e}`;

// ─── S150 · Commerce Engines · DP-WS-4/9/10/11/16/17/19.3 ───────────
export interface WsPriceList {
  id: string; entityId: string;
  name: string;
  mode: 'per_item' | 'percent_off_list';
  percentOff?: number | null;                  // mode percent_off_list
  itemRates: { storeItemId: string; rate: number }[];   // mode per_item
  assignedPartyIds: string[];
  isActive: boolean; createdAt: string; updatedAt: string;
}

export type SchemeType = 'buy_x_get_y' | 'slab_discount' | 'order_value_discount' | 'coupon';

export interface WsScheme {
  id: string; entityId: string;
  name: string; type: SchemeType;
  // buy_x_get_y:
  buyStoreItemId?: string | null; buyQty?: number | null;
  getStoreItemId?: string | null; getQty?: number | null;     // free goods · zero-rate lines
  // slab_discount (per item):
  slabStoreItemId?: string | null;
  slabs?: { minQty: number; discountPct: number }[];
  // order_value_discount:
  minOrderValue?: number | null; orderDiscountPct?: number | null;
  // coupon (DP-WS-16):
  couponCode?: string | null;                  // unique per entity (throw)
  couponUsageLimit?: number | null;            // null = unlimited
  couponUsedCount: number;
  couponDiscountPct?: number | null; couponDiscountFlat?: number | null;  // exactly one
  // common:
  partyGroupFilter?: string | null;            // null = all (key = party.group per Block 0)
  validFrom: string; validTo: string;
  stackable: boolean;                          // default false · best-single-wins
  isActive: boolean; createdAt: string; updatedAt: string;
}

export interface AppliedScheme {
  schemeId: string; schemeName: string; type: SchemeType;
  freeLines: { storeItemId: string; qty: number }[];
  discountAmount: number;
  displayText: string;                          // "Scheme: 2 pcs free"
}

export interface CartEvaluation {
  lines: { storeItemId: string; qty: number; unitPrice: number; lineTotal: number }[];
  appliedSchemes: AppliedScheme[];
  freeLines: { storeItemId: string; qty: number }[];
  schemeDiscount: number; couponDiscount: number;
  loyaltyRedeemed: number; voucherRedeemed: number; creditRedeemed: number;
  subtotal: number; totalDiscount: number; payable: number;
}

export interface WsLoyaltyRule {
  entityId: string;
  earnPointsPerRupee: number;                  // e.g. 0.01 = 1 pt / ₹100
  minOrderValue: number;
  redeemValuePerPoint: number;                 // ₹ per point
  expiryMonths: number | null;                 // null = never
  isActive: boolean; updatedAt: string;
}

export type LedgerEntryKind = 'earn' | 'redeem' | 'expire' | 'reversal' | 'issue';

export interface WsPointsEntry {               // APPEND-ONLY
  id: string; entityId: string; partyId: string;
  kind: LedgerEntryKind; points: number;       // signed by kind at computation, stored positive
  orderRef?: string | null; reason?: string | null;
  reversesEntryId?: string | null;
  at: string; byUserId: string;
}

export interface WsGiftVoucher {
  id: string; entityId: string;
  code: string;                                // unique per entity (throw)
  initialValue: number;
  issuedToPartyId?: string | null;
  expiresAt?: string | null;
  isActive: boolean; issuedAt: string; issuedByUserId: string;
}
export interface WsVoucherEntry {              // APPEND-ONLY redemptions/reversals
  id: string; entityId: string; voucherId: string;
  kind: 'redeem' | 'reversal'; amount: number;
  orderRef?: string | null; reason?: string | null; reversesEntryId?: string | null;
  at: string; byUserId: string;
}

export interface WsCreditEntry {               // store credit · APPEND-ONLY
  id: string; entityId: string; partyId: string;
  kind: 'issue' | 'redeem' | 'reversal'; amount: number;
  orderRef?: string | null; reason: string;    // mandatory
  reversesEntryId?: string | null;
  at: string; byUserId: string;
}

export interface WsCampaign {                  // DP-WS-11
  id: string; entityId: string;
  name: string; bannerDataUrl?: string | null; // ≤1MB
  startsAt: string; endsAt: string;            // auto window · time-robust
  collectionItemIds: string[];
  offerPrices: { storeItemId: string; offerPrice: number }[];
  isActive: boolean; createdAt: string;
}

export interface WsTestimonial {               // DP-WS-17 · curated NOW · live reviews P2BB
  id: string; entityId: string;
  customerName: string; company?: string | null;
  text: string; rating?: number | null;        // 1-5
  isPublished: boolean; createdAt: string; createdByUserId: string;
}

export interface EffectivePriceResult {
  storeItemId: string; listPrice: number;
  campaignPrice?: number | null; priceListPrice?: number | null;
  effective: number;
  source: 'list' | 'campaign' | 'price_list';
}

// ─── S150 storage keys (entity-scoped) ──────────────────────────────
export const wsPriceListsKey   = (e: string): string => `ws_price_lists_${e}`;
export const wsSchemesKey      = (e: string): string => `ws_schemes_${e}`;
export const wsLoyaltyRuleKey  = (e: string): string => `ws_loyalty_rule_${e}`;
export const wsPointsKey       = (e: string): string => `ws_points_${e}`;
export const wsGiftVouchersKey = (e: string): string => `ws_gift_vouchers_${e}`;
export const wsVoucherEntriesKey = (e: string): string => `ws_voucher_entries_${e}`;
export const wsCreditEntriesKey  = (e: string): string => `ws_credit_entries_${e}`;
export const wsCampaignsKey    = (e: string): string => `ws_campaigns_${e}`;
export const wsTestimonialsKey = (e: string): string => `ws_testimonials_${e}`;

// ─── S151 · Storefront + Orders · DP-WS-3/8/19/22 ───────────────────
export interface WsCartLine {
  storeItemId: string; variantId?: string | null;
  qty: number;                                  // ≥1 · MOQ enforced at checkout
}

export interface WsSavedCart {                  // DP-WS-19.6
  id: string; entityId: string;
  partyId?: string | null;                      // assisted mode customer
  name: string;                                 // e.g. "Sharma Traders monthly"
  lines: WsCartLine[];
  createdAt: string; updatedAt: string; createdByUserId: string;
}

export interface WsStoreOrder {                 // LINK + SNAPSHOT · never the order itself (DP-WS-3)
  id: string; entityId: string;
  soVoucherId: string; soVoucherNo: string;     // THE order = the voucher
  partyId: string; partyName: string;
  evaluation: CartEvaluation;                   // priced snapshot at commit
  couponSchemeId?: string | null;
  pointsRedeemed: number; voucherCodeUsed?: string | null; creditRedeemed: number;
  paymentLinkRef?: string | null;               // ReceivX attach · [JWT] capture
  placedVia: 'storefront' | 'quick_order' | 'reorder';
  createdAt: string; createdByUserId: string;
}

export interface WsQuoteRequest {               // DP-WS-19.2
  id: string; entityId: string;
  quotationVoucherId: string; quotationVoucherNo: string;
  partyId: string; partyName: string;
  lines: WsCartLine[];
  note?: string | null;
  createdAt: string; createdByUserId: string;
}

export interface QuickOrderParseResult {        // DP-WS-19.1
  lines: WsCartLine[];
  unknownSkus: string[];
  invalidRows: string[];
}

export const wsSavedCartsKey   = (e: string): string => `ws_saved_carts_${e}`;
export const wsStoreOrdersKey  = (e: string): string => `ws_store_orders_${e}`;
export const wsQuoteRequestsKey = (e: string): string => `ws_quote_requests_${e}`;
