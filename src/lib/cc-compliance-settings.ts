/**
 * @file        src/lib/cc-compliance-settings.ts
 * @purpose     CC Compliance Settings · NEW canonical home · 7 ServiceDesk-relevant setting groups
 * @sprint      T-Phase-1.C.1a · Block D.2 · v2 spec · Q-LOCK-6
 * @decisions   D-NEW-CY 2nd consumer (SLA Matrix · FR-77 promotion threshold MET)
 * @iso        Functional Suitability + Maintainability
 * @disciplines FR-30 · FR-54
 * @[JWT]       Phase 2 wires real backend
 */

import type { SLASeverity } from '@/types/call-type';

// Group 1 · Risk Engine
export interface RiskFactorWeights {
  payment_history: number;
  expiry_proximity: number;
  contract_value: number;
  service_status: number;
  customer_activity: number;
}
export interface RiskEngineSettings {
  risk_factor_weights: RiskFactorWeights;
  risk_threshold_high: number;
  risk_threshold_medium: number;
}

// Group 2 · Commission Rates
export interface CommissionRateSettings {
  salesman_default_rate: number;
  receiver_default_rate: number;
  amc_default_rate: number;
  branch_overrides: Record<string, Partial<Omit<CommissionRateSettings, 'branch_overrides'>>>;
}

// Group 3 · Renewal Cascade (Q15-d 4-cascade)
export interface RenewalCascadeSettings {
  first_reminder_days: number;
  second_reminder_days: number;
  third_reminder_days: number;
  final_reminder_days: number;
  oem_overrides: Record<string, Partial<Omit<RenewalCascadeSettings, 'oem_overrides' | 'customer_class_overrides'>>>;
  customer_class_overrides: Record<string, Partial<Omit<RenewalCascadeSettings, 'oem_overrides' | 'customer_class_overrides'>>>;
}

// Group 4 · Service Tier (Q10-c configurable · free-form attributes)
export interface ServiceTier {
  tier_id: string;
  customer_id: string;
  tier_name: string;
  tier_attributes: Record<string, unknown>;
}
export interface ServiceTierSettings {
  tiers: ServiceTier[];
}

// Group 5 · Email Templates (3-cascade)
export interface EmailTemplate {
  template_id: string;
  template_name: string;
  cascade_level: 1 | 2 | 3;
  oem_pref?: string;
  customer_class_pref?: string;
  language: string;
  subject_template: string;
  body_template: string;
}
export interface EmailTemplateSettings {
  templates: EmailTemplate[];
}

// Group 6 · SLA Matrix (28-cell · D-NEW-CY 2nd consumer · FR-77 path MET)
export interface SLAMatrixCell {
  call_type_code: string;
  severity: SLASeverity;
  response_hours: number;
  resolution_hours: number;
  flash_timer_minutes: number;
}
export interface SLAMatrixSettings {
  matrix: SLAMatrixCell[];
}

// Group 7 · Tellicaller Trigger Config (D-NEW-DJ Three-Layer 32nd POSSIBLE)
export interface TellicallerTriggerConfig {
  trigger_id: string;
  trigger_name: string;
  trigger_at_days: number;
  push_to_queue_threshold: number;
  script_id: string;
  assignment_rule: 'round_robin' | 'territory' | 'oem_specialist';
  language_pref: string;
  oem_overrides?: Record<string, Partial<Omit<TellicallerTriggerConfig, 'oem_overrides' | 'customer_class_overrides'>>>;
  customer_class_overrides?: Record<string, Partial<Omit<TellicallerTriggerConfig, 'oem_overrides' | 'customer_class_overrides'>>>;
}
export interface TellicallerTriggerSettings {
  triggers: TellicallerTriggerConfig[];
}

