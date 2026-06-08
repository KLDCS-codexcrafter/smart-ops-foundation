/**
 * @file        src/types/master-health.ts
 * @purpose     B.6 Master Health Scorecard · read-model types
 * @sprint      B6 · T-B6-Master-Health · Pillar-B CLOSE
 * @notes       Read-model only · no FY-stamped record store · nothing persisted
 *              except an optional last-run cache via masterHealthCacheKey.
 */
import type { MasterType } from '@/lib/master-replication-engine';

export type MasterHealthDimension =
  | 'duplicates'
  | 'sleeping'
  | 'incomplete'
  | 'orphaned'
  | 'ssot_coverage';

export type MasterHealthSeverity = 'ok' | 'warn' | 'critical';

export type MasterHealthSource =
  | 'idea-3'
  | 'idea-9'
  | 'b6-incomplete'
  | 'b6-orphaned'
  | 'b6-replication'
  | 'unavailable';

export interface MasterHealthCheck {
  dimension: MasterHealthDimension;
  master_type: MasterType | string;
  count: number;
  severity: MasterHealthSeverity;
  detail: string;
  drill_route?: string;
  source: MasterHealthSource;
}

export interface MasterTypeScore {
  master_type: MasterType | string;
  score_0_100: number;
  checks: MasterHealthCheck[];
}

export interface MasterHealthReport {
  generated_at: string;
  overall_score: number;
  by_type: MasterTypeScore[];
}

export const masterHealthCacheKey = (entityCode: string): string =>
  `erp_master_health_last_run_${entityCode}`;
