/**
 * @file src/components/canonical/form-carry-forward-kit.tsx
 * @purpose UI half of the canonical FR-29 12-item carry-forward kit · re-exports the React
 *          mount components. Companion to src/lib/form-carry-forward-kit.ts (types · hooks · helpers).
 * @who All form authors (every Sprint·card)
 * @when 2026-05-09
 * @sprint T-Phase-1.A.5.d-2-T1-AuditFix · Block A (closes F-1 D-NEW-CB violation · split from .tsx-only)
 * @iso ISO 25010 Maintainability
 * @whom Audit Owner
 * @decisions D-NEW-CE (FormCarryForwardKit canonical) · D-NEW-CB (parsers/utils in lib/)
 * @disciplines FR-29 · FR-30
 * @reuses src/components/uth/* · src/lib/form-carry-forward-kit
 * @[JWT] N/A (composition module · no storage · no API)
 */

// ─── React mount component re-exports (JSX) ───
export { UseLastVoucherButton } from '@/components/uth/UseLastVoucherButton';
export { Sprint27d2Mount } from '@/components/uth/Sprint27d2Mount';
export { Sprint27eMount, type Sprint27eMountHandle } from '@/components/uth/Sprint27eMount';
export { DraftRecoveryDialog } from '@/components/uth/DraftRecoveryDialog';

// ─── Convenience re-export of the lib half (forms can keep single import path) ───
export {
  useSprint27d1Mount,
  dAdd, dSub, dMul, dPct, round2, dEq, dSum,
  useFormCarryForwardChecklist,
  FORM_CARRY_FORWARD_ROSTER,
  type FormCarryForwardConfig,
} from '@/lib/form-carry-forward-kit';
