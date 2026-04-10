export type GodownOwnershipType =
  | 'own_own_stock'
  | 'own_third_party_stock'
  | 'third_party_our_stock'
  | 'third_party_third_party_stock'
  | 'job_work_location'
  | 'consignment_at_dealer'
  | 'cwc_swc_godown'
  | 'customs_bonded'
  | 'sez_ftz';

export const OWNERSHIP_LABELS: Record<GodownOwnershipType, string> = {
  own_own_stock: 'Own Premises - Own Stock',
  own_third_party_stock: 'Own Premises - Third Party Stock',
  third_party_our_stock: 'Rented - Our Stock',
  third_party_third_party_stock: 'Third Party - Third Party Stock',
  job_work_location: 'Job Work Location',
  consignment_at_dealer: 'Consignment at Customer / Dealer',
  cwc_swc_godown: 'CWC / SWC Government Warehouse',
  customs_bonded: 'Customs Bonded Warehouse',
  sez_ftz: 'SEZ / Free Trade Zone',
};

export const RENTED_TYPES: GodownOwnershipType[] = [
  'third_party_our_stock', 'cwc_swc_godown', 'customs_bonded',
  'consignment_at_dealer', 'sez_ftz'
];

export interface GodownBin {
  id: string; shelf_id: string; code: string; name: string;
  bin_type?: string | null; capacity?: number | null;
  barcode?: string | null; qr_code?: string | null;
  status: 'active' | 'inactive'; description?: string | null;
  created_at: string; updated_at: string;
}

export interface GodownShelf {
  id: string; rack_id: string; code: string; name: string;
  level_number: number; capacity?: number | null;
  max_weight?: number | null;
  status: 'active' | 'inactive';
  bins?: GodownBin[];
  created_at: string; updated_at: string;
}

export interface GodownRack {
  id: string; zone_id: string; code: string; name: string;
  rack_type?: string | null; levels?: number | null;
  capacity?: number | null; capacity_unit?: string | null;
  max_weight_per_level?: number | null;
  status: 'active' | 'inactive'; description?: string | null;
  shelves?: GodownShelf[];
  created_at: string; updated_at: string;
}

export interface GodownZone {
  id: string; godown_id: string; code: string; name: string;
  zone_type: string;
  temperature_controlled: boolean;
  temp_min?: number | null; temp_max?: number | null;
  humidity_controlled: boolean;
  capacity?: number | null; capacity_unit?: string | null;
  status: 'active' | 'inactive' | 'maintenance';
  description?: string | null;
  racks?: GodownRack[];
  created_at: string; updated_at: string;
}

export interface GodownAgreement {
  id: string; godown_id: string;
  agreement_number: string;
  lessor_name: string;
  lessor_gstin?: string | null;
  lessor_pan?: string | null;
  start_date: string;
  end_date?: string | null;
  notice_period_days?: number | null;
  lock_in_months?: number | null;
  auto_renewal: boolean;
  monthly_rent?: number | null;
  security_deposit?: number | null;
  charge_type: 'fixed' | 'per_sqft' | 'per_quintal' | 'per_pallet' | 'per_cbm';
  rate?: number | null;
  billing_cycle: 'monthly' | 'quarterly' | 'annual';
  escalation_rate?: number | null;
  tds_applicable: boolean;
  tds_section?: string | null;
  tds_rate?: number | null;
  license_type?: string | null;
  license_number?: string | null;
  license_expiry?: string | null;
  insurance_policy?: string | null;
  insurance_expiry?: string | null;
  status: 'active' | 'expired' | 'terminated';
  created_at: string; updated_at: string;
}

export interface Godown {
  id: string; code: string; name: string;
  ownership_type: GodownOwnershipType;
  party_id?: string | null;
  party_name?: string | null;
  address?: string | null; city?: string | null;
  state?: string | null; pincode?: string | null;
  country: string;
  latitude?: number | null; longitude?: number | null;
  total_capacity?: number | null;
  capacity_unit?: string | null;
  contact_person?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  gst_number?: string | null;
  description?: string | null;
  status: 'active' | 'inactive';
  zones?: GodownZone[];
  agreements?: GodownAgreement[];
  created_at: string; updated_at: string;
}
