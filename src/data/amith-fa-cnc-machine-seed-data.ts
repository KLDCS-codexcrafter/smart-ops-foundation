/**
 * @file        src/data/amith-fa-cnc-machine-seed-data.ts
 * @purpose     AMITH CNC machine FA seed · custodian-employee linkage scenario
 * @sprint      T-Phase-4.FAR-0 (T-fix) · Theme 2 remediation · FAR-CAP-3 + FK-CAP-1
 * @disciplines FR-26 entity-scoped · FR-19 ADDITIVE · backward-compat ABSOLUTE
 */

import type { AssetUnitRecord } from '@/types/fixed-asset';
import { faUnitsKey } from '@/types/fixed-asset';

export const AMITH_FA_CNC_MACHINE: Partial<AssetUnitRecord>[] = [
  {
    id: 'amith-fa-cnc-001',
    asset_id: 'PPE/24-25/AMITH-CNC-001',
    item_name: 'DMG Mori DMU 50 5-Axis CNC Machining Centre',
    item_id: 'item-amith-dmu-50',
    gross_block_cost: 16500000,
    purchase_date: '2024-05-18',
    put_to_use_date: '2024-08-22',
    it_act_block: 'Plant & Machinery',
    location: 'AMITH Engineering · Shop Floor 1 · Pune',
    department: 'Production',
    custodian_name: 'Sandeep Kulkarni · Senior CNC Operator',
    custodian_employee_id: null,
    status: 'active',
  },
  {
    id: 'amith-fa-cnc-002',
    asset_id: 'PPE/24-25/AMITH-CNC-002',
    item_name: 'Mazak Variaxis i-700 4-Axis CNC Machining Centre',
    item_id: 'item-amith-vrx-700',
    gross_block_cost: 12800000,
    purchase_date: '2024-06-25',
    put_to_use_date: '2024-09-15',
    it_act_block: 'Plant & Machinery',
    location: 'AMITH Engineering · Shop Floor 1 · Pune',
    department: 'Production',
    custodian_name: 'Arun Deshmukh · CNC Programmer',
    custodian_employee_id: null,
    status: 'active',
  },
  {
    id: 'amith-fa-cnc-003',
    asset_id: 'PPE/24-25/AMITH-CNC-003',
    item_name: 'Haas VF-4SS 3-Axis Vertical Machining Centre',
    item_id: 'item-amith-vf4ss',
    gross_block_cost: 6450000,
    purchase_date: '2024-07-12',
    put_to_use_date: '2024-09-28',
    it_act_block: 'Plant & Machinery',
    location: 'AMITH Engineering · Shop Floor 2 · Pune',
    department: 'Production',
    custodian_name: 'Mahesh Bhosale · Machine Shop Lead',
    custodian_employee_id: null,
    status: 'active',
  },
  {
    id: 'amith-fa-cnc-004',
    asset_id: 'PPE/24-25/AMITH-EDM-004',
    item_name: 'Sodick AQ400L Wire EDM Machine',
    item_id: 'item-amith-edm-aq400',
    gross_block_cost: 5850000,
    purchase_date: '2024-08-20',
    put_to_use_date: '2024-11-02',
    it_act_block: 'Plant & Machinery',
    location: 'AMITH Engineering · EDM Bay · Pune',
    department: 'Production',
    custodian_name: 'Vivek Patil · EDM Specialist',
    custodian_employee_id: null,
    status: 'active',
  },
  {
    id: 'amith-fa-cnc-005',
    asset_id: 'PPE/24-25/AMITH-CMM-005',
    item_name: 'Zeiss CONTURA G2 CMM (Coordinate Measuring Machine)',
    item_id: 'item-amith-cmm-contura',
    gross_block_cost: 7200000,
    purchase_date: '2024-09-08',
    put_to_use_date: '2024-11-18',
    it_act_block: 'Plant & Machinery',
    location: 'AMITH Engineering · Metrology Lab · Pune',
    department: 'QC',
    custodian_name: 'Sneha Joshi · CMM Inspector',
    custodian_employee_id: null,
    status: 'active',
  },
];

// [JWT] GET /api/fa/amith/cnc-machine?entityCode=AMITH
export function seedAMITHFACNCMachine(entityCode: string): void {
  const key = faUnitsKey(entityCode);
  try {
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(existing) && existing.length > 0) return;
    // [JWT] POST /api/fa/amith/cnc-machine
    localStorage.setItem(key, JSON.stringify(AMITH_FA_CNC_MACHINE));
  } catch { /* quota */ }
}
