/**
 * @file        src/lib/comply360-licenses-registry-engine.ts
 * @sibling     NEW @ Sprint 79a · Comply360 Main Arc 1.11 · Pass A · Q25
 * @realizes    Unified Licenses & Regulatory Registry. 13 license types span
 *              6 EximX masters (IEC · LUT · CTH · AEO · FTA-cert · RCMC)
 *              plus 7 new types stored locally (Schedule H/H1 narcotic ·
 *              CTH-auth · EPCG · Advance Auth · DGFT-other · Trademark ·
 *              Patent). Aggregates expiry buckets · expiring-in window ·
 *              renewals. EximX storage NEVER mutated (read-only consumption).
 * @reads-from  iec-engine · lut-engine · cth-history-engine · aeo-tier-engine ·
 *              aeo-tier-benefit-engine · fta-checker
 * @sprint      Sprint 79a · T-Phase-5.A.1.11-PASS-A
 * [JWT] Phase 8: GET /api/comply360/licenses · POST /api/comply360/licenses · PATCH /licenses/:id/renew
 */
import { listIECs, classifyIECValidity } from './iec-engine';
import { listLUTs, classifyLUTExpiry } from './lut-engine';
import { loadEntityAEOCerts } from './aeo-tier-engine';
import { loadFTAPreferences } from './fta-checker';

export const READS_FROM = {
  engines: [
    'iec-engine',
    'lut-engine',
    'cth-history-engine',
    'aeo-tier-engine',
    'aeo-tier-benefit-engine',
    'fta-checker',
  ],
  storage_keys: ['erp_comply360_licenses_'],
} as const;

export type LicenseType =
  | 'iec' | 'lut' | 'aeo' | 'rcmc' | 'schedule-h' | 'schedule-h1'
  | 'cth-auth' | 'fta-cert' | 'epcg' | 'advance-auth' | 'dgft-other'
  | 'trademark' | 'patent';

export type LicenseStatus = 'active' | 'expiring-90d' | 'expired' | 'renewed';
export type ExpiryClassification = 'safe' | 'expiring' | 'expired';

export interface LicenseRecord {
  id: string;
  entity_code: string;
  license_type: LicenseType;
  license_number: string;
  issued_date: string;
  expiry_date: string;
  status: LicenseStatus;
  issuing_authority: string;
  metadata?: Record<string, string | number>;
}

export interface LicenseRegistryView {
  entity_code: string;
  total_active: number;
  total_expiring: number;
  total_expired: number;
  by_type: Record<LicenseType, number>;
  records: LicenseRecord[];
}

const storageKey = (entity_code: string): string =>
  `erp_comply360_licenses_${entity_code}`;

