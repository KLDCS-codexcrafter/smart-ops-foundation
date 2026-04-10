export type LabelSize = '30x20' | '50x25' | '100x50' | '38x25' | 'A4' | 'custom';
export type LabelOrientation = 'portrait' | 'landscape';
export type LabelType =
  | 'product' | 'price_tag' | 'shelf' | 'carton' | 'pallet'
  | 'mrp_compliance' | 'fssai_compliance' | 'drug_compliance' | 'epr_compliance'
  | 'asset_tag' | 'bin_location' | 'serial_number' | 'custody_transfer';

export type LabelBarcodeType = 'EAN13' | 'QR' | 'Code128' | 'ITF14' | 'EAN8' | 'GS1_128' | 'DataMatrix' | 'DynamicQR';

export interface LabelTemplate {
  id: string;
  name: string;
  label_type: LabelType;
  size: LabelSize;
  custom_width_mm?: number | null;
  custom_height_mm?: number | null;
  orientation: LabelOrientation;
  show_item_name: boolean;
  show_regional_name: boolean;
  show_item_code: boolean;
  show_barcode: boolean;
  barcode_type: LabelBarcodeType;
  show_mrp: boolean;
  show_hsn: boolean;
  show_batch_no: boolean;
  show_mfg_date: boolean;
  show_expiry_date: boolean;
  show_weight: boolean;
  show_uom: boolean;
  show_company_name: boolean;
  show_serial_number: boolean;
  show_fssai_number: boolean;
  show_drug_license: boolean;
  show_epr_registration: boolean;
  custom_fields?: { label: string; value: string }[] | null;
  version: number;
  is_active: boolean;
  is_compliance: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}
