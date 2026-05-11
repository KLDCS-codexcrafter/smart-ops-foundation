/**
 * @file        src/lib/sitex-demobilization-engine.ts
 * @purpose     Site Demobilization Workflow (OOB #20) · orchestrates closeout · subscribes to closeout guards
 * @sprint      T-Phase-1.A.15a SiteX Closeout · OOB #20 · Block G.1
 * @decisions   D-NEW-CX POSSIBLE Compliance Lock at Closeout (21st canonical)
 */

import type { SiteMaster } from '@/types/sitex';
import { getSite, checkCloseoutGuards } from './sitex-engine';
import { reconcileImprest } from './sitex-imprest-engine';
import { siteMastersKey } from '@/types/sitex';
import { emitMaintainProHandoff, emitAssetCapitalization } from './sitex-bridges';

export interface DemobilizationTask {
  id: string;
  category: 'surplus_return' | 'equipment_recall' | 'imprest_reconciliation' | 'financial' | 'labour_offroll';
  description: string;
  status: 'pending' | 'in_progress' | 'done';
  done_at: string | null;
}

const demobKey = (entityCode: string, siteId: string): string =>
  `erp_sitex_demob_${entityCode}_${siteId}`;

export function initiateDemobilization(entityCode: string, siteId: string): {
  allowed: boolean; reason: string | null; tasks: DemobilizationTask[];
} {
  const site = getSite(entityCode, siteId);
  if (!site) return { allowed: false, reason: 'Site not found', tasks: [] };
  if (site.status !== 'active') return { allowed: false, reason: 'Site must be active', tasks: [] };

  const tasks: DemobilizationTask[] = [
    { id: 't1', category: 'surplus_return', description: 'Return surplus material to HO (Inter-Branch Stock Transfer)', status: 'pending', done_at: null },
    { id: 't2', category: 'equipment_recall', description: 'Recall equipment to MaintainPro pool', status: 'pending', done_at: null },
    { id: 't3', category: 'imprest_reconciliation', description: 'Reconcile site imprest balance back to HO', status: 'pending', done_at: null },
    { id: 't4', category: 'financial', description: 'Final RA bill settlement + BD ledger reconciliation', status: 'pending', done_at: null },
    { id: 't5', category: 'labour_offroll', description: 'Off-roll site labour roster entries', status: 'pending', done_at: null },
  ];

  // Update site state
  const sites = JSON.parse(localStorage.getItem(siteMastersKey(entityCode)) ?? '[]') as SiteMaster[];
  const idx = sites.findIndex((s) => s.id === siteId);
  if (idx >= 0) {
    sites[idx] = { ...sites[idx], status: 'demobilizing', updated_at: new Date().toISOString() };
    localStorage.setItem(siteMastersKey(entityCode), JSON.stringify(sites));
  }
  localStorage.setItem(demobKey(entityCode, siteId), JSON.stringify(tasks));
  return { allowed: true, reason: null, tasks };
}

export function listDemobilizationTasks(entityCode: string, siteId: string): DemobilizationTask[] {
  try {
    const raw = localStorage.getItem(demobKey(entityCode, siteId));
    return raw ? (JSON.parse(raw) as DemobilizationTask[]) : [];
  } catch { return []; }
}

export function completeDemobilizationTask(entityCode: string, siteId: string, taskId: string): boolean {
  const tasks = listDemobilizationTasks(entityCode, siteId);
  const t = tasks.find((x) => x.id === taskId);
  if (!t) return false;
  t.status = 'done';
  t.done_at = new Date().toISOString();
  if (t.category === 'imprest_reconciliation') {
    reconcileImprest(entityCode, siteId);
  }
  localStorage.setItem(demobKey(entityCode, siteId), JSON.stringify(tasks));
  return true;
}

export function closeSite(entityCode: string, siteId: string): {
  allowed: boolean; reason: string | null; failed_guards: string[];
} {
  const guards = checkCloseoutGuards(entityCode, siteId);
  if (!guards.all_passed) {
    return { allowed: false, reason: 'Compliance Lock at Closeout blocked', failed_guards: guards.failed_guards };
  }
  const site = getSite(entityCode, siteId);
  if (!site) return { allowed: false, reason: 'Site not found', failed_guards: [] };

  const sites = JSON.parse(localStorage.getItem(siteMastersKey(entityCode)) ?? '[]') as SiteMaster[];
  const idx = sites.findIndex((s) => s.id === siteId);
  const now = new Date().toISOString();
  if (idx >= 0) {
    sites[idx] = { ...sites[idx], status: 'closed', actual_demobilization: now, updated_at: now };
    localStorage.setItem(siteMastersKey(entityCode), JSON.stringify(sites));
  }

  // Emit appropriate handoffs (Q-LOCK-15a)
  if (site.site_mode === 'capex_internal') {
    emitMaintainProHandoff({
      type: 'sitex.maintainpro.handoff',
      site_id: siteId,
      entity_id: site.entity_id,
      equipment_list: [],
      timestamp: now,
    });
    emitAssetCapitalization({
      type: 'sitex.asset.capitalization',
      site_id: siteId,
      entity_id: site.entity_id,
      total_capitalized_value: site.cost_to_date,
      cwip_voucher_id: null,
      fixed_asset_voucher_id: null,
      timestamp: now,
    });
  }

  return { allowed: true, reason: null, failed_guards: [] };
}
