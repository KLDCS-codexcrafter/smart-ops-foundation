/**
 * @file        src/lib/idea-8-cost-centre-cross-stitch-engine.ts
 * @sibling     NEW @ Sprint 100 · 💡 Idea 8 · Cost-Centre Cross-Stitch
 * @realizes    Cross-stitches Project ↔ Division ↔ Department ↔ Cost Centre links.
 *              Cost Centre is PROJECT-ONLY (locked · Q-LOCK S100) — populated from
 *              ProjectCentre.division_id + .department_id; voucher slicing via VoucherOrgTag.
 * @reads-from  projx/project-centre (type+key · USE-SITE) · voucher-org-tag-engine (slicing)
 * @audit       Owns + logs `cost_centre_cross_stitch` (module: 'mca-roc').
 * @sprint      T-Phase-6.A.0.5 · Block 6
 * [JWT] Phase 8: GET /api/cost-centre-cross-stitch?entityCode=:entityCode
 */
import { logAudit } from '@/lib/audit-trail-engine';
import { registerAuditEntityType } from '@/lib/comply360-audit-trail-aggregator-engine';
import type { ProjectCentre } from '@/types/projx/project-centre';
import { projectCentresKey } from '@/types/projx/project-centre';

export const READS_FROM = {
  engines: ['projx/project-centre', 'voucher-org-tag-engine'],
  storage_keys: ['erp_project_centres_*'],
} as const;

registerAuditEntityType({
  id: 'cost_centre_cross_stitch',
  module: 'mca-roc',
  label: 'Cost-Centre Cross-Stitch',
});

export interface CrossStitchLink {
  project_id: string;
  division_id: string | null;
  department_id: string | null;
  cost_centre_id: string;
}

function readProjectCentres(entity_code: string): ProjectCentre[] {
  try {
    // [JWT] GET /api/projx/project-centres?entityCode=:entity_code
    const raw = localStorage.getItem(projectCentresKey(entity_code));
    return raw ? (JSON.parse(raw) as ProjectCentre[]) : [];
  } catch {
    return [];
  }
}

function findProject(project_id: string): { pc: ProjectCentre; entity_code: string } | null {
  // Walk known entity stores by scanning all entity-scoped keys.
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith('erp_project_centres_')) continue;
    const entity_code = k.replace('erp_project_centres_', '');
    const all = readProjectCentres(entity_code);
    const hit = all.find((pc) => pc.id === project_id);
    if (hit) return { pc: hit, entity_code };
  }
  return null;
}

/** Build cross-stitch link for a single project (Cost Centre = project-only · locked). */
export function buildCrossStitch(project_id: string): CrossStitchLink | null {
  const found = findProject(project_id);
  if (!found) return null;
  const link: CrossStitchLink = {
    project_id,
    division_id: found.pc.division_id,
    department_id: found.pc.department_id,
    cost_centre_id: project_id, // Project = Cost Centre (locked)
  };
  logAudit({
    entityCode: found.entity_code,
    action: 'create',
    entityType: 'cost_centre_cross_stitch',
    recordId: project_id,
    recordLabel: `Cross-stitch ${found.pc.code} ${found.pc.name}`,
    beforeState: null,
    afterState: { ...link },
    reason: null,
    sourceModule: 'mca-roc',
  });
  return link;
}

/** Enumerate cross-stitch links for an entity (no audit · read-only listing). */
export function listCrossStitches(entity_code: string): CrossStitchLink[] {
  return readProjectCentres(entity_code)
    .filter((pc) => pc.status === 'active')
    .map((pc) => ({
      project_id: pc.id,
      division_id: pc.division_id,
      department_id: pc.department_id,
      cost_centre_id: pc.id,
    }));
}
