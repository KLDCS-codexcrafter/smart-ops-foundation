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
