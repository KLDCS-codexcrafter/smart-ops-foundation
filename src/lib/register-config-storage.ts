/**
 * @file     register-config-storage.ts
 * @purpose  Load, save, reset, and key-compute helpers for RegisterConfig under localStorage.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created Apr-2026 · T10-pre.2d-A
 * @sprint   T10-pre.2d-A
 * @iso      Reliability (HIGH — graceful fallback on missing/corrupt storage)
 *           Maintainability (HIGH — single-source key derivation)
 * @whom     RegisterConfigPage (editor) · (future 2d-C) 13 register pages
 * @depends  register-config.ts (types + defaults)
 * @consumers RegisterConfigPage.tsx · (future 2d-C) 13 register pages
 */

import {
  type RegisterConfig,
  type RegisterTypeCode,
  type RegisterToggles,
  type RegisterGroupKey,
  DEFAULT_REGISTER_CONFIG,
  DEFAULT_REGISTER_TOGGLES,
  DEFAULT_REGISTER_GROUP,
} from '@/types/register-config';

/**
 * @purpose   Canonical localStorage key per entity.
 * @param     entityCode — entity short code
 * @returns   'registerConfig:{entityCode}'
 * @iso       Maintainability — single-source key derivation
 */
export function registerConfigKey(entityCode: string): string {
  return `registerConfig:${entityCode}`;
}

/**
 * @purpose   Load RegisterConfig from localStorage. Returns default on missing/corrupt.
 * @param     entityCode — entity short code
 * @returns   RegisterConfig (never null — falls back to DEFAULT_REGISTER_CONFIG)
 * @iso       Reliability — try/catch prevents one bad entity from breaking the app
 */
export function loadRegisterConfig(entityCode: string): RegisterConfig {
  try {
    // [JWT] GET /api/finecore/register-config/:entityCode
    const raw = localStorage.getItem(registerConfigKey(entityCode));
    if (!raw) return DEFAULT_REGISTER_CONFIG;
    const parsed = JSON.parse(raw) as Partial<RegisterConfig>;
    // [Critical] Version check: if stored version != current, fall back to default.
    // Prevents reading incompatible old shapes after shape changes.
    if (parsed.version !== 1) return DEFAULT_REGISTER_CONFIG;
    return {
      version: 1,
      byRegisterType: parsed.byRegisterType ?? {},
    };
  } catch {
    return DEFAULT_REGISTER_CONFIG;
  }
}

/**
 * @purpose   Save RegisterConfig to localStorage.
 * @param     entityCode — entity short code
 * @param     config — full RegisterConfig to persist
 * @iso       Reliability — no-throw on quota exceeded (rare for ~5KB config)
 */
export function saveRegisterConfig(entityCode: string, config: RegisterConfig): void {
  try {
    // [JWT] PUT /api/finecore/register-config/:entityCode
    localStorage.setItem(registerConfigKey(entityCode), JSON.stringify(config));
  } catch (err) {
    // [Analytical] Diagnostic-only; banned-pattern targets console.log, not console.error.
    console.error('Failed to save RegisterConfig:', err);
  }
}

/**
 * @purpose   Remove RegisterConfig from localStorage, restoring defaults on next load.
 * @param     entityCode — entity short code
 */
export function resetRegisterConfig(entityCode: string): void {
  try {
    // [JWT] DELETE /api/finecore/register-config/:entityCode
    localStorage.removeItem(registerConfigKey(entityCode));
  } catch {
    // ignore
  }
}

/**
 * @purpose   Resolve effective toggles for a register type — merges stored Partial over defaults.
 * @param     config — full RegisterConfig
 * @param     registerType — which register
 * @returns   Complete RegisterToggles with all keys populated
 * @iso       Reliability — missing keys always fall back to DEFAULT_REGISTER_TOGGLES
 */
export function resolveToggles(config: RegisterConfig, registerType: RegisterTypeCode): RegisterToggles {
  const stored = config.byRegisterType[registerType]?.toggles ?? {};
  return { ...DEFAULT_REGISTER_TOGGLES, ...stored };
}

/**
 * @purpose   Resolve effective default group for a register type.
 * @param     config — full RegisterConfig
 * @param     registerType — which register
 * @returns   RegisterGroupKey — either stored override or DEFAULT_REGISTER_GROUP[type]
 */
export function resolveDefaultGroup(config: RegisterConfig, registerType: RegisterTypeCode): RegisterGroupKey {
  return config.byRegisterType[registerType]?.defaultGroup ?? DEFAULT_REGISTER_GROUP[registerType];
}
