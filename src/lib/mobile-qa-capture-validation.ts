/**
 * mobile-qa-capture-validation.ts — Sprint 5-pre-3 · Block D · D-346
 * Pure step-validation logic split out of MobileQualiCheckCapture.tsx
 * so the .tsx file remains component-only (react-refresh hygiene).
 * Mirrors mobile-gate-guard-validation D-312 split.
 */

export type QaStep = 1 | 2 | 3 | 4 | 5;

export interface QaCaptureFormState {
  qa_id: string | null;
  qa_no: string;
  spec_id: string | null;
  line_id: string | null;
  item_name: string;
  qty_inspected: number;
  qty_passed: number;
  qty_failed: number;
  qty_sample: number;
  failure_reason: string;
  parameter_values: Record<string, string>;
  photo_urls: string[];
}

export const EMPTY_QA_FORM_STATE: QaCaptureFormState = {
  qa_id: null, qa_no: '', spec_id: null, line_id: null,
  item_name: '', qty_inspected: 0, qty_passed: 0, qty_failed: 0, qty_sample: 0,
  failure_reason: '', parameter_values: {}, photo_urls: [],
};

export function canProceedQa(s: QaCaptureFormState, step: QaStep): boolean {
  if (step === 1) return s.qa_id !== null;
  if (step === 2) {
    const total = s.qty_passed + s.qty_failed + s.qty_sample;
    return total > 0 && total <= s.qty_inspected;
  }
  if (step === 3) return true; // parameters optional (spec may be missing)
  if (step === 4) return true; // photos optional
  return false;
}
