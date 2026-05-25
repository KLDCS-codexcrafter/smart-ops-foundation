/**
 * @file        src/lib/physical-asset-unit-bridge.ts
 * @purpose     3-shape unification · joins AssetUnitRecord ↔ AssetTag ↔ Asset(Pay Hub) · 27th SIBLING ⭐
 * @sprint      T-Phase-2.HK-6 · Theme 2 v2 · Q-LOCK-4 v2 B-2 · Q-LOCK-17(i)
 * @decisions   D-NEW · per Path A 50-year-architect Decision LOCKED May 23 + RAT-2 ratified
 * @disciplines FR-19 SIBLING (single-source: physical asset unification) · FR-26 entity-scoped
 * @design      SOFT-LINK · additive FK references · NO breaking changes to 3 existing types (per D-10)
 * @closes      LEAK-1 (Ghost partial) + LEAK-3 (Duplicates full) + LEAK-7 (Custodian drift root) + GAP-17
 * @[JWT]       Phase 2: POST /api/physical-asset-unit/link
 */

import type { AssetUnitRecord } from '@/types/fixed-asset';
import type { AssetTag } from '@/types/asset-tag';
import type { Asset } from '@/types/asset-master';
import { faUnitsKey } from '@/types/fixed-asset';
import { ASSETS_KEY } from '@/types/asset-master';

// AssetTag storage key (mirrors AssetTagManager convention · entity-scoped)
const assetTagsKey = (e: string): string => `erp_asset_tags_${e}`;

// ============================================================================
// TYPES · PhysicalAssetUnit join model (NEW)
// ============================================================================

