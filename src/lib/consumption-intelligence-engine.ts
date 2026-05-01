/**
 * consumption-intelligence-engine.ts — Pure algorithms for the MOAT layer.
 * Sprint T-Phase-1.2.2 · The MOAT sprint.
 *
 * D-216: Pure functions — read live data, compute alerts, NEVER persist.
 * Caller (Welcome strip + ConsumptionSummaryReport) decides whether to cache.
 *
 * The 3 algorithms:
 *   1. detectRateAnomalies         — consumption qty/output spiked vs trailing average
 *   2. detectMaterialAgeing        — stock balance hasn't moved for N days
 *   3. detectUnaccountedConsumption — MIN issued but no Consumption Entry filed
 *
 * No localStorage writes. No side effects. Easy to unit test.
 */
import { dMul, dSub, dAdd, round2 } from '@/lib/decimal-helpers';
import type { ConsumptionAlert, ConsumptionEntry, MaterialIssueNote } from '@/types/consumption';
import type { StockBalanceEntry } from '@/types/grn';

const DAY_MS = 24 * 60 * 60 * 1000;

const newAlert = (
  kind: ConsumptionAlert['kind'],
  severity: ConsumptionAlert['severity'],
  title: string,
  description: string,
  magnitude: number,
  refs: Pick<ConsumptionAlert,
    'ref_item_id' | 'ref_godown_id' | 'ref_department_code' | 'ref_min_id'> = {},
): ConsumptionAlert => ({
  id: `cal-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  kind, severity, title, description, magnitude,
  detected_at: new Date().toISOString(),
  ...refs,
});

/**
 * Rate anomaly: for each (item, project) job-mode entry over the last N days,
 * compare actual qty/output_qty against the trailing average of prior entries.
 * Flag if the most recent entry is ≥ thresholdPct higher than the trailing avg.
 */
export function detectRateAnomalies(
  entries: readonly ConsumptionEntry[],
  opts: { lookbackDays?: number; thresholdPct?: number } = {},
): ConsumptionAlert[] {
  const lookbackDays = opts.lookbackDays ?? 90;
  const thresholdPct = opts.thresholdPct ?? 25;
  const cutoff = Date.now() - lookbackDays * DAY_MS;
  const alerts: ConsumptionAlert[] = [];

  // Bucket job-mode entries by (item_id, project_centre_id)
  const buckets = new Map<string, Array<{ entry: ConsumptionEntry; rate: number }>>();
  for (const e of entries) {
    if (e.status !== 'posted') continue;
    if (e.mode !== 'job') continue;
    if (!e.project_centre_id) continue;
    const t = new Date(e.consumption_date).getTime();
    if (t < cutoff) continue;
    if (e.output_qty <= 0) continue;
    for (const ln of e.lines) {
      if (ln.actual_qty <= 0) continue;
      const key = `${ln.item_id}::${e.project_centre_id}`;
      const rate = ln.actual_qty / e.output_qty; // qty consumed per unit output
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push({ entry: e, rate });
    }
  }

  for (const [, points] of buckets) {
    if (points.length < 3) continue; // need at least 3 to be meaningful
    const sorted = [...points].sort(
      (a, b) => a.entry.consumption_date.localeCompare(b.entry.consumption_date));
    const latest = sorted[sorted.length - 1];
    const priors = sorted.slice(0, -1);
    const avgPrior = priors.reduce((s, p) => s + p.rate, 0) / priors.length;
    if (avgPrior <= 0) continue;
    const deltaPct = ((latest.rate - avgPrior) / avgPrior) * 100;
    if (deltaPct < thresholdPct) continue;
    const lineHit = latest.entry.lines.find(l => Math.abs(l.actual_qty / latest.entry.output_qty - latest.rate) < 1e-6);
    const itemName = lineHit?.item_name ?? 'Unknown item';
    const lossValue = round2(dMul(dSub(latest.rate, avgPrior), dMul(latest.entry.output_qty, lineHit?.rate ?? 0)));
    alerts.push(newAlert(
      'rate_anomaly',
      deltaPct > 50 ? 'critical' : 'warn',
      `Rate anomaly · ${itemName}`,
      `Consumption rate up ${round2(deltaPct)}% vs trailing avg on ${latest.entry.ce_no}. ` +
      `Latest ${round2(latest.rate)} ${lineHit?.uom ?? ''}/output vs avg ${round2(avgPrior)}.`,
      Math.abs(lossValue),
      { ref_item_id: lineHit?.item_id ?? null },
    ));
  }
  return alerts;
}

/**
 * Material ageing: stock balance entries with no movement (no GRN, no MIN out, no CE)
 * for ageingDays. Magnitude is the locked-up rupee value.
 */
export function detectMaterialAgeing(
  balances: readonly StockBalanceEntry[],
  mins: readonly MaterialIssueNote[],
  consumptions: readonly ConsumptionEntry[],
  opts: { ageingDays?: number; minValue?: number } = {},
): ConsumptionAlert[] {
  const ageingDays = opts.ageingDays ?? 60;
  const minValue = opts.minValue ?? 5000;
  const cutoff = Date.now() - ageingDays * DAY_MS;
  const alerts: ConsumptionAlert[] = [];

  // Build last-movement map keyed by item:godown
  const lastTouched = new Map<string, number>();
  for (const m of mins) {
    if (m.status !== 'issued') continue;
    const t = new Date(m.issue_date).getTime();
    for (const ln of m.lines) {
      const fromKey = `${ln.item_id}::${m.from_godown_id}`;
      const toKey = `${ln.item_id}::${m.to_godown_id}`;
      lastTouched.set(fromKey, Math.max(lastTouched.get(fromKey) ?? 0, t));
      lastTouched.set(toKey,   Math.max(lastTouched.get(toKey)   ?? 0, t));
    }
  }
  for (const c of consumptions) {
    if (c.status !== 'posted') continue;
    const t = new Date(c.consumption_date).getTime();
    for (const ln of c.lines) {
      const k = `${ln.item_id}::${c.godown_id}`;
      lastTouched.set(k, Math.max(lastTouched.get(k) ?? 0, t));
    }
  }

  for (const b of balances) {
    if (b.qty <= 0) continue;
    if (b.value < minValue) continue;
    const k = `${b.item_id}::${b.godown_id}`;
    const last = lastTouched.get(k) ?? new Date(b.updated_at).getTime();
    if (last >= cutoff) continue;
    const idleDays = Math.floor((Date.now() - last) / DAY_MS);
    alerts.push(newAlert(
      'material_ageing',
      idleDays > 180 ? 'critical' : 'warn',
      `Idle stock · ${b.item_name}`,
      `${b.qty} ${b.item_name} in ${b.godown_name} idle for ${idleDays} days · ₹${round2(b.value).toLocaleString('en-IN')} locked up.`,
      b.value,
      { ref_item_id: b.item_id, ref_godown_id: b.godown_id },
    ));
  }
  return alerts;
}

/**
 * Unaccounted consumption: MINs issued more than `graceDays` ago whose total qty
 * still exceeds the qty consumed in CE entries pointing at the same destination
 * godown · same item · within a 30-day window of the MIN.
 */
export function detectUnaccountedConsumption(
  mins: readonly MaterialIssueNote[],
  consumptions: readonly ConsumptionEntry[],
  opts: { graceDays?: number } = {},
): ConsumptionAlert[] {
  const graceDays = opts.graceDays ?? 7;
  const cutoff = Date.now() - graceDays * DAY_MS;
  const alerts: ConsumptionAlert[] = [];

  for (const m of mins) {
    if (m.status !== 'issued') continue;
    const issueT = new Date(m.issue_date).getTime();
    if (issueT > cutoff) continue;
    let issuedTotal = 0, consumedTotal = 0, leakValue = 0;
    for (const ln of m.lines) {
      issuedTotal = dAdd(issuedTotal, ln.qty);
      const consumedQty = consumptions
        .filter(c => c.status === 'posted' && c.godown_id === m.to_godown_id)
        .filter(c => {
          const ct = new Date(c.consumption_date).getTime();
          return ct >= issueT && ct <= issueT + 30 * DAY_MS;
        })
        .reduce((s, c) => s + c.lines
          .filter(cl => cl.item_id === ln.item_id)
          .reduce((s2, cl) => dAdd(s2, cl.actual_qty), 0), 0);
      consumedTotal = dAdd(consumedTotal, consumedQty);
      if (consumedQty < ln.qty) {
        leakValue = dAdd(leakValue, dMul(dSub(ln.qty, consumedQty), ln.rate));
      }
    }
    if (consumedTotal >= issuedTotal) continue;
    const pctAccounted = issuedTotal > 0 ? (consumedTotal / issuedTotal) * 100 : 0;
    alerts.push(newAlert(
      'unaccounted_consumption',
      pctAccounted < 25 ? 'critical' : 'warn',
      `Unaccounted · ${m.min_no}`,
      `${m.to_godown_name} received ${round2(issuedTotal)} units but only ${round2(consumedTotal)} ` +
      `posted as Consumption (${round2(pctAccounted)}% accounted). ` +
      `₹${round2(leakValue).toLocaleString('en-IN')} of material untraced.`,
      round2(leakValue),
      { ref_min_id: m.id, ref_godown_id: m.to_godown_id, ref_department_code: m.to_department_code },
    ));
  }
  return alerts;
}

/**
 * One-shot orchestration — returns all alerts sorted by severity desc + magnitude desc.
 * Pure: caller may cache the result; we never write.
 */
export function runConsumptionIntelligence(
  data: {
    balances: readonly StockBalanceEntry[];
    mins: readonly MaterialIssueNote[];
    consumptions: readonly ConsumptionEntry[];
  },
): ConsumptionAlert[] {
  const all = [
    ...detectRateAnomalies(data.consumptions),
    ...detectMaterialAgeing(data.balances, data.mins, data.consumptions),
    ...detectUnaccountedConsumption(data.mins, data.consumptions),
  ];
  const order = { critical: 0, warn: 1, info: 2 };
  return all.sort(
    (a, b) => order[a.severity] - order[b.severity] || b.magnitude - a.magnitude);
}
