export type BarcodeSuperType =
  | 'EAN13' | 'QR' | 'Code128' | 'ITF14' | 'EAN8'
  | 'GS1_128' | 'DataMatrix' | 'DynamicQR';

export interface BarcodeJob {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  barcode_type: BarcodeSuperType;
  barcode_value: string;
  gtin?: string | null;
  lot_number?: string | null;
  expiry_date?: string | null;
  serial_number?: string | null;
  qr_url?: string | null;
  label_template_id?: string | null;
  label_template_name?: string | null;
  quantity: number;
  status: 'draft' | 'queued' | 'printed';
  created_at: string;
  updated_at: string;
}
