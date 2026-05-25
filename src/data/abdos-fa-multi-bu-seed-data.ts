/**
 * @file        src/data/abdos-fa-multi-bu-seed-data.ts
 * @purpose     ABDOS multi-BU conglomerate FA seed · cross-BU asset depth
 * @sprint      T-Phase-4.FAR-0 (T-fix) · Theme 2 remediation · FAR-CAP-3
 * @disciplines FR-26 entity-scoped · FR-19 ADDITIVE · backward-compat ABSOLUTE
 */

import type { AssetUnitRecord } from '@/types/fixed-asset';
import { faUnitsKey } from '@/types/fixed-asset';

export const ABDOS_FA_MULTI_BU: Partial<AssetUnitRecord>[] = [
  {
    id: 'abdos-fa-mb-001',
    asset_id: 'PPE/24-25/ABDOS-PLT-001',
    item_name: 'Injection Moulding Machine 850T (Plastics Division)',
    item_id: 'item-abdos-im-850',
    gross_block_cost: 6800000,
    purchase_date: '2024-06-10',
    put_to_use_date: '2024-08-15',
    it_act_block: 'Plant & Machinery',
    location: 'ABDOS Plastics · Plot A · Daman',
    department: 'Production',
    custodian_name: 'Rajesh Mehta · Plastics BU Head',
    custodian_employee_id: null,
    status: 'active',
  },
  {
    id: 'abdos-fa-mb-002',
    asset_id: 'PPE/24-25/ABDOS-FRG-002',
    item_name: 'Power Press 500T (Forging Division)',
    item_id: 'item-abdos-press-500',
    gross_block_cost: 4250000,
    purchase_date: '2024-07-22',
    put_to_use_date: '2024-09-30',
    it_act_block: 'Plant & Machinery',
    location: 'ABDOS Forging · Plot B · Daman',
    department: 'Production',
    custodian_name: 'Vikram Shah · Forging BU Head',
    custodian_employee_id: null,
    status: 'active',
  },
  {
    id: 'abdos-fa-mb-003',
    asset_id: 'PPE/24-25/ABDOS-PKG-003',
    item_name: 'Corrugated Box Plant Line (Packaging Division)',
    item_id: 'item-abdos-pkg-line',
    gross_block_cost: 2950000,
    purchase_date: '2024-08-05',
    put_to_use_date: '2024-10-12',
    it_act_block: 'Plant & Machinery',
    location: 'ABDOS Packaging · Plot C · Daman',
    department: 'Production',
    custodian_name: 'Sunil Joshi · Packaging BU Head',
    custodian_employee_id: null,
    status: 'active',
  },
  {
    id: 'abdos-fa-mb-004',
    asset_id: 'PPE/24-25/ABDOS-IT-004',
    item_name: 'Dell PowerEdge R750 Server Cluster (Corporate IT)',
    item_id: 'item-abdos-srv-r750',
    gross_block_cost: 1850000,
    purchase_date: '2024-05-18',
    put_to_use_date: '2024-06-25',
    it_act_block: 'Computers & Software',
    location: 'ABDOS HO · Data Centre · Mumbai',
    department: 'IT',
    custodian_name: 'Anita Desai · IT Manager',
    custodian_employee_id: null,
    status: 'active',
  },
  {
    id: 'abdos-fa-mb-005',
    asset_id: 'PPE/24-25/ABDOS-VEH-005',
    item_name: 'Tata Prima Truck 3128.K (Shared Inter-BU Transport)',
    item_id: 'item-abdos-truck-prima',
    gross_block_cost: 3450000,
    purchase_date: '2024-09-15',
    put_to_use_date: '2024-10-20',
    it_act_block: 'Vehicles',
    location: 'ABDOS HO · Transport Pool · Mumbai',
    department: 'Logistics',
    custodian_name: 'Pradeep Nair · Transport In-charge',
    custodian_employee_id: null,
    status: 'active',
  },
  {
    id: 'abdos-fa-mb-006',
    asset_id: 'PPE/24-25/ABDOS-RND-006',
    item_name: 'Universal Testing Machine 100kN (R&D Lab)',
    item_id: 'item-abdos-utm-100',
    gross_block_cost: 1650000,
    purchase_date: '2024-10-08',
    put_to_use_date: '2024-12-15',
    it_act_block: 'Plant & Machinery',
    location: 'ABDOS R&D · Pilot Plant · Mumbai',
    department: 'R&D',
    custodian_name: 'Dr. Meera Krishnan · R&D Head',
    custodian_employee_id: null,
    status: 'active',
  },
];

// [JWT] GET /api/fa/abdos/multi-bu?entityCode=ABDOS
export function seedABDOSFAMultiBU(entityCode: string): void {
  const key = faUnitsKey(entityCode);
  try {
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(existing) && existing.length > 0) return;
    // [JWT] POST /api/fa/abdos/multi-bu
    localStorage.setItem(key, JSON.stringify(ABDOS_FA_MULTI_BU));
  } catch { /* quota */ }
}
