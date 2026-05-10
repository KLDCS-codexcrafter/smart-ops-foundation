/**
 * @file        src/types/bom-entry.ts
 * @purpose     EngineeringX BOM entry canonical schema · own entity · NOT FR-73 consumer
 * @sprint      T-Phase-1.A.12 EngineeringX BOM-from-Drawing + Reference Project Library · Q-LOCK-2a · Block A.1
 * @decisions   Path B own entity · D-NEW-CP DocumentTag custom_tags engineering metadata pattern (REGISTER 14th canonical) ·
 *              D-NEW-BV Phase 1 mock · FR-11 SSOT
 * @disciplines FR-29 · FR-30 · FR-33 · FR-50
 * @reuses      types/docvault.ts (drawing_id raw FK · zero-touch)
 * @[JWT]       Schema for /api/engineeringx/bom (Phase 2)
 */

export type BomEntryStatus = 'draft' | 'confirmed' | 'obsolete';

export interface BomEntryAuditEntry {
  ts: string;
  user_id: string;
  user_name: string;
  action: 'created' | 'updated' | 'deleted' | 'extracted' | 'confirmed' | 'obsoleted';
  payload?: Record<string, unknown>;
}

export interface BomEntry {
  id: string;
  entity_id: string;
  drawing_id: string;
  material_code: string;
  description: string;
  qty: number;
  unit: string;
  item_no: string;
  status: BomEntryStatus;
  audit_log: BomEntryAuditEntry[];
  created_at: string;
  updated_at: string;
}

export type CreateBomEntryInput = Omit<
  BomEntry,
  'id' | 'audit_log' | 'created_at' | 'updated_at' | 'status'
> & {
  status?: BomEntryStatus;
};

export function bomEntriesKey(entityCode: string): string {
  return `erp_engineeringx_bom_${entityCode}`;
}

export function bomLineSubtotal(entry: Pick<BomEntry, 'qty'>): number {
  return entry.qty;
}
