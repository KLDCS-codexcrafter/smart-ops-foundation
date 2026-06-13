/**
 * @file        src/lib/cc-config-seed.ts
 * @sprint      W1C-7a · T-W1C7a-CC-Config-Seed · Wave-1 Close Arc
 * @purpose     Seed-only writers + config read-helper for the Command Center
 *              governance layer (Compliance Settings, Auto-Send rules,
 *              Integrations). Consumes existing engines · ZERO new SIBLINGs.
 *              ZERO writes outside the demo seed path.
 *
 *   - Compliance Settings: writes the per-entity comply360 sub-config keys
 *     using the SAME defaults (DEFAULT_GROUP_CONFIG, DEFAULT_RCM,
 *     DEFAULT_SETTLEMENT, DEFAULT_OUTSTANDING, DEFAULT_LC) the
 *     ComplianceSettingsAutomation component reads/writes via its own
 *     constants module — schema preserved bytes-identical (we do NOT
 *     invent fields). Group flags are flipped ON for the demo experience.
 *     The summary marker erp_comply360_config_${entity} is written so the
 *     OverviewModule security-score `isConfigured` check flips true.
 *
 *   - Auto-send rules: re-uses the auto-send-rules-engine update path
 *     (listAutoSendRules + upsertAutoSendRule) to flip the two W1C-4
 *     starter rules to enabled — for DEMO entities only. The engine
 *     remains 0-DIFF.
 *
 *   - Integrations: a small typed shape persisted under
 *     erp_integrations_${entity}. Demo writes the "connected" set;
 *     fresh real entities have no key → ALL integrations render as
 *     "not_configured" (ruling b · no fake connected state).
 *
 * [JWT] All localStorage paths are demo-seed scope only and tagged via the
 * comply360 / integrations key prefixes for `purgeDemoData` cleanup.
 */

import {
  COMPLY360_GROUP_KEY,
  comply360RCMKey,
  comply360SettlementKey,
  comply360OutstandingKey,
  comply360LCKey,
} from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import {
  DEFAULT_GROUP_CONFIG,
  DEFAULT_RCM,
  DEFAULT_SETTLEMENT,
  DEFAULT_OUTSTANDING,
  DEFAULT_LC,
} from '@/pages/erp/accounting/ComplianceSettingsAutomation.defaults';
import { listAutoSendRules, upsertAutoSendRule } from '@/lib/auto-send-rules-engine';

// ── Demo entity scope ───────────────────────────────────────────────────
/** Entity short-codes seeded by Foundation in useDemoSeedLoader.
 *  Source-of-truth: DEMO_COMPANY_PROFILES (SMRT · DGTL · EXPT). */
export const DEMO_ENTITY_CODES: ReadonlyArray<string> = ['SMRT', 'DGTL', 'EXPT'] as const;

export function isDemoEntity(entityCode: string): boolean {
  return DEMO_ENTITY_CODES.includes(entityCode);
}

// ── Integrations ────────────────────────────────────────────────────────
export type IntegrationStatus = 'connected' | 'not_configured' | 'disconnected';

export interface IntegrationRow {
  name: string;
  category: string;
  status: IntegrationStatus;
}

/** Honest fresh-entity state (ruling b · no fake connected). */
export const DEFAULT_NOT_CONFIGURED_INTEGRATIONS: ReadonlyArray<IntegrationRow> = [
  { name: 'Tally ERP',         category: 'Accounting',    status: 'not_configured' },
  { name: 'GST Portal',        category: 'Compliance',    status: 'not_configured' },
  { name: 'SMTP Email',        category: 'Communication', status: 'not_configured' },
  { name: 'WhatsApp Business', category: 'Communication', status: 'not_configured' },
  { name: 'SMS Gateway',       category: 'Communication', status: 'not_configured' },
];

/** What a demo-loaded entity presents (Tally · GST Portal · SMTP wired). */
export const DEMO_CONNECTED_INTEGRATIONS: ReadonlyArray<IntegrationRow> = [
  { name: 'Tally ERP',         category: 'Accounting',    status: 'connected' },
  { name: 'GST Portal',        category: 'Compliance',    status: 'connected' },
  { name: 'SMTP Email',        category: 'Communication', status: 'connected' },
  { name: 'WhatsApp Business', category: 'Communication', status: 'not_configured' },
  { name: 'SMS Gateway',       category: 'Communication', status: 'not_configured' },
];

export const integrationsKey = (entityCode: string): string =>
  `erp_integrations_${entityCode}`;

/** Reader consumed by SecurityModule IntegrationsPanel.
 *  No key for the active entity → honest not-configured set. */
