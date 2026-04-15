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
