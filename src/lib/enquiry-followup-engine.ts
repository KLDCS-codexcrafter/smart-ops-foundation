/**
 * @file        src/lib/enquiry-followup-engine.ts
 * @purpose     D-NEW-GA · Post-Enquiry Vendor Quotation Follow-Up engine · 18th SIBLING application
 * @sprint      T-Phase-2.B-Procure360-Phase2-Polish-Part-B · Block F · founder Q3 May 22 vision
 * @decisions   Q-LOCK-8(a) · 3-5-7 day TallyWARM cascade · FR-19 SIBLING above procurement-enquiry + procure-followup
 * @disciplines FR-19 · FR-22 · FR-26 entity-scoped persistence · FR-54 CC SSOT preserved
 * @reuses      procurement-enquiry-engine (0-DIFF) · procure-followup-engine (0-DIFF)
 * @[JWT]       GET/POST /api/procure360/enquiry-followup-cascades
 */
import type {
  EnquiryFollowupCascade,
  EnquiryFollowupStage,
} from '@/types/enquiry-followup';
import { enquiryFollowupCascadesKey } from '@/types/enquiry-followup';

function newId(): string {
  return `efc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function addDays(d: Date, days: number): string {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r.toISOString();
}

export function loadCascades(entityCode: string): EnquiryFollowupCascade[] {
  try {
    const raw = localStorage.getItem(enquiryFollowupCascadesKey(entityCode));
    return raw ? (JSON.parse(raw) as EnquiryFollowupCascade[]) : [];
  } catch {
    return [];
  }
}

export function saveCascades(entityCode: string, list: EnquiryFollowupCascade[]): void {
  localStorage.setItem(enquiryFollowupCascadesKey(entityCode), JSON.stringify(list));
}

/**
 * Initiate a cascade when an enquiry is sent to a vendor.
 */
export function initiateCascade(
  entityCode: string,
  enquiryId: string,
  vendorId: string,
  vendorName: string,
  sentAt: Date = new Date(),
): EnquiryFollowupCascade {
  const cascade: EnquiryFollowupCascade = {
    id: newId(),
    enquiry_id: enquiryId,
    vendor_id: vendorId,
    vendor_name: vendorName,
    entity_id: entityCode,
    enquiry_sent_at: sentAt.toISOString(),
    day_3_reminder_due: addDays(sentAt, 3),
    day_5_reminder_due: addDays(sentAt, 5),
    day_7_escalation_due: addDays(sentAt, 7),
    current_stage: 'initial',
    stage_history: [{ stage: 'initial', at: sentAt.toISOString() }],
    result: 'pending',
    created_at: sentAt.toISOString(),
    updated_at: sentAt.toISOString(),
  };

  const all = loadCascades(entityCode);
  saveCascades(entityCode, [...all, cascade]);
  return cascade;
}

/**
 * Scan all active cascades · advance stage if due date passed and no vendor response.
 */
export function scanAndAdvanceCascades(
  entityCode: string,
  now: Date = new Date(),
): { advanced: EnquiryFollowupCascade[]; escalated: EnquiryFollowupCascade[] } {
  const all = loadCascades(entityCode);
  const advanced: EnquiryFollowupCascade[] = [];
  const escalated: EnquiryFollowupCascade[] = [];

  const updatedList = all.map<EnquiryFollowupCascade>((cascade) => {
    if (cascade.result !== 'pending') return cascade;

    const updated: EnquiryFollowupCascade = {
      ...cascade,
      stage_history: [...cascade.stage_history],
    };
    let changed = false;

    if (updated.current_stage === 'initial' && now >= new Date(cascade.day_3_reminder_due)) {
      updated.current_stage = 'reminder_1';
      updated.stage_history.push({
        stage: 'reminder_1',
        at: now.toISOString(),
        note: 'Day 3 first reminder',
      });
      changed = true;
    }

    if (updated.current_stage === 'reminder_1' && now >= new Date(cascade.day_5_reminder_due)) {
      updated.current_stage = 'reminder_2';
      updated.stage_history.push({
        stage: 'reminder_2',
        at: now.toISOString(),
        note: 'Day 5 second reminder + buyer alert',
      });
      changed = true;
    }

    if (updated.current_stage === 'reminder_2' && now >= new Date(cascade.day_7_escalation_due)) {
      updated.current_stage = 'escalation';
      updated.result = 'vendor_unresponsive';
      updated.stage_history.push({
        stage: 'escalation',
        at: now.toISOString(),
        note: 'Day 7 escalation · vendor flagged unresponsive · alternate vendor trigger',
      });
      changed = true;
      escalated.push(updated);
    } else if (changed) {
      advanced.push(updated);
    }

    if (changed) {
      updated.updated_at = now.toISOString();
    }
    return updated;
  });

  saveCascades(entityCode, updatedList);
  return { advanced, escalated };
}

/**
 * Mark cascade resolved when vendor responds with quotation.
 */
export function markVendorResponded(
  entityCode: string,
  cascadeId: string,
  respondedAt: Date = new Date(),
): EnquiryFollowupCascade | null {
  const all = loadCascades(entityCode);
  const cascade = all.find((c) => c.id === cascadeId);
  if (!cascade) return null;

  const updated: EnquiryFollowupCascade = {
    ...cascade,
    current_stage: 'closed',
    result: 'vendor_responded',
    vendor_responded_at: respondedAt.toISOString(),
    stage_history: [
      ...cascade.stage_history,
      { stage: 'closed', at: respondedAt.toISOString(), note: 'Vendor responded with quotation' },
    ],
    updated_at: respondedAt.toISOString(),
  };

  saveCascades(entityCode, all.map((c) => (c.id === cascadeId ? updated : c)));
  return updated;
}

/**
 * Manually trigger alternate vendor sourcing on a cascade (Day 7+ buyer action).
 */
export function triggerAlternate(
  entityCode: string,
  cascadeId: string,
  alternateVendorId: string,
  at: Date = new Date(),
): EnquiryFollowupCascade | null {
  const all = loadCascades(entityCode);
  const cascade = all.find((c) => c.id === cascadeId);
  if (!cascade) return null;

  const updated: EnquiryFollowupCascade = {
    ...cascade,
    result: 'alternate_triggered',
    alternate_vendor_triggered_at: at.toISOString(),
    alternate_vendor_id: alternateVendorId,
    stage_history: [
      ...cascade.stage_history,
      {
        stage: cascade.current_stage,
        at: at.toISOString(),
        note: `Alternate vendor ${alternateVendorId} triggered`,
      },
    ],
    updated_at: at.toISOString(),
  };

  saveCascades(entityCode, all.map((c) => (c.id === cascadeId ? updated : c)));
  return updated;
}

export function listActiveCascades(entityCode: string): EnquiryFollowupCascade[] {
  return loadCascades(entityCode).filter((c) => c.result === 'pending');
}

export function listCascadesByStage(
  entityCode: string,
  stage: EnquiryFollowupStage,
): EnquiryFollowupCascade[] {
  return loadCascades(entityCode).filter((c) => c.current_stage === stage);
}

export function listCascadesForEnquiry(
  entityCode: string,
  enquiryId: string,
): EnquiryFollowupCascade[] {
  return loadCascades(entityCode).filter((c) => c.enquiry_id === enquiryId);
}

export interface EnquiryFollowupSummary {
  total: number;
  pending: number;
  in_reminder_1: number;
  in_reminder_2: number;
  escalated: number;
  responded: number;
  alternate_triggered: number;
}

export function summarizeCascades(entityCode: string): EnquiryFollowupSummary {
  const all = loadCascades(entityCode);
  return {
    total: all.length,
    pending: all.filter((c) => c.result === 'pending').length,
    in_reminder_1: all.filter((c) => c.current_stage === 'reminder_1').length,
    in_reminder_2: all.filter((c) => c.current_stage === 'reminder_2').length,
    escalated: all.filter((c) => c.current_stage === 'escalation').length,
    responded: all.filter((c) => c.result === 'vendor_responded').length,
    alternate_triggered: all.filter((c) => c.alternate_vendor_id != null).length,
  };
}
