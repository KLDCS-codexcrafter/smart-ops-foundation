export interface AssetTag {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  asset_tag_number: string;
  department: string;
  cost_centre?: string | null;
  custodian_name: string;
  custodian_email?: string | null;
  physical_location: string;
  purchase_date?: string | null;
  warranty_expiry?: string | null;
  last_verified_date?: string | null;
  last_verified_by?: string | null;
  barcode_type: 'QR' | 'Code128' | 'DynamicQR';
  label_template_id?: string | null;
  qr_url?: string | null;
  status: 'active' | 'transferred' | 'disposed' | 'missing';
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustodyTransfer {
  id: string;
  asset_tag_id: string;
  from_department: string;
  from_custodian: string;
  to_department: string;
  to_custodian: string;
  transfer_date: string;
  authorized_by: string;
  notes?: string | null;
  created_at: string;
}
