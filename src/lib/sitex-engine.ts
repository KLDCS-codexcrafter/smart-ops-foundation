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
