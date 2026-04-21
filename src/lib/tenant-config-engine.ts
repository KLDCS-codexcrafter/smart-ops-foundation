/**
 * tenant-config-engine.ts — Tenant-level configuration (Phase 1 skeleton)
 *
 * PURPOSE
 * Central place to read tenant-wide flags: accounting_mode, default currency, FY start month,
 * time zone, etc. Drives feature gating + voucher behaviour + chip visibility.
 *
 * INPUT        entityCode
 * OUTPUT       TenantConfig object (seeded with defaults if not found)
 *
 * DEPENDENCIES none at the engine level (storage wrapped per Rule 1 — hook owns persistence
 *              in Phase 2; this file stays pure).
 *
 * TALLY-ON-TOP BEHAVIOR
 * accounting_mode drives whether voucher posts hit Operix GL or only emit events for Bridge.
 *
 * SPEC DOC
 * /docs/Operix_Phase1_Roadmap.xlsx — D-002 (accounting_mode), D-003 (Tally-on-top boundary)
 */

import type { AccountingMode } from './event-bus';

export interface TenantConfig {
  entity_code: string;
  accounting_mode: AccountingMode;
  default_currency: string;      // 'INR'
  fy_start_month: number;        // 1-12, default 4 (April for India)
  timezone: string;              // 'Asia/Kolkata'
  base_country: string;          // 'IN'
  tally_bridge_enabled: boolean; // true if a Bridge instance is active
  /** ISO timestamp; updated whenever config is saved */
  updated_at: string;
}

export function tenantConfigKey(entityCode: string): string {
  return `erp_tenant_config_${entityCode}`;
}

export function defaultTenantConfig(entityCode: string): TenantConfig {
  return {
    entity_code: entityCode,
    accounting_mode: 'standalone',
    default_currency: 'INR',
    fy_start_month: 4,
    timezone: 'Asia/Kolkata',
    base_country: 'IN',
    tally_bridge_enabled: false,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Read tenant config from data source. Phase 1 uses localStorage (wrapped here).
 * Phase 2 will swap the ls() call for an API call; this function's signature stays.
 */
export function loadTenantConfig(entityCode: string): TenantConfig {
  try {
    // [JWT] GET /api/tenants/:entityCode/config
    const raw = localStorage.getItem(tenantConfigKey(entityCode));
    if (raw) return JSON.parse(raw) as TenantConfig;
  } catch { /* fall through to seed */ }
  const seeded = defaultTenantConfig(entityCode);
  try {
    // [JWT] PUT /api/tenants/:entityCode/config (seed)
    localStorage.setItem(tenantConfigKey(entityCode), JSON.stringify(seeded));
  } catch { /* ignore */ }
  return seeded;
}

/** Upsert tenant config. Returns the merged config. */
export function updateTenantConfig(
  entityCode: string,
  patch: Partial<Omit<TenantConfig, 'entity_code' | 'updated_at'>>,
): TenantConfig {
  const current = loadTenantConfig(entityCode);
  const merged: TenantConfig = {
    ...current,
    ...patch,
    entity_code: entityCode,
    updated_at: new Date().toISOString(),
  };
  try {
    // [JWT] PATCH /api/tenants/:entityCode/config
    localStorage.setItem(tenantConfigKey(entityCode), JSON.stringify(merged));
  } catch { /* ignore */ }
  return merged;
}