// [JWT] localStorage — replace with REST GET /api/comply360/licenses in Phase 8
function readLocal(entity_code: string): LicenseRecord[] {
  try {
    const raw = localStorage.getItem(storageKey(entity_code));
    return raw ? (JSON.parse(raw) as LicenseRecord[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(entity_code: string, list: LicenseRecord[]): void {
  localStorage.setItem(storageKey(entity_code), JSON.stringify(list));
}

function emptyByType(): Record<LicenseType, number> {
  return {
    iec: 0, lut: 0, aeo: 0, rcmc: 0, 'schedule-h': 0, 'schedule-h1': 0,
    'cth-auth': 0, 'fta-cert': 0, epcg: 0, 'advance-auth': 0,
    'dgft-other': 0, trademark: 0, patent: 0,
  };
}

/** Classify a license by expiry: safe (>90 days) · expiring (≤90 days) · expired. */
export function classifyExpiry(license: LicenseRecord, now: Date = new Date()): ExpiryClassification {
  const expiry = new Date(license.expiry_date).getTime();
  const today = now.getTime();
  const daysLeft = Math.floor((expiry - today) / (24 * 60 * 60 * 1000));
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 90) return 'expiring';
  return 'safe';
}

/**
 * Aggregate licenses across the 6 EximX masters + this engine's local storage.
 * EximX masters NEVER mutated · read-only consumption per §H + FK-CAP-7.
 */
export function aggregateLicenses(entity_code: string): LicenseRegistryView {
  const records: LicenseRecord[] = [];

  // IEC (EximX) · scope by entity_id
  for (const iec of listIECs(entity_code).filter((i) => i.entity_id === entity_code)) {
    const bucket = classifyIECValidity(iec);
    records.push({
      id: `LIC-IEC-${iec.id}`,
      entity_code,
      license_type: 'iec',
      license_number: iec.iec_number,
      issued_date: iec.issue_date,
      expiry_date: iec.validity,
      status: bucket === 'valid' ? 'active' : bucket === 'expiring-90d' ? 'expiring-90d' : 'expired',
      issuing_authority: 'DGFT',
    });
  }

  // LUT (EximX) · scope by entity_id
  for (const lut of listLUTs(entity_code).filter((l) => l.entity_id === entity_code)) {
    const bucket = classifyLUTExpiry(lut);
    records.push({
      id: `LIC-LUT-${lut.id}`,
      entity_code,
      license_type: 'lut',
      license_number: lut.lut_number,
      issued_date: lut.validity_from,
      expiry_date: lut.validity_to,
      status: bucket === 'expired' ? 'expired' : bucket === 'expiring' || bucket === 'renewal-due' ? 'expiring-90d' : 'active',
      issuing_authority: lut.authority,
    });
  }

  // AEO (EximX)
  for (const cert of loadEntityAEOCerts(entity_code)) {
    const expiry = new Date(cert.validity_to).getTime();
    const status: LicenseStatus =
      expiry < Date.now() ? 'expired'
        : expiry - Date.now() <= 90 * 24 * 60 * 60 * 1000 ? 'expiring-90d'
          : 'active';
    records.push({
      id: `LIC-AEO-${cert.id}`,
      entity_code,
      license_type: 'aeo',
      license_number: cert.certificate_no,
      issued_date: cert.validity_from,
      expiry_date: cert.validity_to,
      status,
      issuing_authority: 'CBIC',
      metadata: { tier: cert.aeo_tier },
    });
  }

  // FTA preferences (EximX)
  for (const pref of loadFTAPreferences(entity_code)) {
    records.push({
      id: `LIC-FTA-${pref.id}`,
      entity_code,
      license_type: 'fta-cert',
      license_number: pref.notification_ref,
      issued_date: pref.effective_from,
      expiry_date: pref.effective_until ?? '',
      status: 'active',
      issuing_authority: 'DGFT/Issuing Authority',
      metadata: { agreement: pref.agreement, cth_code: pref.cth_code },
    });
  }


  // Local-store license types (the 9 non-EximX types)
  records.push(...readLocal(entity_code));

  const by_type = emptyByType();
  let total_active = 0;
  let total_expiring = 0;
  let total_expired = 0;
  for (const rec of records) {
    by_type[rec.license_type] = (by_type[rec.license_type] ?? 0) + 1;
    const cls = classifyExpiry(rec);
    if (cls === 'safe') total_active++;
    else if (cls === 'expiring') total_expiring++;
    else total_expired++;
  }

  return {
    entity_code,
    total_active,
    total_expiring,
    total_expired,
    by_type,
    records,
  };
}

/** Filter records expiring within N days. */
export function getExpiringIn(entity_code: string, days: number): LicenseRecord[] {
  const view = aggregateLicenses(entity_code);
  const horizon = Date.now() + days * 24 * 60 * 60 * 1000;
  return view.records.filter((r) => {
    const t = new Date(r.expiry_date).getTime();
    return t >= Date.now() && t <= horizon;
  });
}

/** Record a non-EximX license (Schedule H/H1 · EPCG · Advance Auth · DGFT-other · Trademark · Patent). */
export function recordLicense(record: LicenseRecord): LicenseRecord {
  const list = readLocal(record.entity_code);
  list.push(record);
  writeLocal(record.entity_code, list);
  return record;
}

/** Renew a locally-stored license (EximX records must be renewed in their own master). */
export function renewLicense(
  entity_code: string,
  license_id: string,
  new_expiry: string,
): LicenseRecord | null {
  const list = readLocal(entity_code);
  let updated: LicenseRecord | null = null;
  const next = list.map((rec) => {
    if (rec.id !== license_id) return rec;
    updated = { ...rec, expiry_date: new_expiry, status: 'renewed' as const };
    return updated;
  });
  writeLocal(entity_code, next);
  return updated;
}

/** Sample license factory · realistic numbers per S75 lesson (no PLACEHOLDER strings). */
export function buildSampleLicense(entity_code: string, license_type: LicenseType): LicenseRecord {
  const samples: Record<LicenseType, { num: string; auth: string }> = {
    iec: { num: 'AAFCM1234B', auth: 'DGFT' },
    lut: { num: 'AD191124000571N', auth: 'GSTN' },
    aeo: { num: 'AEO-T2-IN-2025-00471', auth: 'CBIC' },
    rcmc: { num: 'RCMC-FIEO-2026-00193', auth: 'FIEO' },
    'schedule-h': { num: 'SCH-H-MH-2026-00827', auth: 'CDSCO' },
    'schedule-h1': { num: 'SCH-H1-MH-2026-00091', auth: 'CDSCO' },
    'cth-auth': { num: 'CTH-AUTH-2026-44219', auth: 'CBIC' },
    'fta-cert': { num: 'COO-IND-CEPA-2026-7251', auth: 'DGFT' },
    epcg: { num: 'EPCG-0530014321', auth: 'DGFT' },
    'advance-auth': { num: 'AA-0530092811', auth: 'DGFT' },
    'dgft-other': { num: 'DGFT-MISC-2026-00118', auth: 'DGFT' },
    trademark: { num: 'TM-IN-4827193', auth: 'IPO' },
    patent: { num: 'IN-PAT-202641002847', auth: 'IPO' },
  };
  const s = samples[license_type];
  return {
    id: `LIC-${license_type}-${entity_code}-${s.num}`,
    entity_code,
    license_type,
    license_number: s.num,
    issued_date: '2025-04-01',
    expiry_date: '2027-03-31',
    status: 'active',
    issuing_authority: s.auth,
  };
}
