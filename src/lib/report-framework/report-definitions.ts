/**
 * @file        report-definitions.ts
 * @sprint      RPT-9a · User Report Builder · Role-scoped Persistence
 * @purpose     CRUD for saved report definitions under a single namespaced
 *              localStorage key. Enforces role→save-scope semantics + delete
 *              permissions in code (the role-scope governance lock).
 *
 * READ-ONLY-LOCK EXEMPTION: This file is the SOLE writer in
 *              src/lib/report-framework/. The grep-asserted read-only-lock
 *              test exempts this file by name (and only this file) for
 *              localStorage.setItem. Every other check (no React, no post/
 *              save/write voucher helpers) still applies.
 *
 *              Writes ONLY to `operix.report-builder.definitions.v1`.
 *              The existing register-saved-views-storage stays 0-DIFF.
 *
 * @[JWT]       LATER: GET/POST /api/report-definitions — for now a single
 *              namespaced localStorage key (no auth call, single-user demo).
 */

import type { QuerySpec } from './report-builder-engine';
import type { ReportChartConfig } from './chart-config';
import type { RoleLayer } from './role-layer';
import type { UserRole } from '@/types/card-entitlement';

export const REPORT_DEFINITIONS_KEY = 'operix.report-builder.definitions.v1';

export type ReportScope = 'private' | 'team' | 'card' | 'curated';

export interface ReportDefinition {
  id: string;
  name: string;
  sourceId: string;
  spec: QuerySpec;
  chartConfig?: ReportChartConfig;
  scope: ReportScope;
  cardId: string;
  createdByRole: RoleLayer;
  createdByUserId: string;
  createdAt: string;
}

// ─── Role → allowed-save-scope ceiling ───────────────────────────────────────

/**
 * Allowed save scopes for a role + effective layer.
 *  - operator                → ['private']
 *  - manager                 → ['private','team']
 *  - management              → ['private','team','card']
 *  - tenant_admin/super_admin → ['private','team','card','curated']
 */
export function allowedSaveScopesFor(
  role: UserRole,
  layer: RoleLayer,
): ReportScope[] {
  if (role === 'tenant_admin' || role === 'super_admin') {
    return ['private', 'team', 'card', 'curated'];
  }
  if (layer === 'management') return ['private', 'team', 'card'];
  if (layer === 'manager') return ['private', 'team'];
  return ['private'];
}

// ─── Persistence (single namespaced key) ─────────────────────────────────────

function readAll(): ReportDefinition[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(REPORT_DEFINITIONS_KEY);
    return raw ? (JSON.parse(raw) as ReportDefinition[]) : [];
  } catch {
    return [];
  }
}

function writeAll(defs: ReportDefinition[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(REPORT_DEFINITIONS_KEY, JSON.stringify(defs));
  } catch {
    /* ignore quota */
  }
}

// ─── API ─────────────────────────────────────────────────────────────────────

export class ReportDefinitionScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportDefinitionScopeError';
  }
}

export interface SaveDefinitionInput {
  id?: string;
  name: string;
  sourceId: string;
  spec: QuerySpec;
  chartConfig?: ReportChartConfig;
  scope: ReportScope;
  cardId: string;
  role: UserRole;
  layer: RoleLayer;
  userId: string;
}

export function saveDefinition(input: SaveDefinitionInput): ReportDefinition {
  const allowed = allowedSaveScopesFor(input.role, input.layer);
  if (!allowed.includes(input.scope)) {
    throw new ReportDefinitionScopeError(
      `Role "${input.role}" (layer "${input.layer}") cannot save scope "${input.scope}". Allowed: ${allowed.join(',')}`,
    );
  }
  const defs = readAll();
  const id = input.id ?? `rd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const def: ReportDefinition = {
    id,
    name: input.name,
    sourceId: input.sourceId,
    spec: input.spec,
    chartConfig: input.chartConfig,
    scope: input.scope,
    cardId: input.cardId,
    createdByRole: input.layer,
    createdByUserId: input.userId,
    createdAt: new Date().toISOString(),
  };
  const idx = defs.findIndex((d) => d.id === id);
  if (idx >= 0) defs[idx] = def; else defs.push(def);
  writeAll(defs);
  return def;
}

/**
 * Visibility rules:
 *  - private:  only when createdByUserId === userId
 *  - team:     visible at layer ≥ manager
 *  - card:     visible to everyone entitled to the card (caller pre-filters card)
 *  - curated:  visible to everyone
 * Caller passes cardId to scope the result to one card; pass undefined to list across cards.
 */
export function listDefinitions(
  cardId: string | undefined,
  layer: RoleLayer,
  userId: string,
): ReportDefinition[] {
  const all = readAll();
  return all.filter((d) => {
    if (cardId && d.cardId !== cardId) return false;
    if (d.scope === 'curated') return true;
    if (d.scope === 'card') return true;
    if (d.scope === 'team') return layer === 'manager' || layer === 'management';
    // private
    return d.createdByUserId === userId;
  });
}

/**
 * Delete permissions:
 *  - own item: always allowed
 *  - any item: allowed at management layer
 */
export function deleteDefinition(
  id: string,
  layer: RoleLayer,
  userId: string,
): boolean {
  const defs = readAll();
  const target = defs.find((d) => d.id === id);
  if (!target) return false;
  const isOwner = target.createdByUserId === userId;
  const isMgmt = layer === 'management';
  if (!isOwner && !isMgmt) {
    throw new ReportDefinitionScopeError(
      `Layer "${layer}" cannot delete report owned by another user`,
    );
  }
  writeAll(defs.filter((d) => d.id !== id));
  return true;
}

/** Test-only reset · clears the storage key. */
export function __resetReportDefinitionsForTests(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(REPORT_DEFINITIONS_KEY);
    }
  } catch { /* ignore */ }
}
