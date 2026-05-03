/**
 * @file        approval-tier-helper.ts
 * @sprint      T-Phase-1.2.6f-b-2-fix-1 · touchup · ESLint react-refresh fix
 * @purpose     Shared tierFor helper · used by ApprovalActionPanel + EnquiryListPanel.
 * @reuses      APPROVAL_MATRIX from requisition-common.ts
 * @disciplines FR-67 (Three Greps · zero duplicates) · FR-22 (Type Discipline)
 */
import { APPROVAL_MATRIX } from '@/types/requisition-common';

export function tierFor(value: number, isCapex: boolean): 1 | 2 | 3 {
  if (isCapex) return 3;
  for (const t of APPROVAL_MATRIX) {
    if (value >= t.min_value && value <= t.max_value) return t.tier;
  }
  return 3;
}
