/**
 * mobile-gate-guard-validation.ts — Sprint 4-pre-3 · Block C · D-312
 * Pure step-validation logic split out of MobileGateGuardCapture.tsx
 * so the .tsx file remains component-only (react-refresh hygiene).
 */
import type { GatePassDirection, LinkedVoucherType } from '@/types/gate-pass';

export type Step = 1 | 2 | 3 | 4 | 5;

export interface FormState {
  direction: GatePassDirection;
  vehicleNo: string;
  vehicleType: string;
  driverName: string;
  driverPhone: string;
  driverLicenseNo: string;
  purpose: string;
  counterpartyName: string;
  linkedVoucherType: LinkedVoucherType;
  linkedVoucherNo: string;
  remarks: string;
  driverLicenseImageUrl?: string;
  vehicleInspectionImageUrl?: string;
  anprImageUrl?: string;
  podImageUrls: string[];
}

export const EMPTY_FORM_STATE: FormState = {
  direction: 'inward', vehicleNo: '', vehicleType: 'truck',
  driverName: '', driverPhone: '', driverLicenseNo: '',
  purpose: '', counterpartyName: '',
  linkedVoucherType: null, linkedVoucherNo: '', remarks: '',
  podImageUrls: [],
};

export function canProceed(s: FormState, step: Step): boolean {
  if (step === 1) return s.vehicleNo.trim().length >= 4;
  if (step === 2) return s.driverName.trim().length >= 2 && /^[6-9]\d{9}$/.test(s.driverPhone.trim());
  if (step === 3) return s.purpose.trim().length >= 3 && s.counterpartyName.trim().length >= 2;
  if (step === 4) return true;
  return false;
}
