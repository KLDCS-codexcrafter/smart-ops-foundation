/**
 * manufacturing-templates.ts — 27 industry templates (Q22=a)
 * Sprint T-Phase-1.3-3-PlantOps-pre-1 · D-571
 *
 * Ported pattern from craft-company-canvas. 12 fully populated this sprint;
 * remaining 15 stubbed with TODO for 3-PlantOps-pre-2 expansion.
 */

export type ManufacturingCategory =
  | 'primary_type'
  | 'secondary_type'
  | 'industry_sector'
  | 'automation_level'
  | 'production_model';

export interface ManufacturingTemplate {
  id: string;
  category: ManufacturingCategory;
  name: string;
  description: string;
  default_costing_method: 'standard' | 'actual' | 'fifo' | 'lifo' | 'weighted_average';
  default_production_model: 'mto' | 'mts' | 'eto' | 'ato' | 'hybrid';
  primary_kpis: string[];
  secondary_kpis: string[];
  enabled_modules: string[];
  qc_parameters: Array<{ key: string; label: string; type: 'numeric' | 'pass_fail' | 'visual' }>;
  compliance_standards: string[];
  icon: string;
  color_class: string;
}

const stub = (
  id: string,
  category: ManufacturingCategory,
  name: string,
  description: string,
): ManufacturingTemplate => ({
  id,
  category,
  name,
  description,
  default_costing_method: 'standard',
  default_production_model: 'mts',
  primary_kpis: ['oee'],
  secondary_kpis: [],
  enabled_modules: ['production-plan', 'job-card'],
  qc_parameters: [],
  compliance_standards: [],
  icon: 'Factory',
  color_class: 'bg-muted',
});

