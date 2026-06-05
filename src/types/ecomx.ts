/**
 * @file ecomx.ts — EcomX Marketplace Commerce Hub types (S153 · DP-EC-2/3/4/5)
 * Entity-scoped per FR-26. JSON-serializable per FR-27.
 */

export type EcMarketplaceType =
  | 'amazon' | 'flipkart' | 'meesho' | 'myntra' | 'jiomart'
  | 'indiamart' | 'quick_commerce' | 'other';

export type EcPartyMode = 'end_customer' | 'marketplace_operator';

export interface EcMarketplace {
  id: string;
  name: string;                       // "Amazon India"
  type: EcMarketplaceType;
  sellerId: string;                   // free text
  commissionPctDefault: number;       // e.g. 15
  tds194oPct: number;                 // DEFAULT 0.1 · configurable (DP-EC-2 · never hardcoded)
  gstTcsPct: number;                  // configurable per current notification
  partyMode: EcPartyMode;             // DEFAULT 'end_customer' (DP-EC-5) · per-marketplace override
  consolidatedB2CPartyId: string | null; // the "Amazon B2C Customers" ledger party id
  facilityGodownId: string | null;    // Channel↔Facility read-link (DP-EC-8 prep)
  isActive: boolean;
  createdAt: string;
  notes: string;
}

export type EcListingKind = 'simple' | 'kit';

export interface EcKitComponent { storeItemId: string; variantId: string | null; qty: number; }

export interface EcListing {
  id: string;
  marketplaceId: string;
  marketplaceSku: string;             // SKU/ASIN/FSN — unique per marketplace (dedupe key)
  kind: EcListingKind;
  storeItemId: string | null;         // simple: PIM item (variantId optional below)
  variantId: string | null;
  components: EcKitComponent[];       // kit: 1..N components (DP-EC-3)
  status: 'live' | 'paused' | 'unmapped';
  title: string;                      // marketplace-side listing title
  createdAt: string;
  updatedAt: string;
}

export interface EcUnmappedSku {     // the inbox — never silently dropped
  id: string;
  marketplaceId: string;
  marketplaceSku: string;
  sampleTitle: string;
  firstSeenAt: string;
  occurrences: number;
  resolvedListingId: string | null;
}

export type EcColumnKey =
  | 'order_id' | 'order_date' | 'sku' | 'qty' | 'unit_price' | 'line_total'
  | 'buyer_name' | 'buyer_state' | 'buyer_gstin' | 'ship_city' | 'ignore';

export interface EcImportTemplate {
  id: string;
  marketplaceId: string;
  name: string;                       // "Amazon B2C order report"
  columnMap: Record<string, EcColumnKey>; // header text → semantic key
  createdAt: string;
}

export interface EcParseRowError { rowIndex: number; reason: string; raw: string; }

export interface EcParseReport {     // the honest triad (DP-EC-4)
  importId: string;
  fileName: string;
  totalRows: number;
  validRows: number;
  unknownSkuRows: number;
  invalidRows: number;
  errors: EcParseRowError[];          // capped at 200, count always truthful
  createdAt: string;
}

export type EcOrderLayer = 'b2c_consolidated' | 'b2b_matched' | 'b2b_unmatched';

export interface EcOrder {           // link + snapshot (WsStoreOrder pattern) — voucher truth lives in ordersKey
  id: string;
  marketplaceId: string;
  marketplaceOrderId: string;         // idempotent dedupe key (per marketplace)
  importId: string;
  soVoucherId: string | null;         // null ONLY for b2b_unmatched (parked in inbox)
  soDocNo: string | null;
  orderDate: string;
  layer: EcOrderLayer;                // DP-EC-5 dual-layer
  endCustomerName: string;            // captured per voucher (GSTR-1 place of supply)
  endCustomerState: string;
  buyerGstin: string | null;
  matchedPartyId: string | null;      // b2b_matched
  lineCount: number;
  grossAmount: number;
  status: 'booked' | 'parked_unmatched' | 'returned'; // 'returned' set by S154
  createdAt: string;
}

export const ecMarketplacesKey = (e: string) => `ecomx_marketplaces_${e}`;
export const ecListingsKey = (e: string) => `ecomx_listings_${e}`;
export const ecUnmappedKey = (e: string) => `ecomx_unmapped_skus_${e}`;
export const ecTemplatesKey = (e: string) => `ecomx_import_templates_${e}`;
export const ecParseReportsKey = (e: string) => `ecomx_parse_reports_${e}`;
export const ecOrdersKey = (e: string) => `ecomx_orders_${e}`;
/** S153 · sidecar — staged parse rows survive until commitImport consumes them. */
export const ecStagedKey = (e: string, importId: string) => `ecomx_staged_${e}_${importId}`;

/** Staged shape — output of parseOrderFile, input of commitImport. */
export interface EcStagedOrder {
  marketplaceOrderId: string;
  orderDate: string;                  // ISO yyyy-mm-dd
  buyerName: string;
  buyerState: string;
  buyerGstin: string | null;
  lines: Array<{ marketplaceSku: string; qty: number; unitPrice: number; lineTotal: number }>;
}
