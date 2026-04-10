export type BarcodeType = 'EAN13' | 'QR' | 'Code128' | 'ITF14' | 'EAN8';

export interface CodeMatrixRule {
  id: string;
  name: string;
  applies_to: 'all' | 'stock_group' | 'category_type';
  applies_to_id?: string | null;
  applies_to_label?: string | null;
  prefix: string;
  suffix?: string | null;
  separator: string;
  sequence_digits: number;
  current_sequence: number;
  include_year: boolean;
  year_format?: 'YY' | 'YYYY' | null;
  barcode_type: BarcodeType;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}
