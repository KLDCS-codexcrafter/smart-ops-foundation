/**
 * @file        src/lib/contract-expiry-alert-engine.ts
 * @purpose     OOB-54 · Contract Expiry Alerts · 17th SIBLING application
 * @sprint      T-Phase-2.A-Procure360-Phase2-Polish-Part-A · Block E · D-NEW-FX
 * @decisions   Q-LOCK-7(a) · NO new voucher · deep-links to existing Enquiry · D-127/128a 139 invariant preserved
 * @disciplines FR-19 SIBLING · FR-22 · FR-26 persistence · procure360-vendor-agreements-engine 0-DIFF
 * @[JWT]       GET /api/procure360/contract-expiry-alerts
 */
import type {
  ContractExpiryAlert,
  ContractExpiryAction,
  ExpiryTier,
} from '@/types/contract-expiry-alert';
import { contractExpiryAcknowledgmentsKey } from '@/types/contract-expiry-alert';

export interface VendorAgreementInput {
  id: string;
  agreement_number?: string;
  vendor_id?: string;
  vendor_name?: string;
  agreement_end_date?: string | null;
}

export function classifyTier(daysToExpiry: number): ExpiryTier {
  if (daysToExpiry <= 30) return 'urgent';
  if (daysToExpiry <= 60) return 'reminder';
  return 'informational';
}

function newId(): string {
  return `cea-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Scan supplied agreements · return alerts for those expiring within `withinDays` (default 90).
 * Callers pass agreements (read via vendor-agreements engine · which stays 0-DIFF).
 */
export function scanAgreements(
  agreements: VendorAgreementInput[],
  withinDays: number = 90,
  now: Date = new Date(),
): ContractExpiryAlert[] {
  const alerts: ContractExpiryAlert[] = [];
  for (const a of agreements) {
    if (!a.agreement_end_date) continue;
    const endDate = new Date(a.agreement_end_date);
    if (Number.isNaN(endDate.getTime())) continue;
    const daysToExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysToExpiry <= 0 || daysToExpiry > withinDays) continue;

    alerts.push({
      id: newId(),
      agreement_id: a.id,
      agreement_number: a.agreement_number ?? '',
      vendor_id: a.vendor_id ?? '',
      vendor_name: a.vendor_name ?? '',
      agreement_end_date: a.agreement_end_date,
      days_to_expiry: daysToExpiry,
      tier: classifyTier(daysToExpiry),
      computed_at: now.toISOString(),
      acknowledged: false,
    });
  }
  return alerts.sort((a, b) => a.days_to_expiry - b.days_to_expiry);
}

export function loadAcknowledgments(entityCode: string): ContractExpiryAlert[] {
  try {
    const raw = localStorage.getItem(contractExpiryAcknowledgmentsKey(entityCode));
    return raw ? (JSON.parse(raw) as ContractExpiryAlert[]) : [];
  } catch {
    return [];
  }
}

export function saveAcknowledgments(entityCode: string, list: ContractExpiryAlert[]): void {
  localStorage.setItem(contractExpiryAcknowledgmentsKey(entityCode), JSON.stringify(list));
}

export function persistAlert(entityCode: string, alert: ContractExpiryAlert): void {
  const all = loadAcknowledgments(entityCode);
  if (all.some((a) => a.id === alert.id)) return;
  saveAcknowledgments(entityCode, [...all, alert]);
}

export function acknowledgeAlert(
  entityCode: string,
  alertId: string,
  acknowledgedBy: string,
  note: string,
  actionTaken: ContractExpiryAction,
): ContractExpiryAlert {
  const all = loadAcknowledgments(entityCode);
  const existing = all.find((a) => a.id === alertId);
  if (!existing) throw new Error(`Alert ${alertId} not found`);
  const updated: ContractExpiryAlert = {
    ...existing,
    acknowledged: true,
    acknowledged_by: acknowledgedBy,
    acknowledged_at: new Date().toISOString(),
    acknowledgment_note: note,
    action_taken: actionTaken,
  };
  saveAcknowledgments(entityCode, all.map((a) => (a.id === alertId ? updated : a)));
  return updated;
}

/**
 * Generate renewal Enquiry seed-data · deep-links to EXISTING Enquiry voucher type.
 * No new voucher type created (D-127/128a 139 invariant · Q-LOCK-7a).
 */
export function generateRenewalEnquiry(
  entityCode: string,
  alertId: string,
  acknowledgedBy: string,
): { renewal_enquiry_template_data: Record<string, unknown>; alert: ContractExpiryAlert } {
  const all = loadAcknowledgments(entityCode);
  const alert = all.find((a) => a.id === alertId);
  if (!alert) throw new Error(`Alert ${alertId} not found`);
  const updated = acknowledgeAlert(
    entityCode,
    alertId,
    acknowledgedBy,
    'Renewal enquiry generated',
    'renewal_enquiry_generated',
  );
  return {
    renewal_enquiry_template_data: {
      enquiry_subject: `Renewal · ${alert.agreement_number}`,
      vendor_id: alert.vendor_id,
      vendor_name: alert.vendor_name,
      reference_agreement_id: alert.agreement_id,
      enquiry_type: 'renewal',
    },
    alert: updated,
  };
}

export interface AlertSummary {
  total: number;
  urgent: number;
  reminder: number;
  informational: number;
  acknowledged: number;
  pending: number;
}

export function summarizeAlerts(alerts: ContractExpiryAlert[]): AlertSummary {
  let urgent = 0,
    reminder = 0,
    informational = 0,
    acknowledged = 0,
    pending = 0;
  for (const a of alerts) {
    if (a.tier === 'urgent') urgent++;
    else if (a.tier === 'reminder') reminder++;
    else if (a.tier === 'informational') informational++;
    if (a.acknowledged) acknowledged++;
    else pending++;
  }
  return { total: alerts.length, urgent, reminder, informational, acknowledged, pending };
}
