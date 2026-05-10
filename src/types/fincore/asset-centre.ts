/**
 * asset-centre.ts — Asset Centre master (FineCore · Capital infrastructure cost-tagging)
 * Sprint T-Phase-1.1.2-pre · D-218 two-master architecture (Asset Centre)
 * Sister master = Project Centre (built in T-Phase-1.1.2-a · ProjX)
 *
 * USAGE:
 * - Voucher line tagging: JournalEntry.asset_centre_id, OutstandingEntry.asset_centre_id
 * - AssetTag tagging: AssetTag.asset_centre_id (sibling of legacy free-text AssetTag.cost_centre)
 * - Drives Fixed Asset Register grouping, depreciation expense allocation, asset P&L roll-up
 */

export type AssetCentreCategory =
  | 'plant_machinery'
  | 'building'
  | 'land'
  | 'vehicle'
  | 'office_equipment'
  | 'furniture_fixture'
  | 'computer_it'
  | 'tools_dies'
  | 'other';

export const ASSET_CENTRE_CATEGORY_LABELS: Record<AssetCentreCategory, string> = {
  plant_machinery:  'Plant & Machinery',
  building:         'Building',
  land:             'Land',
  vehicle:          'Vehicle',
  office_equipment: 'Office Equipment',
  furniture_fixture:'Furniture & Fixture',
  computer_it:      'Computer & IT',
  tools_dies:       'Tools & Dies',
  other:            'Other',
};

export interface AssetCentre {
  id: string;
  code: string;                          // auto-gen: ACT-NNNN (4-digit zero-padded sequence per entity)
  name: string;
  category: AssetCentreCategory;
  parent_asset_centre_id: string | null;
  division_id: string | null;
  department_id: string | null;
  location: string;
  custodian_name: string;
  custodian_email: string;
  status: 'active' | 'inactive';
  description: string;
  entity_id: string | null;
  created_at: string;
  updated_at: string;
}

export const assetCentresKey = (entityCode: string): string => `erp_asset_centres_${entityCode}`;

// Sequence helper — used for auto-gen ACT-NNNN code
export const ASSET_CENTRE_SEQ_KEY = (entityCode: string): string => `erp_doc_seq_ACT_${entityCode}`;
