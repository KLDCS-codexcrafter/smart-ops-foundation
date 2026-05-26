/**
 * gst-engine.ts — GST Rate Resolution Hierarchy (4 levels)
 * [JWT] Replace with GET /api/accounting/gst/resolve-rate
 */
import type { InventoryItem } from '@/types/inventory-item';
import type { StockGroup } from '@/types/stock-group';
import type { L3FinancialGroup } from '@/data/finframe-seed-data';

export type GSTType = 'taxable' | 'exempt' | 'nil_rated' | 'non_gst' | 'zero_rated';

export interface GSTRateResult {
  igstRate: number;
  cgstRate: number;
  sgstRate: number;
  cessRate: number;
  gstType: GSTType;
  source: 'item' | 'stock_group' | 'ledger' | 'group' | 'none';
  warn?: boolean;
}

interface LedgerWithGST {
  parentGroupCode: string;
  gstRate: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cessRate: number;
  gstType: GSTType;
}

/**
 * Resolve GST rate using 4-level waterfall:
 * L1: Item → L2: Stock Group → L3: Sales/Purchase Ledger → L4: L3 Group guard
 */
export function resolveGSTRate(
  item: InventoryItem,
  stockGroups: StockGroup[],
  salesLedger: LedgerWithGST,
  l3Groups: L3FinancialGroup[]
): GSTRateResult {
  // Guard: check L3 group gstApplicable
  const l3 = l3Groups.find(g => g.code === salesLedger.parentGroupCode);
  if (l3 && !l3.gstApplicable) {
    return {
      igstRate: 0, cgstRate: 0, sgstRate: 0, cessRate: 0,
      gstType: 'non_gst', source: 'group',
    };
  }

  // Level 1: Stock Item
  if (item.igst_rate !== null && item.igst_rate !== undefined) {
    return {
      igstRate: item.igst_rate,
      cgstRate: item.cgst_rate ?? 0,
      sgstRate: item.sgst_rate ?? 0,
      cessRate: item.cess_rate ?? 0,
      gstType: 'taxable',
      source: 'item',
    };
  }

  // Level 2: Stock Group
  const grp = stockGroups.find(g => g.id === item.stock_group_id);
  if (grp?.igst_rate !== null && grp?.igst_rate !== undefined) {
    return {
      igstRate: grp.igst_rate!,
      cgstRate: grp.cgst_rate ?? 0,
      sgstRate: grp.sgst_rate ?? 0,
      cessRate: grp.cess_rate ?? 0,
      gstType: grp.gst_type ?? 'taxable',
      source: 'stock_group',
    };
  }

  // Level 3: Sales/Purchase Ledger
  if (salesLedger.gstRate > 0) {
    return {
      igstRate: salesLedger.igstRate,
      cgstRate: salesLedger.cgstRate,
      sgstRate: salesLedger.sgstRate,
      cessRate: salesLedger.cessRate,
      gstType: salesLedger.gstType,
      source: 'ledger',
    };
  }

  // No rate found — return 0 with warning
  return {
    igstRate: 0, cgstRate: 0, sgstRate: 0, cessRate: 0,
    gstType: 'taxable', source: 'none', warn: true,
  };
}

// ── ITC Reversal on Capital Sale · Section 18(6) ──────────────────
// Sprint 65 FAR-1 · LEAK-9 closed · additive · existing 3 exports preserved.

import type { AssetUnitRecord } from '@/types/fixed-asset';
import { roundTo } from './decimal-helpers';

/**
 * Proportional ITC reversal on disposal of capital goods per Section 18(6) CGST Act.
 * Formula: ITC × (remaining months in 60-month window) / 60.
 * Compares with output tax on transaction value; higher of the two is the liability.
 */
export function computeITCReversalOnCapitalSale(
  asset: AssetUnitRecord,
  disposalAmount: number,
  disposalDate: string,
): { reversalAmount: number; remainingMonths: number; itcAtPurchase: number } {
  // Assume blended 18% IGST as itcAtPurchase proxy when not separately captured.
  const ASSUMED_GST_RATE = 18;
  const itcAtPurchase = roundTo(asset.gross_block_cost * ASSUMED_GST_RATE / 100, 2);
  const purchase = new Date(asset.put_to_use_date || asset.purchase_date);
  const disposal = new Date(disposalDate);
  const monthsUsed = Math.max(0, Math.floor(
    (disposal.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24 * 30),
  ));
  const remainingMonths = Math.max(0, 60 - monthsUsed);
  const proportional = roundTo(itcAtPurchase * remainingMonths / 60, 2);
  const outputTax = roundTo(disposalAmount * ASSUMED_GST_RATE / 100, 2);
  return {
    reversalAmount: Math.max(proportional, outputTax),
    remainingMonths,
    itcAtPurchase,
  };
}