export const MANUFACTURING_TEMPLATES: ManufacturingTemplate[] = [
  // ── PRIMARY TYPE (6) ──
  {
    id: 'job-shop',
    category: 'primary_type',
    name: 'Job Shop',
    description: 'Custom one-off · low volume · high variety',
    default_costing_method: 'actual',
    default_production_model: 'mto',
    primary_kpis: ['cycle_time', 'on_time_delivery', 'cost_variance'],
    secondary_kpis: ['utilization', 'rework_pct'],
    enabled_modules: ['production-plan', 'job-card', 'qc-incoming'],
    qc_parameters: [{ key: 'visual_check', label: 'Visual Check', type: 'pass_fail' }],
    compliance_standards: [],
    icon: 'Wrench',
    color_class: 'bg-primary',
  },
  {
    id: 'process-continuous',
    category: 'primary_type',
    name: 'Process Continuous',
    description: 'Continuous flow · high volume · single product',
    default_costing_method: 'standard',
    default_production_model: 'mts',
    primary_kpis: ['oee', 'yield', 'throughput'],
    secondary_kpis: ['energy_kwh', 'waste_pct'],
    enabled_modules: ['production-plan', 'oee', 'wastage', 'qc-incoming', 'qc-outgoing'],
    qc_parameters: [
      { key: 'temperature', label: 'Temperature (°C)', type: 'numeric' },
      { key: 'ph_value', label: 'pH', type: 'numeric' },
    ],
    compliance_standards: ['ISO9001'],
    icon: 'Zap',
    color_class: 'bg-warning',
  },
  {
    id: 'process-batch',
    category: 'primary_type',
    name: 'Process Batch',
    description: 'Batch-wise discrete chemistry / FMCG',
    default_costing_method: 'standard',
    default_production_model: 'mts',
    primary_kpis: ['yield', 'batch_cycle_time', 'oee'],
    secondary_kpis: ['waste_pct', 'rework_pct'],
    enabled_modules: ['production-plan', 'job-card', 'wastage', 'oee', 'qc-outgoing'],
    qc_parameters: [
      { key: 'batch_weight_kg', label: 'Batch Weight (kg)', type: 'numeric' },
    ],
    compliance_standards: ['ISO9001', 'GMP'],
    icon: 'Beaker',
    color_class: 'bg-accent',
  },
  {
    id: 'discrete-assembly',
    category: 'primary_type',
    name: 'Discrete Assembly',
    description: 'Component assembly · mixed-model line',
    default_costing_method: 'standard',
    default_production_model: 'ato',
    primary_kpis: ['oee', 'first_pass_yield', 'cycle_time'],
    secondary_kpis: ['rework_pct'],
    enabled_modules: ['production-plan', 'job-card', 'oee', 'qc-incoming'],
    qc_parameters: [{ key: 'torque_nm', label: 'Torque (Nm)', type: 'numeric' }],
    compliance_standards: ['ISO9001'],
    icon: 'Cog',
    color_class: 'bg-primary',
  },
  stub('cellular-mfg', 'primary_type', 'Cellular Manufacturing', 'Group-tech cells · TODO 3-PlantOps-pre-2'),
  stub('repetitive-mfg', 'primary_type', 'Repetitive Manufacturing', 'Repetitive flow · TODO 3-PlantOps-pre-2'),

  // ── SECONDARY TYPE (4) ──
  {
    id: 'make-to-order',
    category: 'secondary_type',
    name: 'Make To Order',
    description: 'Produce after sales-order receipt',
    default_costing_method: 'actual',
    default_production_model: 'mto',
    primary_kpis: ['on_time_delivery', 'cost_variance'],
    secondary_kpis: ['cycle_time'],
    enabled_modules: ['production-plan', 'job-card'],
    qc_parameters: [],
    compliance_standards: [],
    icon: 'Package',
    color_class: 'bg-primary',
  },
  {
    id: 'make-to-stock',
    category: 'secondary_type',
    name: 'Make To Stock',
    description: 'Forecast-driven inventory replenishment',
    default_costing_method: 'standard',
    default_production_model: 'mts',
    primary_kpis: ['service_level', 'inventory_turns'],
    secondary_kpis: ['oee'],
    enabled_modules: ['production-plan', 'oee'],
    qc_parameters: [],
    compliance_standards: [],
    icon: 'Boxes',
    color_class: 'bg-accent',
  },
  {
    id: 'engineer-to-order',
    category: 'secondary_type',
    name: 'Engineer To Order',
    description: 'Project-based · per-order BOM',
    default_costing_method: 'actual',
    default_production_model: 'eto',
    primary_kpis: ['cost_variance', 'on_time_delivery', 'milestone_completion'],
    secondary_kpis: ['rework_pct'],
    enabled_modules: ['production-plan', 'job-card', 'project-link'],
    qc_parameters: [{ key: 'dimensional_check', label: 'Dimensional Check', type: 'pass_fail' }],
    compliance_standards: ['ISO9001'],
    icon: 'Layers',
    color_class: 'bg-warning',
  },
  stub('assemble-to-order', 'secondary_type', 'Assemble To Order', 'Configure-and-assemble · TODO 3-PlantOps-pre-2'),

  // ── INDUSTRY SECTOR (8) ──
  {
    id: 'industry-textile',
    category: 'industry_sector',
    name: 'Textile',
    description: 'Yarn · fabric · garment manufacturing',
    default_costing_method: 'standard',
    default_production_model: 'mts',
    primary_kpis: ['gsm_compliance', 'shrinkage_pct', 'color_fastness'],
    secondary_kpis: ['rework_pct'],
    enabled_modules: ['production-plan', 'job-card', 'qc-outgoing'],
    qc_parameters: [
      { key: 'gsm', label: 'GSM', type: 'numeric' },
      { key: 'yarn_count', label: 'Yarn Count', type: 'numeric' },
    ],
    compliance_standards: ['OEKO-TEX'],
    icon: 'Shirt',
    color_class: 'bg-accent',
  },
  {
    id: 'industry-pharma',
    category: 'industry_sector',
    name: 'Pharma',
    description: 'GMP/WHO-GMP regulated drug manufacturing',
    default_costing_method: 'standard',
    default_production_model: 'mts',
    primary_kpis: ['yield', 'batch_release_cycle', 'deviation_count'],
    secondary_kpis: ['oee'],
    enabled_modules: ['production-plan', 'job-card', 'wastage', 'qc-incoming', 'qc-outgoing', 'compliance-audit'],
    qc_parameters: [
      { key: 'assay_pct', label: 'Assay (%)', type: 'numeric' },
      { key: 'dissolution_pct', label: 'Dissolution (%)', type: 'numeric' },
    ],
    compliance_standards: ['WHO-GMP', 'ISO9001', '21CFR'],
    icon: 'Pill',
    color_class: 'bg-success',
  },
  {
    id: 'industry-food',
    category: 'industry_sector',
    name: 'Food & FMCG',
    description: 'FSSAI-compliant food processing',
    default_costing_method: 'standard',
    default_production_model: 'mts',
    primary_kpis: ['yield', 'oee', 'shelf_life_compliance'],
    secondary_kpis: ['waste_pct'],
    enabled_modules: ['production-plan', 'job-card', 'wastage', 'qc-incoming', 'qc-outgoing'],
    qc_parameters: [
      { key: 'moisture_pct', label: 'Moisture (%)', type: 'numeric' },
      { key: 'visual_check', label: 'Visual Check', type: 'pass_fail' },
    ],
    compliance_standards: ['FSSAI', 'HACCP', 'ISO22000'],
    icon: 'Utensils',
    color_class: 'bg-warning',
  },
  {
    id: 'industry-automotive', category: 'industry_sector',
    name: 'Automotive', description: 'TS-16949 / IATF 16949 tier-N supplier',
    default_costing_method: 'standard', default_production_model: 'mts',
    primary_kpis: ['ppm_defect', 'on_time_delivery', 'oee'],
    secondary_kpis: ['scrap_pct'],
    enabled_modules: ['production-plan', 'job-card', 'oee', 'qc-incoming', 'qc-outgoing', 'compliance-audit'],
    qc_parameters: [
      { key: 'dimensional_check', label: 'Dimensional Check', type: 'numeric' },
      { key: 'visual_aql', label: 'Visual AQL', type: 'pass_fail' },
    ],
    compliance_standards: ['IATF16949', 'ISO9001'],
    icon: 'Car', color_class: 'bg-primary',
  },
  {
    id: 'industry-electronics', category: 'industry_sector',
    name: 'Electronics', description: 'IPC-A-610 PCB / SMT assembly',
    default_costing_method: 'standard', default_production_model: 'ato',
    primary_kpis: ['first_pass_yield', 'oee', 'defect_ppm'],
    secondary_kpis: ['rework_pct'],
    enabled_modules: ['production-plan', 'job-card', 'oee', 'qc-incoming', 'qc-outgoing'],
    qc_parameters: [
      { key: 'aoi_pass', label: 'AOI Pass', type: 'pass_fail' },
      { key: 'ict_pass', label: 'ICT Pass', type: 'pass_fail' },
    ],
    compliance_standards: ['IPC-A-610', 'RoHS', 'ISO9001'],
    icon: 'Cpu', color_class: 'bg-accent',
  },
  {
    id: 'industry-chemicals', category: 'industry_sector',
    name: 'Chemicals', description: 'Bulk / specialty chemical manufacturing',
    default_costing_method: 'standard', default_production_model: 'mts',
    primary_kpis: ['yield', 'purity_pct', 'energy_kwh'],
    secondary_kpis: ['waste_pct'],
    enabled_modules: ['production-plan', 'job-card', 'wastage', 'qc-outgoing', 'compliance-audit'],
    qc_parameters: [
      { key: 'purity_pct', label: 'Purity (%)', type: 'numeric' },
      { key: 'ph_value', label: 'pH', type: 'numeric' },
    ],
    compliance_standards: ['REACH', 'ISO14001'],
    icon: 'FlaskConical', color_class: 'bg-warning',
  },
  {
    id: 'industry-metal', category: 'industry_sector',
    name: 'Metal & Fabrication', description: 'Heat-number traceable steel/alloy fabrication',
    default_costing_method: 'actual', default_production_model: 'mto',
    primary_kpis: ['heat_traceability', 'on_time_delivery', 'rework_pct'],
    secondary_kpis: ['scrap_pct'],
    enabled_modules: ['production-plan', 'job-card', 'qc-incoming', 'qc-outgoing'],
    qc_parameters: [
      { key: 'tensile_mpa', label: 'Tensile (MPa)', type: 'numeric' },
      { key: 'hardness_hrc', label: 'Hardness (HRC)', type: 'numeric' },
    ],
    compliance_standards: ['ISO9001', 'ASME'],
    icon: 'Wrench', color_class: 'bg-muted',
  },
  {
    id: 'industry-packaging', category: 'industry_sector',
    name: 'Packaging', description: 'Corrugation / lamination / flexible packaging',
    default_costing_method: 'standard', default_production_model: 'mto',
    primary_kpis: ['waste_pct', 'on_time_delivery', 'oee'],
    secondary_kpis: ['rework_pct'],
    enabled_modules: ['production-plan', 'job-card', 'wastage', 'qc-outgoing'],
    qc_parameters: [
      { key: 'gsm', label: 'GSM', type: 'numeric' },
      { key: 'bursting_strength', label: 'Bursting Strength', type: 'numeric' },
    ],
    compliance_standards: ['BRC', 'ISO9001'],
    icon: 'Package', color_class: 'bg-primary',
  },

  // ── AUTOMATION LEVEL (4) ──
  {
    id: 'automation-manual', category: 'automation_level',
    name: 'Manual', description: 'Hand-operated · operator-driven workflow',
    default_costing_method: 'actual', default_production_model: 'mto',
    primary_kpis: ['labour_efficiency', 'rework_pct'],
    secondary_kpis: [],
    enabled_modules: ['production-plan', 'job-card'],
    qc_parameters: [{ key: 'visual_check', label: 'Visual Check', type: 'pass_fail' }],
    compliance_standards: [],
    icon: 'HandMetal', color_class: 'bg-muted',
  },
  {
    id: 'automation-semi-auto', category: 'automation_level',
    name: 'Semi-Automatic', description: 'Operator + machine collaboration',
    default_costing_method: 'standard', default_production_model: 'mts',
    primary_kpis: ['oee', 'cycle_time'],
    secondary_kpis: ['utilization'],
    enabled_modules: ['production-plan', 'job-card', 'oee'],
    qc_parameters: [{ key: 'visual_check', label: 'Visual Check', type: 'pass_fail' }],
    compliance_standards: [],
    icon: 'Cog', color_class: 'bg-primary',
  },
  {
    id: 'automation-fully-auto', category: 'automation_level',
    name: 'Fully Automatic', description: 'PLC / SCADA driven · minimal operator',
    default_costing_method: 'standard', default_production_model: 'mts',
    primary_kpis: ['oee', 'throughput', 'mtbf'],
    secondary_kpis: ['energy_kwh'],
    enabled_modules: ['production-plan', 'oee', 'qc-outgoing'],
    qc_parameters: [{ key: 'inline_spc', label: 'Inline SPC', type: 'numeric' }],
    compliance_standards: ['ISO9001'],
    icon: 'CircuitBoard', color_class: 'bg-accent',
  },
  {
    id: 'automation-lights-out', category: 'automation_level',
    name: 'Lights-Out', description: 'Unmanned · 24x7 robotic operation',
    default_costing_method: 'standard', default_production_model: 'mts',
    primary_kpis: ['oee', 'mtbf', 'mttr'],
    secondary_kpis: ['energy_kwh'],
    enabled_modules: ['production-plan', 'oee', 'qc-outgoing'],
    qc_parameters: [{ key: 'inline_spc', label: 'Inline SPC', type: 'numeric' }],
    compliance_standards: ['ISO9001'],
    icon: 'Bot', color_class: 'bg-success',
  },

  // ── PRODUCTION MODEL (5) ──
  {
    id: 'model-line', category: 'production_model',
    name: 'Production Line', description: 'Sequential conveyor-based line',
    default_costing_method: 'standard', default_production_model: 'mts',
    primary_kpis: ['line_balance_pct', 'oee', 'throughput'],
    secondary_kpis: ['takt_time'],
    enabled_modules: ['production-plan', 'job-card', 'oee'],
    qc_parameters: [{ key: 'inline_check', label: 'Inline Check', type: 'pass_fail' }],
    compliance_standards: [],
    icon: 'AlignHorizontalSpaceBetween', color_class: 'bg-primary',
  },
  {
    id: 'model-cellular', category: 'production_model',
    name: 'Cellular', description: 'Manufacturing cell layout · multi-skill',
    default_costing_method: 'standard', default_production_model: 'mto',
    primary_kpis: ['cycle_time', 'on_time_delivery', 'flexibility_index'],
    secondary_kpis: ['utilization'],
    enabled_modules: ['production-plan', 'job-card'],
    qc_parameters: [{ key: 'visual_check', label: 'Visual Check', type: 'pass_fail' }],
    compliance_standards: [],
    icon: 'LayoutGrid', color_class: 'bg-accent',
  },
  {
    id: 'model-job-shop', category: 'production_model',
    name: 'Job Shop Layout', description: 'Functional/process-grouped layout',
    default_costing_method: 'actual', default_production_model: 'mto',
    primary_kpis: ['cycle_time', 'utilization'],
    secondary_kpis: ['rework_pct'],
    enabled_modules: ['production-plan', 'job-card'],
    qc_parameters: [{ key: 'visual_check', label: 'Visual Check', type: 'pass_fail' }],
    compliance_standards: [],
    icon: 'Wrench', color_class: 'bg-muted',
  },
  {
    id: 'model-project', category: 'production_model',
    name: 'Project', description: 'One-of-a-kind · ETO project',
    default_costing_method: 'actual', default_production_model: 'eto',
    primary_kpis: ['milestone_compliance', 'cost_variance'],
    secondary_kpis: ['rework_pct'],
    enabled_modules: ['production-plan', 'job-card', 'compliance-audit'],
    qc_parameters: [{ key: 'milestone_check', label: 'Milestone Check', type: 'pass_fail' }],
    compliance_standards: ['ISO9001'],
    icon: 'KanbanSquare', color_class: 'bg-warning',
  },
  {
    id: 'model-agile', category: 'production_model',
    name: 'Agile', description: 'Reconfigurable · responds to demand shifts',
    default_costing_method: 'standard', default_production_model: 'hybrid',
    primary_kpis: ['flexibility_index', 'changeover_time', 'on_time_delivery'],
    secondary_kpis: ['utilization'],
    enabled_modules: ['production-plan', 'job-card', 'oee'],
    qc_parameters: [{ key: 'visual_check', label: 'Visual Check', type: 'pass_fail' }],
    compliance_standards: [],
    icon: 'Repeat', color_class: 'bg-accent',
  },
];

export const MANUFACTURING_CATEGORIES: ManufacturingCategory[] = [
  'primary_type',
  'secondary_type',
  'industry_sector',
  'automation_level',
  'production_model',
];

export function getTemplateById(id: string): ManufacturingTemplate | undefined {
  return MANUFACTURING_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByCategory(category: ManufacturingCategory): ManufacturingTemplate[] {
  return MANUFACTURING_TEMPLATES.filter(t => t.category === category);
}

export function getAllTemplates(): ManufacturingTemplate[] {
  return [...MANUFACTURING_TEMPLATES];
}
