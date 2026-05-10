/**
 * @file        src/types/engineering-drawing.ts
 * @purpose     EngineeringX Drawing type aliases · DocVault Document is canonical SSOT (FR-73 5th consumer at A.11)
 * @who         Engineering · Production · Procurement · QualiCheck
 * @when        2026-05-10
 * @sprint      T-Phase-1.A.11 EngineeringX Drawing Register + Version Control · Q-LOCK-1a + Q-LOCK-2a · Block A · 5th FR-73 consumer registration · refactor from A.10 own-schema to DocVault Hub-and-Spoke
 * @iso         ISO 9001:2015 §7.5 · ISO/IEC 27001 · ISO 25010 Maintainability + Compatibility
 * @whom        Audit Owner · Engineering Lead · Document Controller
 * @decisions   FR-73 Hub-and-Spoke (5th consumer · A.11 registration · Path A confirmed) ·
 *              D-NEW-CO drawing version supersession workflow (NEW canonical at A.11 · 13th) ·
 *              D-NEW-BV Phase 1 mock · FR-11 SSOT · FR-13 Cards Render Replicas
 * @disciplines FR-29 · FR-30 · FR-33
 * @reuses      types/docvault.ts canonical (ABSOLUTE zero touch · FR-73 Hub)
 * @[JWT]       Schema for /api/docvault/documents (Phase 2 · drawings stored as Documents)
 */
import type { Document, DocumentVersion } from './docvault';

/**
 * EngineeringDrawing is now an ALIAS for DocVault Document (FR-73 5th consumer · A.11).
 * Engineering-specific metadata stored in DocumentTag.custom_tags via key:value strings.
 */
export type EngineeringDrawing = Document;
export type DrawingVersion = DocumentVersion;

export type DrawingType =
  | 'assembly'
  | 'part'
  | 'p_and_id'
  | 'electrical'
  | 'civil'
  | 'other';

export const DRAWING_TYPE_LABELS: Record<DrawingType, string> = {
  assembly: 'Assembly',
  part: 'Part',
  p_and_id: 'P&ID',
  electrical: 'Electrical',
  civil: 'Civil',
  other: 'Other',
};

export const DRAWING_STATUS_COLORS: Record<string, string> = {
  draft:      'bg-slate-500/10 text-slate-700 border-slate-500/30',
  submitted:  'bg-blue-500/10 text-blue-700 border-blue-500/30',
  approved:   'bg-green-500/10 text-green-700 border-green-500/30',
  superseded: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  rejected:   'bg-red-500/10 text-red-700 border-red-500/30',
  obsolete:   'bg-gray-500/10 text-gray-700 border-gray-500/30',
};

/**
 * Drawing custom_tags keys · institutional convention · FR-73.10 sentinel cite preservation.
 */
export const DRAWING_CUSTOM_TAG_KEYS = {
  drawing_no: 'drawing_no',
  drawing_subtype: 'drawing_subtype',
  drawing_revision: 'drawing_revision',
  bom_extracted: 'bom_extracted',
  ai_similarity_signature: 'ai_similarity_signature',
} as const;

export type DrawingCustomTagKey = keyof typeof DRAWING_CUSTOM_TAG_KEYS;

export function buildDrawingCustomTags(
  meta: Partial<Record<DrawingCustomTagKey, string>>,
): string[] {
  return Object.entries(meta)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}:${v}`);
}

export function parseDrawingCustomTags(
  customTags: string[] | undefined,
): Partial<Record<DrawingCustomTagKey, string>> {
  if (!customTags) return {};
  const out: Partial<Record<DrawingCustomTagKey, string>> = {};
  for (const tag of customTags) {
    const [k, ...rest] = tag.split(':');
    if (k && rest.length > 0 && (k in DRAWING_CUSTOM_TAG_KEYS)) {
      out[k as DrawingCustomTagKey] = rest.join(':');
    }
  }
  return out;
}
