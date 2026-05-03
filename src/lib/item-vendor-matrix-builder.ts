/**
 * item-vendor-matrix-builder.ts — Compute RFQ matrix
 * Sprint T-Phase-1.2.6f-a · per D-243
 */
import type { ItemVendor } from '@/types/item-vendor';
import type {
  ProcurementEnquiry,
  ProcurementEnquiryLine,
  VendorSelectionMode,
} from '@/types/procurement-enquiry';

export interface MatrixCell {
  line_id: string;
  item_id: string;
  item_name: string;
  vendor_id: string;
  vendor_name: string;
  is_supplier: boolean;
  current_rate: number | null;
  preferred: boolean;
  match_reason: 'product_master' | 'override' | 'preferred';
  override_reason?: string;
}

export interface RFQMatrix {
  enquiry_id: string;
  cells: MatrixCell[];
  rfq_count: number;
  warnings: string[];
}

export interface ItemVendorLookup {
  getByItemId: (itemId: string) => ItemVendor[];
}

export function buildItemVendorMatrix(
  enquiry: ProcurementEnquiry,
  mode: VendorSelectionMode,
  lookup: ItemVendorLookup,
  topNVendorIds: string[] = [],
): RFQMatrix {
  const cells: MatrixCell[] = [];
  const warnings: string[] = [];
  const rfqVendorSet = new Set<string>();

  for (const line of enquiry.lines) {
    const lineMode: VendorSelectionMode = line.vendor_mode_override ?? mode;
    const matched = lookup.getByItemId(line.item_id);
    const filtered = filterByMode(matched, lineMode, topNVendorIds);

    if (filtered.length === 0) {
      warnings.push(`Line ${line.line_no} (${line.item_name}): no matching vendor`);
      continue;
    }

    for (const v of filtered) {
      const vendorId = v.vendor_id ?? v.id;
      cells.push({
        line_id: line.id,
        item_id: line.item_id,
        item_name: line.item_name,
        vendor_id: vendorId,
        vendor_name: v.vendor_name,
        is_supplier: true,
        current_rate: v.current_rate ?? null,
        preferred: v.is_preferred,
        match_reason: v.is_preferred ? 'preferred' : 'product_master',
      });
      rfqVendorSet.add(vendorId);
    }
  }

  // Apply overrides
  for (const ov of enquiry.matrix_overrides) {
    const line: ProcurementEnquiryLine | undefined = enquiry.lines.find((l) => l.id === ov.line_id);
    if (!line) continue;
    cells.push({
      line_id: ov.line_id,
      item_id: line.item_id,
      item_name: line.item_name,
      vendor_id: ov.vendor_id,
      vendor_name: ov.vendor_id,
      is_supplier: false,
      current_rate: null,
      preferred: false,
      match_reason: 'override',
      override_reason: ov.reason,
    });
    rfqVendorSet.add(ov.vendor_id);
  }

  return {
    enquiry_id: enquiry.id,
    cells,
    rfq_count: rfqVendorSet.size,
    warnings,
  };
}

function filterByMode(
  matched: ItemVendor[],
  mode: VendorSelectionMode,
  topNVendorIds: string[],
): ItemVendor[] {
  if (matched.length === 0) return [];
  switch (mode) {
    case 'single': {
      const preferred = matched.find((v) => v.is_preferred);
      return preferred ? [preferred] : [matched[0]];
    }
    case 'scoring':
      return topNVendorIds.length > 0
        ? matched.filter((v) => topNVendorIds.includes(v.vendor_id ?? v.id))
        : matched.slice(0, 3);
    case 'floating':
      return matched;
    default:
      return matched;
  }
}
