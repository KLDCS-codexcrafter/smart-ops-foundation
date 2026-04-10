export interface ItemOpeningStockEntry {
  id: string;
  item_id: string;
  godown_id: string;
  godown_name?: string | null;
  batch_number?: string | null;
  mfg_date?: string | null;
  expiry_date?: string | null;
  serial_number?: string | null;
  quantity: number;
  rate: number;
  value: number;
  created_at: string;
  updated_at: string;
}
