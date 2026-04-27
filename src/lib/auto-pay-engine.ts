/**
 * @file     auto-pay-engine.ts
 * @purpose  Auto-Pay Rules engine · 3 trigger types (recurring · threshold ·
 *           on_invoice_post) · evaluateRulesNow returns rules ready to fire ·
 *           operator manually clicks "Run Auto-Pay Now".
 * @who      Operix Engineering
 * @when     Apr-2026 · T-T8.7-SmartAP (Group B Sprint B.7)
 * @sprint   T-T8.7-SmartAP
 * @phase    Phase 1 · localStorage · MANUAL trigger only · NO cron.
 * @whom     SmartAPHub · AutoPayRulesEditor
 * @depends  payment-requisition (B.4 · payment_template FK · READ only · DO NOT MODIFY)
 *
 * Per Q-HH (a) sophisticated approval workflow / scheduler / notifications DEFERRED.
 *
 * [DEFERRED · Phase 2 backend] Actual cron/scheduler. Phase 1 ships rule definitions
 *   + manual "Run Auto-Pay Now" button. Phase 2 swap to backend cron with same
 *   engine API surface · UI unchanged.
 *   See: /Future_Task_Register_Support_BackOffice.md · Capability 7
 */

import type {
  AutoPayRule, AutoPayCandidate, AutoPayTriggerType, RecurringSchedule,
} from '@/types/smart-ap';
import { autoPayRulesKey } from '@/types/smart-ap';
import type { PaymentRequisition } from '@/types/payment-requisition';
import { paymentRequisitionsKey } from '@/types/payment-requisition';
import { getCurrentUser } from '@/lib/auth-helpers';

// ── Storage helpers ────────────────────────────────────────────────────

function readAll(entityCode: string): AutoPayRule[] {
  // [JWT] GET /api/smart-ap/auto-pay-rules?entity={entityCode}
  try {
    const raw = localStorage.getItem(autoPayRulesKey(entityCode));
    return raw ? (JSON.parse(raw) as AutoPayRule[]) : [];
  } catch { return []; }
}

function writeAll(entityCode: string, items: AutoPayRule[]): void {
  // [JWT] PUT /api/smart-ap/auto-pay-rules/bulk
  localStorage.setItem(autoPayRulesKey(entityCode), JSON.stringify(items));
}

function readReqs(entityCode: string): PaymentRequisition[] {
  // [JWT] GET /api/payment-requisitions?entity={entityCode} · READ only
  try {
    const raw = localStorage.getItem(paymentRequisitionsKey(entityCode));
    return raw ? (JSON.parse(raw) as PaymentRequisition[]) : [];
  } catch { return []; }
}

