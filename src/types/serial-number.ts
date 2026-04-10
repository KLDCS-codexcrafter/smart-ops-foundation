export type SerialStatus = 'available' | 'sold' | 'reserved' | 'in_repair' | 'returned' | 'scrapped';
export type SerialCondition = 'new' | 'good' | 'fair' | 'damaged' | 'defective';

export interface SerialNumber {
  id: string;
  serial_number: string;
  item_id?: string | null;
  item_name?: string | null;
  batch_id?: string | null;
  status: SerialStatus;
  condition: SerialCondition;
  warranty_start_date?: string | null;
  warranty_end_date?: string | null;
  warranty_months?: number | null;
  purchase_date?: string | null;
  purchase_price?: number | null;
  supplier_name?: string | null;
  supplier_invoice_no?: string | null;
  sale_date?: string | null;
  sale_price?: number | null;
  customer_name?: string | null;
  sale_invoice_no?: string | null;
  current_location?: string | null;
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
  created_at: string;
  updated_at: string;
}

export interface SerialFormData {
  serial_number: string;
  item_id?: string | null;
  item_name?: string | null;
  status: SerialStatus;
  condition: SerialCondition;
  warranty_end_date?: string | null;
  warranty_months?: number | null;
  purchase_date?: string | null;
  supplier_name?: string | null;
  current_location?: string | null;
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
