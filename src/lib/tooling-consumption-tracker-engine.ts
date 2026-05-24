/**
 * @file        src/lib/tooling-consumption-tracker-engine.ts
 * @sprint      T-Phase-3.PROD-2 · ST11 · PROD-LEAK-14 closure · Q-LOCK-11
 * @purpose     Tooling/jig/fixture consumption tracker · per-machine tool-life burn rate vs
 *              expected life · surfaces alerts when a tool nears or exceeds end-of-life.
 *              Sub-helper engine · NOT a new SIBLING.
 * @disciplines FR-26 entity-scoped · FR-93 engine-side ls-helper
 * @[JWT]       POST /api/production/tooling-consumption/scan
 *
 * v1 limitation note:
 * Tool register stored side-store (erp_tooling_register_${entityCode}) keyed by tool_id ·
 * dedicated Tool SIBLING deferred to PROD-3. Consumption accrued from Production Confirmation
 * actual_qty mapped via machine_id linkage on the issuing PO.
 * Acceptable trade-off for LEAK-14 v1 closure.
 */

import type { ProductionConfirmation } from '@/types/production-confirmation';
import { productionConfirmationsKey } from '@/types/production-confirmation';
import type { ProductionOrder } from '@/types/production-order';
import { productionOrdersKey } from '@/types/production-order';
// Sprint T-Phase-3.PROD-FIX-A · ST7 · Q-LOCK-4 Option Y · LEAK-14 surgical fix
// machine→factory ancestry: compare PO factory with the tool's machine's factory.
import type { Machine } from '@/types/machine';
import { machinesKey } from '@/types/machine';

export interface ToolingRegisterRecord {
  tool_id: string;
  tool_name: string;
  machine_id: string;
  expected_life_units: number;
  consumed_units: number;
  installed_at: string;
  last_reset_at: string | null;
}

export interface ToolingConsumptionAlert {
  id: string;
  tool_id: string;
  tool_name: string;
  machine_id: string;
  consumed_units: number;
  expected_life_units: number;
  consumption_pct: number;
  severity: 'warning' | 'critical' | 'eol';
  detected_at: string;
  acknowledged_at: string | null;
}

const WARN_PCT = 80;
const CRIT_PCT = 95;
const EOL_PCT = 100;

export const toolingRegisterKey = (entityCode: string): string =>
  `erp_tooling_register_${entityCode}`;
export const toolingConsumptionAlertsKey = (entityCode: string): string =>
  `erp_tooling_consumption_alerts_${entityCode}`;

function lsRead<T>(key: string, fallback: T): T {
  try {
    // [JWT] GET /api/*
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsWrite(key: string, value: unknown): void {
  try {
    // [JWT] PUT /api/*
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota silent */
  }
}

/** Accrue consumption since last_reset_at by summing PO outputs whose machines map to the tool. */
export function recomputeToolingConsumption(entityCode: string): ToolingRegisterRecord[] {
  const tools = lsRead<ToolingRegisterRecord[]>(toolingRegisterKey(entityCode), []);
  if (tools.length === 0) return [];
  const pos = lsRead<ProductionOrder[]>(productionOrdersKey(entityCode), []);
  const poById = new Map(pos.map(p => [p.id, p]));
  // Sprint T-Phase-3.PROD-FIX-A · ST7 · LEAK-14 fix · machine-master ancestry
  const machines = lsRead<Machine[]>(machinesKey(entityCode), []);
  const machineById = new Map(machines.map(m => [m.id, m]));
  const confs = lsRead<ProductionConfirmation[]>(
    productionConfirmationsKey(entityCode),
    [],
  ).filter(c => c.status === 'confirmed');

  const next: ToolingRegisterRecord[] = tools.map(tool => {
    const since = tool.last_reset_at ?? tool.installed_at;
    const toolMachine = machineById.get(tool.machine_id);
    let burnt = 0;
    for (const c of confs) {
      if (c.confirmation_date < since) continue;
      // Sprint T-Phase-3.PROD-FIX-A · ST7 · LEAK-14 surgical fix (Q-LOCK-4 Option Y).
      // Previous (buggy): po.production_site_id === tool.machine_id (factory_id vs machine_id mismatch).
      // Fixed: match when the tool's machine belongs to the PO's factory.
      const po = poById.get(c.id) ?? null;
      const matches = po && toolMachine
        ? toolMachine.factory_id === po.production_site_id
        : true; /* fallback when linkage missing */
      if (!matches) continue;
      for (const line of c.lines) {
        burnt += line.actual_qty;
      }
    }
    // Preserve seeded baseline when no confirmation-based accrual is available yet.
    const next_consumed = burnt > 0 ? burnt : tool.consumed_units;
    return { ...tool, consumed_units: Number(next_consumed.toFixed(2)) };
  });

  lsWrite(toolingRegisterKey(entityCode), next);
  return next;
}

export function detectToolingAlerts(entityCode: string): ToolingConsumptionAlert[] {
  const tools = recomputeToolingConsumption(entityCode);
  const now = new Date().toISOString();
  const existing = lsRead<ToolingConsumptionAlert[]>(
    toolingConsumptionAlertsKey(entityCode),
    [],
  );
  const ackMap = new Map(existing.map(a => [a.tool_id, a.acknowledged_at] as const));
  const alerts: ToolingConsumptionAlert[] = [];
  for (const t of tools) {
    if (t.expected_life_units <= 0) continue;
    const pct = Number(((t.consumed_units / t.expected_life_units) * 100).toFixed(2));
    if (pct < WARN_PCT) continue;
    const severity: ToolingConsumptionAlert['severity'] =
      pct >= EOL_PCT ? 'eol' : pct >= CRIT_PCT ? 'critical' : 'warning';
    alerts.push({
      id: `tool-${t.tool_id}`,
      tool_id: t.tool_id,
      tool_name: t.tool_name,
      machine_id: t.machine_id,
      consumed_units: t.consumed_units,
      expected_life_units: t.expected_life_units,
      consumption_pct: pct,
      severity,
      detected_at: now,
      acknowledged_at: ackMap.get(t.tool_id) ?? null,
    });
  }
  lsWrite(toolingConsumptionAlertsKey(entityCode), alerts);
  return alerts;
}

export function listOpenToolingAlerts(entityCode: string): ToolingConsumptionAlert[] {
  return lsRead<ToolingConsumptionAlert[]>(toolingConsumptionAlertsKey(entityCode), [])
    .filter(a => a.acknowledged_at === null);
}

export function acknowledgeToolingAlert(alertId: string, entityCode: string): void {
  const list = lsRead<ToolingConsumptionAlert[]>(
    toolingConsumptionAlertsKey(entityCode),
    [],
  );
  lsWrite(
    toolingConsumptionAlertsKey(entityCode),
    list.map(a =>
      a.id === alertId ? { ...a, acknowledged_at: new Date().toISOString() } : a,
    ),
  );
}

export function resetTool(toolId: string, entityCode: string): void {
  const tools = lsRead<ToolingRegisterRecord[]>(toolingRegisterKey(entityCode), []);
  const now = new Date().toISOString();
  lsWrite(
    toolingRegisterKey(entityCode),
    tools.map(t =>
      t.tool_id === toolId ? { ...t, consumed_units: 0, last_reset_at: now } : t,
    ),
  );
}
