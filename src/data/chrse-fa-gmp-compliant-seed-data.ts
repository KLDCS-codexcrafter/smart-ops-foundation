/**
 * @file        src/data/chrse-fa-gmp-compliant-seed-data.ts
 * @purpose     CHRSE pharma GMP-compliant FA seed · CFR-Part-11 e-sig-bearing assets
 * @sprint      T-Phase-4.FAR-0 (T-fix) · Theme 2 remediation · FAR-CAP-3
 * @disciplines FR-26 entity-scoped · FR-19 ADDITIVE · backward-compat ABSOLUTE
 */

import type { AssetUnitRecord } from '@/types/fixed-asset';
import { faUnitsKey } from '@/types/fixed-asset';

export const CHRSE_FA_GMP_COMPLIANT: Partial<AssetUnitRecord>[] = [
  {
    id: 'chrse-fa-gmp-001',
    asset_id: 'PPE/24-25/CHRSE-GMP-001',
    item_name: 'Agilent HPLC 1290 Infinity II (CFR-11 compliant)',
    item_id: 'item-chrse-hplc-1290',
    gross_block_cost: 8500000,
    purchase_date: '2024-05-12',
    put_to_use_date: '2024-07-20',
    it_act_block: 'Plant & Machinery',
    location: 'CHRSE Pharma · Block A · Vadodara',
    department: 'QC',
    custodian_name: 'Dr. Neha Shah · QC Head',
    custodian_employee_id: null,
    status: 'active',
  },
  {
    id: 'chrse-fa-gmp-002',
    asset_id: 'PPE/24-25/CHRSE-GMP-002',
    item_name: 'Sartorius Biostat 200L Fermenter (GMP-grade)',
    item_id: 'item-chrse-ferm-200',
    gross_block_cost: 14500000,
    purchase_date: '2024-06-18',
    put_to_use_date: '2024-09-10',
    it_act_block: 'Plant & Machinery',
    location: 'CHRSE Pharma · Block B · Vadodara',
    department: 'Production',
    custodian_name: 'Prakash Iyer · Fermentation Lead',
    custodian_employee_id: null,
    status: 'active',
  },
  {
    id: 'chrse-fa-gmp-003',
    asset_id: 'PPE/24-25/CHRSE-GMP-003',
    item_name: 'Steris Amsco V-PRO 60 Autoclave (CFR-11)',
    item_id: 'item-chrse-autoclave-v60',
    gross_block_cost: 3200000,
    purchase_date: '2024-07-08',
    put_to_use_date: '2024-09-15',
    it_act_block: 'Plant & Machinery',
    location: 'CHRSE Pharma · Sterilization Bay · Vadodara',
    department: 'Production',
    custodian_name: 'Suresh Tiwari · Sterilization Officer',
    custodian_employee_id: null,
    status: 'active',
  },
  {
    id: 'chrse-fa-gmp-004',
    asset_id: 'PPE/24-25/CHRSE-GMP-004',
    item_name: 'Cleanroom HVAC System ISO 7 (Block A)',
    item_id: 'item-chrse-hvac-iso7',
    gross_block_cost: 9800000,
    purchase_date: '2024-04-22',
    put_to_use_date: '2024-08-05',
    it_act_block: 'Plant & Machinery',
    location: 'CHRSE Pharma · Block A Cleanroom · Vadodara',
    department: 'Maintenance',
    custodian_name: 'Ravi Bhatia · Facility Engineer',
    custodian_employee_id: null,
    status: 'active',
  },
  {
    id: 'chrse-fa-gmp-005',
    asset_id: 'PPE/24-25/CHRSE-GMP-005',
    item_name: 'TSI AeroTrak 9510 Particle Counter (21 CFR Part 11)',
    item_id: 'item-chrse-pc-9510',
    gross_block_cost: 1250000,
    purchase_date: '2024-08-14',
    put_to_use_date: '2024-10-02',
    it_act_block: 'Computers & Software',
    location: 'CHRSE Pharma · QC Lab · Vadodara',
    department: 'QC',
    custodian_name: 'Kavita Menon · QC Analyst',
    custodian_employee_id: null,
    status: 'active',
  },
];

// [JWT] GET /api/fa/chrse/gmp-compliant?entityCode=CHRSE
export function seedCHRSEFAGMPCompliant(entityCode: string): void {
  const key = faUnitsKey(entityCode);
  try {
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(existing) && existing.length > 0) return;
    // [JWT] POST /api/fa/chrse/gmp-compliant
    localStorage.setItem(key, JSON.stringify(CHRSE_FA_GMP_COMPLIANT));
  } catch { /* quota */ }
}
