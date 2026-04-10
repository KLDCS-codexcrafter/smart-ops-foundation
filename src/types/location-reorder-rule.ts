export type ReorderPriority = 'critical' | 'high' | 'normal';

export interface LocationReorderRule {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  godown_id: string;
  godown_name: string;
  department_tag_id?: string | null;
  department_tag_name?: string | null;
  min_stock: number;
  max_stock: number;
  reorder_qty: number;
  safety_stock: number;
  lead_time_days: number;
  priority: ReorderPriority;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DepartmentTag {
  id: string;
  name: string;
  color: string; // hex colour for badge
  is_system: boolean; // pre-seeded tags cannot be deleted
  created_at: string;
}
