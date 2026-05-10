/**
 * @file src/types/welder.ts
 * @purpose Welder Qualification data model · ASME IX + AWS D1.1 chain (Welder + WPS + PQR + WPQ)
 * @who Lovable on behalf of Operix Founder
 * @when 2026-05-09
 * @sprint T-Phase-1.A.5.c-QualiCheck-Welder-Vendor-ISO-IQC
 * @iso 25010 Maintainability + Reliability + Auditability · ASME IX QW-200/QW-300/QW-450 · AWS D1.1
 * @whom QA Manager · Welding Engineer · Welder
 * @decisions D-NEW-BN (Welder Qualification engine NEW · Welder→WPS→PQR→WPQ chain)
 * @disciplines FR-19 (consume Party master · zero-touch Procure360) ·
 *              FR-22 (ActivityItemKind · Welder='master' · WPS/PQR/WPQ='document') ·
 *              FR-30 · FR-50 (entity_id) · FR-51 (branch_id)
 * @[JWT] localStorage keys: erp_welder_${entityCode} · erp_wps_${entityCode} · erp_pqr_${entityCode} · erp_wpq_${entityCode}
 */

export type WelderId = `WLD-${string}`;
export type WpsId = `WPS-${string}`;
export type PqrId = `PQR-${string}`;
export type WpqId = `WPQ-${string}`;

export type WeldingStandard = 'asme_ix' | 'aws_d1_1';
export type WeldingProcess = 'smaw' | 'gmaw' | 'gtaw' | 'fcaw';
export type WeldingPosition = '1G' | '2G' | '3G' | '4G' | '5G' | '6G';
export type QualificationStatus = 'qualified' | 'expired' | 'suspended' | 'revoked';

export interface Welder {
  id: WelderId;
  entity_id: string;
  branch_id?: string | null;
  party_id: string;
  employee_code?: string | null;
  full_name: string;
  joined_at: string;
  active: boolean;
}

export interface WeldingProcedureSpec {
  id: WpsId;
  entity_id: string;
  branch_id?: string | null;
  wps_no: string;
  standard: WeldingStandard;
  processes: WeldingProcess[];
  positions: WeldingPosition[];
  base_metal_spec: string;
  filler_metal_spec: string;
  preheat_temp_c?: number | null;
  interpass_temp_c?: number | null;
  prepared_by: string;
  prepared_at: string;
  approved_by?: string | null;
  approved_at?: string | null;
  document_url?: string | null;
}

export interface ProcedureQualificationRecord {
  id: PqrId;
  entity_id: string;
  branch_id?: string | null;
  pqr_no: string;
  related_wps_id: WpsId;
  test_date: string;
  test_lab?: string | null;
  tensile_strength_mpa: number;
  bend_test_result: 'pass' | 'fail';
  hardness_value?: number | null;
  hardness_unit?: 'HB' | 'HRC' | 'HRB' | 'HV' | null;
  certified_by: string;
  document_url?: string | null;
}

export interface WelderPerformanceQualification {
  id: WpqId;
  entity_id: string;
  branch_id?: string | null;
  wpq_no: string;
  related_welder_id: WelderId;
  related_wps_id: WpsId;
  standard: WeldingStandard;
  processes: WeldingProcess[];
  positions: WeldingPosition[];
  qualified_at: string;
  qualified_through: string;
  qualified_by: string;
  test_pieces?: string[] | null;
  status: QualificationStatus;
  expiry_alert_sent_at?: string | null;
  document_url?: string | null;
}

export const welderKey = (e: string): string => `erp_welder_${e}`;
export const wpsKey = (e: string): string => `erp_wps_${e}`;
export const pqrKey = (e: string): string => `erp_pqr_${e}`;
export const wpqKey = (e: string): string => `erp_wpq_${e}`;

export const WELDING_STANDARD_LABELS: Record<WeldingStandard, string> = {
  asme_ix: 'ASME IX',
  aws_d1_1: 'AWS D1.1',
};

export const WELDING_PROCESS_LABELS: Record<WeldingProcess, string> = {
  smaw: 'SMAW',
  gmaw: 'GMAW',
  gtaw: 'GTAW',
  fcaw: 'FCAW',
};

export const QUAL_STATUS_LABELS: Record<QualificationStatus, string> = {
  qualified: 'Qualified',
  expired: 'Expired',
  suspended: 'Suspended',
  revoked: 'Revoked',
};