// ============================================================================
// localStorage keys · namespaced 'cc_compliance_v1'
// ============================================================================
const NS = 'cc_compliance_v1';
const riskKey = (e: string): string => `${NS}_risk_${e}`;
const commissionKey = (e: string): string => `${NS}_commission_${e}`;
const renewalKey = (e: string): string => `${NS}_renewal_${e}`;
const serviceTierKey = (e: string): string => `${NS}_service_tier_${e}`;
const emailTemplateKey = (e: string): string => `${NS}_email_template_${e}`;
const slaMatrixKey = (e: string): string => `${NS}_sla_matrix_${e}`;
const tellicallerKey = (e: string): string => `${NS}_tellicaller_${e}`;

// ============================================================================
// DEFAULTS
// ============================================================================
export const DEFAULT_RISK_ENGINE_SETTINGS: RiskEngineSettings = {
  risk_factor_weights: {
    payment_history: 25,
    expiry_proximity: 20,
    contract_value: 15,
    service_status: 20,
    customer_activity: 20,
  },
  risk_threshold_high: 70,
  risk_threshold_medium: 40,
};

export const DEFAULT_COMMISSION_RATE_SETTINGS: CommissionRateSettings = {
  salesman_default_rate: 2.5,
  receiver_default_rate: 1.0,
  amc_default_rate: 5.0,
  branch_overrides: {},
};

export const DEFAULT_RENEWAL_CASCADE_SETTINGS: RenewalCascadeSettings = {
  first_reminder_days: 90,
  second_reminder_days: 60,
  third_reminder_days: 30,
  final_reminder_days: 7,
  oem_overrides: {},
  customer_class_overrides: {},
};

export const DEFAULT_SERVICE_TIER_SETTINGS: ServiceTierSettings = { tiers: [] };
export const DEFAULT_EMAIL_TEMPLATE_SETTINGS: EmailTemplateSettings = { templates: [] };

const DEFAULT_CALL_TYPES_FOR_SLA = ['INSTALL', 'REPAIR', 'CALIBRATION', 'WARRANTY_CLAIM', 'AMC_SERVICE', 'SPARE_REPLACE', 'STANDBY_LOAN'];
const SLA_SEVS: SLASeverity[] = ['sev1_critical', 'sev2_high', 'sev3_medium', 'sev4_low'];

export const DEFAULT_SLA_MATRIX_SETTINGS: SLAMatrixSettings = {
  matrix: DEFAULT_CALL_TYPES_FOR_SLA.flatMap((ct) =>
    SLA_SEVS.map((sev) => ({
      call_type_code: ct,
      severity: sev,
      response_hours: sev === 'sev1_critical' ? 2 : sev === 'sev2_high' ? 4 : sev === 'sev3_medium' ? 8 : 24,
      resolution_hours: sev === 'sev1_critical' ? 8 : sev === 'sev2_high' ? 24 : sev === 'sev3_medium' ? 48 : 96,
      flash_timer_minutes: sev === 'sev1_critical' ? 15 : sev === 'sev2_high' ? 30 : sev === 'sev3_medium' ? 60 : 120,
    })),
  ),
};

export const DEFAULT_TELLICALLER_TRIGGER_SETTINGS: TellicallerTriggerSettings = {
  triggers: [
    { trigger_id: 'tc-renewal-90', trigger_name: 'Renewal 90-day window', trigger_at_days: 90, push_to_queue_threshold: 50, script_id: 'script-renewal-1', assignment_rule: 'territory', language_pref: 'hi' },
    { trigger_id: 'tc-renewal-60', trigger_name: 'Renewal 60-day window', trigger_at_days: 60, push_to_queue_threshold: 60, script_id: 'script-renewal-2', assignment_rule: 'territory', language_pref: 'hi' },
    { trigger_id: 'tc-renewal-30', trigger_name: 'Renewal 30-day window', trigger_at_days: 30, push_to_queue_threshold: 70, script_id: 'script-renewal-3', assignment_rule: 'oem_specialist', language_pref: 'hi' },
  ],
};

// ============================================================================
// CRUD helpers (generic) · [JWT] markers for Phase 2
// ============================================================================

