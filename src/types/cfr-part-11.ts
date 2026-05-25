/**
 * @file        src/types/cfr-part-11.ts
 * @sprint      T-Phase-3.PROD-4.5 · Theme D · Q-LOCK-1 A · 38th SIBLING types
 * @purpose     21 CFR Part 11 electronic audit trail + e-signature type system.
 *              Per FR-26 entity-scoped storage · per Q-LOCK-10 A.
 * @moat        MOAT-37 · 21 CFR Part 11 audit trail framework at SMB price.
 */

export type CFRPart11ActionType =
  | 'batch_release'
  | 'batch_quarantine'
  | 'recipe_create'
  | 'recipe_modify'
  | 'recipe_approve'
  | 'genealogy_export'
  | 'deviation_log'
  | 'capa_log'
  | 'other';

export type CFRPart11SeverityLevel = 'info' | 'warning' | 'critical';

/**
 * Individual audit trail entry · IMMUTABLE once written · hash-chained.
 * Per FDA 21 CFR Part 11 §11.10(e) computer-generated audit trail.
 */
export interface CFRPart11AuditEntry {
  id: string;
  entity_code: string;
  action_type: CFRPart11ActionType;
  target_entity_type: 'process_batch' | 'recipe' | 'genealogy' | 'other';
  target_entity_id: string;
  severity: CFRPart11SeverityLevel;
  description: string;
  // Electronic signature per §11.50 / §11.100
  signed_by_user_id: string;
  signed_by_user_name: string;
  signature_reason: string;
  signature_timestamp: string;
  // Tamper-evidence per §11.10(e) · SHA-256 hash chain
  previous_entry_hash: string | null;
  entry_hash: string;
  // Metadata
  recorded_at: string;
  source_system: 'web' | 'mobile' | 'system';
}

export interface CFRPart11IntegrityCheck {
  entity_code: string;
  total_entries_checked: number;
  intact_chain: boolean;
  first_broken_entry_id: string | null;
  first_broken_entry_index: number | null;
  checked_at: string;
}

export interface CFRPart11SignatureInput {
  username: string;
  password: string;
  reason: string;
}

// Entity-scoped storage keys per FR-26
export const cfrPart11AuditKey = (entityCode: string): string =>
  `cfr_part_11_audit_${entityCode}`;

export const cfrPart11IntegrityCacheKey = (entityCode: string): string =>
  `cfr_part_11_integrity_${entityCode}`;
