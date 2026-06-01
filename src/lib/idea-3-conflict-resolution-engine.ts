/**
 * @file        src/lib/idea-3-conflict-resolution-engine.ts
 * @sibling     NEW @ Sprint 98 · Arc 0 Master Data Foundation · 💡 Idea 3
 * @realizes    Within-store master conflict resolution (dedup) · finds near-duplicate
 *              records within a SHARED master store (e.g. "Steel Rod 10mm" vs
 *              "MS Round Bar 10mm" both in erp_inventory_items) and proposes a
 *              merge plan that survivor-wins per field. DP-PH6-NEW-24: targets
 *              the shared/group stores · no cross-entity replication semantics.
 * @reads-from  master-replication-engine (MasterType + MasterConflict types only)
 * @sprint      Sprint 98 · T-Phase-6.A.0.3
 * @audit       Reuses 'master_conflict_resolution' · no new audit type.
 * [JWT] Phase 8: POST /api/master-conflict/scan · POST /api/master-conflict/merge
 */
import type { MasterType } from '@/lib/master-replication-engine';
import { logAudit } from '@/lib/audit-trail-engine';

export const READS_FROM = {
  engines: ['master-replication-engine', 'audit-trail-engine'],
  storage_keys: [],
} as const;

export interface DuplicateCandidate {
  id: string;
  master_type: MasterType;
  record_a: Record<string, unknown>;
  record_b: Record<string, unknown>;
  similarity: number; // 0..1
  matched_fields: string[];
}

export interface MergePlan {
  master_type: MasterType;
  survivor_id: string;
  merged: Record<string, unknown>;
  loser_id: string;
  field_decisions: { field: string; chosen_from: 'survivor' | 'loser'; value: unknown }[];
}

// ─── Normalization for similarity ─────────────────────────────────────
const norm = (s: unknown): string =>
  String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Levenshtein-ratio similarity in [0,1]. Cheap; SMB-scale stores. */
function similarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const m = a.length, n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  const dist = dp[n];
  return 1 - dist / Math.max(m, n);
}

const NAME_FIELDS = ['name', 'item_name', 'display_name', 'ledger_name', 'party_name'];

const pickName = (r: Record<string, unknown>): string => {
  for (const f of NAME_FIELDS) {
    const v = r[f];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return '';
};

/**
 * Scan a store for likely duplicates · O(n²) bounded to <500 records per call.
 * Threshold defaults to 0.75 name similarity OR exact (hsn/gstin/pan) match.
 */
export function scanForDuplicates(input: {
  master_type: MasterType;
  records: Record<string, unknown>[];
  threshold?: number;
  exact_match_fields?: string[];
}): DuplicateCandidate[] {
  const threshold = input.threshold ?? 0.75;
  const exactFields = input.exact_match_fields ?? ['hsn_code', 'gstin', 'pan'];
  const out: DuplicateCandidate[] = [];
  const recs = input.records.slice(0, 500);

  for (let i = 0; i < recs.length; i++) {
    for (let j = i + 1; j < recs.length; j++) {
      const a = recs[i], b = recs[j];
      const matched: string[] = [];
      let qualifies = false;

      for (const f of exactFields) {
        const va = a[f], vb = b[f];
        if (va && vb && norm(va) === norm(vb)) {
          matched.push(f);
          qualifies = true;
        }
      }

      const nameA = norm(pickName(a)), nameB = norm(pickName(b));
      const sim = similarity(nameA, nameB);
      if (sim >= threshold) {
        matched.push('name');
        qualifies = true;
      }

      if (qualifies) {
        out.push({
          id: `dup_${i}_${j}`,
          master_type: input.master_type,
          record_a: a,
          record_b: b,
          similarity: Math.max(sim, matched.length > 1 ? 0.95 : sim),
          matched_fields: matched,
        });
      }
    }
  }
  return out;
}

/**
 * Build a survivor-wins merge plan. Survivor's non-empty fields keep;
 * loser fills gaps. Caller decides which is survivor (UI choice).
 */
export function buildMergePlan(input: {
  master_type: MasterType;
  survivor: Record<string, unknown>;
  loser: Record<string, unknown>;
  survivor_id_field?: string;
}): MergePlan {
  const idField = input.survivor_id_field ?? 'id';
  const merged: Record<string, unknown> = { ...input.loser, ...input.survivor };
  const decisions: MergePlan['field_decisions'] = [];
  const allFields = new Set([...Object.keys(input.survivor), ...Object.keys(input.loser)]);
  for (const f of allFields) {
    const sv = input.survivor[f];
    const lv = input.loser[f];
    if (sv !== undefined && sv !== null && sv !== '') {
      decisions.push({ field: f, chosen_from: 'survivor', value: sv });
      merged[f] = sv;
    } else if (lv !== undefined && lv !== null && lv !== '') {
      decisions.push({ field: f, chosen_from: 'loser', value: lv });
      merged[f] = lv;
    }
  }
  return {
    master_type: input.master_type,
    survivor_id: String(input.survivor[idField] ?? ''),
    loser_id: String(input.loser[idField] ?? ''),
    merged,
    field_decisions: decisions,
  };
}

/**
 * Commit a merge plan · returns the new record list with loser removed and
 * survivor replaced by merged. Caller persists. Emits audit (reused type).
 */
export function commitMerge(input: {
  plan: MergePlan;
  records: Record<string, unknown>[];
  survivor_id_field?: string;
  entity_code: string;
  actor: string;
}): Record<string, unknown>[] {
  const idField = input.survivor_id_field ?? 'id';
  const next = input.records
    .filter((r) => String(r[idField] ?? '') !== input.plan.loser_id)
    .map((r) =>
      String(r[idField] ?? '') === input.plan.survivor_id ? input.plan.merged : r,
    );

  logAudit({
    entityCode: input.entity_code,
    action: 'update',
    entityType: 'master_conflict_resolution',
    recordId: input.plan.survivor_id,
    recordLabel: `Merge ${input.plan.master_type} · loser=${input.plan.loser_id} → survivor=${input.plan.survivor_id}`,
    beforeState: { loser_id: input.plan.loser_id, decisions: input.plan.field_decisions },
    afterState: input.plan.merged,
    reason: input.actor,
    sourceModule: 'idea-3-conflict-resolution-engine',
  });

  return next;
}
