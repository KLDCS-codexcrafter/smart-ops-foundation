/**
 * wastage-analysis-engine.ts — 3-PlantOps-pre-3b · D-607 · Q36=ALL polymorphic
 *
 * Builds source rows from JobCards + auto-derives 6 NEW 12-Category rows from JC patterns.
 * Aggregates rows by selected view mode · Pareto-sorted with cumulative_pct.
 */
import type { JobCard } from '@/types/job-card';
import type { DailyWorkRegisterEntry } from '@/types/daily-work-register';
import type { Machine } from '@/types/machine';
import type { ManufacturingTemplate } from '@/config/manufacturing-templates';
import type {
  WastageSourceRow, WastageRow, WastageViewMode, WastageCategory12,
} from '@/types/wastage-snapshot';
import { REASON_TO_CATEGORY_MAP, CATEGORY_12_LABELS } from '@/types/wastage-snapshot';
import { round2 } from '@/lib/decimal-helpers';

export interface BuildWastageSourceRowsInput {
  entity_id: string;
  factory_id: string | null;
  job_cards: JobCard[];
  dwr_entries: DailyWorkRegisterEntry[];
  machines: Machine[];
}

export function buildWastageSourceRows(input: BuildWastageSourceRowsInput): WastageSourceRow[] {
  const result: WastageSourceRow[] = [];
  const { entity_id, factory_id, job_cards, machines } = input;

  for (const jc of job_cards) {
    if (factory_id && jc.factory_id !== factory_id) continue;
    const hasAutoCandidate =
      jc.status === 'on_hold' ||
      jc.produced_qty > jc.planned_qty * 1.1 ||
      jc.rejected_qty > jc.planned_qty * 0.1 ||
      (jc.actual_start && jc.actual_end);
    if (jc.wastage_qty <= 0 && !hasAutoCandidate) continue;

    const machine = machines.find(m => m.id === jc.machine_id);
    const valuePerQty = (machine?.hourly_run_cost ?? 0) / 8;

    if (jc.wastage_qty > 0 && jc.wastage_reason) {
      const category_12 = REASON_TO_CATEGORY_MAP[jc.wastage_reason] ?? 'other';
      result.push({
        id: `wsr-${jc.id}-${jc.wastage_reason}`,
        entity_id, factory_id: jc.factory_id, machine_id: jc.machine_id,
        date: (jc.actual_start ?? jc.scheduled_start).slice(0, 10),
        source_jc_id: jc.id, source_jc_doc_no: jc.doc_no,
        reason_6: jc.wastage_reason,
        category_12,
        is_auto_derived: false,
        template_kpi_key: null,
        wastage_qty: jc.wastage_qty,
        wastage_value: round2(jc.wastage_qty * valuePerQty),
        wastage_notes: jc.wastage_notes,
        computed_at: new Date().toISOString(),
      });
    }

    if (jc.status === 'on_hold') {
      result.push(buildAutoDerivedRow(jc, 'waiting', jc.wastage_qty || 1, machine, 'Hold-state detected'));
    }

    if (jc.produced_qty > jc.planned_qty * 1.1) {
      const overage = jc.produced_qty - jc.planned_qty;
      result.push(buildAutoDerivedRow(jc, 'over_production', overage, machine, `${overage} units beyond plan`));
    }

    if (jc.actual_start && jc.actual_end) {
      const actualHours = (new Date(jc.actual_end).getTime() - new Date(jc.actual_start).getTime()) / 3600000;
      const scheduledHours = (new Date(jc.scheduled_end).getTime() - new Date(jc.scheduled_start).getTime()) / 3600000;
      if (scheduledHours > 0 && actualHours > scheduledHours * 1.2) {
        result.push(buildAutoDerivedRow(jc, 'over_processing', 0, machine, `${round2(actualHours - scheduledHours)}h excess time`));
      }
    }

    if (machine && jc.actual_start && jc.actual_end && jc.produced_qty > 0) {
      const actualHours = (new Date(jc.actual_end).getTime() - new Date(jc.actual_start).getTime()) / 3600000;
      const actualRate = jc.produced_qty / Math.max(actualHours, 0.01);
      const ratedRate = machine.rated_capacity_per_hour;
      if (ratedRate > 0 && actualRate < ratedRate * 0.7 && actualRate >= ratedRate * 0.3) {
        result.push(buildAutoDerivedRow(jc, 'reduced_speed', 0, machine, `${round2(actualRate)}/h vs ${ratedRate}/h rated`));
      }
      if (ratedRate > 0 && actualRate < ratedRate * 0.3 && actualRate >= ratedRate * 0.1 && !jc.breakdown_notes) {
        result.push(buildAutoDerivedRow(jc, 'idling_minor_stops', 0, machine, 'Sustained idle pattern'));
      }
    }

    if (jc.rejected_qty > jc.planned_qty * 0.1 && isJCFirstOfDay(jc, job_cards)) {
      result.push(buildAutoDerivedRow(jc, 'reduced_yield_startup', jc.rejected_qty, machine, 'Startup yield loss'));
    }
  }
  return result;
}

