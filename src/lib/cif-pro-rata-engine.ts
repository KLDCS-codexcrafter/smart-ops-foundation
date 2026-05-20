/**
 * @file        src/lib/cif-pro-rata-engine.ts
 * @purpose     9-Column CIF Pro-Rata Engine · 6 bases (founder caveat resolution) · Moat #9 ANCHOR
 * @sprint      T-Phase-1.EX-5-CommercialInvoice-6PartAllocation-CIFWaterfall
 * @decisions   EX-5-Q3=b-expanded 6 pro-rata bases (Value · Weight · Volume · Quantity · Equal · Specific Assignment)
 * @disciplines FR-30 · FR-50 · FR-80 exhaustive switch on basis (6 cases)
 */
import type {
  CIFProRataBasis,
  CIFWaterfallInputLine,
  CIFWaterfallVoucherTotals,
  CIFWaterfallRow,
} from '@/types/cif-waterfall';

export function computeProRataRatios(
  lines: CIFWaterfallInputLine[],
  basis: CIFProRataBasis,
): number[] {
  switch (basis) {
    case 'value': {
      const total = lines.reduce((s, l) => s + l.fob_value_inr, 0);
      return total > 0 ? lines.map((l) => l.fob_value_inr / total) : lines.map(() => 0);
    }
    case 'weight': {
      const total = lines.reduce((s, l) => s + l.gross_weight_kgs, 0);
      return total > 0 ? lines.map((l) => l.gross_weight_kgs / total) : lines.map(() => 0);
    }
    case 'volume': {
      const total = lines.reduce((s, l) => s + l.volume_cbm, 0);
      return total > 0 ? lines.map((l) => l.volume_cbm / total) : lines.map(() => 0);
    }
    case 'quantity': {
      const total = lines.reduce((s, l) => s + l.qty, 0);
      return total > 0 ? lines.map((l) => l.qty / total) : lines.map(() => 0);
    }
    case 'equal': {
      const r = lines.length > 0 ? 1 / lines.length : 0;
      return lines.map(() => r);
    }
    case 'specific_assignment': {
      const totalPct = lines.reduce((s, l) => s + (l.specific_assignment_pct ?? 0), 0);
      return totalPct > 0
        ? lines.map((l) => (l.specific_assignment_pct ?? 0) / totalPct)
        : lines.map(() => 0);
    }
    default: {
      const _exhaustive: never = basis;
      return _exhaustive;
    }
  }
}

export function computeCIFWaterfall(
  lines: CIFWaterfallInputLine[],
  voucherTotals: CIFWaterfallVoucherTotals,
  basis: CIFProRataBasis,
  customExchangeRate: number,
): CIFWaterfallRow[] {
  const ratios = computeProRataRatios(lines, basis);
  return lines.map((line, i) => {
    const ratio = ratios[i] ?? 0;
    const cost_base_inr = line.cost_forex * customExchangeRate;
    const insurance_inr = voucherTotals.voucher_insurance_inr * ratio;
    const freight_inr = voucherTotals.voucher_freight_inr * ratio;
    const exworks_inr = voucherTotals.voucher_exworks_inr * ratio;
    const packing_inr = voucherTotals.voucher_packing_inr * ratio;
    const cif_total_inr = cost_base_inr + insurance_inr + freight_inr + exworks_inr + packing_inr;
    return {
      line_id: line.line_id,
      qty: line.qty,
      rate_forex: line.rate_forex,
      cost_forex: line.cost_forex,
      cost_base_inr: Number(cost_base_inr.toFixed(2)),
      insurance_inr: Number(insurance_inr.toFixed(2)),
      freight_inr: Number(freight_inr.toFixed(2)),
      exworks_inr: Number(exworks_inr.toFixed(2)),
      packing_inr: Number(packing_inr.toFixed(2)),
      cif_total_inr: Number(cif_total_inr.toFixed(2)),
      basis,
      allocation_ratio: Number(ratio.toFixed(6)),
    };
  });
}
