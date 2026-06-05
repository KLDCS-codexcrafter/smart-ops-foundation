/**
 * @file        src/lib/ecomx-recon-engine.ts
 * @purpose     S154 · EcomX Money Suite · DP-EC-6/7/8/9 · marketplace settlement ingestion,
 *              194-O + GST-TCS registers, three-way reconciliation, claims recovery,
 *              returns, channel allocation + stock-file export.
 * @sprint      Sprint 154 · EcomX Money Suite
 * @reads-from  ecomx-engine (CALL ONLY: listMarketplaces · listEcOrders · resolveListing ·
 *              S154-additive markOrderReturned) · audit-trail-engine.logAudit ·
 *              decimal-helpers (money math, no rate literals).
 * @walls       §H 0-DIFF: ecomx-engine's prior 19 exports · webstorex-* ·
 *              party-master-engine · fincore-engine · breadcrumb-memory ·
 *              applications.ts · seed/role files.
 *              DP-EC-6: NO FinCore voucher writes from this engine — posting is a
 *              named [JWT] seam (the journal rider lives outside this file).
 *              Rates: configured tds194oPct/gstTcsPct from the marketplace are used
 *              ONLY to flag rate-anomaly notes — file-reported amounts are NEVER
 *              overwritten. No hardcoded 0.1 / 1.0 literals drive recon math.
 * @JWT         P2BB: real marketplace settlement-report API ingestion ·
 *              FinCore journal rider on commit (settlement-side TDS/TCS receivables).
 */
import type {
  EcSettlementColumnKey, EcSettlementTemplate, EcSettlementRow, EcStagedSettlementRow,
  EcVarianceClass, EcReconLine, EcReconRun,
  EcClaim, EcClaimStatus, EcReturn, EcChannelAllocation,
  EcOrder, EcParseReport, EcParseRowError,
} from '@/types/ecomx';
import {
  ecSettlementTemplatesKey, ecSettlementRowsKey, ecStagedSettlementKey,
  ecReconRunsKey, ecReconLinesKey, ecClaimsKey, ecReturnsKey, ecAllocationsKey,
  ecParseReportsKey,
} from '@/types/ecomx';
import {
  listMarketplaces, listEcOrders, markOrderReturned,
} from '@/lib/ecomx-engine';
import { logAudit } from '@/lib/audit-trail-engine';
import { dAdd, dSub, dMul, round2, dEq } from '@/lib/decimal-helpers';

// ─── tiny LS helpers ─────────────────────────────────────────────────
function ls<T>(key: string): T[] {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function ss<T>(key: string, data: T[]): void {
  // [JWT] POST /api/entity/storage/:key
  localStorage.setItem(key, JSON.stringify(data));
}
function nowIso(nowISO?: string): string { return nowISO ?? new Date().toISOString(); }
function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}
function safeAudit(
  entityCode: string,
  action: 'create' | 'update' | 'cancel',
  recordId: string, label: string,
  before: Record<string, unknown> | null, after: Record<string, unknown> | null,
  reason?: string,
): void {
  try {
    logAudit({
      entityCode, action, entityType: 'webstorex_event',
      recordId, recordLabel: label,
      beforeState: before, afterState: after,
      reason: reason ?? null, sourceModule: 'ecomx-recon-engine',
    });
  } catch { /* D-AUDIT-SAFE */ }
}

// ═══════════════════════════════════════════════════════════════════════
// 2.1 · SETTLEMENT TEMPLATES + SUGGESTER
// ═══════════════════════════════════════════════════════════════════════
export function listSettlementTemplates(
  entityCode: string, marketplaceId?: string,
): EcSettlementTemplate[] {
  const rows = ls<EcSettlementTemplate>(ecSettlementTemplatesKey(entityCode));
  return marketplaceId ? rows.filter((t) => t.marketplaceId === marketplaceId) : rows;
}

export function saveSettlementTemplate(
  entityCode: string,
  input: { id?: string; marketplaceId: string; name: string; columnMap: Record<string, EcSettlementColumnKey> },
  nowISO?: string,
): EcSettlementTemplate {
  const all = ls<EcSettlementTemplate>(ecSettlementTemplatesKey(entityCode));
  if (input.id) {
    const idx = all.findIndex((t) => t.id === input.id);
    if (idx < 0) throw new Error(`Template not found: ${input.id}`);
    const before = { ...all[idx] };
    all[idx] = { ...all[idx], marketplaceId: input.marketplaceId, name: input.name, columnMap: input.columnMap };
    ss(ecSettlementTemplatesKey(entityCode), all);
    safeAudit(entityCode, 'update', all[idx].id, `Settlement template · ${all[idx].name}`,
      before as unknown as Record<string, unknown>,
      all[idx] as unknown as Record<string, unknown>);
    return all[idx];
  }
  const row: EcSettlementTemplate = {
    id: newId('ecst'), marketplaceId: input.marketplaceId, name: input.name,
    columnMap: input.columnMap, createdAt: nowIso(nowISO),
  };
  all.push(row);
  ss(ecSettlementTemplatesKey(entityCode), all);
  safeAudit(entityCode, 'create', row.id, `Settlement template · ${row.name}`,
    null, row as unknown as Record<string, unknown>);
  return row;
}

