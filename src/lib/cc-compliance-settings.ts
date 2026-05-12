/**
 * @file        src/lib/cc-compliance-settings.ts
 * @purpose     CC Compliance Settings · NEW canonical home · 7 ServiceDesk-relevant setting groups
 * @sprint      T-Phase-1.C.1a · Block D.2 · v2 spec · Q-LOCK-6
 * @decisions   D-NEW-CY 2nd consumer (SLA Matrix · FR-77 promotion threshold MET)
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
      flash_timer_minutes: sev === 'sev1_critical' ? 15 : sev === 'sev2_high' ? 30 : 60,
    })),
  ),
};

export const DEFAULT_TELLICALLER_TRIGGER_SETTINGS: TellicallerTriggerSettings = {
  triggers: [
    {
      trigger_id: 'tc-renewal-90',
      trigger_name: 'Renewal 90-day window',
      trigger_at_days: 90,
      push_to_queue_threshold: 50,
      script_id: 'script-renewal-1',
      assignment_rule: 'territory',
      language_pref: 'hi',
    },
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
  void updated_by;
  const next = { ...getRiskEngineSettings(entityCode), ...updates };
  // [JWT] PUT /api/cc/compliance-settings/risk
  writeSettings(riskKey(entityCode), next);
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
  void updated_by;
  const next = { ...getCommissionRateSettings(entityCode), ...updates };
  writeSettings(commissionKey(entityCode), next);
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
  void updated_by;
  const next = { ...getRenewalCascadeSettings(entityCode), ...updates };
  writeSettings(renewalKey(entityCode), next);
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
  void updated_by;
  const next = { ...getServiceTierSettings(entityCode), ...updates };
  writeSettings(serviceTierKey(entityCode), next);
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
  void updated_by;
  const next = { ...getEmailTemplateSettings(entityCode), ...updates };
  writeSettings(emailTemplateKey(entityCode), next);
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
  void updated_by;
  const next = { ...getSLAMatrixSettings(entityCode), ...updates };
  writeSettings(slaMatrixKey(entityCode), next);
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
  void updated_by;
  const next = { ...getTellicallerTriggerSettings(entityCode), ...updates };
  writeSettings(tellicallerKey(entityCode), next);
  return next;
}
