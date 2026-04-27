/**
 * @file     register-saved-views-storage.ts
 * @purpose  Per-entity per-register-code saved view persistence (filters · column
 *           toggles · group-by snapshots). Mirrors register-config-storage.ts:
 *           localStorage-backed Phase-1 storage with version-checked fallback.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created Apr-2026 · T-T10-pre.2d-D
 * @sprint   T-T10-pre.2d-D (Saved Views + Reconciliation View + Drill-to-Source)
 * @iso      Reliability (HIGH — version-check fallback, never throws to caller)
 *           Maintainability (HIGH — single-source key derivation, mirrors register-config-storage)
 *           Functional Suitability (HIGH+ — single-default invariant enforced server-side-equivalent)
 * @whom     RegisterGrid.tsx (SavedViewSelector + auto-apply default) · future RegisterConfigPage
 * @depends  RegisterTypes (RegisterSavedView) · register-config (RegisterTypeCode)
 * @consumers RegisterGrid.tsx · SmokeTestRunner (view-1 / view-2 round-trip checks)
 *
 * NOTE: Phase 2 will swap localStorage for `GET /api/finecore/register-saved-views/...`
 *       backend endpoints — the storage-key naming pattern is preserved so the
 *       JWT-annotated comments below map 1:1 to future REST routes.
 */

import type { RegisterTypeCode } from '@/types/register-config';
import type { RegisterSavedView } from '@/components/finecore/registers/RegisterTypes';

const STORAGE_VERSION = 1;

interface SavedViewsBlob {
  version: number;
  views: RegisterSavedView[];
}

/**
 * @purpose Canonical localStorage key per (entity, register-type).
 * @returns 'erp_register_saved_views_{entityCode}_{registerType}'
 */
export function savedViewsKey(entityCode: string, registerType: RegisterTypeCode): string {
  return `erp_register_saved_views_${entityCode}_${registerType}`;
}

/**
 * @purpose Load all saved views for (entity, register-type). Returns [] on missing
 *          or version-mismatched / corrupt storage (never throws).
 */
export function loadSavedViews(entityCode: string, registerType: RegisterTypeCode): RegisterSavedView[] {
  try {
    // [JWT] GET /api/finecore/register-saved-views/:entityCode/:registerType
    const raw = localStorage.getItem(savedViewsKey(entityCode, registerType));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<SavedViewsBlob>;
    if (parsed.version !== STORAGE_VERSION) return [];
    return Array.isArray(parsed.views) ? parsed.views : [];
  } catch {
    return [];
  }
}

function writeBlob(entityCode: string, registerType: RegisterTypeCode, views: RegisterSavedView[]): void {
  try {
    const blob: SavedViewsBlob = { version: STORAGE_VERSION, views };
    // [JWT] PUT /api/finecore/register-saved-views/:entityCode/:registerType
    localStorage.setItem(savedViewsKey(entityCode, registerType), JSON.stringify(blob));
  } catch (err) {
    // [Analytical] Diagnostic-only; banned-pattern targets console.log, not console.error.
    console.error('Failed to save RegisterSavedView blob:', err);
  }
}

/**
 * @purpose Insert or update a saved view. Enforces single-default invariant —
 *          when `view.isDefault === true`, all other views are demoted to false.
 */
export function saveView(
  entityCode: string,
  registerType: RegisterTypeCode,
  view: RegisterSavedView,
): void {
  const existing = loadSavedViews(entityCode, registerType);
  const idx = existing.findIndex(v => v.id === view.id);
  let next: RegisterSavedView[] = idx >= 0
    ? existing.map((v, i) => (i === idx ? view : v))
    : [...existing, view];
  if (view.isDefault) {
    next = next.map(v => (v.id === view.id ? v : { ...v, isDefault: false }));
  }
  writeBlob(entityCode, registerType, next);
}

/**
 * @purpose Remove a saved view by id. No-op when id is unknown.
 */
export function deleteView(
  entityCode: string,
  registerType: RegisterTypeCode,
  viewId: string,
): void {
  const existing = loadSavedViews(entityCode, registerType);
  const next = existing.filter(v => v.id !== viewId);
  // [JWT] DELETE /api/finecore/register-saved-views/:entityCode/:registerType/:viewId
  writeBlob(entityCode, registerType, next);
}

/**
 * @purpose Promote one view to default; demotes every other view. No-op when id
 *          is unknown.
 */
export function setDefaultView(
  entityCode: string,
  registerType: RegisterTypeCode,
  viewId: string,
): void {
  const existing = loadSavedViews(entityCode, registerType);
  if (!existing.some(v => v.id === viewId)) return;
  const next = existing.map(v => ({ ...v, isDefault: v.id === viewId }));
  writeBlob(entityCode, registerType, next);
}

/**
 * @purpose Convenience accessor — returns the single default view for (entity,
 *          register-type), or null when none is marked default.
 */
export function getDefaultView(
  entityCode: string,
  registerType: RegisterTypeCode,
): RegisterSavedView | null {
  return loadSavedViews(entityCode, registerType).find(v => v.isDefault) ?? null;
}
