/**
 * mobile-inward-capture-validation.ts — Sprint 6-pre-3 · Block A · D-369
 * Pure step-validation for MobileInwardReceiptCapture (react-refresh hygiene).
 * Mirrors mobile-gate-guard-validation D-312 and mobile-qa-capture-validation D-346.
 */

export type InwardStep = 1 | 2 | 3 | 4 | 5;

export interface InwardCaptureLine {
  item_id: string;
  item_code: string;
  item_name: string;
  uom: string;
  expected_qty: number;
  received_qty: number;
  condition: 'ok' | 'damaged' | 'short';
  photo_urls: string[];
}

export interface InwardCaptureFormState {
  vendor_id: string;
  vendor_name: string;
  gate_pass_id: string | null;
  gate_pass_no: string | null;
  vehicle_no: string;
  godown_id: string;
  godown_name: string;
  lines: InwardCaptureLine[];
  narration: string;
}

export const EMPTY_INWARD_FORM_STATE: InwardCaptureFormState = {
  vendor_id: '', vendor_name: '',
  gate_pass_id: null, gate_pass_no: null,
  vehicle_no: '',
  godown_id: 'gd-main', godown_name: 'Main Stores',
  lines: [], narration: '',
};

export function canProceedInward(s: InwardCaptureFormState, step: InwardStep): boolean {
  if (step === 1) return s.vendor_name.trim().length >= 2;
  if (step === 2) return true; // gate-pass auto-link is optional
  if (step === 3) return s.lines.length > 0 && s.lines.every(l => l.received_qty > 0);
  if (step === 4) return true; // photos optional
  return false;
}
