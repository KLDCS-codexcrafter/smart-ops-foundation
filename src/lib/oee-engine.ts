/**
 * oee-engine.ts — Q35=ALL polymorphic OEE compute
 * Sprint T-Phase-1.3-3-PlantOps-pre-3a · D-595
 */
import type { JobCard } from '@/types/job-card';
import type { DailyWorkRegisterEntry } from '@/types/daily-work-register';
import type { Machine } from '@/types/machine';
import type { ManufacturingTemplate } from '@/config/manufacturing-templates';
import type {
  OEESourceData, OEEResult, OEEFormulaMode, OEEClassification,
} from '@/types/oee-snapshot';
import { round2 } from '@/lib/decimal-helpers';

export interface BuildOEESourceDataInput {
  entity_id: string;
  factory_id: string;
  machine: Machine;
  date: string;
  shift_id: string | null;
  job_cards: JobCard[];
  dwr_entries: DailyWorkRegisterEntry[];
  template?: ManufacturingTemplate;
}

export function buildOEESourceData(input: BuildOEESourceDataInput): OEESourceData {
  const { entity_id, factory_id, machine, date, shift_id, job_cards, dwr_entries, template } = input;

  const filteredJCs = job_cards.filter(jc =>
    jc.machine_id === machine.id &&
    jc.scheduled_start.slice(0, 10) === date &&
    (shift_id === null || jc.shift_id === shift_id) &&
    jc.status === 'completed'
  );

  const filteredDWRs = dwr_entries.filter(d =>
    d.machine_id === machine.id &&
    d.date === date &&
    (shift_id === null || d.shift_id === shift_id)
  );

  const planned_production_time = 8;
  const actual_run_time = filteredJCs.reduce((sum, jc) => {
    if (!jc.actual_start || !jc.actual_end) return sum;
    return sum + (new Date(jc.actual_end).getTime() - new Date(jc.actual_start).getTime()) / (1000 * 60 * 60);
  }, 0);

  const theoretical_max_qty = actual_run_time * (machine.rated_capacity_per_hour || 1);
  const actual_qty = filteredJCs.reduce((s, jc) => s + jc.produced_qty, 0);
  const good_qty = filteredJCs.reduce((s, jc) => s + jc.produced_qty - jc.rejected_qty - jc.rework_qty, 0);

  return {
    entity_id, factory_id,
    machine_id: machine.id,
    date, shift_id,
    source_dwr_entry_ids: filteredDWRs.map(d => d.id),
    source_job_card_ids: filteredJCs.map(jc => jc.id),
    planned_production_time,
    actual_run_time: round2(actual_run_time),
    theoretical_max_qty: round2(theoretical_max_qty),
    actual_qty: round2(actual_qty),
    good_qty: round2(good_qty),
    primary_kpis: template?.primary_kpis ?? [],
    computed_at: new Date().toISOString(),
  };
}

export function computeOEE(source: OEESourceData, mode: OEEFormulaMode, template?: ManufacturingTemplate): OEEResult {
  switch (mode) {
    case 'classic_apq': return computeClassicAPQ(source);
    case 'simplified_aq': return computeSimplifiedAQ(source);
    case 'template_weighted': return computeTemplateWeighted(source, template);
  }
}

function computeClassicAPQ(source: OEESourceData): OEEResult {
  const availability_pct = source.planned_production_time > 0
    ? round2((source.actual_run_time / source.planned_production_time) * 100) : 0;
  const performance_pct = source.theoretical_max_qty > 0
    ? round2((source.actual_qty / source.theoretical_max_qty) * 100) : 0;
  const quality_pct = source.actual_qty > 0
    ? round2((source.good_qty / source.actual_qty) * 100) : 0;
  const oee_pct = round2((availability_pct / 100) * (performance_pct / 100) * (quality_pct / 100) * 100);

  const factors: string[] = [];
  if (availability_pct < 80) factors.push(`Availability dragging at ${availability_pct}%`);
  if (performance_pct < 80) factors.push(`Performance below target at ${performance_pct}%`);
  if (quality_pct < 95) factors.push(`Quality issues · ${quality_pct}%`);
  if (factors.length === 0) factors.push('All metrics within target');

  return {
    mode: 'classic_apq',
    availability_pct, performance_pct, quality_pct,
    kpi_breakdown: null, template_id: null,
    oee_pct,
    classification: classifyOEE(oee_pct),
    formula_label: 'Classic OEE = A × P × Q',
    contributing_factors: factors,
  };
}

