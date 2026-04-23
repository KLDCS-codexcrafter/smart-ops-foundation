/**
 * @file     print-render-helpers.ts
 * @purpose  Shared helpers for print-panel renderers — in particular dynamic column-count math for colSpan coordination when line-column toggles hide columns.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created Apr-2026 · T10-pre.2b.3b-B2
 * @sprint   T10-pre.2b.3b-B2
 * @iso      Maintainability (HIGH — colSpan math in one place) · Reliability (HIGH — deterministic)
 * @whom     14 print panels (renderer layer)
 * @depends  print-config.ts (PrintToggles, VoucherTypeCode)
 * @consumers 10 panels with item-line tables: invoice, purchase-invoice, credit-note, debit-note, delivery-note, receipt-note, stock-adjustment, stock-journal, stock-transfer, mfg-journal
 */

import type { PrintToggles, VoucherTypeCode } from '@/types/print-config';

/**
 * @purpose   Count the visible line-item columns for a given voucher type + toggle state.
 * @param     toggles — resolved PrintToggles for this voucher
 * @param     voucherType — which voucher (drives fixed-column baseline)
 * @returns   Integer count of visible columns in the line-items table (used for colSpan math on totals rows)
 * @why-this-approach  [Analytical] colSpan values in totals rows must equal the count of visible columns in the table header/body. Hard-coding colSpan breaks when line-column toggles hide columns. This helper derives it dynamically.
 * @iso       Maintainability (HIGH — single source of col-count logic)
 * @example
 *   // Delivery Note: 8-col table (#, Desc, Qty, UOM, Rate, Value, Godown, Batch)
 *   // If showRate=false + showValue=false → returns 6 (#, Desc, Qty, UOM, Godown, Batch)
 *   const cols = visibleLineColCount(payload.resolved_toggles, 'delivery_note');
 */
export function visibleLineColCount(
  toggles: PrintToggles,
  voucherType: VoucherTypeCode,
): number {
  // [Concrete] Fixed columns per voucher (never toggled) + optional columns gated by toggles.
  // Keep this switch in sync with the panel's actual <thead>.
  switch (voucherType) {
    case 'invoice': {
      // Fixed: #, Description, Qty, Taxable, CGST, SGST, IGST = 7
      // Toggleable: HSN (showHsnSac), Rate (showRate), Discount (showDiscountColumn)
      let cols = 7;
      if (toggles.showHsnSac) cols += 1;
      if (toggles.showRate) cols += 1;
      if (toggles.showDiscountColumn) cols += 1;
      return cols;
    }
    case 'purchase_invoice':
    case 'credit_note':
    case 'debit_note': {
      // Fixed: #, Desc, Qty, Taxable, CGST, SGST, IGST, Total = 8
      // Toggleable: HSN (showHsnSac), Rate (showRate)
      let cols = 8;
      if (toggles.showHsnSac) cols += 1;
      if (toggles.showRate) cols += 1;
      return cols;
    }
    case 'delivery_note':
    case 'receipt_note': {
      // Fixed: #, Desc, Qty, UOM = 4
      // Toggleable: Rate, Value, Godown, Batch
      let cols = 4;
      if (toggles.showRate) cols += 1;
      if (toggles.showValue) cols += 1;
      if (toggles.showGodown) cols += 1;
      if (toggles.showBatch) cols += 1;
      return cols;
    }
    case 'stock_transfer': {
      // Fixed: #, Item, Qty, UOM = 4
      // Toggleable: Godown, Batch
      let cols = 4;
      if (toggles.showGodown) cols += 1;
      if (toggles.showBatch) cols += 1;
      return cols;
    }
    case 'stock_adjustment': {
      // Fixed: #, Item, Direction, Qty, UOM, Reason = 6
      // Toggleable: Godown
      let cols = 6;
      if (toggles.showGodown) cols += 1;
      return cols;
    }
    case 'stock_journal':
    case 'mfg_journal': {
      // stock_journal fixed: #, Item, Qty, UOM = 4
      // mfg_journal fixed:   #, Item Code, Item Name, Qty, UOM = 5
      // Toggleable: Godown
      const baseFixed = voucherType === 'mfg_journal' ? 5 : 4;
      let cols = baseFixed;
      if (toggles.showGodown) cols += 1;
      return cols;
    }
    default:
      // [Critical] GL vouchers (receipt, payment, contra, journal) don't have item-line tables.
      // Safe default returned for symmetry; caller should not rely on this branch.
      return 5;
  }
}