/** Pure heuristic header-to-semantic-key suggestion. Editable. Never authoritative. */
export function suggestSettlementColumnMap(
  headers: string[],
  type: 'amazon' | 'flipkart' | 'meesho' | 'myntra' | 'jiomart' | 'indiamart' | 'quick_commerce' | 'other',
): Record<string, EcSettlementColumnKey> {
  const map: Record<string, EcSettlementColumnKey> = {};
  for (const raw of headers) {
    const h = raw.trim().toLowerCase();
    let k: EcSettlementColumnKey = 'ignore';
    // Common
    if (/order[\s_-]?id|order\s*no/.test(h)) k = 'order_id';
    else if (/event|type|txn[\s_-]?type/.test(h)) k = 'event_type';
    else if (/^gross|invoice\s*amount|item\s*price\s*total/.test(h)) k = 'gross';
    else if (/commission|marketplace\s*fee/.test(h)) k = 'commission';
    else if (/fixed[\s_-]?fee|closing[\s_-]?fee/.test(h)) k = 'fixed_fee';
    else if (/shipping|delivery\s*fee/.test(h)) k = 'shipping_fee';
    else if (/other[\s_-]?fee|misc/.test(h)) k = 'other_fee';
    else if (/tds|194[\s_-]?o/.test(h)) k = 'tds_194o';
    else if (/tcs|gst[\s_-]?tcs/.test(h)) k = 'gst_tcs';
    else if (/^net|bank\s*settlement\s*value|payable|amount\s*credited/.test(h)) k = 'net';
    else if (/cod|cash\s*on\s*delivery/.test(h)) k = 'cod_flag';
    else if (/return|rto/.test(h)) k = 'return_flag';
    else if (/settle.*date|payment\s*date|disbursal/.test(h)) k = 'settlement_date';
    // Marketplace-specific overrides
    if (type === 'amazon') {
      if (/^total$/.test(h)) k = 'gross';
      if (/^commission$/.test(h)) k = 'commission';
    } else if (type === 'flipkart') {
      if (/bank\s*settlement\s*value/.test(h)) k = 'net';
    }
    map[raw] = k;
  }
  return map;
}

// ═══════════════════════════════════════════════════════════════════════
// 2.2 · PARSE → COMMIT SETTLEMENT FILE (idempotent)
// ═══════════════════════════════════════════════════════════════════════

export interface SettlementParseInput {
  rows: Array<Record<string, string>>;
  fileName: string;
}

