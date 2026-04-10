export interface Brand {
  id: string;
  code: string;
  name: string;
  manufacturer_name?: string | null;
  country_of_origin?: string | null;
  website?: string | null;
  notes?: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface SubBrand {
  id: string;
  code: string;
  name: string;
  brand_id: string;
  brand_name?: string | null;
  description?: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}
