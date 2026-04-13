/** asset-master.ts — Pay Hub Asset Master types · Sprint 4 */

export type AssetCategory =
  | 'laptop' | 'desktop' | 'mobile' | 'printer' | 'server'
  | 'networking' | 'furniture' | 'vehicle' | 'office_equipment' | 'other';

export type AssetStatus = 'available' | 'assigned' | 'under_repair' | 'disposed' | 'missing';

export type AssetCondition = 'new' | 'good' | 'fair' | 'damaged';

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  laptop: 'Laptop', desktop: 'Desktop', mobile: 'Mobile / Phone',
  printer: 'Printer / Scanner', server: 'Server',
  networking: 'Networking Equipment', furniture: 'Furniture',
  vehicle: 'Vehicle', office_equipment: 'Office Equipment', other: 'Other',
};

export const ASSET_STATUS_COLORS: Record<AssetStatus, string> = {
  available:    'bg-green-500/10 text-green-700 border-green-500/30',
  assigned:     'bg-blue-500/10 text-blue-700 border-blue-500/30',
  under_repair: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  disposed:     'bg-slate-500/10 text-slate-500 border-slate-400/30',
  missing:      'bg-red-500/10 text-red-700 border-red-500/30',
};

// ── Assignment history record ────────────────────────────────────────
export interface AssetAssignment {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  assignedDate: string;
  returnedDate: string;      // '' = still assigned
  conditionOut: AssetCondition;  // condition when assigned
  conditionIn: AssetCondition;   // condition when returned ('' if not yet returned)
  notes: string;
  assignedBy: string;
}

// ── Main Asset record ─────────────────────────────────────────────────
export interface Asset {
  id: string;
  assetCode: string;         // AST-000001
  name: string;
  category: AssetCategory;
  make: string;
  model: string;
  serialNo: string;
  purchaseDate: string;
  purchaseValue: number;
  warrantyExpiry: string;
  location: string;
  department: string;
  condition: AssetCondition;
  notes: string;
  // Current assignment (mirrors latest open AssetAssignment)
  currentAssigneeId: string;
  currentAssigneeCode: string;
  currentAssigneeName: string;
  assignedDate: string;
  // Full history
  assignments: AssetAssignment[];
  status: AssetStatus;
  created_at: string;
  updated_at: string;
}

export const ASSETS_KEY = 'erp_pay_hub_assets';

export const BLANK_ASSET: Omit<Asset, "id" | "assetCode" | "created_at" | "updated_at"> = {
  name: '', category: 'laptop', make: '', model: '', serialNo: '',
  purchaseDate: '', purchaseValue: 0, warrantyExpiry: '',
  location: '', department: '', condition: 'new', notes: '',
  currentAssigneeId: '', currentAssigneeCode: '', currentAssigneeName: '',
  assignedDate: '', assignments: [], status: 'available',
};
