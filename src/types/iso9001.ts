/**
 * @file src/types/iso9001.ts
 * @sprint T-Phase-1.A.5.c-QualiCheck-Welder-Vendor-ISO-IQC
 * @decisions D-NEW-BP (ISO 9001 audit document register · 7-clause taxonomy · URL-only)
 * @disciplines FR-22 (kind='document') · FR-30 · FR-50
 * @[JWT] localStorage key: erp_iso9001_${entityCode}
 */

export type Iso9001ClauseId =
  | '4_context'
  | '5_leadership'
  | '6_planning'
  | '7_support'
  | '8_operation'
  | '9_performance'
  | '10_improvement';

export type Iso9001LinkedRecordType =
  | 'ncr' | 'capa' | 'mtc' | 'fai' | 'welder' | 'wpq';

export interface Iso9001LinkedRecord {
  type: Iso9001LinkedRecordType;
  id: string;
}

export interface Iso9001AuditDocument {
  id: string;
  entity_id: string;
  branch_id?: string | null;
  clause: Iso9001ClauseId;
  title: string;
  description?: string | null;
  audit_date: string;
  auditor: string;
  document_url: string;
  linked_records: Iso9001LinkedRecord[];
  created_at: string;
  created_by: string;
}

export const iso9001Key = (e: string): string => `erp_iso9001_${e}`;

export const ISO9001_CLAUSE_LABELS: Record<Iso9001ClauseId, string> = {
  '4_context': '4 · Context of the Organisation',
  '5_leadership': '5 · Leadership',
  '6_planning': '6 · Planning',
  '7_support': '7 · Support',
  '8_operation': '8 · Operation',
  '9_performance': '9 · Performance Evaluation',
  '10_improvement': '10 · Improvement',
};

export const ISO9001_LINKED_TYPE_LABELS: Record<Iso9001LinkedRecordType, string> = {
  ncr: 'NCR', capa: 'CAPA', mtc: 'MTC', fai: 'FAI',
  welder: 'Welder', wpq: 'WPQ',
};
