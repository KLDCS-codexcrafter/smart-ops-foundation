/**
 * @file        src/lib/master-replication-engine.ts
 * @sibling     NEW @ Sprint 96 · Arc 0 Master Data Foundation kickoff
 * @realizes    Tally TDL Mechanism A · "Create In All Company?" prompt-on-save
 *              applied uniformly to: Item · Customer · Vendor · Ledger ·
 *              Stock Group · Stock Category · Voucher Type · Unit
 * Covers:      Prompt-on-save QUERYBOX pattern (Tally TDL Form Accept hook)
 *              Persistent preference per master per entity (Q2=C)
 *              Walk-collection pattern (skip current entity · iterate siblings)
 *              Auto-seed on new entity (REVERSE: pull all existing group masters)
 *              Conflict detection (pre-save check against existing canonical)
 *              Owner-company tagging (Tally TDL $OwnerCompany pattern)
 * @reads-from  mock-entities · entity-setup-service (USE-SITE READS · §H 0-DIFF)
 * @sprint      Sprint 96 · T-Phase-6.A.0.1 · Arc 0 foundation
 * [JWT] Phase 8: POST /api/master-replication/{prompt,replicate,seed,conflict}
 */
import { loadEntities } from '@/data/mock-entities';
import { logAudit } from '@/lib/audit-trail-engine';
import { registerAuditEntityType } from '@/lib/comply360-audit-trail-aggregator-engine';

export const READS_FROM = {
  engines: ['mock-entities', 'entity-setup-service'],
  storage_keys: ['erp_group_*', 'erp_<entity>_master_repl_pref_*', 'erp_<entity>_master_<type>'],
} as const;

// ─── Q-LOCK S96-3 · Register 3 owned audit entity types under 'mca-roc' ───
registerAuditEntityType({ id: 'master_replication_event',   module: 'mca-roc', label: 'Master Replication Event' });
registerAuditEntityType({ id: 'master_conflict_resolution', module: 'mca-roc', label: 'Master Conflict Resolution' });
registerAuditEntityType({ id: 'master_sync_run',            module: 'mca-roc', label: 'Master Sync Run' });

// ─── Contract types ────────────────────────────────────────────────────

export type MasterType =
  | 'item' | 'customer' | 'vendor' | 'ledger'
  | 'stock_group' | 'stock_category' | 'voucher_type' | 'unit';

export const ALL_MASTER_TYPES: readonly MasterType[] = [
  'item', 'customer', 'vendor', 'ledger',
  'stock_group', 'stock_category', 'voucher_type', 'unit',
] as const;

export interface MasterReplicationPreference {
  master_type: MasterType;
  entity_code: string;
  mode: 'always_prompt' | 'always_replicate' | 'never_replicate';
  remembered_choice?: boolean;
  updated_at: string;
}

export interface MasterConflict {
  master_type: MasterType;
  source_entity: string;
  target_entity: string;
  field: string;
  source_value: unknown;
  existing_value: unknown;
  resolution: 'pending';
}

export interface ReplicationResult {
  master_type: MasterType;
  source_entity: string;
  targets_attempted: string[];
  targets_succeeded: string[];
  targets_skipped: { entity_code: string; reason: 'conflict' | 'preference_off' }[];
  conflicts: MasterConflict[];
  run_id: string;
}

// ─── Key helpers (FR-26 entity-scoped) ────────────────────────────────

const prefKey = (entity_code: string, master_type: MasterType): string =>
  `erp_${entity_code}_master_repl_pref_${master_type}`;

const entityMasterKey = (entity_code: string, master_type: MasterType): string =>
  `erp_${entity_code}_master_${master_type}`;

