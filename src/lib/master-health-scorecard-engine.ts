/**
 * @file        src/lib/master-health-scorecard-engine.ts
 * @sprint      B6 · T-B6-Master-Health · Pillar-B CLOSE
 * @realizes    B.6 · aggregates existing governance engines into one health score
 *              REUSES idea-3 (duplicates) · idea-9 (sleeping) · master-replication ·
 *              party-master. New work: incomplete + orphaned + ssot_coverage checks
 *              + transparent score rubric + cockpit aggregation.
 * @reads-from  idea-3-conflict-resolution-engine (scanForDuplicates · CONSUME)
 *              idea-9-sleeping-master-detector-engine (detectSleepingMasters · CONSUME)
 *              master-replication-engine (ALL_MASTER_TYPES · MasterType · getPreference · key shape)
 *              party-master-engine (loadPartyMaster · loadPartiesByType)
 *              fincore-engine (ledgerDefsKey shape only · read-only)
 *              inventory storage (`erp_inventory_items` · read-only)
 * @writes-to   localStorage masterHealthCacheKey (last-run cache only · no master mutation)
 * @walls       NEVER writes to any master store · NEVER merges/deletes (idea-3 panel owns merge)
 *              NEVER reimplements duplicate or sleeping detection — DELEGATES
 * @jwt         Wave-2: server-side scan at scale + Master SSOT Write-Through enforcement
 */
import {
  ALL_MASTER_TYPES,
  type MasterType,
  getPreference,
} from '@/lib/master-replication-engine';
import { scanForDuplicates } from '@/lib/idea-3-conflict-resolution-engine';
import { detectSleepingMasters } from '@/lib/idea-9-sleeping-master-detector-engine';
import { loadPartyMaster, loadPartiesByType } from '@/lib/party-master-engine';
import { ledgerDefsKey } from '@/lib/fincore-engine';
import type {
  MasterHealthCheck,
  MasterHealthDimension,
  MasterHealthReport,
  MasterHealthSeverity,
  MasterTypeScore,
} from '@/types/master-health';
import { masterHealthCacheKey } from '@/types/master-health';

// ─── Drill-through routes (existing CC panels — AC7 no duplicate UI) ─────────
const DRILL_DUPLICATES = '/erp/command-center#mdg-conflict-resolution';
const DRILL_SLEEPING   = '/erp/command-center#fincore-master-visibility-heatmap';
const DRILL_LIFECYCLE  = '/erp/command-center#fincore-master-lifecycle-wizard';

// ─── Severity rubric (transparent) ───────────────────────────────────────────
function severityFromCount(count: number): MasterHealthSeverity {
  if (count <= 0) return 'ok';
  if (count <= 5) return 'warn';
  return 'critical';
}
function severityFromPercent(pctMissing: number): MasterHealthSeverity {
  if (pctMissing <= 5) return 'ok';
  if (pctMissing <= 20) return 'warn';
  return 'critical';
}

// ─── Storage helpers (READ-ONLY) ─────────────────────────────────────────────
interface LedgerRow {
  id?: string; name?: string;
  parentGroupCode?: string | null; parentGroupId?: string | null;
  groupId?: string | null; groupName?: string | null;
}
interface InventoryRow {
  id?: string; name?: string; code?: string;
  hsn_sac_code?: string | null;
  stock_group_id?: string | null;
  category_type?: string | null;
  brand_id?: string | null;
}

function readLedgers(entityCode: string): LedgerRow[] {
  try {
    const raw = localStorage.getItem(ledgerDefsKey(entityCode));
    return raw ? (JSON.parse(raw) as LedgerRow[]) : [];
  } catch { return []; }
}
function readInventory(): InventoryRow[] {
  try {
    const raw = localStorage.getItem('erp_inventory_items');
    return raw ? (JSON.parse(raw) as InventoryRow[]) : [];
  } catch { return []; }
}

// ─── Per-dimension builders ──────────────────────────────────────────────────

