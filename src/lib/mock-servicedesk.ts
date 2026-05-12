/**
 * @file        src/lib/mock-servicedesk.ts
 * @purpose     Demo seed · Sinha + Smart Power 5-archetype + Multi-OEM 1-customer-3-OEMs
 * @sprint      T-Phase-1.C.1a · Block H · v2 spec
 */
import type { AMCRecord } from '@/types/servicedesk';
import { amcRecordKey } from '@/types/servicedesk';

const nowIso = (): string => new Date().toISOString();

const baseAMC = (overrides: Partial<AMCRecord>): AMCRecord => ({
  id: `amc_seed_${overrides.id ?? Math.random().toString(36).slice(2, 8)}`,
  entity_id: 'OPRX',
  branch_id: 'BR-MUM',
  customer_id: '',
  sales_invoice_id: null,
  amc_applicable: null,
  applicability_decided_at: null,
  applicability_decided_by: null,
  applicability_reason: '',
  amc_code: '',
  amc_type: 'comprehensive',
  contract_start: null,
  contract_end: null,
  billing_cycle: 'upfront',
  contract_value_paise: 0,
  billed_to_date_paise: 0,
  outstanding_paise: 0,
  commission_salesman_pct: 2.5,
  commission_receiver_pct: 1.0,
  commission_amc_pct: 5.0,
  risk_score: 0,
  risk_bucket: 'low',
  renewal_probability: 0,
  status: 'applicability_pending',
  lifecycle_stage: 'applicability_decision',
  oem_name: '',
  oem_sla_hours: null,
  iot_device_ids: [],
  whatsapp_lifecycle_phase: 'post_install',
  created_at: nowIso(),
  updated_at: nowIso(),
  created_by: 'seed',
  audit_trail: [],
  ...overrides,
});

/** Sinha AAD/26-27/SINHA001 · cross-card preserved from A.15a + A.16b */
export const SINHA_AMC_APPLICABILITY_DECISION: AMCRecord = baseAMC({
  id: 'sinha-001',
  customer_id: 'CUST-SINHA-001',
  amc_code: 'AAD/26-27/SINHA001',
  oem_name: 'Voltas',
  applicability_reason: 'CAPEX install completed · 1-yr warranty expiring 2027-03',
});

/** Smart Power 5-archetype · SMRTP-001 to 005 */
export const SMARTPOWER_AMC_ARCHETYPES: AMCRecord[] = [
  baseAMC({
    id: 'smrtp-001',
    customer_id: 'CUST-SMRTP-001',
    amc_code: 'AMC/SMRTP/001',
    oem_name: 'Mitsubishi',
    contract_value_paise: 120_00_000,
    status: 'active',
    lifecycle_stage: 'active',
    amc_applicable: true,
  }),
  baseAMC({
    id: 'smrtp-002',
    customer_id: 'CUST-SMRTP-002',
    amc_code: 'AMC/SMRTP/002',
    oem_name: 'Mitsubishi',
    contract_value_paise: 80_00_000,
    status: 'expiring_soon',
    lifecycle_stage: 'renewal_window',
    amc_applicable: true,
  }),
  baseAMC({
    id: 'smrtp-003',
    customer_id: 'CUST-SMRTP-003',
    amc_code: 'AMC/SMRTP/003',
    oem_name: 'Daikin',
    contract_value_paise: 45_00_000,
    status: 'active',
    lifecycle_stage: 'service_delivery',
    amc_applicable: true,
  }),
  baseAMC({
    id: 'smrtp-004',
    customer_id: 'CUST-SMRTP-004',
    amc_code: 'AMC/SMRTP/004',
    oem_name: 'Daikin',
    contract_value_paise: 25_00_000,
    status: 'expired',
    lifecycle_stage: 'lapsed',
    amc_applicable: true,
  }),
  baseAMC({
    id: 'smrtp-005',
    customer_id: 'CUST-SMRTP-005',
    amc_code: 'AMC/SMRTP/005',
    oem_name: 'Bluestar',
    contract_value_paise: 60_00_000,
    status: 'proposal_sent',
    lifecycle_stage: 'proposal',
    amc_applicable: true,
  }),
];

/** Multi-OEM 1 customer · 3 OEMs (Voltas + Daikin + Bluestar) */
export const MULTI_OEM_DEMO_CUSTOMER: AMCRecord[] = [
  baseAMC({ id: 'multi-v', customer_id: 'CUST-MULTI-001', amc_code: 'AMC/MULTI/VOLTAS', oem_name: 'Voltas', contract_value_paise: 30_00_000, status: 'active', amc_applicable: true }),
  baseAMC({ id: 'multi-d', customer_id: 'CUST-MULTI-001', amc_code: 'AMC/MULTI/DAIKIN', oem_name: 'Daikin', contract_value_paise: 20_00_000, status: 'active', amc_applicable: true }),
  baseAMC({ id: 'multi-b', customer_id: 'CUST-MULTI-001', amc_code: 'AMC/MULTI/BLUESTAR', oem_name: 'Bluestar', contract_value_paise: 15_00_000, status: 'expiring_soon', amc_applicable: true }),
];

export function seedServiceDeskDemo(entityCode: string): void {
  try {
    const key = amcRecordKey(entityCode);
    const existing = localStorage.getItem(key);
    if (existing) return; // idempotent
    const all = [
      SINHA_AMC_APPLICABILITY_DECISION,
      ...SMARTPOWER_AMC_ARCHETYPES,
      ...MULTI_OEM_DEMO_CUSTOMER,
    ];
    localStorage.setItem(key, JSON.stringify(all));
  } catch {
    /* quota silent */
  }
}
