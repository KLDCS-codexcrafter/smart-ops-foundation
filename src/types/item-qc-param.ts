export interface ItemQCParam {
  id: string;
  item_id: string;
  sl_no: number;
  specification: string;
  standard?: string | null;
  test_method?: string | null;
  frequency?: string | null;
  is_critical: boolean;
  party_specific: boolean;
  party_id?: string | null;
  party_name?: string | null;
  created_at: string;
  updated_at: string;
}