export function loadIntegrationsForEntity(entityCode: string): IntegrationRow[] {
  try {
    // [JWT] GET /api/cc/integrations/:entityCode
    const raw = localStorage.getItem(integrationsKey(entityCode));
    if (!raw) return DEFAULT_NOT_CONFIGURED_INTEGRATIONS.map(r => ({ ...r }));
    const parsed = JSON.parse(raw) as IntegrationRow[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_NOT_CONFIGURED_INTEGRATIONS.map(r => ({ ...r }));
    }
    return parsed;
  } catch {
    return DEFAULT_NOT_CONFIGURED_INTEGRATIONS.map(r => ({ ...r }));
  }
}

// ── Compliance Settings & Automation summary marker ────────────────────
/** Storage-key for the FinCoreMastersModule "Compliance Settings &
 *  Automation" tile + OverviewModule `isConfigured` indicator. */
export const comply360ConfigKey = (entityCode: string): string =>
  `erp_comply360_config_${entityCode}`;

export interface Comply360ConfigSummary {
  /** Identifies the seed source for purgeDemoData. */
  seededBy: 'demo' | 'user';
  schemaVersion: 1;
  /** Feature-flag mirror of the per-entity flags that drive panel render. */
  gstEnabled: boolean;
  tdsEnabled: boolean;
  einvoiceEnabled: boolean;
  ewayEnabled: boolean;
  rcmEnabled: boolean;
  /** Timestamp for audit / debug. */
  seededAt: string;
}

// ── Seed entry point ────────────────────────────────────────────────────
function writeIfAbsent(key: string, value: unknown): void {
  // [JWT] GET/POST /api/entity/storage/:key — additive-only.
  const existing = localStorage.getItem(key);
  if (existing) return;
  localStorage.setItem(key, JSON.stringify(value));
}

/** Seed the CC governance layer for every demo entity.
 *  Called from useDemoSeedLoader.loadFoundationMasters().
 *  Idempotent · additive · honest (real-entity un-seeded surfaces untouched). */
export function seedCCConfigForDemoEntities(
  entityCodes: ReadonlyArray<string> = DEMO_ENTITY_CODES,
): void {
  // Group-scoped: written once across all demo entities (shape preserved).
  const groupConfig = {
    ...DEFAULT_GROUP_CONFIG,
    enableAdvancedGST: true,
    enableAutoRCM: true,
    enableQRMPScheme: false,
    enableAutoTDSPayable: true,
    enableAutoTDSReceivable: true,
    enableDiscountAutoPosting: true,
    enableTaxAuditReport: true,
    enableSAMModule: true,
  };
  writeIfAbsent(COMPLY360_GROUP_KEY, groupConfig);

  const now = new Date().toISOString();

  for (const entityCode of entityCodes) {
    // 1) Compliance Settings sub-configs — shapes preserved from defaults.
    //    Ledger-mapping fields left blank (honest): the fincore demo seed
    //    does NOT pre-create the RCM / LC ledger ids these point at, and
    //    fabricating ledger ids would violate the no-fake rule.
    writeIfAbsent(comply360RCMKey(entityCode),         { ...DEFAULT_RCM });
    writeIfAbsent(comply360SettlementKey(entityCode),  { ...DEFAULT_SETTLEMENT });
    writeIfAbsent(comply360OutstandingKey(entityCode), { ...DEFAULT_OUTSTANDING });
    writeIfAbsent(comply360LCKey(entityCode),          { ...DEFAULT_LC });

    // 2) Summary marker — flips OverviewModule.isConfigured() true.
    const summary: Comply360ConfigSummary = {
      seededBy: 'demo',
      schemaVersion: 1,
      gstEnabled: true,
      tdsEnabled: true,
      einvoiceEnabled: true,
      ewayEnabled: true,
      rcmEnabled: true,
      seededAt: now,
    };
    writeIfAbsent(comply360ConfigKey(entityCode), summary);

    // 3) Integrations — connected set for demo entities.
    writeIfAbsent(
      integrationsKey(entityCode),
      DEMO_CONNECTED_INTEGRATIONS.map(r => ({ ...r })),
    );

    // 4) Auto-send rules — enable the two W1C-4 starter rules per entity
    //    via the engine's update path (engine 0-DIFF).
    const rules = listAutoSendRules(entityCode);
    for (const r of rules) {
      if (r.event === 'approval.pending' || r.event === 'digest.my_reminders') {
        if (!r.enabled) upsertAutoSendRule(entityCode, { ...r, enabled: true });
      }
    }
  }
}
