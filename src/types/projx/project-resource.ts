/**
 * project-resource.ts — SAMPerson allocation to a project
 * Sprint T-Phase-1.1.2-b · ProjX Transactions
 */

export interface ProjectResource {
  id: string;
  entity_id: string;
  project_id: string;
  project_centre_id: string;

  person_id: string;
  person_code: string;
  person_name: string;

  role_on_project: string;
  allocation_pct: number;                   // 0-100
  allocated_from: string;                   // YYYY-MM-DD
  allocated_until: string | null;

  daily_cost_rate: number;                  // ₹/day

  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const projectResourcesKey = (entityCode: string): string =>
  `erp_project_resources_${entityCode}`;

/** Detect overlapping date-range allocation for the same person+project */
export function hasOverlappingAllocation(
  resources: ProjectResource[],
  personId: string,
  projectId: string,
  fromISO: string,
  untilISO: string | null,
  excludeId?: string,
): boolean {
  return resources.some(r => {
    if (excludeId && r.id === excludeId) return false;
    if (r.person_id !== personId || r.project_id !== projectId || !r.is_active) return false;
    const aFrom = r.allocated_from;
    const aUntil = r.allocated_until ?? '9999-12-31';
    const bFrom = fromISO;
    const bUntil = untilISO ?? '9999-12-31';
    return aFrom <= bUntil && bFrom <= aUntil;
  });
}
