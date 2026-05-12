/**
 * @file        src/types/call-type.ts
 * @purpose     Call Type CC master · NEW CC-owned master · Q-LOCK-4
 * @sprint      T-Phase-1.C.1a · Block D.1
 * @decisions   D-NEW-CT institutional · single-file pattern (matches cc-masters.ts)
 * @disciplines FR-30
 * @[JWT]       Phase 2 wires GET/POST/PUT /api/cc/call-types
 */

export type SLASeverity = 'sev1_critical' | 'sev2_high' | 'sev3_medium' | 'sev4_low';

export interface EscalationLevel {
  level: number;
  trigger_after_minutes: number;
  notify_role: string;
}

export interface CallTypeConfiguration {
  id: string;
  call_type_code: string;
  display_name: string;
  default_sla_severity: SLASeverity;
  default_assignment_rule: 'round_robin' | 'territory' | 'skill_based' | 'manual';
  escalation_matrix: EscalationLevel[];
  language_pref?: string;
  is_active: boolean;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

export const callTypeConfigurationKey = (entityCode: string): string =>
  `erp_call_type_${entityCode}`;

const std = (
  code: string,
  name: string,
  sla: SLASeverity,
  rule: CallTypeConfiguration['default_assignment_rule'],
): CallTypeConfiguration => ({
  id: `ct-${code.toLowerCase()}`,
  call_type_code: code,
  display_name: name,
  default_sla_severity: sla,
  default_assignment_rule: rule,
  escalation_matrix: [
    { level: 1, trigger_after_minutes: 60, notify_role: 'service_supervisor' },
    { level: 2, trigger_after_minutes: 240, notify_role: 'service_manager' },
    { level: 3, trigger_after_minutes: 480, notify_role: 'branch_head' },
  ],
  is_active: true,
  created_at: '',
  created_by: 'system',
  updated_at: '',
  updated_by: 'system',
});

/** 12 standard call types · seeded on first run · consumed via servicedesk-engine.ts getCallTypeConfiguration */
export const STANDARD_CALL_TYPES: CallTypeConfiguration[] = [
  std('INSTALL', 'Installation', 'sev3_medium', 'territory'),
  std('REPAIR', 'Repair', 'sev2_high', 'skill_based'),
  std('CALIBRATION', 'Calibration', 'sev3_medium', 'skill_based'),
  std('WARRANTY_CLAIM', 'Warranty Claim', 'sev2_high', 'territory'),
  std('AMC_SERVICE', 'AMC Service', 'sev3_medium', 'territory'),
  std('SPARE_REPLACE', 'Spare Replacement', 'sev3_medium', 'round_robin'),
  std('STANDBY_LOAN', 'Standby Loan', 'sev2_high', 'manual'),
  std('CUSTOMER_IN', 'Customer In', 'sev3_medium', 'round_robin'),
  std('CUSTOMER_OUT', 'Customer Out', 'sev3_medium', 'round_robin'),
  std('VOICE_COMPLAINT', 'Voice Complaint', 'sev1_critical', 'manual'),
  std('WA_INQUIRY', 'WhatsApp Inquiry', 'sev4_low', 'round_robin'),
  std('AUTO_PMS', 'Auto-PMS', 'sev4_low', 'territory'),
];
