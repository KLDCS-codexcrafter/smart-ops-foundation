/**
 * @file        src/data/smrtp-fa-mold-die-seed-data.ts
 * @purpose     SMRTP mold + die FA seed · UOP depreciation candidates · plastics tooling
 * @sprint      T-Phase-4.FAR-0 (T-fix) · Theme 2 remediation · FAR-CAP-3
 * @disciplines FR-26 entity-scoped · FR-19 ADDITIVE · backward-compat ABSOLUTE
 */

import type { AssetUnitRecord } from '@/types/fixed-asset';
import { faUnitsKey } from '@/types/fixed-asset';

export const SMRTP_FA_MOLD_DIE: Partial<AssetUnitRecord>[] = [
  {
    id: 'smrtp-fa-md-001',
    asset_id: 'PPE/24-25/SMRTP-MLD-001',
    item_name: 'Injection Mould 8-Cavity (Bottle Cap · P20 Steel)',
    item_id: 'item-smrtp-mld-cap-8c',
    gross_block_cost: 1850000,
    purchase_date: '2024-05-08',
    put_to_use_date: '2024-07-15',
    it_act_block: 'Plant & Machinery',
    location: 'SMRTP · Tool Room · Vapi',
    department: 'Production',
    custodian_name: 'Jignesh Patel · Tool Room Head',
    custodian_employee_id: null,
    status: 'active',
  },
  {
    id: 'smrtp-fa-md-002',
    asset_id: 'PPE/24-25/SMRTP-MLD-002',
    item_name: 'Injection Mould 4-Cavity (Container Lid · H13 Steel)',
    item_id: 'item-smrtp-mld-lid-4c',
    gross_block_cost: 1420000,
    purchase_date: '2024-06-12',
    put_to_use_date: '2024-08-20',
    it_act_block: 'Plant & Machinery',
    location: 'SMRTP · Tool Room · Vapi',
    department: 'Production',
    custodian_name: 'Ketan Desai · Mould Engineer',
    custodian_employee_id: null,
    status: 'active',
  },
  {
    id: 'smrtp-fa-md-003',
    asset_id: 'PPE/24-25/SMRTP-MLD-003',
    item_name: 'Injection Mould 2-Cavity (Crate Body · 718H Steel)',
    item_id: 'item-smrtp-mld-crate-2c',
    gross_block_cost: 2150000,
    purchase_date: '2024-07-18',
    put_to_use_date: '2024-09-25',
    it_act_block: 'Plant & Machinery',
    location: 'SMRTP · Tool Room · Vapi',
    department: 'Production',
    custodian_name: 'Bharat Joshi · Senior Tool Maker',
    custodian_employee_id: null,
    status: 'active',
  },
  {
    id: 'smrtp-fa-md-004',
    asset_id: 'PPE/24-25/SMRTP-MLD-004',
    item_name: 'Injection Mould 16-Cavity (Spoon · NAK80 Steel)',
    item_id: 'item-smrtp-mld-spoon-16c',
    gross_block_cost: 980000,
    purchase_date: '2024-08-05',
    put_to_use_date: '2024-10-10',
    it_act_block: 'Plant & Machinery',
    location: 'SMRTP · Tool Room · Vapi',
    department: 'Production',
    custodian_name: 'Pravin Modi · Tool Maker',
    custodian_employee_id: null,
    status: 'active',
  },
  {
    id: 'smrtp-fa-md-005',
    asset_id: 'PPE/24-25/SMRTP-DIE-005',
    item_name: 'Die-Cast Die (Aluminium Handle · H13)',
    item_id: 'item-smrtp-die-handle',
    gross_block_cost: 1650000,
    purchase_date: '2024-09-14',
    put_to_use_date: '2024-11-18',
    it_act_block: 'Plant & Machinery',
    location: 'SMRTP · Die-Cast Bay · Vapi',
    department: 'Production',
    custodian_name: 'Hardik Shah · Die-Cast Supervisor',
    custodian_employee_id: null,
    status: 'active',
  },
  {
    id: 'smrtp-fa-md-006',
    asset_id: 'PPE/24-25/SMRTP-MTC-006',
    item_name: 'Mould Temperature Controller (MTC 24kW)',
    item_id: 'item-smrtp-mtc-24',
    gross_block_cost: 385000,
    purchase_date: '2024-10-02',
    put_to_use_date: '2024-11-25',
    it_act_block: 'Plant & Machinery',
    location: 'SMRTP · Moulding Floor · Vapi',
    department: 'Maintenance',
    custodian_name: 'Nilesh Parmar · Maintenance Technician',
    custodian_employee_id: null,
    status: 'active',
  },
];

// [JWT] GET /api/fa/smrtp/mold-die?entityCode=SMRTP
export function seedSMRTPFAMoldDie(entityCode: string): void {
  const key = faUnitsKey(entityCode);
  try {
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(existing) && existing.length > 0) return;
    // [JWT] POST /api/fa/smrtp/mold-die
    localStorage.setItem(key, JSON.stringify(SMRTP_FA_MOLD_DIE));
  } catch { /* quota */ }
}