function buildAutoDerivedRow(jc: JobCard, category: WastageCategory12, qty: number, machine: Machine | undefined, evidence: string): WastageSourceRow {
  return {
    id: `wsr-${jc.id}-${category}-auto`,
    entity_id: jc.entity_id, factory_id: jc.factory_id, machine_id: jc.machine_id,
    date: (jc.actual_start ?? jc.scheduled_start).slice(0, 10),
    source_jc_id: jc.id, source_jc_doc_no: jc.doc_no,
    reason_6: null,
    category_12: category,
    is_auto_derived: true,
    template_kpi_key: null,
    wastage_qty: qty,
    wastage_value: round2(qty * ((machine?.hourly_run_cost ?? 0) / 8)),
    wastage_notes: evidence,
    computed_at: new Date().toISOString(),
  };
}

function isJCFirstOfDay(jc: JobCard, all: JobCard[]): boolean {
  const date = (jc.actual_start ?? jc.scheduled_start).slice(0, 10);
  const sameDayMachine = all.filter(j =>
    j.machine_id === jc.machine_id &&
    (j.actual_start ?? j.scheduled_start).slice(0, 10) === date,
  ).sort((a, b) => (a.actual_start ?? a.scheduled_start).localeCompare(b.actual_start ?? b.scheduled_start));
  return sameDayMachine[0]?.id === jc.id;
}

export function aggregateWastage(
  sourceRows: WastageSourceRow[],
  mode: WastageViewMode,
  template?: ManufacturingTemplate,
): WastageRow[] {
  const groupKeyFn: (r: WastageSourceRow) => { key: string; label: string } =
    mode === '6_reason'
      ? (r) => {
          const k = r.reason_6 ?? 'auto_derived_only';
          return { key: k, label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) };
        }
      : mode === '12_category'
      ? (r) => ({ key: r.category_12, label: CATEGORY_12_LABELS[r.category_12] })
      : (r) => {
          const tk = template?.qc_parameters?.find(qc =>
            r.wastage_notes.toLowerCase().includes(qc.key.toLowerCase()),
          )?.key ?? r.category_12;
          return { key: tk, label: tk.replace(/_/g, ' ') };
        };

  const groups = new Map<string, { rows: WastageSourceRow[]; label: string }>();
  for (const row of sourceRows) {
    const { key, label } = groupKeyFn(row);
    const existing = groups.get(key) ?? { rows: [], label };
    existing.rows.push(row);
    groups.set(key, existing);
  }

  const allRows: WastageRow[] = [];
  for (const [key, { rows, label }] of groups) {
    const total_qty = rows.reduce((s, r) => s + r.wastage_qty, 0);
    const total_value = rows.reduce((s, r) => s + r.wastage_value, 0);
    allRows.push({
      view_mode: mode,
      group_key: key,
      group_label: label,
      total_qty: round2(total_qty),
      total_value: round2(total_value),
      occurrence_count: rows.length,
      pct_of_total: 0,
      cumulative_pct: 0,
      source_jc_ids: Array.from(new Set(rows.map(r => r.source_jc_id))),
      contributing_machines: Array.from(new Set(rows.map(r => r.machine_id))),
    });
  }

  allRows.sort((a, b) => b.total_qty - a.total_qty);
  const grandTotal = allRows.reduce((s, r) => s + r.total_qty, 0);
  let cumulative = 0;
  for (const row of allRows) {
    row.pct_of_total = grandTotal > 0 ? round2((row.total_qty / grandTotal) * 100) : 0;
    cumulative += row.pct_of_total;
    row.cumulative_pct = round2(cumulative);
  }

  return allRows;
}