function readOrDefault<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeSettings<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota silent */
  }
}

// ============================================================================
// AUDIT LOG (FR-39 §B audit immutability) · all updates write to ${NS}_audit_<entity>
// ============================================================================
interface CCSettingsAuditEntry {
  at: string;
  by: string;
  setting_group: string;
  before: unknown;
  after: unknown;
}
const ccAuditKey = (e: string): string => `${NS}_audit_${e}`;
function appendCCSettingsAudit(
  entityCode: string,
  by: string,
  setting_group: string,
  before: unknown,
  after: unknown,
): void {
  try {
    const key = ccAuditKey(entityCode);
    const log = JSON.parse(localStorage.getItem(key) ?? '[]') as CCSettingsAuditEntry[];
    log.push({ at: new Date().toISOString(), by, setting_group, before, after });
    localStorage.setItem(key, JSON.stringify(log));
  } catch { /* quota silent */ }
}

// ============================================================================
// VALIDATORS (FR-39 §B data integrity)
// ============================================================================
export function validateRiskWeights(w: RiskFactorWeights): { valid: boolean; sum: number; error?: string } {
  const sum = w.payment_history + w.expiry_proximity + w.contract_value + w.service_status + w.customer_activity;
  if (sum < 95 || sum > 105) {
    return { valid: false, sum, error: `Risk factor weights must sum to ~100 (got ${sum})` };
  }
  return { valid: true, sum };
}
export function validateRenewalCascade(s: RenewalCascadeSettings): { valid: boolean; error?: string } {
  if (!(s.first_reminder_days > s.second_reminder_days && s.second_reminder_days > s.third_reminder_days && s.third_reminder_days > s.final_reminder_days)) {
    return { valid: false, error: 'Renewal cascade days must be strictly descending (first > second > third > final)' };
  }
  if (s.final_reminder_days < 1) return { valid: false, error: 'Final reminder must be ≥ 1 day' };
  return { valid: true };
}
export function validateSLAMatrix(s: SLAMatrixSettings): { valid: boolean; error?: string } {
  for (const cell of s.matrix) {
    if (cell.response_hours <= 0 || cell.resolution_hours <= 0 || cell.flash_timer_minutes <= 0) {
      return { valid: false, error: `SLA cell ${cell.call_type_code}/${cell.severity} has non-positive value` };
    }
    if (cell.response_hours > cell.resolution_hours) {
      return { valid: false, error: `SLA cell ${cell.call_type_code}/${cell.severity}: response (${cell.response_hours}h) > resolution (${cell.resolution_hours}h)` };
    }
  }
  return { valid: true };
}

// Group 1 · Risk
export function getRiskEngineSettings(entityCode: string): RiskEngineSettings {
  // [JWT] GET /api/cc/compliance-settings/risk
  return readOrDefault(riskKey(entityCode), DEFAULT_RISK_ENGINE_SETTINGS);
}
export function updateRiskEngineSettings(
  entityCode: string,
  updates: Partial<RiskEngineSettings>,
  updated_by: string,
): RiskEngineSettings {
  const before = getRiskEngineSettings(entityCode);
  const next = { ...before, ...updates };
  if (updates.risk_factor_weights) {
    const v = validateRiskWeights(next.risk_factor_weights);
    if (!v.valid) throw new Error(v.error);
  }
  // [JWT] PUT /api/cc/compliance-settings/risk
  writeSettings(riskKey(entityCode), next);
  appendCCSettingsAudit(entityCode, updated_by, 'risk_engine', before, next);
  return next;
}

// Group 2 · Commission
export function getCommissionRateSettings(entityCode: string): CommissionRateSettings {
  return readOrDefault(commissionKey(entityCode), DEFAULT_COMMISSION_RATE_SETTINGS);
}
export function updateCommissionRateSettings(
  entityCode: string,
  updates: Partial<CommissionRateSettings>,
  updated_by: string,
): CommissionRateSettings {
  const before = getCommissionRateSettings(entityCode);
  const next = { ...before, ...updates };
  writeSettings(commissionKey(entityCode), next);
  appendCCSettingsAudit(entityCode, updated_by, 'commission', before, next);
  return next;
}