/** duplicates → DELEGATES to idea-3.scanForDuplicates (no reimplementation). */
function buildDuplicatesCheck(
  master_type: MasterType,
  records: Record<string, unknown>[],
): MasterHealthCheck {
  // Field hints per master type — exact-match fields drive idea-3 honest sigs.
  const exactFields = master_type === 'customer' || master_type === 'vendor'
    ? ['gstin', 'pan']
    : master_type === 'item'
    ? ['hsn_sac_code', 'code']
    : ['code'];
  const dups = scanForDuplicates({
    master_type,
    records,
    exact_match_fields: exactFields,
  });
  const count = dups.length;
  return {
    dimension: 'duplicates',
    master_type,
    count,
    severity: severityFromCount(count),
    detail: count === 0
      ? 'No near-duplicate clusters detected by idea-3.scanForDuplicates'
      : `${count} near-duplicate cluster(s) detected · review in Master Conflict Resolution`,
    drill_route: count > 0 ? DRILL_DUPLICATES : undefined,
    source: 'idea-3',
  };
}

/** sleeping → DELEGATES to idea-9.detectSleepingMasters (no reimplementation). */
function buildSleepingCheck(
  master_type: MasterType,
  entityCode: string,
): MasterHealthCheck {
  const sleeps = detectSleepingMasters({
    entity_code: entityCode,
    master_types: [master_type],
  });
  const dormant = sleeps.filter((s) => s.flag === 'dormant').length;
  const sleeping = sleeps.filter((s) => s.flag === 'sleeping').length;
  const count = sleeping; // headline: long-sleep records
  return {
    dimension: 'sleeping',
    master_type,
    count,
    severity: severityFromCount(count),
    detail: `${sleeping} sleeping · ${dormant} dormant (idea-9 thresholds) of ${sleeps.length} scanned`,
    drill_route: count > 0 ? DRILL_SLEEPING : undefined,
    source: 'idea-9',
  };
}

/** incomplete → reads REAL fields from master shapes (Block-0 confirmed). */
function buildIncompleteCheck(
  master_type: MasterType,
  entityCode: string,
): MasterHealthCheck {
  if (master_type === 'customer' || master_type === 'vendor') {
    const rows = loadPartiesByType(entityCode, master_type);
    const total = rows.length;
    if (total === 0) {
      return zeroChecked('incomplete', master_type, 'No records in party master', 'b6-incomplete');
    }
    let missing = 0;
    for (const p of rows) {
      const noGstin = !p.gstin || p.gstin.trim() === '';
      const noState = !p.state_code || p.state_code.trim() === '';
      const unresolvedQuickAdd = Boolean(p.created_via_quick_add) && !p.audit_flag_resolved_at;
      if (noGstin || noState || unresolvedQuickAdd) missing++;
    }
    const pct = total === 0 ? 0 : Math.round((missing / total) * 100);
    return {
      dimension: 'incomplete',
      master_type,
      count: missing,
      severity: severityFromPercent(pct),
      detail: `${missing}/${total} (${pct}%) missing gstin · state_code · or unresolved quick-add (real-field read)`,
      drill_route: missing > 0 ? DRILL_LIFECYCLE : undefined,
      source: 'b6-incomplete',
    };
  }
  if (master_type === 'item') {
    const rows = readInventory();
    const total = rows.length;
    if (total === 0) {
      return zeroChecked('incomplete', master_type, 'No records in inventory item master', 'b6-incomplete');
    }
    let missing = 0;
    for (const r of rows) {
      const noHsn = !r.hsn_sac_code || String(r.hsn_sac_code).trim() === '';
      const noGroup = !r.stock_group_id;
      if (noHsn || noGroup) missing++;
    }
    const pct = Math.round((missing / total) * 100);
    return {
      dimension: 'incomplete',
      master_type,
      count: missing,
      severity: severityFromPercent(pct),
      detail: `${missing}/${total} (${pct}%) missing hsn_sac_code or stock_group_id (real-field read)`,
      drill_route: missing > 0 ? DRILL_LIFECYCLE : undefined,
      source: 'b6-incomplete',
    };
  }
  if (master_type === 'ledger') {
    const rows = readLedgers(entityCode);
    const total = rows.length;
    if (total === 0) {
      return zeroChecked('incomplete', master_type, 'No records in ledger master', 'b6-incomplete');
    }
    let missing = 0;
    for (const r of rows) {
      const noName = !r.name || r.name.trim() === '';
      if (noName) missing++;
    }
    const pct = Math.round((missing / total) * 100);
    return {
      dimension: 'incomplete',
      master_type,
      count: missing,
      severity: severityFromPercent(pct),
      detail: `${missing}/${total} (${pct}%) missing name (real-field read · parent-group integrity in 'orphaned')`,
      drill_route: missing > 0 ? DRILL_LIFECYCLE : undefined,
      source: 'b6-incomplete',
    };
  }
  // Fields not modeled — honest unavailable, never fabricated 0%.
  return {
    dimension: 'incomplete',
    master_type,
    count: 0,
    severity: 'ok',
    detail: `Incomplete-field model not defined for '${master_type}' · check unavailable rather than fabricated`,
    source: 'unavailable',
  };
}

