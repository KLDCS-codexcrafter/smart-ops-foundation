/**
 * @file        src/data/sinha-eximx-seed.ts
 * @purpose     Sinha demo seed for EximX · 1 IEC + 1 LUT per EX-1-Q7=b minimal seed
 * @sprint      T-Phase-1.EX-1-EximX-Foundation
 * @decisions   EX-1-Q7=b minimal seed · FR-72 Sinha demo continuity · Q5 Sinha extended
 */
import type { IEC } from '@/types/iec';
import type { LUT } from '@/types/lut';

export const SINHA_IEC: IEC = {
  id: 'iec-sinha-001',
  entity_id: 'sinha-trading',
  iec_number: 'AAACS1234E',
  issue_date: '2022-04-15',
  validity: '2027-04-14',
  status: 'active',
  legal_name: 'Sinha Trading Co. Pvt. Ltd.',
  pan: 'AAACS1234E',
  iec_type: 'company',
  date_of_incorporation: '2010-06-20',
  registered_address: '32 Park Street, 4th Floor',
  city: 'Kolkata',
  state: 'West Bengal',
  pincode: '700016',
  branches: [
    { branch_id: 'br-001', address_line_1: '32 Park Street, 4th Floor', city: 'Kolkata', state: 'West Bengal', pincode: '700016', is_head_office: true },
    { branch_id: 'br-002', address_line_1: 'Plot 17, JNPT Container Yard', city: 'Navi Mumbai', state: 'Maharashtra', pincode: '400707', is_head_office: false },
  ],
  ad_code: '02071600000076',
  bank_name: 'HDFC Bank',
  bank_branch: 'Park Street, Kolkata',
  bank_account_number: '50100123456789',
  primary_activities: ['9018', '8517', '8443'],
  goods_categories: ['Medical Equipment', 'Telecom Components', 'Printing Supplies'],
  created_at: '2022-04-15T00:00:00Z',
  updated_at: '2025-04-15T00:00:00Z',
  last_kyc_date: '2025-04-15',
};

export const SINHA_LUT: LUT = {
  id: 'lut-sinha-001',
  entity_id: 'sinha-trading',
  lut_number: 'AD191024000089A',
  fiscal_year: '2025-2026',
  validity_from: '2025-04-01',
  validity_to: '2026-03-31',
  acceptance_date: '2025-04-08',
  apr_due_date: '2026-06-30',
  authority: 'Assistant Commissioner · Kolkata North Commissionerate',
  status: 'active',
  workflow_history: [
    { from_status: 'draft', to_status: 'filed', transitioned_at: '2025-04-03T10:30:00Z', transitioned_by: 'system-seed', notes: 'Filed via GSTN portal' },
    { from_status: 'filed', to_status: 'acknowledged', transitioned_at: '2025-04-05T14:00:00Z', transitioned_by: 'system-seed', notes: 'ARN received' },
    { from_status: 'acknowledged', to_status: 'active', transitioned_at: '2025-04-08T09:00:00Z', transitioned_by: 'system-seed', notes: 'Officer-accepted · operative for FY 2025-2026' },
  ],
  created_at: '2025-04-03T10:30:00Z',
  updated_at: '2025-04-08T09:00:00Z',
};

/** Seed Sinha entity if no IEC/LUT exists · per FR-20 inline seedIfEmpty pattern */
export const seedSinhaEximX = (): void => {
  const iecKey = `erp_sinha-trading_iec`;
  const lutKey = `erp_sinha-trading_lut`;
  if (!localStorage.getItem(iecKey)) localStorage.setItem(iecKey, JSON.stringify([SINHA_IEC]));
  if (!localStorage.getItem(lutKey)) localStorage.setItem(lutKey, JSON.stringify([SINHA_LUT]));
};
