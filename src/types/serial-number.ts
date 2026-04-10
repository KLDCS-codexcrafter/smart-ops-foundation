export interface SerialNumber {
  id: string;
  serial_number: string;
  stock_item_id: string;
  stock_item_name: string;
  status: 'available' | 'sold' | 'in_repair' | 'scrapped' | 'returned';
  warranty_start_date?: string | null;
  warranty_end_date?: string | null;
  purchase_date?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  imei_1?: string | null;
  imei_2?: string | null;
  custom_field_1_label?: string | null;
  custom_field_1_value?: string | null;
  custom_field_2_label?: string | null;
  custom_field_2_value?: string | null;
  current_custodian?: string | null;
  grn_reference?: string | null;
  sales_reference?: string | null;
}

export interface SerialFormData {
  serial_number: string;
  stock_item_id: string;
  stock_item_name: string;
  status: 'available' | 'sold' | 'in_repair' | 'scrapped' | 'returned';
  warranty_start_date?: string | null;
  warranty_end_date?: string | null;
  purchase_date?: string | null;
  notes?: string | null;
  imei_1?: string | null;
  imei_2?: string | null;
  custom_field_1_label?: string | null;
  custom_field_1_value?: string | null;
  custom_field_2_label?: string | null;
  custom_field_2_value?: string | null;
  current_custodian?: string | null;
  grn_reference?: string | null;
  sales_reference?: string | null;
}
