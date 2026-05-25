/**
 * @file        src/data/shkph-fa-api-reactor-seed-data.ts
 * @purpose     SHKPH API reactor FA seed · campaign-based depreciation scenario
 * @sprint      T-Phase-4.FAR-0 (T-fix) · Theme 2 remediation · FAR-CAP-3
 * @disciplines FR-26 entity-scoped · FR-19 ADDITIVE · backward-compat ABSOLUTE
 */

import type { AssetUnitRecord } from '@/types/fixed-asset';
import { faUnitsKey } from '@/types/fixed-asset';

export const SHKPH_FA_API_REACTOR: Partial<AssetUnitRecord>[] = [
  {
    id: 'shkph-fa-api-001',
    asset_id: 'PPE/24-25/SHKPH-RX-001',
    item_name: 'API Reactor 6KL (Hastelloy C-22 · Campaign-based)',
    item_id: 'item-shkph-rx-6kl',
    gross_block_cost: 18500000,
    purchase_date: '2024-04-22',
    put_to_use_date: '2024-08-05',
    it_act_block: 'Plant & Machinery',
    location: 'SHKPH API · Block A · Hyderabad',
    department: 'Production',
    custodian_name: 'Dr. Srinivas Reddy · API Plant Manager',
    custodian_employee_id: null,
    status: 'active',
  },
  {
    id: 'shkph-fa-api-002',
    asset_id: 'PPE/24-25/SHKPH-RX-002',
    item_name: 'API Reactor 3KL (Glass-Lined · Campaign-based)',
    item_id: 'item-shkph-rx-3kl',
    gross_block_cost: 9750000,
    purchase_date: '2024-05-30',
    put_to_use_date: '2024-08-28',
    it_act_block: 'Plant & Machinery',
    location: 'SHKPH API · Block A · Hyderabad',
    department: 'Production',
    custodian_name: 'Venkat Rao · Reactor Operations Engineer',
    custodian_employee_id: null,
    status: 'active',
  },
  {
    id: 'shkph-fa-api-003',
    asset_id: 'PPE/24-25/SHKPH-CF-003',
    item_name: 'Ferrum HF 1300 Inverting Filter Centrifuge',
    item_id: 'item-shkph-cf-1300',
    gross_block_cost: 6450000,
    purchase_date: '2024-07-10',
    put_to_use_date: '2024-09-22',
    it_act_block: 'Plant & Machinery',
    location: 'SHKPH API · Block B · Hyderabad',
    department: 'Production',
    custodian_name: 'Krishna Mohan · Separation In-charge',
    custodian_employee_id: null,
    status: 'active',
  },
  {
    id: 'shkph-fa-api-004',
    asset_id: 'PPE/24-25/SHKPH-DR-004',
    item_name: 'Agitated Nutsche Filter Dryer 1000L (ANFD)',
    item_id: 'item-shkph-anfd-1000',
    gross_block_cost: 7850000,
    purchase_date: '2024-08-18',
    put_to_use_date: '2024-10-25',
    it_act_block: 'Plant & Machinery',
    location: 'SHKPH API · Block B · Hyderabad',
    department: 'Production',
    custodian_name: 'Rajashekar Naidu · Drying Section Lead',
    custodian_employee_id: null,
    status: 'active',
  },
  {
    id: 'shkph-fa-api-005',
    asset_id: 'PPE/24-25/SHKPH-ML-005',
    item_name: 'Hosokawa Alpine 200 ATP Air Classifier Mill',
    item_id: 'item-shkph-mill-atp200',
    gross_block_cost: 3950000,
    purchase_date: '2024-09-25',
    put_to_use_date: '2024-11-30',
    it_act_block: 'Plant & Machinery',
    location: 'SHKPH API · Milling Bay · Hyderabad',
    department: 'Production',
    custodian_name: 'Suresh Kumar · Milling Station Operator',
    custodian_employee_id: null,
    status: 'active',
  },
];

// [JWT] GET /api/fa/shkph/api-reactor?entityCode=SHKPH
export function seedSHKPHFAAPIReactor(entityCode: string): void {
  const key = faUnitsKey(entityCode);
  try {
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(existing) && existing.length > 0) return;
    // [JWT] POST /api/fa/shkph/api-reactor
    localStorage.setItem(key, JSON.stringify(SHKPH_FA_API_REACTOR));
  } catch { /* quota */ }
}