// Group 3 · Renewal Cascade
export function getRenewalCascadeSettings(entityCode: string): RenewalCascadeSettings {
  return readOrDefault(renewalKey(entityCode), DEFAULT_RENEWAL_CASCADE_SETTINGS);
}
export function updateRenewalCascadeSettings(
  entityCode: string,
  updates: Partial<RenewalCascadeSettings>,
  updated_by: string,
): RenewalCascadeSettings {
  const before = getRenewalCascadeSettings(entityCode);
  const next = { ...before, ...updates };
  const v = validateRenewalCascade(next);
  if (!v.valid) throw new Error(v.error);
  writeSettings(renewalKey(entityCode), next);
  appendCCSettingsAudit(entityCode, updated_by, 'renewal_cascade', before, next);
  return next;
}

// Group 4 · Service Tier
export function getServiceTierSettings(entityCode: string): ServiceTierSettings {
  return readOrDefault(serviceTierKey(entityCode), DEFAULT_SERVICE_TIER_SETTINGS);
}
export function updateServiceTierSettings(
  entityCode: string,
  updates: Partial<ServiceTierSettings>,
  updated_by: string,
): ServiceTierSettings {
  const before = getServiceTierSettings(entityCode);
  const next = { ...before, ...updates };
  writeSettings(serviceTierKey(entityCode), next);
  appendCCSettingsAudit(entityCode, updated_by, 'service_tier', before, next);
  return next;
}

// Group 5 · Email Templates
export function getEmailTemplateSettings(entityCode: string): EmailTemplateSettings {
  return readOrDefault(emailTemplateKey(entityCode), DEFAULT_EMAIL_TEMPLATE_SETTINGS);
}
export function updateEmailTemplateSettings(
  entityCode: string,
  updates: Partial<EmailTemplateSettings>,
  updated_by: string,
): EmailTemplateSettings {
  const before = getEmailTemplateSettings(entityCode);
  const next = { ...before, ...updates };
  writeSettings(emailTemplateKey(entityCode), next);
  appendCCSettingsAudit(entityCode, updated_by, 'email_template', before, next);
  return next;
}

// Group 6 · SLA Matrix
export function getSLAMatrixSettings(entityCode: string): SLAMatrixSettings {
  return readOrDefault(slaMatrixKey(entityCode), DEFAULT_SLA_MATRIX_SETTINGS);
}
export function updateSLAMatrixSettings(
  entityCode: string,
  updates: Partial<SLAMatrixSettings>,
  updated_by: string,
): SLAMatrixSettings {
  const before = getSLAMatrixSettings(entityCode);
  const next = { ...before, ...updates };
  const v = validateSLAMatrix(next);
  if (!v.valid) throw new Error(v.error);
  writeSettings(slaMatrixKey(entityCode), next);
  appendCCSettingsAudit(entityCode, updated_by, 'sla_matrix', before, next);
  return next;
}

// Group 7 · Tellicaller Triggers
export function getTellicallerTriggerSettings(entityCode: string): TellicallerTriggerSettings {
  return readOrDefault(tellicallerKey(entityCode), DEFAULT_TELLICALLER_TRIGGER_SETTINGS);
}
export function updateTellicallerTriggerSettings(
  entityCode: string,
  updates: Partial<TellicallerTriggerSettings>,
  updated_by: string,
): TellicallerTriggerSettings {
  const before = getTellicallerTriggerSettings(entityCode);
  const next = { ...before, ...updates };
  writeSettings(tellicallerKey(entityCode), next);
  appendCCSettingsAudit(entityCode, updated_by, 'tellicaller', before, next);
  return next;
}
