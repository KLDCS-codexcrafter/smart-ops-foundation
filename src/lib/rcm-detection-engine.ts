/**
 * rcm-detection-engine.ts — 3-fold RCM signal detection
 * Sprint T-Phase-2.7-a · Q3-d · Q5-b · Q8-c
 *
 * Three signals (any one triggers detection):
 *   1) Vendor URP / unregistered (Section 9(4))
 *   2) Vendor on composition scheme (Section 9(4))
 *   3) HSN/SAC on Section 9(3) RCM notification list (Section 9(3))
 *
 * Severity tiers:
 *   HIGH = URP OR composition (clear 9(4) breach risk)
 *   MED  = HSN-notified but vendor registered (9(3) standard)
 *   LOW  = HSN baseline match w/ ambiguous vendor data
 *   INFO = no signals (clean line · still logged for completeness)
 *
 * [JWT] Pure engine · no I/O.
 */

import type { RCMSeverity, RCMSignalBreakdown } from '@/types/rcm-compliance-log';
import { isUnregisteredParty } from '@/lib/gstin-validator';
import { lookupHSN } from '@/lib/hsn-resolver';

/**
 * Hard-coded ~30 HSN/SAC codes notified under Section 9(3) RCM
 * (CBIC Notification 4/2017-CT and amendments · indicative baseline).
 * Q8-c: entity-level extensions extend this via HSN master is_rcm_notified Switch.
 */
export const RCM_HSN_NOTIFICATION_LIST: readonly string[] = [
  // Section 9(3) goods
  '0801', // Cashew nuts not shelled (registered → unregistered)
  '0802', // Bidi wrapper leaves
  '1404', // Tobacco leaves
  '5004', // Silk yarn
  '5101', // Raw wool
  '5201', // Raw cotton
  '7102', // Diamonds, raw
  '8807', // Used vehicles (specified)
  // Section 9(3) services (SAC)
  '9954', // Construction services (sub-set RCM via promoter)
  '9961', // Goods Transport Agency
  '9962', // Legal services from advocates
  '9963', // Sponsorship services
  '9964', // Services of director to body corporate
  '9965', // Services by an arbitral tribunal
  '9966', // Services by individual DSA to bank/NBFC
  '9967', // Services by recovery agent to bank/NBFC
  '9968', // Services of insurance agent to insurance company
  '9971', // Banking services (sub-set RCM)
  '9972', // Renting of motor vehicle
  '9973', // Lending of securities
  '9982', // Services of business facilitator to banking company
  '9983', // Services from author/composer to publisher
  '9984', // Import of services (Section 5(3) IGST · proxy)
  '9985', // Services from agriculturist (limited)
  '9986', // Renting of immovable property to registered person
  '9987', // Services by way of transfer of development rights
  '9988', // Services by Central/State Govt (excl exempt)
  '9991', // Public administration to business entity
  '9992', // Services by Reserve Bank
  '9994', // Services by way of supply of online information (cross-border)
  '9997', // Other services (specified RCM)
];

export interface VendorMasterSnapshot {
  id: string | null;
  name: string | null;
  gstin: string | null;
  /** Optional · may not exist on current vendor master · null fallback. */
  is_composition?: boolean | null;
  /** Optional · 'regular' | 'composition' | 'urp' | 'sez' etc. · null fallback. */
  party_registration_type?: string | null;
  state_code?: string | null;
}

export interface DetectionLine {
  id: string;
  hsn_sac_code: string | null;
  taxable_amount_paise: number;
  is_rcm?: boolean;
  rcm_section?: string | null;
}

export interface RCMDetectionResult {
  detected: boolean;
  severity: RCMSeverity;
  signals: RCMSignalBreakdown;
  /** Affected line ids (any line that matched a signal). */
  affected_line_ids: string[];
  /** Aggregate taxable amount across affected lines. */
  taxable_amount_paise: number;
  /** Human-readable explanation for compliance log note field. */
  reason: string;
}

/** True if a single HSN code is on the Section 9(3) notification list. */
export function isHSNNotified(
  code: string | null | undefined,
  entityCode?: string,
): boolean {
  const c = (code ?? '').trim();
  if (!c) return false;
  if (RCM_HSN_NOTIFICATION_LIST.includes(c)) return true;
  // Extension layer: HSN master Switch flips reverseCharge for entity.
  const rec = lookupHSN(c, entityCode);
  return rec?.reverseCharge === true;
}

/**
 * Detect RCM applicability on a voucher (purchase / expense / JV-as-purchase).
 * Returns highest-severity signal across all lines.
 */
export function detectRCMForVoucher(
  vendor: VendorMasterSnapshot | null | undefined,
  lines: DetectionLine[],
  entityCode?: string,
): RCMDetectionResult {
  const signals: RCMSignalBreakdown = {
    signal_urp: false,
    signal_composition: false,
    signal_hsn_notified: false,
    recommended_section: null,
  };

  // Vendor-level signals
  if (vendor) {
    if (isUnregisteredParty(vendor.gstin)) {
      signals.signal_urp = true;
    }
    const regType = (vendor.party_registration_type ?? '').toLowerCase();
    if (vendor.is_composition === true || regType === 'composition') {
      signals.signal_composition = true;
    }
    if (regType === 'urp' || regType === 'unregistered') {
      signals.signal_urp = true;
    }
  } else {
    // No vendor record · treat as URP (graceful degradation)
    signals.signal_urp = true;
  }

  // Line-level HSN signals
  const affected: string[] = [];
  let totalPaise = 0;
  let anyHSNNotified = false;
  for (const ln of lines) {
    const hsnHit = isHSNNotified(ln.hsn_sac_code, entityCode);
    if (hsnHit) {
      anyHSNNotified = true;
      affected.push(ln.id);
      totalPaise += ln.taxable_amount_paise || 0;
    } else if (signals.signal_urp || signals.signal_composition) {
      // Vendor signal applies to all lines
      affected.push(ln.id);
      totalPaise += ln.taxable_amount_paise || 0;
    }
  }
  signals.signal_hsn_notified = anyHSNNotified;

  // Section recommendation
  if (signals.signal_hsn_notified) {
    signals.recommended_section = '9(3)';
  } else if (signals.signal_urp || signals.signal_composition) {
    signals.recommended_section = '9(4)';
  }

  // Severity calc
  let severity: RCMSeverity = 'INFO';
  const detected =
    signals.signal_urp || signals.signal_composition || signals.signal_hsn_notified;
  if (signals.signal_urp || signals.signal_composition) {
    severity = 'HIGH';
  } else if (signals.signal_hsn_notified) {
    severity = 'MED';
  } else if (detected) {
    severity = 'LOW';
  }

  // Reason text
  const reasons: string[] = [];
  if (signals.signal_urp) reasons.push('Vendor unregistered (Section 9(4))');
  if (signals.signal_composition) reasons.push('Vendor on composition (Section 9(4))');
  if (signals.signal_hsn_notified) reasons.push('HSN/SAC on Section 9(3) list');
  const reason = reasons.length ? reasons.join(' · ') : 'No RCM signals detected';

  return {
    detected,
    severity,
    signals,
    affected_line_ids: detected ? affected : [],
    taxable_amount_paise: detected ? totalPaise : 0,
    reason,
  };
}
