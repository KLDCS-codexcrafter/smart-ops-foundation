/**
 * @file        src/lib/sitex-engine.ts
 * @purpose     SiteX canonical engine · Path B own entity · Site Master CRUD + 5-state machine + bridge event emission
 * @who         Site Manager · Site Engineer · System Operations
 * @when        2026-05-11
 * @sprint      T-Phase-1.A.14 SiteX Foundation · Block A.2 · NEW canonical
 * @iso         ISO 9001:2015 §8.1 · ISO 25010
 * @whom        Audit Owner
 * @decisions   D-NEW-CU POSSIBLE · D-NEW-CT 17th canonical · D-194 · FR-50 · FR-51
 * @disciplines FR-1 · FR-19 · FR-22 · FR-24 · FR-30 · FR-50 · FR-51 · FR-73.1 absolute
 * @reuses      SiteMaster + SiteStatus + SiteTransitionResult + SiteMobilizedEvent from @/types/sitex · emitSiteMobilized from ./sitex-bridges
 * @[JWT]       GET /api/sitex/sites · POST /api/sitex/sites · PATCH /api/sitex/sites/:id/transition
 */

import type {
  SiteMaster, SiteStatus, SiteTransitionResult, SiteMobilizedEvent,
} from '@/types/sitex';
import { siteMastersKey } from '@/types/sitex';
import { emitSiteMobilized } from './sitex-bridges';

export function listSites(entityCode: string): SiteMaster[] {
  try {
    const raw = localStorage.getItem(siteMastersKey(entityCode));
    return raw ? (JSON.parse(raw) as SiteMaster[]) : [];
  } catch {
    return [];
  }
}

export function getSite(entityCode: string, siteId: string): SiteMaster | null {
  return listSites(entityCode).find((s) => s.id === siteId) ?? null;
}

export function createSite(entityCode: string, site: SiteMaster): SiteMaster {
  const sites = listSites(entityCode);
  sites.push(site);
  localStorage.setItem(siteMastersKey(entityCode), JSON.stringify(sites));
  return site;
}

export function mobilizeSite(entityCode: string, siteId: string): SiteTransitionResult {
  const site = getSite(entityCode, siteId);
  if (!site) {
    return { allowed: false, to_state: 'planned', reason: 'Site not found', missing_prerequisites: [] };
  }
  const guard = canTransitionSiteState(site, 'mobilizing');
  if (!guard.allowed) return guard;

  const now = new Date().toISOString();
  const updated: SiteMaster = { ...site, status: 'mobilizing', mobilization_actual: now, updated_at: now };
  upsertSite(entityCode, updated);

  const event: SiteMobilizedEvent = {
    type: 'site.mobilized',
    site_id: site.id,
    entity_id: site.entity_id,
    site_code: site.site_code,
    site_name: site.site_name,
    site_mode: site.site_mode,
    mobilization_actual: now,
    location: site.location,
    timestamp: now,
  };
  emitSiteMobilized(event);

  return { allowed: true, to_state: 'mobilizing', reason: null, missing_prerequisites: [] };
}

export function canTransitionSiteState(site: SiteMaster, to: SiteStatus): SiteTransitionResult {
  const missing: string[] = [];

  if (to === 'mobilizing') {
    if (!site.site_manager_id) missing.push('site_manager_id required for mobilization');
    if ((site.site_mode === 'construction' || site.site_mode === 'capex_internal') && !site.safety_officer_id) {
      missing.push('safety_officer_id required for construction/capex_internal modes');
    }
  }
  // 'closed' state Compliance Lock guard extended at A.15

  if (missing.length > 0) {
    return { allowed: false, to_state: to, reason: 'Missing prerequisites', missing_prerequisites: missing };
  }
  return { allowed: true, to_state: to, reason: null, missing_prerequisites: [] };
}

function upsertSite(entityCode: string, site: SiteMaster): void {
  const sites = listSites(entityCode);
  const idx = sites.findIndex((s) => s.id === site.id);
  if (idx >= 0) sites[idx] = site;
  else sites.push(site);
  localStorage.setItem(siteMastersKey(entityCode), JSON.stringify(sites));
}

export function getSiteContext(entityCode: string, siteId: string): {
  site: SiteMaster | null;
  isActive: boolean;
  daysInProgress: number;
} {
  const site = getSite(entityCode, siteId);
  if (!site) return { site: null, isActive: false, daysInProgress: 0 };

  const isActive = site.status === 'active';
  const start = site.mobilization_actual ? new Date(site.mobilization_actual) : new Date();
  const daysInProgress = Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));

  return { site, isActive, daysInProgress };
}

// ============================================================================
// A.15a · Mobilization Checklist + Compliance Lock at Closeout (Q-LOCK-14a · OOB #13 + OOB #15)
// ============================================================================

export interface CloseoutGuardResult {
  guard_name: string;
  status: 'pass' | 'fail' | 'skip_for_mode';
  details: string;
}

export interface MobilizationChecklistItem {
  id: string;
  category: 'people' | 'permits' | 'materials' | 'equipment' | 'site_readiness';
  description: string;
  is_required: boolean;
  is_complete: boolean;
  completed_by: string | null;
  completed_at: string | null;
  evidence_doc_id: string | null;
}

