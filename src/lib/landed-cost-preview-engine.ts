/**
 * @file        src/lib/landed-cost-preview-engine.ts
 * @purpose     Landed Cost Preview · 3-bucket structure · preview-only · NO GL commit
 * @sprint      T-Phase-1.EX-3-ImportPO-ForeignVendor-DualRate
 * @decisions   EX-3-Q11=a preview-only · EX-3-Q8=a FK to EX-2 via existing engines
 * @disciplines FR-30 · FR-50
 */
import type { ImportPurchaseOrder } from '@/types/import-purchase-order';
import { resolveDutyStructure, totalBucketDuty } from '@/lib/cth-resolver';
import { checkCAROTARPreference } from '@/lib/fta-checker';

export interface LandedCostLinePreview {
  line_id: string;
  cth_code: string;
  country_code: string;
  basic_value_inr: number;
  bucket_customs_inr: number;
  bucket_other_inr: number;
  bucket_gst_inr: number;
  total_landed_inr: number;
  fta_savings_inr: number;
  warnings: string[];
}

export interface LandedCostPreview {
  po_id: string;
  lines: LandedCostLinePreview[];
  total_basic_inr: number;
  total_customs_inr: number;
  total_other_inr: number;
  total_gst_inr: number;
  total_landed_inr: number;
  total_fta_savings_inr: number;
  notes: string[];
}

// preview-only · no commit · NO GL impact
export function previewLandedCost(
  entityCode: string,
  po: ImportPurchaseOrder,
  effectiveRate: number,
): LandedCostPreview {
  const lines: LandedCostLinePreview[] = po.lines.map((line) => {
    const basic_value_inr = line.basic_value_foreign * effectiveRate;
    const ds = resolveDutyStructure(entityCode, line.cth_code, line.country_of_origin, po.po_date);
    if (!ds) {
      return {
        line_id: line.id, cth_code: line.cth_code, country_code: line.country_of_origin,
        basic_value_inr, bucket_customs_inr: 0, bucket_other_inr: 0, bucket_gst_inr: 0,
        total_landed_inr: basic_value_inr, fta_savings_inr: 0,
        warnings: [`No duty structure found for ${line.cth_code} × ${line.country_of_origin}`],
      };
    }
    const customs = totalBucketDuty(ds.buckets[0], basic_value_inr);
    const other = totalBucketDuty(ds.buckets[1], basic_value_inr);
    const gst = totalBucketDuty(ds.buckets[2], basic_value_inr + customs + other);
    const carotar = line.fta_agreement
      ? checkCAROTARPreference(entityCode, line.cth_code, line.country_of_origin, po.po_date, ds.buckets[0].bcd_rate)
      : null;
    const fta_savings_inr = carotar?.is_eligible
      ? ((carotar.standard_rate - (carotar.preferential_rate ?? 0)) / 100) * basic_value_inr
      : 0;
    return {
      line_id: line.id, cth_code: line.cth_code, country_code: line.country_of_origin,
      basic_value_inr, bucket_customs_inr: customs, bucket_other_inr: other, bucket_gst_inr: gst,
      total_landed_inr: basic_value_inr + customs + other + gst - fta_savings_inr,
      fta_savings_inr, warnings: [],
    };
  });

  const total_basic_inr = lines.reduce((s, l) => s + l.basic_value_inr, 0);
  const total_customs_inr = lines.reduce((s, l) => s + l.bucket_customs_inr, 0);
  const total_other_inr = lines.reduce((s, l) => s + l.bucket_other_inr, 0);
  const total_gst_inr = lines.reduce((s, l) => s + l.bucket_gst_inr, 0);
  const total_landed_inr = lines.reduce((s, l) => s + l.total_landed_inr, 0);
  const total_fta_savings_inr = lines.reduce((s, l) => s + l.fta_savings_inr, 0);

  return {
    po_id: po.id, lines,
    total_basic_inr, total_customs_inr, total_other_inr, total_gst_inr,
    total_landed_inr, total_fta_savings_inr,
    notes: ['PREVIEW ONLY · no GL commit · BoE filing (EX-6) commits to ledger'],
  };
}