export interface PhysicalAssetUnit {
  /** Canonical join ID · stable across all 4 shapes */
  id: string;
  entity_id: string;
  /** FK to AssetUnitRecord (FA accounting layer) · primary source */
  asset_unit_record_id: string;
  /** FK to AssetTag (physical tag/QR layer) · null if untagged */
  asset_tag_id: string | null;
  /** FK to Asset (Pay Hub HR equipment layer) · null if not HR-issued */
  hr_asset_id: string | null;
  /** 🆕 Sprint 64 FAR-0 · FK to MaintainPro Equipment (4th shape) · null if not maint-tracked */
  equipment_id?: string | null;
  /** Sync timestamps for each leg */
  fa_synced_at: string;
  tag_synced_at: string | null;
  hr_synced_at: string | null;
  equipment_synced_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UnifiedAssetView {
  unit: PhysicalAssetUnit;
  fa_record: AssetUnitRecord | null;
  asset_tag: AssetTag | null;
  hr_asset: Asset | null;
}

export interface OrphanReport {
  /** AssetUnitRecord IDs not linked to any PhysicalAssetUnit */
  fa_orphans: string[];
  /** AssetTag IDs not linked */
  tag_orphans: string[];
  /** Asset (Pay Hub) IDs not linked */
  hr_orphans: string[];
  /** PhysicalAssetUnit IDs where at least one referenced row is missing */
  dangling_links: string[];
}

export const physicalAssetUnitsKey = (e: string): string => `erp_physical_asset_units_${e}`;

const newId = (p: string): string =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// ============================================================================
// I/O HELPERS (entity-scoped)
// ============================================================================

function readPAUs(entityCode: string): PhysicalAssetUnit[] {
  try {
    // [JWT] GET /api/physical-asset-unit?entityCode=...
    const raw = localStorage.getItem(physicalAssetUnitsKey(entityCode));
    return raw ? (JSON.parse(raw) as PhysicalAssetUnit[]) : [];
  } catch { return []; }
}

function writePAUs(entityCode: string, list: PhysicalAssetUnit[]): void {
  try {
    // [JWT] POST /api/physical-asset-unit
    localStorage.setItem(physicalAssetUnitsKey(entityCode), JSON.stringify(list));
  } catch { /* quota */ }
}

function readFAUnits(entityCode: string): AssetUnitRecord[] {
  try {
    const raw = localStorage.getItem(faUnitsKey(entityCode));
    return raw ? (JSON.parse(raw) as AssetUnitRecord[]) : [];
  } catch { return []; }
}

function writeFAUnits(entityCode: string, list: AssetUnitRecord[]): void {
  try { localStorage.setItem(faUnitsKey(entityCode), JSON.stringify(list)); } catch { /* quota */ }
}

function readAssetTags(entityCode: string): AssetTag[] {
  try {
    const raw = localStorage.getItem(assetTagsKey(entityCode));
    return raw ? (JSON.parse(raw) as AssetTag[]) : [];
  } catch { return []; }
}

function readHRAssets(): Asset[] {
  // Pay Hub Asset Master is global (not entity-scoped in current schema)
  try {
    const raw = localStorage.getItem(ASSETS_KEY);
    return raw ? (JSON.parse(raw) as Asset[]) : [];
  } catch { return []; }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Create unified PhysicalAssetUnit linking 1 AssetUnitRecord + optional AssetTag + optional Asset(PayHub).
 * Soft-links back-references on each shape (additive · D-10 compliant).
 */
export function linkPhysicalAssetUnit(
  entityCode: string,
  assetUnitRecordId: string,
  options: { asset_tag_id?: string | null; hr_asset_id?: string | null } = {},
): PhysicalAssetUnit {
  const faUnits = readFAUnits(entityCode);
  const faIdx = faUnits.findIndex(u => u.id === assetUnitRecordId);
  if (faIdx < 0) throw new Error(`AssetUnitRecord ${assetUnitRecordId} not found`);

  // Validate tag/HR references if provided
  const tagId = options.asset_tag_id ?? null;
  if (tagId) {
    const tags = readAssetTags(entityCode);
    if (!tags.some(t => t.id === tagId)) throw new Error(`AssetTag ${tagId} not found`);
  }
  const hrId = options.hr_asset_id ?? null;
  if (hrId) {
    const hr = readHRAssets();
    if (!hr.some(a => a.id === hrId)) throw new Error(`HR Asset ${hrId} not found`);
  }

  const now = new Date().toISOString();
  const existing = readPAUs(entityCode).find(p => p.asset_unit_record_id === assetUnitRecordId);
  if (existing) {
    return updatePAU(entityCode, existing.id, { asset_tag_id: tagId, hr_asset_id: hrId });
  }

  const pau: PhysicalAssetUnit = {
    id: newId('pau'),
    entity_id: entityCode,
    asset_unit_record_id: assetUnitRecordId,
    asset_tag_id: tagId,
    hr_asset_id: hrId,
    fa_synced_at: now,
    tag_synced_at: tagId ? now : null,
    hr_synced_at: hrId ? now : null,
    created_at: now,
    updated_at: now,
  };

  const all = readPAUs(entityCode);
  all.push(pau);
  writePAUs(entityCode, all);

  // Soft-link back-references on the 3 shapes (additive · existing optional fields)
  faUnits[faIdx] = {
    ...faUnits[faIdx],
    asset_tag_id: tagId ?? faUnits[faIdx].asset_tag_id,
    hr_asset_id: hrId ?? faUnits[faIdx].hr_asset_id,
  };
  writeFAUnits(entityCode, faUnits);

  return pau;
}

function updatePAU(
  entityCode: string,
  pauId: string,
  patch: Partial<Pick<PhysicalAssetUnit, 'asset_tag_id' | 'hr_asset_id'>>,
): PhysicalAssetUnit {
  const all = readPAUs(entityCode);
  const idx = all.findIndex(p => p.id === pauId);
  if (idx < 0) throw new Error(`PhysicalAssetUnit ${pauId} not found`);
  const now = new Date().toISOString();
  all[idx] = {
    ...all[idx],
    asset_tag_id: patch.asset_tag_id ?? all[idx].asset_tag_id,
    hr_asset_id: patch.hr_asset_id ?? all[idx].hr_asset_id,
    tag_synced_at: patch.asset_tag_id ? now : all[idx].tag_synced_at,
    hr_synced_at: patch.hr_asset_id ? now : all[idx].hr_synced_at,
    updated_at: now,
  };
  writePAUs(entityCode, all);
  return all[idx];
}

/** HR assignment → FA custodian sync · Pay Hub → FA flow */
export function syncFromHRAssignment(
  entityCode: string,
  hrAssetId: string,
  employeeName: string,
): PhysicalAssetUnit | null {
  const pau = readPAUs(entityCode).find(p => p.hr_asset_id === hrAssetId);
  if (!pau) return null;

  const faUnits = readFAUnits(entityCode);
  const idx = faUnits.findIndex(u => u.id === pau.asset_unit_record_id);
  if (idx >= 0) {
    faUnits[idx] = { ...faUnits[idx], custodian_name: employeeName };
    writeFAUnits(entityCode, faUnits);
  }
  return updatePAU(entityCode, pau.id, { hr_asset_id: hrAssetId });
}

/** AssetTag creation/update → FA physical_location sync */
export function syncFromAssetTag(
  entityCode: string,
  assetTagId: string,
): PhysicalAssetUnit | null {
  const pau = readPAUs(entityCode).find(p => p.asset_tag_id === assetTagId);
  if (!pau) return null;
  const tag = readAssetTags(entityCode).find(t => t.id === assetTagId);
  if (!tag) return null;
  const faUnits = readFAUnits(entityCode);
  const idx = faUnits.findIndex(u => u.id === pau.asset_unit_record_id);
  if (idx >= 0) {
    faUnits[idx] = { ...faUnits[idx], location: tag.physical_location || faUnits[idx].location };
    writeFAUnits(entityCode, faUnits);
  }
  return updatePAU(entityCode, pau.id, { asset_tag_id: assetTagId });
}

/** Find PhysicalAssetUnit by any of 4 IDs (4th shape `equipment_id` added Sprint 64 FAR-0) */
export function findPhysicalAssetUnit(
  entityCode: string,
  query: { asset_unit_record_id?: string; asset_tag_id?: string; hr_asset_id?: string; equipment_id?: string },
): PhysicalAssetUnit | null {
  const all = readPAUs(entityCode);
  if (query.asset_unit_record_id) {
    return all.find(p => p.asset_unit_record_id === query.asset_unit_record_id) ?? null;
  }
  if (query.asset_tag_id) {
    return all.find(p => p.asset_tag_id === query.asset_tag_id) ?? null;
  }
  if (query.hr_asset_id) {
    return all.find(p => p.hr_asset_id === query.hr_asset_id) ?? null;
  }
  if (query.equipment_id) {
    return all.find(p => p.equipment_id === query.equipment_id) ?? null;
  }
  return null;
}

// 🆕 Sprint 64 FAR-0 · Theme 8 · 4-shape unification (D-FAR-v4-28 A · FR-19 ADDITIVE)

/** Find PhysicalAssetUnit by MaintainPro Equipment ID (4th shape lookup) */
export function findPhysicalAssetUnitByEquipment(
  entityCode: string,
  equipmentId: string,
): PhysicalAssetUnit | null {
  return readPAUs(entityCode).find(p => p.equipment_id === equipmentId) ?? null;
}

/** Link MaintainPro Equipment to existing PhysicalAssetUnit · 4-shape unification */
export function linkEquipmentToPhysicalAssetUnit(
  entityCode: string,
  pauId: string,
  equipmentId: string,
): PhysicalAssetUnit {
  const all = readPAUs(entityCode);
  const idx = all.findIndex(p => p.id === pauId);
  if (idx < 0) throw new Error(`PhysicalAssetUnit ${pauId} not found in entity ${entityCode}`);
  const now = new Date().toISOString();
  const updated: PhysicalAssetUnit = {
    ...all[idx],
    equipment_id: equipmentId,
    equipment_synced_at: now,
    updated_at: now,
  };
  all[idx] = updated;
  writePAUs(entityCode, all);
  return updated;
}

/** List all PhysicalAssetUnits with resolved 3-shape data · verification panel input */
export function listUnifiedAssets(entityCode: string): UnifiedAssetView[] {
  const paus = readPAUs(entityCode);
  const faUnits = readFAUnits(entityCode);
  const tags = readAssetTags(entityCode);
  const hr = readHRAssets();

  return paus.map(p => ({
    unit: p,
    fa_record: faUnits.find(u => u.id === p.asset_unit_record_id) ?? null,
    asset_tag: p.asset_tag_id ? (tags.find(t => t.id === p.asset_tag_id) ?? null) : null,
    hr_asset: p.hr_asset_id ? (hr.find(a => a.id === p.hr_asset_id) ?? null) : null,
  }));
}

/** Ghost asset detection · 4-bucket orphan report (LEAK-1 / LEAK-3 foundation) */
export function detectOrphans(entityCode: string): OrphanReport {
  const paus = readPAUs(entityCode);
  const faUnits = readFAUnits(entityCode);
  const tags = readAssetTags(entityCode);
  const hr = readHRAssets();

  const linkedFA = new Set(paus.map(p => p.asset_unit_record_id));
  const linkedTags = new Set(paus.map(p => p.asset_tag_id).filter((x): x is string => !!x));
  const linkedHR = new Set(paus.map(p => p.hr_asset_id).filter((x): x is string => !!x));

  const fa_orphans = faUnits
    .filter(u => u.status === 'active' && !linkedFA.has(u.id))
    .map(u => u.id);
  const tag_orphans = tags
    .filter(t => t.status === 'active' && !linkedTags.has(t.id))
    .map(t => t.id);
  const hr_orphans = hr
    .filter(a => a.status !== 'disposed' && !linkedHR.has(a.id))
    .map(a => a.id);

  const faIds = new Set(faUnits.map(u => u.id));
  const tagIds = new Set(tags.map(t => t.id));
  const hrIds = new Set(hr.map(a => a.id));
  const dangling_links = paus
    .filter(p =>
      !faIds.has(p.asset_unit_record_id) ||
      (p.asset_tag_id && !tagIds.has(p.asset_tag_id)) ||
      (p.hr_asset_id && !hrIds.has(p.hr_asset_id)),
    )
    .map(p => p.id);

  return { fa_orphans, tag_orphans, hr_orphans, dangling_links };
}

/** Unlink (delete) a PhysicalAssetUnit · soft-link removal · back-references retained on shapes for audit */
export function unlinkPhysicalAssetUnit(entityCode: string, pauId: string): void {
  const all = readPAUs(entityCode);
  writePAUs(entityCode, all.filter(p => p.id !== pauId));
}
