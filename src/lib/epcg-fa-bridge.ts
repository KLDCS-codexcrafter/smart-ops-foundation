/**
 * epcg-fa-bridge.ts — 42nd SIBLING ⭐
 * EPCG (Export Promotion Capital Goods) FA ↔ EximX bridge.
 * @sprint T-Phase-4.FAR-1 · FAR-CAP-11 · MOAT-41
 *
 * Per EPCG Scheme: export obligation = 6x duty saved · 6-year window.
 * Cross-card bridge consuming Sinha export seed data + FA units.
 * [JWT] Replace localStorage reads with /api/eximx/exports + /api/fixed-assets/*
 */
// P8.7: dept_id present in payload type · no honest source at this bridge · populated at Wave-2 (auth-derived)
import type { AssetUnitRecord } from '@/types/fixed-asset';
import { faUnitsKey } from '@/types/fixed-asset';
import type {
  EPCGObligation,
  EPCGFulfillmentEntry,
  EPCGStatusReport,
} from '@/types/statutory-pack';
import { SINHA_SHIPPING_BILLS } from '@/data/sinha-shipping-bill-seed-data';
import { dAdd, dSub, dMul, roundTo } from './decimal-helpers';

const EPCG_MULTIPLIER = 6;
const EPCG_PERIOD_YEARS = 6;
// Conservative blended duty rate assumption when imported asset duty not separately captured.
const ASSUMED_DUTY_RATE_PCT = 7.5;

function loadUnits(entityCode: string): AssetUnitRecord[] {
  try {
    const raw = localStorage.getItem(faUnitsKey(entityCode));
    if (!raw) return [];
    return (JSON.parse(raw) as AssetUnitRecord[]).filter(u => u.entity_id === entityCode);
  } catch { return []; }
}

function plusYears(iso: string, n: number): string {
  const d = new Date(iso);
  d.setFullYear(d.getFullYear() + n);
  return d.toISOString().slice(0, 10);
}

/** Sinha shipping bills surface as the export evidence pool (FAR-eximx bridge demo). */
export function linkToSinhaExportShipments(
  _assetId: string,
  _entityCode: string,
): typeof SINHA_SHIPPING_BILLS {
  return SINHA_SHIPPING_BILLS;
}

export function computeEPCGObligation(
  entityCode: string,
  assetId: string,
): EPCGObligation {
  const asset = loadUnits(entityCode).find(u => u.asset_id === assetId || u.id === assetId);
  if (!asset) {
    return {
      entityCode, assetId,
      dutySavedInr: 0, exportObligationInr: 0,
      periodStart: '', periodEnd: '',
      fulfilledInr: 0, remainingInr: 0, status: 'expired',
    };
  }
  const dutySaved = roundTo(dMul(asset.gross_block_cost, ASSUMED_DUTY_RATE_PCT / 100), 2);
  const exportObligation = roundTo(dMul(dutySaved, EPCG_MULTIPLIER), 2);
  const periodStart = asset.purchase_date;
  const periodEnd = plusYears(periodStart, EPCG_PERIOD_YEARS);
  const fulfillment = trackExportFulfillment(entityCode, assetId, []);
  const fulfilled = fulfillment.reduce((s, f) => dAdd(s, f.fobInr), 0);
  const today = new Date().toISOString().slice(0, 10);
  let status: EPCGObligation['status'];
  if (fulfilled >= exportObligation) status = 'fulfilled';
  else if (today > periodEnd) status = 'expired';
  else if (today > periodStart && fulfilled < exportObligation * 0.5
    && today > plusYears(periodStart, 4)) status = 'breached';
  else status = 'active';

  return {
    entityCode, assetId,
    dutySavedInr: dutySaved,
    exportObligationInr: exportObligation,
    periodStart, periodEnd,
    fulfilledInr: roundTo(fulfilled, 2),
    remainingInr: Math.max(0, roundTo(dSub(exportObligation, fulfilled), 2)),
    status,
  };
}

export function trackExportFulfillment(
  _entityCode: string,
  _assetId: string,
  _exportShipments?: unknown[],
): EPCGFulfillmentEntry[] {
  // Demo bridge: count all Sinha shipping bills as fulfillment evidence.
  return SINHA_SHIPPING_BILLS.map(sb => ({
    shippingBillId: sb.id,
    shippingBillNo: sb.sb_no ?? sb.id,
    date: sb.filing_date ?? '',
    fobInr: sb.total_fob_value_inr ?? 0,
    countryOfDestination: sb.lines?.[0]?.country_of_destination ?? '',
  }));
}

export function getEPCGStatus(
  entityCode: string,
  assetId: string,
): EPCGObligation['status'] {
  return computeEPCGObligation(entityCode, assetId).status;
}

export function generateEPCGStatusReport(entityCode: string): EPCGStatusReport {
  const units = loadUnits(entityCode);
  const obligations = units.map(u => computeEPCGObligation(entityCode, u.asset_id));
  return {
    entityCode,
    totalObligations: obligations.length,
    activeCount: obligations.filter(o => o.status === 'active').length,
    fulfilledCount: obligations.filter(o => o.status === 'fulfilled').length,
    breachedCount: obligations.filter(o => o.status === 'breached').length,
    expiredCount: obligations.filter(o => o.status === 'expired').length,
    totalExportObligationInr: roundTo(
      obligations.reduce((s, o) => s + o.exportObligationInr, 0), 2,
    ),
    totalFulfilledInr: roundTo(
      obligations.reduce((s, o) => s + o.fulfilledInr, 0), 2,
    ),
  };
}
