export interface ItemPartyCode {
  id: string;
  item_id: string;
  party_type: 'vendor' | 'customer';
  party_id?: string | null;
  party_name: string;
  party_item_code?: string | null;
  party_item_name?: string | null;
  print_name?: string | null;
  created_at: string;
  updated_at: string;
}