/** orphaned → if-present-then-valid checks (parent reference must resolve). */
function buildOrphanedCheck(
  master_type: MasterType,
  entityCode: string,
): MasterHealthCheck {
  if (master_type === 'ledger') {
    const rows = readLedgers(entityCode);
    if (rows.length === 0) {
      return zeroChecked('orphaned', master_type, 'No ledger records to check', 'b6-orphaned');
    }
    const knownIds = new Set<string>();
    for (const r of rows) { if (r.id) knownIds.add(r.id); }
    let orphans = 0;
    for (const r of rows) {
      const parent = r.parentGroupId ?? r.parentGroupCode ?? r.groupId;
      if (parent && !knownIds.has(parent)) orphans++;
    }
    return {
      dimension: 'orphaned',
      master_type,
      count: orphans,
      severity: severityFromCount(orphans),
      detail: `${orphans} ledger(s) reference a parent group that does not resolve (if-present-then-valid)`,
      drill_route: orphans > 0 ? DRILL_LIFECYCLE : undefined,
      source: 'b6-orphaned',
    };
  }
  if (master_type === 'item') {
    const rows = readInventory();
    if (rows.length === 0) {
      return zeroChecked('orphaned', master_type, 'No item records to check', 'b6-orphaned');
    }
    // Category/brand parent integrity: if referenced, must be present elsewhere.
    // No category master store guaranteed at this tier — flag honestly with low signal.
    let suspect = 0;
    for (const r of rows) {
      if (r.stock_group_id && String(r.stock_group_id).trim() === '') suspect++;
    }
    return {
      dimension: 'orphaned',
      master_type,
      count: suspect,
      severity: severityFromCount(suspect),
      detail: suspect === 0
        ? 'No orphan references detected (if-present-then-valid · group master cross-check is Wave-2)'
        : `${suspect} item(s) with blank-but-set stock_group reference`,
      drill_route: suspect > 0 ? DRILL_LIFECYCLE : undefined,
      source: 'b6-orphaned',
    };
  }
  return {
    dimension: 'orphaned',
    master_type,
    count: 0,
    severity: 'ok',
    detail: `Parent-reference model not defined for '${master_type}' · unavailable rather than fabricated`,
    source: 'unavailable',
  };
}

/** ssot_coverage → has an explicit replication preference been recorded? */
function buildSsotCoverageCheck(
  master_type: MasterType,
  entityCode: string,
): MasterHealthCheck {
  // getPreference always returns a record (default 'always_prompt'). We probe
  // for an explicitly-stored preference via the documented key shape to report
  // honestly whether SSOT routing is governed for this type.
  const probedKey = `erp_${entityCode}_master_repl_pref_${master_type}`;
  let stored = false;
  try {
    stored = localStorage.getItem(probedKey) !== null;
  } catch { stored = false; }
  const pref = getPreference(entityCode, master_type);
  const governed = stored;
  return {
    dimension: 'ssot_coverage',
    master_type,
    count: governed ? 0 : 1,
    severity: governed ? 'ok' : 'warn',
    detail: governed
      ? `SSOT routing governed · mode='${pref.mode}' (master-replication-engine preference recorded)`
      : `No explicit replication preference recorded · creation may be card-local · default '${pref.mode}' applies`,
    drill_route: governed ? undefined : DRILL_LIFECYCLE,
    source: 'b6-replication',
  };
}

