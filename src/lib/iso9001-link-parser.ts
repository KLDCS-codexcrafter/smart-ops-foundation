/**
 * @file        src/lib/iso9001-link-parser.ts
 * @purpose     Pure parser for ISO 9001 linked-records textarea · "ncr:NCR-001, capa:CAPA-002" → Iso9001LinkedRecord[]
 * @who         QA Manager · Internal Auditor (consumed by Iso9001Capture + Iso9001Register)
 * @when        2026-05-09
 * @sprint      T-Phase-1.A.5.c-T3-AuditFix · Block A
 * @iso         ISO 25010 Maintainability · ISO 27001 Input validation
 * @whom        Audit Owner
 * @decisions   D-NEW-CB (parser extracted out of component file · resolves react-refresh/only-export-components)
 *              · D-NEW-CA (silent-drop policy · invalid entries dropped without throwing)
 * @disciplines FR-19 (sibling extraction · component file stays component-only)
 *              · FR-21 (input validation) · FR-30 (canonical header)
 * @reuses      @/types/iso9001 ISO9001_LINKED_TYPE_LABELS · type-only imports
 * @[JWT]       N/A (pure function · no API · no storage)
 */
import {
  ISO9001_LINKED_TYPE_LABELS,
  type Iso9001LinkedRecord,
  type Iso9001LinkedRecordType,
} from '@/types/iso9001';

export const VALID_LINK_TYPES: Iso9001LinkedRecordType[] =
  Object.keys(ISO9001_LINKED_TYPE_LABELS) as Iso9001LinkedRecordType[];

/** Parse "ncr:NCR-001, capa:CAPA-002" → Iso9001LinkedRecord[] · drops invalid entries silently. */
export function parseLinkedRecordsTextarea(s: string): Iso9001LinkedRecord[] {
  return s.split(',')
    .map((t) => t.trim()).filter(Boolean)
    .map((t) => {
      const [typeRaw, idRaw] = t.split(':').map((p) => p?.trim() ?? '');
      const type = typeRaw.toLowerCase() as Iso9001LinkedRecordType;
      if (!VALID_LINK_TYPES.includes(type) || !idRaw) return null;
      return { type, id: idRaw };
    })
    .filter((r): r is Iso9001LinkedRecord => r !== null);
}
