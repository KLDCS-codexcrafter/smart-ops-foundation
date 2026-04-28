/**
 * lead-distribution.ts — Lead routing + capacity · Canvas Wave 5 (T-Phase-1.1.1i)
 * [JWT] GET/POST/PUT/DELETE /api/salesx/lead-distribution
 */

export type DistributionStrategy =
  | 'round_robin'
  | 'weighted'
  | 'skill_based'
  | 'manual';

export const DISTRIBUTION_STRATEGY_LABELS: Record<DistributionStrategy, string> = {
  round_robin: 'Round Robin (equal rotation)',
  weighted:    'Weighted (by performance)',
  skill_based: 'Skill-Based (by product expertise)',
  manual:      'Manual (supervisor assigns)',
};

export interface DistributionConfig {
  id: string;
  entity_id: string;
  strategy: DistributionStrategy;
  rotation_cursor: number;
  weights: Record<string, number>;
  skills: Record<string, string[]>;
  auto_redistribute_enabled: boolean;
  redistribute_when_overcap_pct: number;
  last_distributed_at: string | null;
  last_distributed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TelecallerCapacity {
  id: string;
  entity_id: string;
  telecaller_id: string;
  telecaller_name: string;
  daily_capacity: number;
  weekly_capacity: number;
  active: boolean;
  product_skills: string[];
  current_daily_load: number;
  current_weekly_load: number;
  utilisation_pct: number;
  created_at: string;
  updated_at: string;
}

export interface DistributionLog {
  id: string;
  entity_id: string;
  distributed_at: string;
  strategy: DistributionStrategy;
  lead_id: string;
  lead_no: string;
  assigned_telecaller_id: string;
  assigned_telecaller_name: string;
  reason: string;
  created_at: string;
}

export const distributionConfigKey = (e: string) => `erp_distribution_config_${e}`;
export const telecallerCapacitiesKey = (e: string) => `erp_telecaller_capacities_${e}`;
export const distributionLogsKey = (e: string) => `erp_distribution_logs_${e}`;