const newRunId = (): string =>
  `mrr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

function safeRead<T>(key: string, fallback: T): T {
  try {
    // [JWT] GET /api/master-replication/...
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function safeWrite(key: string, value: unknown): void {
  try {
    // [JWT] POST /api/master-replication/...
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota silent */ }
}

// ─── Preference persistence ───────────────────────────────────────────

export function getPreference(
  entity_code: string, master_type: MasterType,
): MasterReplicationPreference {
  const stored = safeRead<MasterReplicationPreference | null>(prefKey(entity_code, master_type), null);
  if (stored) return stored;
  return {
    master_type,
    entity_code,
    mode: 'always_prompt',
    updated_at: new Date().toISOString(),
  };
}

export function setPreference(pref: MasterReplicationPreference): MasterReplicationPreference {
  const next: MasterReplicationPreference = { ...pref, updated_at: new Date().toISOString() };
  safeWrite(prefKey(pref.entity_code, pref.master_type), next);
  return next;
}

// ─── promptCreateInAll (Tally TDL QUERYBOX hook) ──────────────────────

export function promptCreateInAll(input: {
  master_type: MasterType;
  current_entity: string;
}): { should_prompt: boolean; default_answer: boolean; preference: MasterReplicationPreference } {
  const preference = getPreference(input.current_entity, input.master_type);
  let should_prompt = false;
  let default_answer = false;
  switch (preference.mode) {
    case 'always_prompt':
      should_prompt = true;
      default_answer = preference.remembered_choice ?? false;
      break;
    case 'always_replicate':
      should_prompt = false;
      default_answer = true;
      break;
    case 'never_replicate':
      should_prompt = false;
      default_answer = false;
      break;
  }
  return { should_prompt, default_answer, preference };
}

// ─── Walk-collection (skip source) ────────────────────────────────────

export function siblingEntities(source_entity: string): string[] {
  return loadEntities()
    .map((e) => e.shortCode)
    .filter((c) => c && c !== source_entity);
}

// ─── Conflict detection ───────────────────────────────────────────────

function getMasterKey(record: Record<string, unknown>): string {
  const candidate = (record.id ?? record.code ?? record.name ?? record.key) as unknown;
  return candidate != null ? String(candidate) : '';
}

export function detectConflicts(input: {
  master_type: MasterType;
  master_record: Record<string, unknown>;
  source_entity: string;
  target_entity: string;
}): MasterConflict[] {
  const key = getMasterKey(input.master_record);
  if (!key) return [];
  const existing = safeRead<Record<string, unknown>[]>(
    entityMasterKey(input.target_entity, input.master_type), [],
  );
  const collision = existing.find((m) => getMasterKey(m) === key);
  if (!collision) return [];
  const conflicts: MasterConflict[] = [];
  for (const field of Object.keys(input.master_record)) {
    if (field === 'owner_company') continue;
    const src = input.master_record[field];
    const tgt = (collision as Record<string, unknown>)[field];
    if (JSON.stringify(src) !== JSON.stringify(tgt)) {
      conflicts.push({
        master_type: input.master_type,
        source_entity: input.source_entity,
        target_entity: input.target_entity,
        field,
        source_value: src,
        existing_value: tgt,
        resolution: 'pending',
      });
    }
  }
  return conflicts;
}

// ─── Replicate to all sibling entities ────────────────────────────────

export function replicateToAllEntities(input: {
  master_type: MasterType;
  master_record: Record<string, unknown>;
  source_entity: string;
  respect_preferences: boolean;
}): ReplicationResult {
  const run_id = newRunId();
  const targets = siblingEntities(input.source_entity);
  const targets_succeeded: string[] = [];
  const targets_skipped: { entity_code: string; reason: 'conflict' | 'preference_off' }[] = [];
  const allConflicts: MasterConflict[] = [];

  const stamped: Record<string, unknown> = {
    ...input.master_record,
    owner_company: input.source_entity,
  };
  const key = getMasterKey(stamped);

  for (const target of targets) {
    if (input.respect_preferences) {
      const targetPref = getPreference(target, input.master_type);
      if (targetPref.mode === 'never_replicate') {
        targets_skipped.push({ entity_code: target, reason: 'preference_off' });
        continue;
      }
    }
    const conflicts = detectConflicts({
      master_type: input.master_type,
      master_record: stamped,
      source_entity: input.source_entity,
      target_entity: target,
    });
    if (conflicts.length > 0) {
      allConflicts.push(...conflicts);
      targets_skipped.push({ entity_code: target, reason: 'conflict' });
      for (const c of conflicts) {
        logAudit({
          entityCode: target,
          action: 'create',
          entityType: 'master_conflict_resolution',
          recordId: `${run_id}_${c.field}`,
          recordLabel: `Conflict ${input.master_type}/${key} field=${c.field}`,
          beforeState: { existing: c.existing_value },
          afterState: { proposed: c.source_value, resolution: 'pending' },
          sourceModule: 'master-replication-engine',
        });
      }
      continue;
    }
    const existing = safeRead<Record<string, unknown>[]>(
      entityMasterKey(target, input.master_type), [],
    );
    // Idempotent: if same key already present (no conflict means equal), skip duplicate insert.
    const already = existing.some((m) => getMasterKey(m) === key);
    if (!already) {
      safeWrite(entityMasterKey(target, input.master_type), [...existing, stamped]);
    }
    targets_succeeded.push(target);
  }

  const result: ReplicationResult = {
    master_type: input.master_type,
    source_entity: input.source_entity,
    targets_attempted: targets,
    targets_succeeded,
    targets_skipped,
    conflicts: allConflicts,
    run_id,
  };

  logAudit({
    entityCode: input.source_entity,
    action: 'create',
    entityType: 'master_replication_event',
    recordId: run_id,
    recordLabel: `Replicate ${input.master_type}/${key} → ${targets.length} sibling(s)`,
    beforeState: null,
    afterState: { result },
    sourceModule: 'master-replication-engine',
  });

  return result;
}

// ─── Reverse-seed for a newly created entity (USE-SITE READ only) ─────
// Reads existing per-entity group masters across the registry and seeds
// the new entity. Does NOT touch entity-setup-service.ts (§H 0-DIFF).

export function seedAllMastersForNewEntity(input: {
  new_entity_code: string;
  master_types?: MasterType[];
}): ReplicationResult[] {
  const types = input.master_types ?? [...ALL_MASTER_TYPES];
  const results: ReplicationResult[] = [];
  const sourceEntities = loadEntities()
    .map((e) => e.shortCode)
    .filter((c) => c && c !== input.new_entity_code);

  for (const master_type of types) {
    const run_id = newRunId();
    const targets_succeeded: string[] = [];
    const targets_skipped: { entity_code: string; reason: 'conflict' | 'preference_off' }[] = [];
    const allConflicts: MasterConflict[] = [];

    // Aggregate canonical set from all source entities (de-duped by key).
    const aggregate = new Map<string, Record<string, unknown>>();
    for (const src of sourceEntities) {
      const list = safeRead<Record<string, unknown>[]>(entityMasterKey(src, master_type), []);
      for (const rec of list) {
        const k = getMasterKey(rec);
        if (!k) continue;
        if (!aggregate.has(k)) {
          aggregate.set(k, { ...rec, owner_company: rec.owner_company ?? src });
        }
      }
    }

    const existing = safeRead<Record<string, unknown>[]>(
      entityMasterKey(input.new_entity_code, master_type), [],
    );
    const existingKeys = new Set(existing.map(getMasterKey));
    const toAppend: Record<string, unknown>[] = [];
    for (const [k, rec] of aggregate.entries()) {
      if (existingKeys.has(k)) {
        targets_skipped.push({ entity_code: input.new_entity_code, reason: 'conflict' });
        continue;
      }
      toAppend.push(rec);
      targets_succeeded.push(k);
    }
    if (toAppend.length > 0) {
      safeWrite(entityMasterKey(input.new_entity_code, master_type), [...existing, ...toAppend]);
    }

    const result: ReplicationResult = {
      master_type,
      source_entity: '__aggregate__',
      targets_attempted: [input.new_entity_code],
      targets_succeeded,
      targets_skipped,
      conflicts: allConflicts,
      run_id,
    };
    results.push(result);

    logAudit({
      entityCode: input.new_entity_code,
      action: 'create',
      entityType: 'master_sync_run',
      recordId: run_id,
      recordLabel: `Seed ${master_type} for new entity ${input.new_entity_code} (${toAppend.length} records)`,
      beforeState: null,
      afterState: { result },
      sourceModule: 'master-replication-engine',
    });
  }

  return results;
}

/**
 * Test/diagnostics helper · clears all replication-related localStorage keys
 * for the given entity (preferences + per-entity master copies). Append-only
 * runtime data is preserved in audit-trail.
 */
export function _clearEntityMasterCacheForTests(entity_code: string): void {
  try {
    for (const t of ALL_MASTER_TYPES) {
      localStorage.removeItem(prefKey(entity_code, t));
      localStorage.removeItem(entityMasterKey(entity_code, t));
    }
  } catch { /* ignore */ }
}

// ═════════════════════════════════════════════════════════════════════
// §L MASTER STORAGE MODEL · Sprint 98 · DP-PH6-NEW-24 RATIFIED
// ─────────────────────────────────────────────────────────────────────
// The 6 canonical masters live under three storage models. Replication
// ("Create In All Company?") is semantically meaningful ONLY for the
// entity-scoped tier. The shared tiers are already present in all entities
// by construction — wiring replication for them would be a no-op.
//
//   GLOBAL (single key · shared across entities · replication N/A):
//     · Item         → erp_inventory_items
//     · Stock Group  → erp_stock_groups
//
//   GROUP-level (shared across entities of one group · replication N/A):
//     · Customer     → erp_group_customer_master
//     · Vendor       → erp_group_vendor_master
//     · Ledger       → erp_group_ledger_definitions
//
//   ENTITY-SCOPED (per-entity key · replicable):
//     · Voucher Type → erp_voucher_types_<entityCode>
//       (template seed: erp_voucher_types_template ; legacy: erp_voucher_types)
//
//   ABSENT (no dedicated store / type / hook in repo):
//     · Stock Category → deferred to a future task.
//
// Block 2 wires prompt-on-save replication for Voucher Type ONLY via the
// adapter below. The MasterType union, ALL_MASTER_TYPES, and every
// existing export above are 0-DIFF.
// ═════════════════════════════════════════════════════════════════════

const voucherTypeEntityKey = (entity_code: string): string =>
  entity_code ? `erp_voucher_types_${entity_code}` : 'erp_voucher_types_template';

/**
 * Prompt-on-save gate for Voucher Type · reuses the preference store
 * (master_type = 'voucher_type'). Returns the same shape as
 * promptCreateInAll for UI parity.
 */
export function promptCreateVoucherTypeInAll(input: {
  current_entity: string;
}): { should_prompt: boolean; default_answer: boolean; preference: MasterReplicationPreference } {
  return promptCreateInAll({ master_type: 'voucher_type', current_entity: input.current_entity });
}

/**
 * Replicate one voucher-type record from source entity → sibling entities.
 * Writes into the canonical per-entity key (`erp_voucher_types_<code>`)
 * used by useVoucherTypes, NOT the generic `erp_<entity>_master_voucher_type`
 * store. De-duplicated by `id`. Conflicts (same id · diverging fields)
 * skip the target and emit `master_conflict_resolution` audit entries —
 * no new audit type is introduced in Block 2.
 */
export function replicateVoucherTypeToAllEntities(input: {
  voucher_type: Record<string, unknown>;
  source_entity: string;
  respect_preferences: boolean;
}): ReplicationResult {
  const run_id = newRunId();
  const targets = siblingEntities(input.source_entity);
  const targets_succeeded: string[] = [];
  const targets_skipped: { entity_code: string; reason: 'conflict' | 'preference_off' }[] = [];
  const allConflicts: MasterConflict[] = [];

  const stamped: Record<string, unknown> = {
    ...input.voucher_type,
    owner_company: input.source_entity,
  };
  const key = getMasterKey(stamped);

  for (const target of targets) {
    if (input.respect_preferences) {
      const targetPref = getPreference(target, 'voucher_type');
      if (targetPref.mode === 'never_replicate') {
        targets_skipped.push({ entity_code: target, reason: 'preference_off' });
        continue;
      }
    }
    const existing = safeRead<Record<string, unknown>[]>(voucherTypeEntityKey(target), []);
    const collision = existing.find((m) => getMasterKey(m) === key);
    if (collision) {
      const conflicts: MasterConflict[] = [];
      for (const field of Object.keys(stamped)) {
        if (field === 'owner_company' || field === 'updated_at' || field === 'created_at') continue;
        const src = stamped[field];
        const tgt = (collision as Record<string, unknown>)[field];
        if (JSON.stringify(src) !== JSON.stringify(tgt)) {
          conflicts.push({
            master_type: 'voucher_type',
            source_entity: input.source_entity,
            target_entity: target,
            field, source_value: src, existing_value: tgt, resolution: 'pending',
          });
        }
      }
      if (conflicts.length > 0) {
        allConflicts.push(...conflicts);
        targets_skipped.push({ entity_code: target, reason: 'conflict' });
        for (const c of conflicts) {
          logAudit({
            entityCode: target,
            action: 'create',
            entityType: 'master_conflict_resolution',
            recordId: `${run_id}_${c.field}`,
            recordLabel: `Conflict voucher_type/${key} field=${c.field}`,
            beforeState: { existing: c.existing_value },
            afterState: { proposed: c.source_value, resolution: 'pending' },
            sourceModule: 'master-replication-engine',
          });
        }
        continue;
      }
      targets_succeeded.push(target); // idempotent (identical)
      continue;
    }
    safeWrite(voucherTypeEntityKey(target), [...existing, stamped]);
    targets_succeeded.push(target);
  }

  const result: ReplicationResult = {
    master_type: 'voucher_type',
    source_entity: input.source_entity,
    targets_attempted: targets,
    targets_succeeded,
    targets_skipped,
    conflicts: allConflicts,
    run_id,
  };

  logAudit({
    entityCode: input.source_entity,
    action: 'create',
    entityType: 'master_replication_event',
    recordId: run_id,
    recordLabel: `Replicate voucher_type/${key} → ${targets.length} sibling(s)`,
    beforeState: null,
    afterState: { result },
    sourceModule: 'master-replication-engine',
  });

  return result;
}