export function checkCloseoutGuards(entityCode: string, siteId: string): {
  all_passed: boolean;
  failed_guards: string[];
  results: CloseoutGuardResult[];
} {
  const site = getSite(entityCode, siteId);
  if (!site) {
    return { all_passed: false, failed_guards: ['site_not_found'], results: [] };
  }
  const results: CloseoutGuardResult[] = [];
  // Stubbed Phase 1 — TRUE by default; real signals wired at Phase 2 as engines mature
  results.push({ guard_name: 'all_ncrs_closed', status: 'pass', details: 'No NCRs registered (Phase 1 stub)' });
  results.push({ guard_name: 'ra_bills_settled', status: 'pass', details: 'No outstanding RA bills (Phase 1 stub)' });
  results.push({ guard_name: 'site_stock_reconciled', status: 'pass', details: 'Stock variance within tolerance (Phase 1 stub)' });
  results.push({ guard_name: 'ptws_closed', status: 'skip_for_mode', details: 'PTW system out of A.15a scope' });
  if (site.site_mode === 'capex_internal') {
    results.push({ guard_name: 'customer_signoff', status: 'skip_for_mode', details: 'capex_internal mode · no customer signoff required' });
  } else {
    results.push({ guard_name: 'customer_signoff', status: 'pass', details: 'Signoff received (Phase 1 stub)' });
  }
  results.push({ guard_name: 'commissioning_report_submitted', status: 'pass', details: 'Stub Phase 1' });
  if (site.site_mode === 'capex_internal') {
    results.push({ guard_name: 'assets_capitalized', status: 'pass', details: 'Capitalization triggered' });
  } else {
    results.push({ guard_name: 'equipment_returned', status: 'pass', details: 'Equipment returned to pool' });
  }
  results.push({ guard_name: 'labour_offrolled', status: 'pass', details: 'No active labour entries' });

  const failed = results.filter((r) => r.status === 'fail').map((r) => r.guard_name);
  return { all_passed: failed.length === 0, failed_guards: failed, results };
}

export function generateMobilizationChecklist(site: SiteMaster): MobilizationChecklistItem[] {
  const mk = (id: string, category: MobilizationChecklistItem['category'], description: string, required = true): MobilizationChecklistItem => ({
    id, category, description, is_required: required, is_complete: false, completed_by: null, completed_at: null, evidence_doc_id: null,
  });

  const common: MobilizationChecklistItem[] = [
    mk('p1', 'people', 'Site Manager mobilized'),
    mk('p2', 'people', 'Safety Officer mobilized'),
    mk('p3', 'permits', 'Entry permit received'),
    mk('p4', 'site_readiness', 'Site access confirmed'),
    mk('p5', 'materials', 'Initial material list prepared'),
    mk('p6', 'equipment', 'Required equipment listed'),
  ];

  if (site.site_mode === 'install_commission') {
    return [
      ...common,
      mk('ic1', 'permits', 'Customer-side work permits'),
      mk('ic2', 'equipment', 'Tools deployed'),
      mk('ic3', 'materials', 'Spares list confirmed'),
      mk('ic4', 'site_readiness', 'Commissioning checklist printed'),
      mk('ic5', 'people', 'Commissioning engineer briefed'),
      mk('ic6', 'site_readiness', 'Customer SPOC confirmed'),
    ];
  }
  if (site.site_mode === 'construction') {
    return [
      ...common,
      mk('c1', 'site_readiness', 'PCC laid'),
      mk('c2', 'site_readiness', 'Boundary wall complete'),
      mk('c3', 'site_readiness', 'Temporary water connection'),
      mk('c4', 'site_readiness', 'Temporary power connection'),
      mk('c5', 'site_readiness', 'Site office erected'),
      mk('c6', 'people', 'Labour camp ready'),
      mk('c7', 'people', 'Safety induction conducted'),
      mk('c8', 'equipment', 'Crane/lifting equipment positioned'),
      mk('c9', 'permits', 'Statutory approvals on display'),
      mk('c10', 'permits', 'Insurance policies confirmed'),
      mk('c11', 'site_readiness', 'First-aid station ready'),
      mk('c12', 'site_readiness', 'Fire-safety equipment installed'),
    ];
  }
  // capex_internal
  return [
    ...common,
    mk('cx1', 'site_readiness', 'Civil readiness confirmed'),
    mk('cx2', 'site_readiness', 'Utility connections in place'),
    mk('cx3', 'people', 'Manpower mobilization plan'),
    mk('cx4', 'site_readiness', 'Safety setup at work zones'),
    mk('cx5', 'permits', 'Internal HSE clearance'),
    mk('cx6', 'site_readiness', 'Existing operations isolation plan'),
    mk('cx7', 'equipment', 'Lift/handling plan signed off'),
    mk('cx8', 'site_readiness', 'Dust/noise mitigation plan'),
    mk('cx9', 'site_readiness', 'Asset tagging plan'),
  ];
}

export function completeMobilizationItem(
  entityCode: string, siteId: string, itemId: string, completedBy: string, evidenceDocId: string | null,
): boolean {
  const key = `erp_sitex_mob_checklist_${entityCode}_${siteId}`;
  try {
    const raw = localStorage.getItem(key);
    const items: MobilizationChecklistItem[] = raw ? JSON.parse(raw) : [];
    const it = items.find((x) => x.id === itemId);
    if (!it) return false;
    it.is_complete = true;
    it.completed_by = completedBy;
    it.completed_at = new Date().toISOString();
    it.evidence_doc_id = evidenceDocId;
    localStorage.setItem(key, JSON.stringify(items));
    return true;
  } catch { return false; }
}

export function isReadyToTransitionFromMobilizing(
  _site: SiteMaster, checklist: MobilizationChecklistItem[],
): { allowed: boolean; pending_items: string[] } {
  const pending = checklist.filter((c) => c.is_required && !c.is_complete).map((c) => c.description);
  return { allowed: pending.length === 0, pending_items: pending };
}