function num(s: string | undefined): number {
  if (s === undefined || s === null || s === '') return 0;
  const n = Number(String(s).replace(/[,₹\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
function boolish(s: string | undefined): boolean {
  if (!s) return false;
  const v = s.toString().trim().toLowerCase();
  return v === 'yes' || v === 'y' || v === 'true' || v === '1';
}
function classifyEventType(raw: string | undefined, returnFlag: boolean, codFlag: boolean): EcSettlementRow['eventType'] {
  if (returnFlag) return 'return';
  const v = (raw ?? '').toString().trim().toLowerCase();
  if (/return|refund|rto/.test(v)) return 'return';
  if (codFlag || /cod|remit/.test(v)) return 'cod_remittance';
  if (/sale|order|shipment/.test(v) || v === '') return 'sale';
  return 'other';
}

/**
 * Pure parse: produces an EcParseReport (triad) + stages settlement rows.
 * No persistence of EcSettlementRow until commitSettlementImport runs.
 */
export function parseSettlementFile(
  entityCode: string,
  marketplaceId: string,
  templateId: string,
  input: SettlementParseInput,
  nowISO?: string,
): EcParseReport {
  const tmpl = listSettlementTemplates(entityCode).find((t) => t.id === templateId);
  if (!tmpl) throw new Error(`Settlement template not found: ${templateId}`);
  if (tmpl.marketplaceId !== marketplaceId) {
    throw new Error('Template marketplace mismatch');
  }
  const reverse: Partial<Record<EcSettlementColumnKey, string>> = {};
  for (const [header, key] of Object.entries(tmpl.columnMap)) {
    if (key !== 'ignore' && !reverse[key]) reverse[key] = header;
  }

  const importId = newId('ecsi');
  const errors: EcParseRowError[] = [];
  const staged: EcStagedSettlementRow[] = [];
  let valid = 0, invalid = 0;

  input.rows.forEach((row, i) => {
    try {
      const orderId = (reverse.order_id ? row[reverse.order_id] : '').toString().trim();
      if (!orderId) throw new Error('missing order_id');
      const gross = num(reverse.gross ? row[reverse.gross] : '');
      const commission = num(reverse.commission ? row[reverse.commission] : '');
      const fees = dAdd(
        dAdd(num(reverse.fixed_fee ? row[reverse.fixed_fee] : ''), num(reverse.shipping_fee ? row[reverse.shipping_fee] : '')),
        num(reverse.other_fee ? row[reverse.other_fee] : ''),
      );
      const tds = num(reverse.tds_194o ? row[reverse.tds_194o] : '');
      const tcs = num(reverse.gst_tcs ? row[reverse.gst_tcs] : '');
      const net = num(reverse.net ? row[reverse.net] : '');
      const settleDate = (reverse.settlement_date ? row[reverse.settlement_date] : '').toString().trim();
      const codFlag = boolish(reverse.cod_flag ? row[reverse.cod_flag] : '');
      const returnFlag = boolish(reverse.return_flag ? row[reverse.return_flag] : '');
      const eventRaw = (reverse.event_type ? row[reverse.event_type] : '').toString();
      const eventType = classifyEventType(eventRaw, returnFlag, codFlag);

      staged.push({
        marketplaceOrderId: orderId,
        eventType,
        gross: round2(gross),
        commission: round2(commission),
        fees: round2(fees),
        tds194o: round2(tds),
        gstTcs: round2(tcs),
        net: round2(net),
        settlementDate: settleDate || new Date().toISOString().slice(0, 10),
        codFlag,
        returnFlag,
      });
      valid++;
    } catch (e) {
      invalid++;
      if (errors.length < 200) {
        errors.push({
          rowIndex: i,
          reason: e instanceof Error ? e.message : 'parse_error',
          raw: JSON.stringify(row).slice(0, 200),
        });
      }
    }
  });

  ss(ecStagedSettlementKey(entityCode, importId), staged);

  const report: EcParseReport = {
    importId,
    fileName: input.fileName,
    totalRows: input.rows.length,
    validRows: valid,
    unknownSkuRows: 0, // n/a for settlement parse — settlements key on order_id, not SKU
    invalidRows: invalid,
    errors,
    createdAt: nowIso(nowISO),
  };
  const allReports = ls<EcParseReport>(ecParseReportsKey(entityCode));
  allReports.push(report);
  ss(ecParseReportsKey(entityCode), allReports);
  return report;
}

export interface SettlementCommitResult {
  importId: string;
  inserted: number;
  duplicates: number;
  matched: number;
  unmatched: number;
  returns: number;
}

/**
 * Commit staged settlement rows.
 * Idempotency key: (marketplaceId, marketplaceOrderId, eventType, settlementDate).
 * Re-commit of the same staged file (or merged duplicates) adds ZERO rows.
 */
export function commitSettlementImport(
  entityCode: string,
  marketplaceId: string,
  importId: string,
  nowISO?: string,
): SettlementCommitResult {
  const staged = ls<EcStagedSettlementRow>(ecStagedSettlementKey(entityCode, importId));
  const existingRows = ls<EcSettlementRow>(ecSettlementRowsKey(entityCode));
  const ecOrders = listEcOrders(entityCode, { marketplaceId });
  const ecOrderByOrderId = new Map<string, EcOrder>(
    ecOrders.map((o) => [o.marketplaceOrderId, o]),
  );

  const seenKeys = new Set<string>(
    existingRows
      .filter((r) => r.marketplaceId === marketplaceId)
      .map((r) => `${r.marketplaceOrderId}|${r.eventType}|${r.settlementDate}`),
  );

  let inserted = 0, duplicates = 0, matched = 0, unmatched = 0, returns = 0;
  const fresh: EcSettlementRow[] = [];

  for (const s of staged) {
    const dedupeKey = `${s.marketplaceOrderId}|${s.eventType}|${s.settlementDate}`;
    if (seenKeys.has(dedupeKey)) { duplicates++; continue; }
    seenKeys.add(dedupeKey);

    const ecOrder = ecOrderByOrderId.get(s.marketplaceOrderId) ?? null;
    if (ecOrder) matched++; else unmatched++;

    const row: EcSettlementRow = {
      id: newId('ecsr'),
      settlementImportId: importId,
      marketplaceId,
      marketplaceOrderId: s.marketplaceOrderId,
      ecOrderId: ecOrder?.id ?? null,
      eventType: s.eventType,
      gross: s.gross,
      commission: s.commission,
      fees: s.fees,
      tds194o: s.tds194o,
      gstTcs: s.gstTcs,
      net: s.net,
      settlementDate: s.settlementDate,
      createdAt: nowIso(nowISO),
    };
    fresh.push(row);
    inserted++;

    // 2.2 returns side-effect: append EcReturn + flip EcOrder status via the
    // single additive ecomx-engine export.
    if (s.eventType === 'return' && ecOrder) {
      returns++;
      const allReturns = ls<EcReturn>(ecReturnsKey(entityCode));
      allReturns.push({
        id: newId('ecrt'),
        ecOrderId: ecOrder.id,
        marketplaceId,
        marketplaceOrderId: s.marketplaceOrderId,
        kind: 'customer_return',
        facilityGodownId: null,
        facilityLabel: 'entered manually — Inventory Hub live link is a Phase-2 seam',
        settlementRowId: row.id,
        createdAt: nowIso(nowISO),
      });
      ss(ecReturnsKey(entityCode), allReturns);
      markOrderReturned(entityCode, ecOrder.id);
    }
  }

  if (fresh.length > 0) {
    ss(ecSettlementRowsKey(entityCode), [...existingRows, ...fresh]);
  }
  // Clear sidecar so re-running commit is a no-op
  ss(ecStagedSettlementKey(entityCode, importId), []);

  safeAudit(entityCode, 'create', importId,
    `EcomX settlement commit · ${marketplaceId} · ${inserted} rows`,
    null, { inserted, duplicates, matched, unmatched, returns } as Record<string, unknown>);

  return { importId, inserted, duplicates, matched, unmatched, returns };
}

// ═══════════════════════════════════════════════════════════════════════
// 2.3 · THREE-WAY RECONCILIATION
// ═══════════════════════════════════════════════════════════════════════

function classify(
  bookedGross: number | null,
  settlementGross: number | null,
  variance: number,
  tolerancePaise: number,
  hasReturn: boolean,
): EcVarianceClass {
  if (bookedGross === null && settlementGross !== null) return 'unmatched_settlement';
  if (bookedGross !== null && settlementGross === null) return 'missing_settlement';
  if (hasReturn) return 'return_adjustment';
  const tolRupees = tolerancePaise / 100;
  if (Math.abs(variance) <= tolRupees) return 'clean';
  return variance < 0 ? 'short_pay' : 'over_pay';
}

function withinPeriod(dateISO: string, from: string, to: string): boolean {
  return dateISO >= from && dateISO <= to;
}

export function runRecon(
  entityCode: string,
  marketplaceId: string,
  periodFrom: string,
  periodTo: string,
  tolerancePaise: number = 100,
  nowISO?: string,
): EcReconRun {
  const marketplace = listMarketplaces(entityCode).find((m) => m.id === marketplaceId);
  if (!marketplace) throw new Error(`Marketplace not found: ${marketplaceId}`);

  const bookedEcOrders = listEcOrders(entityCode, { marketplaceId })
    .filter((o) => withinPeriod(o.orderDate, periodFrom, periodTo));
  const allSettlementRows = ls<EcSettlementRow>(ecSettlementRowsKey(entityCode))
    .filter((r) => r.marketplaceId === marketplaceId && withinPeriod(r.settlementDate, periodFrom, periodTo));
  const returns = ls<EcReturn>(ecReturnsKey(entityCode))
    .filter((r) => r.marketplaceId === marketplaceId);
  const returnedOrderIds = new Set(returns.map((r) => r.marketplaceOrderId));

  // Group settlement rows per marketplaceOrderId (multi-event-per-order possible)
  const settlementsByOrder = new Map<string, EcSettlementRow[]>();
  for (const r of allSettlementRows) {
    const arr = settlementsByOrder.get(r.marketplaceOrderId) ?? [];
    arr.push(r);
    settlementsByOrder.set(r.marketplaceOrderId, arr);
  }

  const runId = newId('ecrr');
  const lines: EcReconLine[] = [];
  const counts: Record<EcVarianceClass, number> = {
    clean: 0, short_pay: 0, over_pay: 0,
    return_adjustment: 0, unmatched_settlement: 0, missing_settlement: 0,
  };
  let totalVariance = 0;
  const handled = new Set<string>();

  // Pass A: every booked EcOrder
  for (const ec of bookedEcOrders) {
    const sRows = settlementsByOrder.get(ec.marketplaceOrderId) ?? [];
    handled.add(ec.marketplaceOrderId);
    const settlementGross = sRows.length > 0
      ? sRows.reduce((a, r) => dAdd(a, r.gross), 0) : null;
    const deductions = sRows.length > 0
      ? sRows.reduce((a, r) => dAdd(a, dAdd(dAdd(dAdd(r.commission, r.fees), r.tds194o), r.gstTcs)), 0) : null;
    const netReceived = sRows.length > 0 ? sRows.reduce((a, r) => dAdd(a, r.net), 0) : null;

    // Variance = settlementGross − bookedGross (positive = over_pay, negative = short_pay)
    const variance = settlementGross !== null
      ? round2(dSub(settlementGross, ec.grossAmount))
      : round2(dSub(0, ec.grossAmount));

    const cls = classify(
      ec.grossAmount, settlementGross, variance, tolerancePaise,
      returnedOrderIds.has(ec.marketplaceOrderId),
    );
    counts[cls]++;
    totalVariance = dAdd(totalVariance, variance);

    // Rate-anomaly note (configured % only flags · never overwrites)
    let rateAnomalyNote: string | null = null;
    if (sRows.length > 0) {
      const reportedTds = sRows.reduce((a, r) => dAdd(a, r.tds194o), 0);
      const reportedTcs = sRows.reduce((a, r) => dAdd(a, r.gstTcs), 0);
      const expectedTds = round2(dMul(ec.grossAmount, dMul(marketplace.tds194oPct, 1 / 100)));
      const expectedTcs = round2(dMul(ec.grossAmount, dMul(marketplace.gstTcsPct, 1 / 100)));
      const notes: string[] = [];
      if (!dEq(reportedTds, expectedTds, 2) && expectedTds > 0) {
        notes.push(`194-O reported ₹${reportedTds.toFixed(2)} vs configured ₹${expectedTds.toFixed(2)} (${marketplace.tds194oPct}%)`);
      }
      if (!dEq(reportedTcs, expectedTcs, 2) && expectedTcs > 0) {
        notes.push(`GST-TCS reported ₹${reportedTcs.toFixed(2)} vs configured ₹${expectedTcs.toFixed(2)} (${marketplace.gstTcsPct}%)`);
      }
      if (notes.length > 0) rateAnomalyNote = notes.join(' · ');
    }

    lines.push({
      id: newId('ecrl'),
      reconRunId: runId,
      marketplaceId,
      ecOrderId: ec.id,
      marketplaceOrderId: ec.marketplaceOrderId,
      bookedGross: ec.grossAmount,
      settlementGross,
      deductions,
      netReceived,
      varianceAmount: variance,
      varianceClass: cls,
      rateAnomalyNote,
      claimId: null,
      createdAt: nowIso(nowISO),
    });
  }

  // Pass B: settlement rows with NO booked EcOrder
  for (const [orderId, sRows] of settlementsByOrder.entries()) {
    if (handled.has(orderId)) continue;
    const settlementGross = sRows.reduce((a, r) => dAdd(a, r.gross), 0);
    const deductions = sRows.reduce((a, r) => dAdd(a, dAdd(dAdd(dAdd(r.commission, r.fees), r.tds194o), r.gstTcs)), 0);
    const netReceived = sRows.reduce((a, r) => dAdd(a, r.net), 0);
    const variance = round2(settlementGross);
    counts.unmatched_settlement++;
    totalVariance = dAdd(totalVariance, variance);
    lines.push({
      id: newId('ecrl'),
      reconRunId: runId,
      marketplaceId,
      ecOrderId: null,
      marketplaceOrderId: orderId,
      bookedGross: null,
      settlementGross: round2(settlementGross),
      deductions: round2(deductions),
      netReceived: round2(netReceived),
      varianceAmount: variance,
      varianceClass: 'unmatched_settlement',
      rateAnomalyNote: null,
      claimId: null,
      createdAt: nowIso(nowISO),
    });
  }

  const run: EcReconRun = {
    id: runId,
    marketplaceId,
    periodFrom,
    periodTo,
    tolerancePaise,
    lineCounts: counts,
    totalVariance: round2(totalVariance),
    createdAt: nowIso(nowISO),
  };

  const runs = ls<EcReconRun>(ecReconRunsKey(entityCode));
  runs.push(run);
  ss(ecReconRunsKey(entityCode), runs);
  const allLines = ls<EcReconLine>(ecReconLinesKey(entityCode));
  ss(ecReconLinesKey(entityCode), [...allLines, ...lines]);

  safeAudit(entityCode, 'create', runId,
    `EcomX recon run · ${marketplaceId} · ${periodFrom}…${periodTo}`,
    null, run as unknown as Record<string, unknown>);

  return run;
}

// ═══════════════════════════════════════════════════════════════════════
// 2.4 · REGISTERS + TAX CREDIT ACCUMULATORS
// ═══════════════════════════════════════════════════════════════════════
export function listReconRuns(entityCode: string, marketplaceId?: string): EcReconRun[] {
  const rows = ls<EcReconRun>(ecReconRunsKey(entityCode));
  return marketplaceId ? rows.filter((r) => r.marketplaceId === marketplaceId) : rows;
}

export function listReconLines(
  entityCode: string,
  filter?: { runId?: string; marketplaceId?: string; varianceClass?: EcVarianceClass },
): EcReconLine[] {
  let rows = ls<EcReconLine>(ecReconLinesKey(entityCode));
  if (filter?.runId) rows = rows.filter((r) => r.reconRunId === filter.runId);
  if (filter?.marketplaceId) rows = rows.filter((r) => r.marketplaceId === filter.marketplaceId);
  if (filter?.varianceClass) rows = rows.filter((r) => r.varianceClass === filter.varianceClass);
  return rows;
}

export function listSettlementRows(
  entityCode: string,
  filter?: { marketplaceId?: string; eventType?: EcSettlementRow['eventType'] },
): EcSettlementRow[] {
  let rows = ls<EcSettlementRow>(ecSettlementRowsKey(entityCode));
  if (filter?.marketplaceId) rows = rows.filter((r) => r.marketplaceId === filter.marketplaceId);
  if (filter?.eventType) rows = rows.filter((r) => r.eventType === filter.eventType);
  return rows;
}

export interface TaxCreditSummary {
  tds194oTotal: number;   // 26AS cross-check
  gstTcsTotal: number;    // GSTR-2B Table-8 cross-check
  rowCount: number;
}

export function getTaxCreditSummary(
  entityCode: string,
  marketplaceId?: string,
  periodFrom?: string,
  periodTo?: string,
): TaxCreditSummary {
  let rows = ls<EcSettlementRow>(ecSettlementRowsKey(entityCode));
  if (marketplaceId) rows = rows.filter((r) => r.marketplaceId === marketplaceId);
  if (periodFrom) rows = rows.filter((r) => r.settlementDate >= periodFrom);
  if (periodTo) rows = rows.filter((r) => r.settlementDate <= periodTo);
  const tds = rows.reduce((a, r) => dAdd(a, r.tds194o), 0);
  const tcs = rows.reduce((a, r) => dAdd(a, r.gstTcs), 0);
  return { tds194oTotal: round2(tds), gstTcsTotal: round2(tcs), rowCount: rows.length };
}

// ═══════════════════════════════════════════════════════════════════════
// 2.5 · CLAIMS (append-only statusHistory)
// ═══════════════════════════════════════════════════════════════════════
const CLAIM_ELIGIBLE: EcVarianceClass[] = ['short_pay', 'unmatched_settlement', 'return_adjustment', 'missing_settlement'];

export function createClaimFromLine(
  entityCode: string,
  reconLineId: string,
  note: string,
  nowISO?: string,
): EcClaim {
  const line = ls<EcReconLine>(ecReconLinesKey(entityCode)).find((l) => l.id === reconLineId);
  if (!line) throw new Error(`Recon line not found: ${reconLineId}`);
  if (!CLAIM_ELIGIBLE.includes(line.varianceClass)) {
    throw new Error(`Claim not eligible for varianceClass: ${line.varianceClass}`);
  }
  if (line.claimId) throw new Error(`Claim already exists for line: ${reconLineId}`);

  const ts = nowIso(nowISO);
  const claim: EcClaim = {
    id: newId('eccl'),
    marketplaceId: line.marketplaceId,
    reconLineId: line.id,
    marketplaceOrderId: line.marketplaceOrderId,
    amount: Math.abs(line.varianceAmount),
    reason: `${line.varianceClass} · ${note}`.trim(),
    claimRef: '',
    status: 'open',
    recoveredAmount: 0,
    statusHistory: [{ status: 'open', at: ts, note: note || 'claim created' }],
    createdAt: ts,
  };
  const all = ls<EcClaim>(ecClaimsKey(entityCode));
  all.push(claim);
  ss(ecClaimsKey(entityCode), all);

  // Back-link claimId on the recon line
  const allLines = ls<EcReconLine>(ecReconLinesKey(entityCode));
  const idx = allLines.findIndex((l) => l.id === reconLineId);
  if (idx >= 0) {
    allLines[idx] = { ...allLines[idx], claimId: claim.id };
    ss(ecReconLinesKey(entityCode), allLines);
  }

  safeAudit(entityCode, 'create', claim.id, `EcomX claim · ${claim.marketplaceOrderId}`,
    null, claim as unknown as Record<string, unknown>);
  return claim;
}

export interface UpdateClaimInput {
  status: EcClaimStatus;
  note: string;
  recoveredAmount?: number;
  claimRef?: string;
}

export function updateClaimStatus(
  entityCode: string,
  claimId: string,
  input: UpdateClaimInput,
  nowISO?: string,
): EcClaim {
  if (!input.note || !input.note.trim()) throw new Error('Note is mandatory for claim status change');
  const all = ls<EcClaim>(ecClaimsKey(entityCode));
  const idx = all.findIndex((c) => c.id === claimId);
  if (idx < 0) throw new Error(`Claim not found: ${claimId}`);
  const before = all[idx];
  const ts = nowIso(nowISO);
  // statusHistory append-only — copy old entries verbatim, only append.
  const next: EcClaim = {
    ...before,
    status: input.status,
    claimRef: input.claimRef !== undefined ? input.claimRef : before.claimRef,
    recoveredAmount: input.recoveredAmount !== undefined
      ? round2(input.recoveredAmount)
      : before.recoveredAmount,
    statusHistory: [
      ...before.statusHistory,
      { status: input.status, at: ts, note: input.note.trim() },
    ],
  };
  all[idx] = next;
  ss(ecClaimsKey(entityCode), all);
  safeAudit(entityCode, 'update', next.id, `EcomX claim status · ${next.status}`,
    before as unknown as Record<string, unknown>,
    next as unknown as Record<string, unknown>);
  return next;
}

export function listClaims(
  entityCode: string,
  filter?: { marketplaceId?: string; status?: EcClaimStatus },
): EcClaim[] {
  let rows = ls<EcClaim>(ecClaimsKey(entityCode));
  if (filter?.marketplaceId) rows = rows.filter((r) => r.marketplaceId === filter.marketplaceId);
  if (filter?.status) rows = rows.filter((r) => r.status === filter.status);
  return rows;
}

export interface ClaimsStats {
  openCount: number;
  openAmount: number;
  recoveredAmount: number;
  totalAmount: number;
}
export function getClaimsStats(entityCode: string, marketplaceId?: string): ClaimsStats {
  const all = listClaims(entityCode, marketplaceId ? { marketplaceId } : undefined);
  const openClaims = all.filter((c) => c.status === 'open' || c.status === 'raised');
  return {
    openCount: openClaims.length,
    openAmount: round2(openClaims.reduce((a, c) => dAdd(a, c.amount), 0)),
    recoveredAmount: round2(all.reduce((a, c) => dAdd(a, c.recoveredAmount), 0)),
    totalAmount: round2(all.reduce((a, c) => dAdd(a, c.amount), 0)),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// 2.6 · RETURNS
// ═══════════════════════════════════════════════════════════════════════
export function listReturns(
  entityCode: string,
  filter?: { marketplaceId?: string; kind?: EcReturn['kind'] },
): EcReturn[] {
  let rows = ls<EcReturn>(ecReturnsKey(entityCode));
  if (filter?.marketplaceId) rows = rows.filter((r) => r.marketplaceId === filter.marketplaceId);
  if (filter?.kind) rows = rows.filter((r) => r.kind === filter.kind);
  return rows;
}

// ═══════════════════════════════════════════════════════════════════════
// 2.7 · CHANNEL ALLOCATION + STOCK-FILE EXPORT
// ═══════════════════════════════════════════════════════════════════════
export function listAllocations(
  entityCode: string,
  filter?: { marketplaceId?: string; storeItemId?: string },
): EcChannelAllocation[] {
  let rows = ls<EcChannelAllocation>(ecAllocationsKey(entityCode));
  if (filter?.marketplaceId) rows = rows.filter((r) => r.marketplaceId === filter.marketplaceId);
  if (filter?.storeItemId) rows = rows.filter((r) => r.storeItemId === filter.storeItemId);
  return rows;
}

export interface UpsertAllocationInput {
  id?: string;
  marketplaceId: string;
  storeItemId: string;
  variantId: string | null;
  allocatedQty: number;
  bufferPct: number;
  availableQtyEntered: number | null; // 0.4 adaptive: manual when no engine read exists
}

/**
 * Upsert allocation with Σ-guard (DP-WS-14 pattern).
 * Σ allocatedQty per (storeItemId, variantId) across marketplaces MUST be ≤ availableQtyEntered
 * (per 0.4 adaptive rule — engine-level stock read does not exist).
 */
export function upsertAllocation(
  entityCode: string,
  input: UpsertAllocationInput,
  nowISO?: string,
): EcChannelAllocation {
  if (input.allocatedQty < 0) throw new Error('allocatedQty must be ≥ 0');
  if (input.bufferPct < 0 || input.bufferPct > 100) throw new Error('bufferPct must be 0..100');

  // Reverse-scan listings under this marketplace to denormalize marketplaceSku.
  // We read the listings store directly (call-only on ecomx-engine — no new export added).
  const allListings = ls<{ id: string; marketplaceId: string; marketplaceSku: string; storeItemId: string | null; variantId: string | null; status: string }>(
    `ecomx_listings_${entityCode}`,
  );
  const found = allListings.find((l) =>
    l.marketplaceId === input.marketplaceId &&
    l.storeItemId === input.storeItemId &&
    (l.variantId ?? null) === (input.variantId ?? null),
  );
  if (!found) throw new Error('No listing exists for this storeItem/variant on the marketplace — create the listing first');
  const marketplaceSku = found.marketplaceSku;


  const all = ls<EcChannelAllocation>(ecAllocationsKey(entityCode));

  // Σ-guard across marketplaces for the same (storeItemId, variantId)
  if (input.availableQtyEntered !== null && input.availableQtyEntered !== undefined) {
    let sigma = input.allocatedQty;
    for (const a of all) {
      if (a.storeItemId === input.storeItemId &&
          (a.variantId ?? null) === (input.variantId ?? null) &&
          a.id !== input.id) {
        sigma = dAdd(sigma, a.allocatedQty);
      }
    }
    if (sigma > input.availableQtyEntered) {
      throw new Error(
        `Allocation Σ-guard breach · Σ=${sigma} exceeds available ${input.availableQtyEntered} for storeItem ${input.storeItemId}`,
      );
    }
  }

  const ts = nowIso(nowISO);
  if (input.id) {
    const idx = all.findIndex((a) => a.id === input.id);
    if (idx < 0) throw new Error(`Allocation not found: ${input.id}`);
    const before = { ...all[idx] };
    all[idx] = {
      ...all[idx],
      marketplaceId: input.marketplaceId,
      storeItemId: input.storeItemId,
      variantId: input.variantId,
      marketplaceSku,
      allocatedQty: input.allocatedQty,
      bufferPct: input.bufferPct,
      availableQtyEntered: input.availableQtyEntered,
      updatedAt: ts,
    };
    ss(ecAllocationsKey(entityCode), all);
    safeAudit(entityCode, 'update', all[idx].id, `EcomX allocation · ${marketplaceSku}`,
      before as unknown as Record<string, unknown>,
      all[idx] as unknown as Record<string, unknown>);
    return all[idx];
  }

  const row: EcChannelAllocation = {
    id: newId('ecca'),
    marketplaceId: input.marketplaceId,
    storeItemId: input.storeItemId,
    variantId: input.variantId,
    marketplaceSku,
    allocatedQty: input.allocatedQty,
    bufferPct: input.bufferPct,
    availableQtyEntered: input.availableQtyEntered,
    updatedAt: ts,
  };
  all.push(row);
  ss(ecAllocationsKey(entityCode), all);
  safeAudit(entityCode, 'create', row.id, `EcomX allocation · ${marketplaceSku}`,
    null, row as unknown as Record<string, unknown>);
  return row;
}

export interface StockExportRow { marketplaceSku: string; qty: number; }

/** Build stock-file export rows: qty = floor(allocated × (1 − buffer/100)), zero-floored. */
export function buildStockExportRows(entityCode: string, marketplaceId: string): StockExportRow[] {
  const rows = listAllocations(entityCode, { marketplaceId });
  return rows.map((a) => {
    const factor = dSub(1, dMul(a.bufferPct, 1 / 100));
    const raw = dMul(a.allocatedQty, factor);
    const qty = Math.max(0, Math.floor(raw));
    return { marketplaceSku: a.marketplaceSku, qty };
  });
}