function zeroChecked(
  dimension: MasterHealthDimension,
  master_type: MasterType | string,
  detail: string,
  source: MasterHealthCheck['source'],
): MasterHealthCheck {
  return { dimension, master_type, count: 0, severity: 'ok', detail, source };
}

// ─── Score rubric (transparent · monotonic) ──────────────────────────────────
// Start at 100. Penalties: critical -20 · warn -7 · unavailable -2.
// Floor 0. Documented here so audit can replay.
export function scoreMasterType(checks: MasterHealthCheck[]): number {
  let score = 100;
  for (const c of checks) {
    if (c.source === 'unavailable') { score -= 2; continue; }
    if (c.severity === 'critical') score -= 20;
    else if (c.severity === 'warn') score -= 7;
  }
  if (score < 0) score = 0;
  if (score > 100) score = 100;
  return score;
}

// ─── Records loader for duplicates (shape adapter only) ──────────────────────
function loadRecordsForDuplicates(
  master_type: MasterType,
  entityCode: string,
): Record<string, unknown>[] {
  if (master_type === 'customer' || master_type === 'vendor') {
    return loadPartiesByType(entityCode, master_type) as unknown as Record<string, unknown>[];
  }
  if (master_type === 'ledger') {
    return readLedgers(entityCode) as unknown as Record<string, unknown>[];
  }
  if (master_type === 'item') {
    return readInventory() as unknown as Record<string, unknown>[];
  }
  return [];
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function runMasterHealth(entityCode: string, today: Date = new Date()): MasterHealthReport {
  const by_type: MasterTypeScore[] = [];

  for (const mt of ALL_MASTER_TYPES) {
    const records = loadRecordsForDuplicates(mt, entityCode);
    const checks: MasterHealthCheck[] = [
      buildDuplicatesCheck(mt, records),
      buildSleepingCheck(mt, entityCode),
      buildIncompleteCheck(mt, entityCode),
      buildOrphanedCheck(mt, entityCode),
      buildSsotCoverageCheck(mt, entityCode),
    ];
    by_type.push({
      master_type: mt,
      score_0_100: scoreMasterType(checks),
      checks,
    });
  }

  const overall_score = by_type.length === 0
    ? 0
    : Math.round(by_type.reduce((s, m) => s + m.score_0_100, 0) / by_type.length);

  const report: MasterHealthReport = {
    generated_at: today.toISOString(),
    overall_score,
    by_type,
  };

  // Cache last run (read-model only · no master mutation).
  try {
    localStorage.setItem(masterHealthCacheKey(entityCode), JSON.stringify(report));
  } catch { /* quota silent */ }

  return report;
}

export function getOverallScore(report: MasterHealthReport): number {
  return report.overall_score;
}

export function getCriticalFindings(report: MasterHealthReport): MasterHealthCheck[] {
  const out: MasterHealthCheck[] = [];
  for (const t of report.by_type) {
    for (const c of t.checks) {
      if (c.severity === 'critical') out.push(c);
    }
  }
  // Sort by count desc (loudest first).
  out.sort((a, b) => b.count - a.count);
  return out;
}

export function loadLastRun(entityCode: string): MasterHealthReport | null {
  try {
    const raw = localStorage.getItem(masterHealthCacheKey(entityCode));
    return raw ? (JSON.parse(raw) as MasterHealthReport) : null;
  } catch { return null; }
}

/** Used by tests to assert idea-3/idea-9 delegation shape without re-running detection. */
export const __spine__ = {
  scanForDuplicates,
  detectSleepingMasters,
  loadPartyMaster,
  getPreference,
  ALL_MASTER_TYPES,
};
