/**
 * @file        src/data/bcpl-fa-hazardous-reactor-seed-data.ts
 * @purpose     BCPL hazardous chemical reactor FA seed · tank-flow capitalization
 * @sprint      T-Phase-4.FAR-0 (T-fix) · Theme 2 remediation · FAR-CAP-3
 * @disciplines FR-26 entity-scoped · FR-19 ADDITIVE · backward-compat ABSOLUTE
 */

import type { AssetUnitRecord } from '@/types/fixed-asset';
import { faUnitsKey } from '@/types/fixed-asset';

export const BCPL_FA_HAZARDOUS_REACTOR: Partial<AssetUnitRecord>[] = [
  {
    id: 'bcpl-fa-hr-001',
    asset_id: 'PPE/24-25/BCPL-RX-001',
    item_name: 'Glass-Lined Reactor 5KL (Hastelloy C-276 baffles)',
    item_id: 'item-bcpl-rx-5kl',
    gross_block_cost: 11500000,
    purchase_date: '2024-05-20',
    put_to_use_date: '2024-08-12',
    it_act_block: 'Plant & Machinery',
    location: 'BCPL Chemicals · Reactor Block · Dahej',
    department: 'Production',
    custodian_name: 'Hitesh Patel · Reactor Operations Lead',
    custodian_employee_id: null,
    status: 'active',
  },
  {
    id: 'bcpl-fa-hr-002',
    asset_id: 'PPE/24-25/BCPL-RX-002',
    item_name: 'Stainless Steel Reactor 2KL (SS-316L)',
    item_id: 'item-bcpl-rx-2kl',
    gross_block_cost: 5800000,
    purchase_date: '2024-06-15',
    put_to_use_date: '2024-09-04',
    it_act_block: 'Plant & Machinery',
    location: 'BCPL Chemicals · Reactor Block · Dahej',
    department: 'Production',
    custodian_name: 'Mehul Trivedi · Plant Engineer',
    custodian_employee_id: null,
    status: 'active',
  },
  {
    id: 'bcpl-fa-hr-003',
    asset_id: 'PPE/24-25/BCPL-DC-003',
    item_name: 'Packed-Bed Distillation Column 12m (SS-304)',
    item_id: 'item-bcpl-dc-12m',
    gross_block_cost: 7250000,
    purchase_date: '2024-07-22',
    put_to_use_date: '2024-10-18',
    it_act_block: 'Plant & Machinery',
    location: 'BCPL Chemicals · Distillation Yard · Dahej',
    department: 'Production',
    custodian_name: 'Anand Sharma · Distillation In-charge',
    custodian_employee_id: null,
    status: 'active',
  },
  {
    id: 'bcpl-fa-hr-004',
    asset_id: 'PPE/24-25/BCPL-TK-004',
    item_name: 'Bulk Solvent Storage Tank 50KL (Tank-Flow Integration)',
    item_id: 'item-bcpl-tk-50kl',
    gross_block_cost: 4150000,
    purchase_date: '2024-08-30',
    put_to_use_date: '2024-11-05',
    it_act_block: 'Plant & Machinery',
    location: 'BCPL Chemicals · Tank Farm · Dahej',
    department: 'Production',
    custodian_name: 'Ramesh Yadav · Tank Farm Supervisor',
    custodian_employee_id: null,
    status: 'active',
  },
  {
    id: 'bcpl-fa-hr-005',
    asset_id: 'PPE/24-25/BCPL-SC-005',
    item_name: 'Wet Scrubber System (HCl/SO2 Safety Scrubber)',
    item_id: 'item-bcpl-sc-wet',
    gross_block_cost: 3650000,
    purchase_date: '2024-09-12',
    put_to_use_date: '2024-11-22',
    it_act_block: 'Plant & Machinery',
    location: 'BCPL Chemicals · Utility Block · Dahej',
    department: 'Maintenance',
    custodian_name: 'Dinesh Solanki · Safety & Environment Officer',
    custodian_employee_id: null,
    status: 'active',
  },
];

// [JWT] GET /api/fa/bcpl/hazardous-reactor?entityCode=BCPL
export function seedBCPLFAHazardousReactor(entityCode: string): void {
  const key = faUnitsKey(entityCode);
  try {
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(existing) && existing.length > 0) return;
    // [JWT] POST /api/fa/bcpl/hazardous-reactor
    localStorage.setItem(key, JSON.stringify(BCPL_FA_HAZARDOUS_REACTOR));
  } catch { /* quota */ }
}