function computeSimplifiedAQ(source: OEESourceData): OEEResult {
  const availability_pct = source.planned_production_time > 0
    ? round2((source.actual_run_time / source.planned_production_time) * 100) : 0;
  const quality_pct = source.actual_qty > 0
    ? round2((source.good_qty / source.actual_qty) * 100) : 0;
  const oee_pct = round2((availability_pct / 100) * (quality_pct / 100) * 100);

  return {
    mode: 'simplified_aq',
    availability_pct, performance_pct: null, quality_pct,
    kpi_breakdown: null, template_id: null,
    oee_pct,
    classification: classifyOEE(oee_pct),
    formula_label: 'Simplified OEE = A × Q (no Performance)',
    contributing_factors: [
      availability_pct < 80 ? `Availability ${availability_pct}%` : `Availability good at ${availability_pct}%`,
      quality_pct < 95 ? `Quality ${quality_pct}%` : `Quality good at ${quality_pct}%`,
    ],
  };
}

function computeTemplateWeighted(source: OEESourceData, template?: ManufacturingTemplate): OEEResult {
  if (!template || !template.primary_kpis || template.primary_kpis.length === 0) {
    const classic = computeClassicAPQ(source);
    return {
      ...classic,
      mode: 'template_weighted',
      formula_label: 'Template-Weighted (fallback to Classic · no template KPIs)',
      contributing_factors: ['No template configured · using classic A×P×Q'],
    };
  }

  const weights = [0.5, 0.3, 0.2];
  const kpiBreakdown: Record<string, number> = {};
  let weightedSum = 0;
  let totalWeight = 0;

  for (let i = 0; i < Math.min(template.primary_kpis.length, 3); i++) {
    const kpi = template.primary_kpis[i];
    const weight = weights[i];
    const value = computeKPIValue(kpi, source);
    kpiBreakdown[kpi] = round2(value);
    weightedSum += value * weight;
    totalWeight += weight;
  }

  const oee_pct = round2(totalWeight > 0 ? weightedSum / totalWeight : 0);

  const availability_pct = source.planned_production_time > 0
    ? round2((source.actual_run_time / source.planned_production_time) * 100) : 0;
  const quality_pct = source.actual_qty > 0
    ? round2((source.good_qty / source.actual_qty) * 100) : 0;

  return {
    mode: 'template_weighted',
    availability_pct, performance_pct: null, quality_pct,
    kpi_breakdown: kpiBreakdown,
    template_id: template.id,
    oee_pct,
    classification: classifyOEE(oee_pct),
    formula_label: `Template-Weighted (${template.name}) · ${template.primary_kpis.slice(0, 3).join(' + ')}`,
    contributing_factors: Object.entries(kpiBreakdown).map(([k, v]) => `${k}: ${v}%`),
  };
}

function computeKPIValue(kpi: string, source: OEESourceData): number {
  switch (kpi) {
    case 'oee':
    case 'availability':
      return source.planned_production_time > 0 ? (source.actual_run_time / source.planned_production_time) * 100 : 0;
    case 'cycle_time':
    case 'performance':
    case 'throughput':
      return source.theoretical_max_qty > 0 ? (source.actual_qty / source.theoretical_max_qty) * 100 : 0;
    case 'first_pass_yield':
    case 'quality':
    case 'yield':
      return source.actual_qty > 0 ? (source.good_qty / source.actual_qty) * 100 : 0;
    case 'utilization':
      return source.planned_production_time > 0 ? (source.actual_run_time / source.planned_production_time) * 100 : 0;
    default:
      return 0;
  }
}

function classifyOEE(oee_pct: number): OEEClassification {
  if (oee_pct >= 85) return 'world_class';
  if (oee_pct >= 60) return 'good';
  if (oee_pct >= 40) return 'fair';
  return 'poor';
}
