/**
 * @file        src/types/refurbished-unit.ts
 * @purpose     RefurbishedUnit canonical · Circular economy resale lifecycle · OOB-S29 Tier 2 ⭐
 * @sprint      T-Phase-1.C.1f · Block A.2
 */
import type { AuditEntry } from '@/types/servicedesk';

export type RefurbGrade = 'A' | 'B' | 'C';
export type RefurbAcquisitionType = 'trade_in' | 'warranty_swap' | 'cancellation' | 'b_stock';
export type RefurbStatus = 'in_refurb' | 'ready' | 'sold' | 'recycled';

export interface RefurbishedUnit {
  id: string;
  entity_id: string;
  original_serial: string;
  product_id: string;
  refurb_grade: RefurbGrade;
  acquired_via: RefurbAcquisitionType;
  acquired_at: string;
  refurb_cost_paise: number;
  resale_price_paise: number;
  margin_paise: number;
  status: RefurbStatus;
  sold_at: string | null;
  sold_to_customer_id: string | null;
  recycled_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  audit_trail: AuditEntry[];
}

export const refurbishedUnitKey = (e: string): string =>
  `servicedesk_v1_refurbished_unit_${e}`;
