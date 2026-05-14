/**
 * @file        src/types/future-task-register.ts
 * @purpose     FutureTaskEntry canonical · ServiceDesk-specific Phase 2 roadmap · MOAT #24 criterion 14
 * @sprint      T-Phase-1.C.1f · Block A.3
 */
import type { AuditEntry } from '@/types/servicedesk';

export type FTStatus = 'planned' | 'in_progress' | 'blocked' | 'done' | 'deferred';
export type FTPriority = 'p0' | 'p1' | 'p2' | 'p3';

export interface FutureTaskEntry {
  id: string;
  ft_code: string;
  title: string;
  description: string;
  status: FTStatus;
  priority: FTPriority;
  target_phase: 'phase_2' | 'phase_3' | 'backlog';
  estimated_loc: number;
  unblock_dependencies: string[];
  parent_card_id: 'servicedesk';
  created_at: string;
  updated_at: string;
  audit_trail: AuditEntry[];
}

export const futureTaskKey = (e: string): string =>
  `servicedesk_v1_future_task_${e}`;
