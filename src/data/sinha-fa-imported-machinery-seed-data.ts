/**
 * @file        src/data/sinha-fa-imported-machinery-seed-data.ts
 * @purpose     Sinha Steel imported machinery FA seed · 9th file in Sinha manifest
 * @sprint      T-Phase-4.FAR-0 · Theme 2 · D-FAR-v4-25 · FAR-CAP-4
 * @disciplines FR-26 entity-scoped · FR-86 Sinha manifest 8→9 (ABSOLUTE preserve from FAR-0 onward)
 */

import type { AssetUnitRecord } from '@/types/fixed-asset';
import { faUnitsKey } from '@/types/fixed-asset';

export const SINHA_FA_IMPORTED_MACHINERY: Partial<AssetUnitRecord>[] = [
  {
    id: 'sinha-fa-im-001',
    asset_id: 'PPE/24-25/SINHA-IMP-001',
    item_name: 'German Hot-Rolling Mill (Schloemann SMS Demag)',
    item_id: 'item-imp-mill-001',
    gross_block_cost: 18500000,
    purchase_date: '2024-08-15',
    put_to_use_date: '2024-11-20',
    it_act_block: 'Plant & Machinery',
    location: 'Sinha Bonded Warehouse · Howrah',
    department: 'Production',
    custodian_name: 'Ramesh Patel · Plant Manager',
    custodian_employee_id: null,
    status: 'active',
  },
  {
    id: 'sinha-fa-im-002',
    asset_id: 'PPE/24-25/SINHA-IMP-002',
    item_name: 'Italian Forging Press (Danieli 1200T)',
    item_id: 'item-imp-press-002',
    gross_block_cost: 12750000,
    purchase_date: '2024-09-10',
    put_to_use_date: '2024-12-05',
    it_act_block: 'Plant & Machinery',
    location: 'Sinha Forge Shop · Howrah',
    department: 'Production',
    custodian_name: 'Anil Kumar · Forge Supervisor',
    custodian_employee_id: null,
    status: 'active',
  },
  {
    id: 'sinha-fa-im-003',
    asset_id: 'PPE/24-25/SINHA-IMP-003',
    item_name: 'Japanese CNC Lathe (Mazak Integrex i-400)',
    item_id: 'item-imp-cnc-003',
    gross_block_cost: 9450000,
    purchase_date: '2024-10-02',
    put_to_use_date: '2024-12-18',
    it_act_block: 'Plant & Machinery',
    location: 'Sinha Machining Bay · Howrah',
    department: 'Production',
    custodian_name: 'Manish Sharma · Machine Shop Head',
    custodian_employee_id: null,
    status: 'active',
  },
  {
    id: 'sinha-fa-im-004',
    asset_id: 'PPE/24-25/SINHA-IMP-004',
    item_name: 'German Heat Treatment Furnace (Aichelin)',
    item_id: 'item-imp-furnace-004',
    gross_block_cost: 7200000,
    purchase_date: '2024-11-12',
    put_to_use_date: '2025-01-22',
    it_act_block: 'Plant & Machinery',
    location: 'Sinha Heat Treatment Shop · Howrah',
    department: 'Production',
    custodian_name: 'Suresh Iyer · Heat Treatment Engineer',
    custodian_employee_id: null,
    status: 'active',
  },
  {
    id: 'sinha-fa-im-005',
    asset_id: 'PPE/24-25/SINHA-IMP-005',
    item_name: 'Chinese Cooling Tower (Liang Chi LCS-300)',
    item_id: 'item-imp-cooling-005',
    gross_block_cost: 3100000,
    purchase_date: '2024-12-05',
    put_to_use_date: '2025-02-10',
    it_act_block: 'Plant & Machinery',
    location: 'Sinha Utility Yard · Howrah',
    department: 'Maintenance',
    custodian_name: 'Vijay Singh · Utility In-charge',
    custodian_employee_id: null,
    status: 'active',
  },
];

// [JWT] GET /api/fa/sinha/imported-machinery?entityCode=SINHA
export function seedSinhaFAImportedMachinery(entityCode: string): void {
  const key = faUnitsKey(entityCode);
  try {
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(existing) && existing.length > 0) return;
    // [JWT] POST /api/fa/sinha/imported-machinery
    localStorage.setItem(key, JSON.stringify(SINHA_FA_IMPORTED_MACHINERY));
  } catch { /* quota */ }
}
