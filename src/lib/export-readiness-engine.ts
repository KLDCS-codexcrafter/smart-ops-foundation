/**
 * @file        src/lib/export-readiness-engine.ts
 * @purpose     Export readiness validation · LUT + IEC + Foreign Customer gate · Q3=a hard enforcement
 * @sprint      T-Phase-1.EX-7a-ExportPO-ForeignCustomer-DocPack
 */
import type { ExportPurchaseOrder } from '@/types/export-purchase-order';
import type { LUT } from '@/types/lut';
import { LUT_LOCALSTORAGE_KEY } from '@/types/lut';

export interface ExportReadinessResult {
  is_ready: boolean;
  lut_state: 'active' | 'expiring' | 'expired' | 'not_found';
  iec_present: boolean;
  foreign_customer_present: boolean;
  blocking_reasons: string[];
  warnings: string[];
}

export function evaluateExportReadiness(entityCode: string, po: ExportPurchaseOrder): ExportReadinessResult {
  const result: ExportReadinessResult = {
    is_ready: false,
    lut_state: 'not_found',
    iec_present: !!po.related_iec_id,
    foreign_customer_present: !!po.related_foreign_customer_id,
    blocking_reasons: [],
    warnings: [],
  };

  if (!result.iec_present) result.blocking_reasons.push('IEC not linked');
  if (!result.foreign_customer_present) result.blocking_reasons.push('Foreign Customer not linked');

  if (!po.related_lut_id) {
    result.blocking_reasons.push('LUT not linked · status transition blocked');
  } else {
    try {
      const raw = localStorage.getItem(LUT_LOCALSTORAGE_KEY(entityCode));
      const luts: LUT[] = raw ? (JSON.parse(raw) as LUT[]) : [];
      const lut = luts.find((l) => l.id === po.related_lut_id);
      if (!lut) {
        result.lut_state = 'not_found';
        result.blocking_reasons.push('LUT linked but record missing');
      } else if (lut.status === 'active') {
        result.lut_state = 'active';
      } else if (lut.status === 'expiring') {
        result.lut_state = 'expiring';
        result.warnings.push(`LUT expiring · renew before next PO (validity: ${lut.validity_to})`);
      } else if (lut.status === 'expired') {
        result.lut_state = 'expired';
        result.blocking_reasons.push(`LUT expired on ${lut.validity_to} · file renewal`);
      } else {
        result.blocking_reasons.push(`LUT status ${lut.status} · only 'active' allows export PO submission`);
      }
    } catch {
      result.blocking_reasons.push('LUT lookup failed');
    }
  }
  result.is_ready = result.blocking_reasons.length === 0;
  return result;
}
