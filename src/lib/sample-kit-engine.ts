/**
 * sample-kit-engine.ts — Pure sample kit flow
 * No React, no localStorage. Callers persist results.
 */

import type {
  SampleKitTemplate, SampleKitRequest, SampleKitStatus,
} from '@/types/sample-kit';
import { CONVERSION_WINDOW_DAYS } from '@/types/sample-kit';

const MS_PER_DAY = 86_400_000;

export interface EligibilityResult {
  ok: boolean;
  reason?: string;
}

export function checkEligibility(
  templateId: string, customerId: string,
  templates: SampleKitTemplate[], requests: SampleKitRequest[],
  customerClvTier: 'vip' | 'growth' | 'standard' | 'at_risk' | 'churned',
): EligibilityResult {
  const template = templates.find(t => t.id === templateId);
  if (!template) return { ok: false, reason: 'Kit not found' };
  if (!template.active) return { ok: false, reason: 'Kit is not active' };

  if (template.min_clv_tier) {
    const RANK = { standard: 1, growth: 2, vip: 3 } as const;
    const minRank = RANK[template.min_clv_tier];
    const mine =
      customerClvTier === 'vip'      ? 3 :
      customerClvTier === 'growth'   ? 2 :
      customerClvTier === 'standard' ? 1 : 0;
    if (mine < minRank) {
      return { ok: false, reason: `Requires ${template.min_clv_tier.toUpperCase()} CLV tier` };
    }
  }

  const myCount = requests.filter(r =>
    r.template_id === templateId && r.customer_id === customerId &&
    r.status !== 'cancelled').length;
  if (myCount >= template.max_kits_per_customer) {
    return { ok: false, reason: `Max ${template.max_kits_per_customer} requests reached` };
  }

  return { ok: true };
}

export function createRequest(
  template: SampleKitTemplate, customerId: string, customerName: string,
  entityCode: string,
): SampleKitRequest {
  const now = new Date().toISOString();
  return {
    id: `skr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    entity_id: entityCode,
    customer_id: customerId, customer_name: customerName,
    template_id: template.id, template_name: template.name,
    status: 'requested',
    requested_at: now,
    shipped_at: null, delivered_at: null,
    return_deadline: null, closed_at: null,
    invoice_id: null, converted_value_paise: 0, notes: '',
  };
}

/** Compute days remaining in return window. Negative = overdue. */
export function daysRemainingInWindow(
  request: SampleKitRequest, now: Date = new Date(),
): number | null {
  if (!request.return_deadline) return null;
  const ms = new Date(request.return_deadline).getTime() - now.getTime();
  return Math.ceil(ms / MS_PER_DAY);
}

/** Check requests that should auto-convert (past deadline, status=delivered). */
export function findExpiredRequests(
  requests: SampleKitRequest[], now: Date = new Date(),
): SampleKitRequest[] {
  return requests.filter(r =>
    r.status === 'delivered' &&
    r.return_deadline !== null &&
    new Date(r.return_deadline).getTime() < now.getTime(),
  );
}

/** Transition — update status + dates appropriately. */
export function transitionStatus(
  request: SampleKitRequest, newStatus: SampleKitStatus, template: SampleKitTemplate,
  now: Date = new Date(),
): SampleKitRequest {
  const nowIso = now.toISOString();
  const updated: SampleKitRequest = { ...request, status: newStatus };

  if (newStatus === 'shipped' && !updated.shipped_at) {
    updated.shipped_at = nowIso;
  }
  if (newStatus === 'delivered' && !updated.delivered_at) {
    updated.delivered_at = nowIso;
    updated.return_deadline = new Date(now.getTime() + CONVERSION_WINDOW_DAYS * MS_PER_DAY).toISOString();
  }
  if (newStatus === 'returned' || newStatus === 'cancelled') {
    updated.closed_at = nowIso;
  }
  if (newStatus === 'converted') {
    updated.closed_at = nowIso;
    updated.invoice_id = `INV-${Date.now()}`;
    updated.converted_value_paise = template.total_value_paise;
  }

  return updated;
}

/** Conversion rate across all closed requests. */
export function conversionRate(requests: SampleKitRequest[]): number {
  const closed = requests.filter(r => r.status === 'returned' || r.status === 'converted');
  if (closed.length === 0) return 0;
  const converted = closed.filter(r => r.status === 'converted').length;
  return Math.round((converted / closed.length) * 100);
}