function nowIso(): string { return new Date().toISOString(); }
function newRuleId(): string {
  return `apr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Schedule math (next_run_at computation) ────────────────────────────

/** Compute next run timestamp from a recurring schedule · null if no schedule. */
export function computeNextRun(
  schedule: RecurringSchedule | undefined,
  fromDate: Date = new Date(),
): string | undefined {
  if (!schedule) return undefined;
  const now = new Date(fromDate);
  if (schedule.cadence === 'daily') {
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(9, 0, 0, 0);
    return next.toISOString();
  }
  if (schedule.cadence === 'weekly') {
    const dow = schedule.day_of_week ?? 1;
    const next = new Date(now);
    const delta = ((dow - now.getDay()) + 7) % 7 || 7;
    next.setDate(now.getDate() + delta);
    next.setHours(9, 0, 0, 0);
    return next.toISOString();
  }
  // monthly · default cadence
  const dom = Math.min(28, Math.max(1, schedule.day_of_month ?? 1));
  const next = new Date(now.getFullYear(), now.getMonth(), dom, 9, 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setMonth(next.getMonth() + 1);
  }
  return next.toISOString();
}

// ── Public API ─────────────────────────────────────────────────────────

export interface CreateAutoPayRuleInput {
  entityCode: string;
  name: string;
  trigger_type: AutoPayTriggerType;
  enabled?: boolean;
  recurring_schedule?: RecurringSchedule;
  threshold_amount?: number;
  payment_template_id?: string;
  payment_template_label?: string;
  vendor_id?: string;
  vendor_name?: string;
}

/** Create a new Auto-Pay rule · validates trigger configuration. */
export function createRule(input: CreateAutoPayRuleInput): AutoPayRule {
  if (!input.name?.trim()) throw new Error('[auto-pay-engine] Rule name required');
  if (input.trigger_type === 'recurring' && !input.recurring_schedule) {
    throw new Error('[auto-pay-engine] recurring trigger requires recurring_schedule');
  }
  if (input.trigger_type === 'threshold'
      && (!input.threshold_amount || input.threshold_amount <= 0)) {
    throw new Error('[auto-pay-engine] threshold trigger requires threshold_amount > 0');
  }

  const u = getCurrentUser();
  const rule: AutoPayRule = {
    id: newRuleId(),
    entity_id: input.entityCode,
    name: input.name.trim(),
    enabled: input.enabled ?? true,
    trigger_type: input.trigger_type,
    recurring_schedule: input.recurring_schedule,
    threshold_amount: input.threshold_amount,
    payment_template_id: input.payment_template_id,
    payment_template_label: input.payment_template_label,
    vendor_id: input.vendor_id,
    vendor_name: input.vendor_name,
    next_run_at: computeNextRun(input.recurring_schedule),
    created_by: u.id,
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  const all = readAll(input.entityCode);
  all.push(rule);
  writeAll(input.entityCode, all);
  return rule;
}

export function listRules(entityCode: string): AutoPayRule[] {
  return readAll(entityCode);
}

export function getRule(entityCode: string, ruleId: string): AutoPayRule | null {
  return readAll(entityCode).find(r => r.id === ruleId) ?? null;
}

export function updateRule(
  entityCode: string,
  ruleId: string,
  patch: Partial<AutoPayRule>,
): AutoPayRule {
  const all = readAll(entityCode);
  const idx = all.findIndex(r => r.id === ruleId);
  if (idx === -1) throw new Error(`[auto-pay-engine] Rule ${ruleId} not found`);
  all[idx] = { ...all[idx], ...patch, id: ruleId, updated_at: nowIso() };
  if (patch.recurring_schedule) {
    all[idx].next_run_at = computeNextRun(patch.recurring_schedule);
  }
  writeAll(entityCode, all);
  return all[idx];
}

export function deleteRule(entityCode: string, ruleId: string): void {
  const all = readAll(entityCode).filter(r => r.id !== ruleId);
  writeAll(entityCode, all);
}

export function toggleRule(entityCode: string, ruleId: string, enabled: boolean): AutoPayRule {
  return updateRule(entityCode, ruleId, { enabled });
}

/** Phase 1 manual trigger: returns rules whose conditions are satisfied right now.
 *  Operator clicks "Run Auto-Pay Now" to actually execute · this engine never
 *  fires anything by itself (no cron · no setTimeout · DEFERRED Phase 2 cron). */
export function evaluateRulesNow(
  entityCode: string,
  asOf: Date = new Date(),
): AutoPayCandidate[] {
  const rules = readAll(entityCode).filter(r => r.enabled);
  const reqs = readReqs(entityCode);
  const candidates: AutoPayCandidate[] = [];
  const nowIsoStr = asOf.toISOString();

  for (const rule of rules) {
    if (rule.trigger_type === 'recurring') {
      if (rule.next_run_at && rule.next_run_at <= nowIsoStr) {
        candidates.push({
          rule,
          reason: `Recurring schedule due (next_run_at=${rule.next_run_at.slice(0, 16)})`,
        });
      }
    } else if (rule.trigger_type === 'threshold') {
      const thresh = rule.threshold_amount ?? 0;
      const matched = reqs.find(r =>
        r.status === 'approved'
        && r.amount <= thresh
        && (!rule.vendor_id || r.vendor_id === rule.vendor_id),
      );
      if (matched) {
        candidates.push({
          rule,
          reason: `Approved requisition ₹${matched.amount.toLocaleString('en-IN')} <= threshold ₹${thresh.toLocaleString('en-IN')}`,
          matched_requisition_id: matched.id,
        });
      }
    } else if (rule.trigger_type === 'on_invoice_post') {
      // Phase 1: detect any approved requisition created since last_executed_at.
      // Phase 2 backend will hook the actual invoice-post event.
      const since = rule.last_executed_at ?? rule.created_at;
      const matched = reqs.find(r =>
        r.status === 'approved'
        && r.created_at > since
        && (!rule.vendor_id || r.vendor_id === rule.vendor_id),
      );
      if (matched) {
        candidates.push({
          rule,
          reason: `New approved requisition since ${since.slice(0, 16)}`,
          matched_requisition_id: matched.id,
        });
      }
    }
  }
  return candidates;
}

/** Mark a rule as executed · advances next_run_at for recurring rules. */
export function markRuleExecuted(
  entityCode: string,
  ruleId: string,
  executedAt: Date = new Date(),
): AutoPayRule {
  const rule = getRule(entityCode, ruleId);
  if (!rule) throw new Error(`[auto-pay-engine] Rule ${ruleId} not found`);
  const next = rule.recurring_schedule
    ? computeNextRun(rule.recurring_schedule, executedAt)
    : undefined;
  return updateRule(entityCode, ruleId, {
    last_executed_at: executedAt.toISOString(),
    next_run_at: next,
  });
}
