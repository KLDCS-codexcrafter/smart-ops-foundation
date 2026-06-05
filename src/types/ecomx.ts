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

// ─── S154 · Money Suite (DP-EC-6/7/8/9) ─────────────────────────────────
// ADDITIVE ONLY · all prior exports above this line are 0-DIFF.

export type EcSettlementColumnKey =
  | 'order_id' | 'event_type' | 'gross' | 'commission' | 'fixed_fee'
  | 'shipping_fee' | 'other_fee' | 'tds_194o' | 'gst_tcs' | 'net'
  | 'cod_flag' | 'return_flag' | 'settlement_date' | 'ignore';

export interface EcSettlementTemplate {
  id: string;
  marketplaceId: string;
  name: string;                          // "Flipkart settlement report"
  columnMap: Record<string, EcSettlementColumnKey>;
  createdAt: string;
}

export interface EcSettlementRow {
  id: string;
  settlementImportId: string;
  marketplaceId: string;
  marketplaceOrderId: string;
  ecOrderId: string | null;              // matched EcOrder · null = unmatched_settlement
  eventType: 'sale' | 'return' | 'cod_remittance' | 'other';
  gross: number;
  commission: number;
  fees: number;                          // fixed + shipping + other, summed
  tds194o: number;                       // as reported by the file (cross-check vs configured %)
  gstTcs: number;
  net: number;
  settlementDate: string;                // ISO yyyy-mm-dd
  createdAt: string;
}

/** S154 · staged settlement-side parse rows — cleared at commitSettlementImport. */
export interface EcStagedSettlementRow {
  marketplaceOrderId: string;
  eventType: 'sale' | 'return' | 'cod_remittance' | 'other';
  gross: number;
  commission: number;
  fees: number;
  tds194o: number;
  gstTcs: number;
  net: number;
  settlementDate: string;
  codFlag: boolean;
  returnFlag: boolean;
}

export type EcVarianceClass =
  | 'clean'                              // booked − (commission+fees+taxes) = net, within tolerance
  | 'short_pay' | 'over_pay'
  | 'return_adjustment'
  | 'unmatched_settlement'               // settlement row with no EcOrder
  | 'missing_settlement';                // booked EcOrder with no settlement row (report-time class)

export interface EcReconLine {           // computed, persisted per run for the register
  id: string;
  reconRunId: string;
  marketplaceId: string;
  ecOrderId: string | null;
  marketplaceOrderId: string;
  bookedGross: number | null;
  settlementGross: number | null;
  deductions: number | null;             // commission + fees + tds + tcs
  netReceived: number | null;
  varianceAmount: number;                // signed
  varianceClass: EcVarianceClass;
  rateAnomalyNote: string | null;        // populated when reported TDS/TCS deviates from configured %
  claimId: string | null;
  createdAt: string;
}

export interface EcReconRun {
  id: string;
  marketplaceId: string;
  periodFrom: string;
  periodTo: string;
  tolerancePaise: number;
  lineCounts: Record<EcVarianceClass, number>;
  totalVariance: number;
  createdAt: string;
}

export type EcClaimStatus = 'open' | 'raised' | 'settled' | 'rejected';

export interface EcClaim {               // DP-EC-7 · "recover every rupee"
  id: string;
  marketplaceId: string;
  reconLineId: string;
  marketplaceOrderId: string;
  amount: number;
  reason: string;                        // from varianceClass + user note
  claimRef: string;                      // marketplace-side case/claim id, user-entered
  status: EcClaimStatus;
  recoveredAmount: number;
  statusHistory: { status: EcClaimStatus; at: string; note: string }[];  // append-only
  createdAt: string;
}

export interface EcReturn {              // DP-EC-8
  id: string;
  ecOrderId: string;
  marketplaceId: string;
  marketplaceOrderId: string;
  kind: 'customer_return' | 'courier_rto';
  facilityGodownId: string | null;       // per 0.5 adaptive rule (null → free-text facilityLabel)
  facilityLabel: string;
  settlementRowId: string | null;
  createdAt: string;
}

export interface EcChannelAllocation {   // DP-EC-9
  id: string;
  marketplaceId: string;
  storeItemId: string;
  variantId: string | null;
  marketplaceSku: string;                // via resolveListing, denormalized for export
  allocatedQty: number;
  bufferPct: number;                     // exported qty = floor(allocatedQty × (1 − bufferPct/100))
  availableQtyEntered: number | null;    // per 0.4 adaptive rule (null when live read exists)
  updatedAt: string;
}

export const ecSettlementTemplatesKey = (e: string) => `ecomx_settlement_templates_${e}`;
export const ecSettlementRowsKey = (e: string) => `ecomx_settlement_rows_${e}`;
export const ecStagedSettlementKey = (e: string, importId: string) =>
  `ecomx_staged_settlement_${e}_${importId}`;
export const ecReconRunsKey = (e: string) => `ecomx_recon_runs_${e}`;
export const ecReconLinesKey = (e: string) => `ecomx_recon_lines_${e}`;
export const ecClaimsKey = (e: string) => `ecomx_claims_${e}`;
export const ecReturnsKey = (e: string) => `ecomx_returns_${e}`;
export const ecAllocationsKey = (e: string) => `ecomx_channel_allocations_${e}`;

// ── S155 · Cockpit + Packing Evidence (DP-EC-10/11) · ADDITIVE ─────────
export interface EcPackingEvidence {
  // METADATA ONLY — binary clip is downloaded to the user's machine, NEVER persisted.
  id: string;
  ecOrderId: string;
  marketplaceId: string;
  marketplaceOrderId: string;
  docVaultDocumentId: string;
  fileName: string;
  durationSec: number | null;
  sizeBytes: number;
  capturedVia: 'camera' | 'file_upload';
  note: string;
  createdAt: string;
}

export interface EcCockpitChannelRow {
  marketplaceId: string;
  marketplaceName: string;
  ordersBooked: number;
  grossBooked: number;
  parkedB2B: number;
  returned: number;
  returnsPct: number;             // returned / ordersBooked · 0 when no orders
  lastReconVariance: number | null;
  openClaimsAmount: number;
  recoveredAmount: number;
}

export interface EcCockpit {
  periodFrom: string;
  periodTo: string;
  channels: EcCockpitChannelRow[];
  totals: {
    ordersBooked: number; grossBooked: number; returned: number;
    unmappedSkus: number; parkedB2B: number;
    tds194oCredit: number;        // 26AS cross-check
    gstTcsCredit: number;         // GSTR-2B Table-8 cross-check
    openClaimsAmount: number; recoveredAmount: number;
    evidenceCount: number;
  };
}

export const ecPackingEvidenceKey = (e: string) => `ecomx_packing_evidence_${e}`;


