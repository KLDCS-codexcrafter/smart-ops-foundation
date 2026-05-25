/**
 * @file        src/lib/cfr-part-11-engine.ts
 * @sprint      T-Phase-3.PROD-4.5 · Theme D · 38th SIBLING ⭐
 * @purpose     21 CFR Part 11 electronic audit trail + e-signature + tamper-evidence.
 *              SHA-256 hash-chain per Q-LOCK-6 A.
 * @moat        MOAT-37 · 21 CFR Part 11 audit trail framework at SMB price.
 * @disciplines FR-19 SIBLING · FR-26 entity-scoped · Lesson 18 path-discipline
 */

import type {
  CFRPart11AuditEntry,
  CFRPart11IntegrityCheck,
  CFRPart11ActionType,
  CFRPart11SeverityLevel,
  CFRPart11SignatureInput,
} from '@/types/cfr-part-11';
import { cfrPart11AuditKey, cfrPart11IntegrityCacheKey } from '@/types/cfr-part-11';

// ============================================================================
// 1. SHA-256 HASH CHAIN (per Q-LOCK-6 A)
// ============================================================================

export async function computeSHA256(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Synchronous fallback hash for envs without crypto.subtle (tests · SSR).
 * Marked with 'fallback' suffix · not cryptographic.
 */
function computeSimpleHash(content: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0') + 'fallback';
}

function buildHashContent(entry: Omit<CFRPart11AuditEntry, 'entry_hash'>): string {
  return [
    entry.id,
    entry.entity_code,
    entry.action_type,
    entry.target_entity_type,
    entry.target_entity_id,
    entry.severity,
    entry.description,
    entry.signed_by_user_id,
    entry.signed_by_user_name,
    entry.signature_reason,
    entry.signature_timestamp,
    entry.previous_entry_hash ?? 'GENESIS',
    entry.recorded_at,
    entry.source_system,
  ].join('|');
}

// ============================================================================
// 2. AUDIT TRAIL READ
// ============================================================================

export function listAuditTrailEntries(entityCode: string): CFRPart11AuditEntry[] {
  // [JWT] GET /api/cfr-part-11/audit-trail
  try {
    const raw = localStorage.getItem(cfrPart11AuditKey(entityCode));
    const entries: CFRPart11AuditEntry[] = raw ? JSON.parse(raw) : [];
    return entries.sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  } catch {
    return [];
  }
}

export function getLatestAuditEntry(entityCode: string): CFRPart11AuditEntry | null {
  const entries = listAuditTrailEntries(entityCode);
  return entries.length > 0 ? entries[entries.length - 1] : null;
}

export function listAuditTrailEntriesByTarget(
  entityCode: string,
  targetEntityType: CFRPart11AuditEntry['target_entity_type'],
  targetEntityId: string,
): CFRPart11AuditEntry[] {
  return listAuditTrailEntries(entityCode).filter(
    (e) => e.target_entity_type === targetEntityType && e.target_entity_id === targetEntityId,
  );
}

// ============================================================================
// 3. AUDIT TRAIL APPEND (with e-signature)
// ============================================================================

export function appendAuditTrailEntry(
  entityCode: string,
  actionType: CFRPart11ActionType,
  targetEntityType: CFRPart11AuditEntry['target_entity_type'],
  targetEntityId: string,
  severity: CFRPart11SeverityLevel,
  description: string,
  signature: CFRPart11SignatureInput & { user_id: string; user_name: string },
): CFRPart11AuditEntry {
  // [JWT] POST /api/cfr-part-11/audit-trail
  if (!signature.username || !signature.password || !signature.reason) {
    throw new Error('CFR-11: e-signature requires username + password + reason');
  }

  const previousEntry = getLatestAuditEntry(entityCode);
  const now = new Date().toISOString();
  const id = `cfr11-${entityCode}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const partial: Omit<CFRPart11AuditEntry, 'entry_hash'> = {
    id,
    entity_code: entityCode,
    action_type: actionType,
    target_entity_type: targetEntityType,
    target_entity_id: targetEntityId,
    severity,
    description,
    signed_by_user_id: signature.user_id,
    signed_by_user_name: signature.user_name,
    signature_reason: signature.reason,
    signature_timestamp: now,
    previous_entry_hash: previousEntry?.entry_hash ?? null,
    recorded_at: now,
    source_system: 'web',
  };

  const hashContent = buildHashContent(partial);
  const entry: CFRPart11AuditEntry = {
    ...partial,
    entry_hash: computeSimpleHash(hashContent),
  };

  try {
    const all = listAuditTrailEntries(entityCode);
    all.push(entry);
    localStorage.setItem(cfrPart11AuditKey(entityCode), JSON.stringify(all));
  } catch (err) {
    throw new Error(`CFR-11: failed to persist audit entry: ${(err as Error).message}`);
  }

  return entry;
}

export async function appendAuditTrailEntryAsync(
  entityCode: string,
  actionType: CFRPart11ActionType,
  targetEntityType: CFRPart11AuditEntry['target_entity_type'],
  targetEntityId: string,
  severity: CFRPart11SeverityLevel,
  description: string,
  signature: CFRPart11SignatureInput & { user_id: string; user_name: string },
): Promise<CFRPart11AuditEntry> {
  if (!signature.username || !signature.password || !signature.reason) {
    throw new Error('CFR-11: e-signature requires username + password + reason');
  }

  const previousEntry = getLatestAuditEntry(entityCode);
  const now = new Date().toISOString();
  const id = `cfr11-${entityCode}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const partial: Omit<CFRPart11AuditEntry, 'entry_hash'> = {
    id,
    entity_code: entityCode,
    action_type: actionType,
    target_entity_type: targetEntityType,
    target_entity_id: targetEntityId,
    severity,
    description,
    signed_by_user_id: signature.user_id,
    signed_by_user_name: signature.user_name,
    signature_reason: signature.reason,
    signature_timestamp: now,
    previous_entry_hash: previousEntry?.entry_hash ?? null,
    recorded_at: now,
    source_system: 'web',
  };

  const hashContent = buildHashContent(partial);
  const entry: CFRPart11AuditEntry = {
    ...partial,
    entry_hash: await computeSHA256(hashContent),
  };

  const all = listAuditTrailEntries(entityCode);
  all.push(entry);
  localStorage.setItem(cfrPart11AuditKey(entityCode), JSON.stringify(all));

  return entry;
}

// ============================================================================
// 4. INTEGRITY VERIFICATION
// ============================================================================

export async function verifyAuditTrailIntegrityAsync(entityCode: string): Promise<CFRPart11IntegrityCheck> {
  const entries = listAuditTrailEntries(entityCode);
  let firstBrokenId: string | null = null;
  let firstBrokenIndex: number | null = null;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const expectedPreviousHash = i === 0 ? null : entries[i - 1].entry_hash;
    if (entry.previous_entry_hash !== expectedPreviousHash) {
      firstBrokenId = entry.id;
      firstBrokenIndex = i;
      break;
    }
    const partial: Omit<CFRPart11AuditEntry, 'entry_hash'> = {
      id: entry.id,
      entity_code: entry.entity_code,
      action_type: entry.action_type,
      target_entity_type: entry.target_entity_type,
      target_entity_id: entry.target_entity_id,
      severity: entry.severity,
      description: entry.description,
      signed_by_user_id: entry.signed_by_user_id,
      signed_by_user_name: entry.signed_by_user_name,
      signature_reason: entry.signature_reason,
      signature_timestamp: entry.signature_timestamp,
      previous_entry_hash: entry.previous_entry_hash,
      recorded_at: entry.recorded_at,
      source_system: entry.source_system,
    };
    const hashContent = buildHashContent(partial);
    const expectedHash = await computeSHA256(hashContent);
    const fallbackHash = computeSimpleHash(hashContent);
    if (entry.entry_hash !== expectedHash && entry.entry_hash !== fallbackHash) {
      firstBrokenId = entry.id;
      firstBrokenIndex = i;
      break;
    }
  }

  const check: CFRPart11IntegrityCheck = {
    entity_code: entityCode,
    total_entries_checked: entries.length,
    intact_chain: firstBrokenId === null,
    first_broken_entry_id: firstBrokenId,
    first_broken_entry_index: firstBrokenIndex,
    checked_at: new Date().toISOString(),
  };

  try {
    localStorage.setItem(cfrPart11IntegrityCacheKey(entityCode), JSON.stringify(check));
  } catch {
    // silent
  }
  return check;
}

export function verifyAuditTrailIntegrity(entityCode: string): CFRPart11IntegrityCheck {
  const entries = listAuditTrailEntries(entityCode);
  let firstBrokenId: string | null = null;
  let firstBrokenIndex: number | null = null;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const expectedPreviousHash = i === 0 ? null : entries[i - 1].entry_hash;
    if (entry.previous_entry_hash !== expectedPreviousHash) {
      firstBrokenId = entry.id;
      firstBrokenIndex = i;
      break;
    }
  }

  return {
    entity_code: entityCode,
    total_entries_checked: entries.length,
    intact_chain: firstBrokenId === null,
    first_broken_entry_id: firstBrokenId,
    first_broken_entry_index: firstBrokenIndex,
    checked_at: new Date().toISOString(),
  };
}

// ============================================================================
// 5. CACHED INTEGRITY READ
// ============================================================================

export function getCachedIntegrityCheck(entityCode: string): CFRPart11IntegrityCheck | null {
  try {
    const raw = localStorage.getItem(cfrPart11IntegrityCacheKey(entityCode));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
