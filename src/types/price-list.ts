export type PriceListType =
  | 'standard_selling'
  | 'wholesale'
  | 'export'
  | 'distributor'
  | 'promotional'
  | 'customer_specific';

export type PriceListCurrency = string;

export interface PriceList {
  id: string;
  name: string;
  list_type: PriceListType;
  currency: PriceListCurrency;
  effective_from?: string | null;
  effective_to?: string | null;
  customer_ids?: string[] | null;
  is_default: boolean;
  copy_from_id?: string | null;
  status: 'draft' | 'approved' | 'active' | 'expired';
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PriceListItem {
  id: string;
  price_list_id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  uom_symbol: string;
  price: number;
  min_qty?: number | null;
  discount_percent?: number | null;
  is_tax_inclusive: boolean;
  created_at: string;
  updated_at: string;
}
