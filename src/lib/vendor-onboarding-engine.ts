/**
 * @file        vendor-onboarding-engine.ts
 * @sprint      T-Phase-1.2.6f-b-1 · Block D.1
 * @purpose     D-255 onboarding · token-only first quote · password set after first submission.
 * @decisions   D-255 · D-275
 * @[JWT]       POST /api/vendor/portal/onboard
 */

import {
  getVendorSession,
  persistVendorSession,
  recordVendorActivity,
  updateVendorPassword,
} from './vendor-portal-auth-engine';

export interface OnboardingState {
  is_first_time_vendor: boolean;
  has_pending_password_set: boolean;
  vendor_id: string;
  entity_code: string;
}

export function getOnboardingState(): OnboardingState | null {
  const session = getVendorSession();
  if (!session) return null;
  return {
    is_first_time_vendor: session.is_token_only && session.must_change_password,
    has_pending_password_set: session.must_change_password,
    vendor_id: session.vendor_id,
    entity_code: session.entity_code,
  };
}

export function markFirstQuoteSubmitted(vendorId: string, entityCode: string): void {
  recordVendorActivity(
    vendorId, entityCode, 'quotation_submit',
    'quotation', undefined, 'first_quote_completed',
  );
}

export function completeOnboarding(
  vendorId: string,
  entityCode: string,
  newPassword: string,
): { ok: boolean; reason?: string } {
  const result = updateVendorPassword(vendorId, entityCode, newPassword);
  if (!result.ok) return result;
  const session = getVendorSession();
  if (session) {
    persistVendorSession({
      ...session,
      must_change_password: false,
      is_token_only: false,
    });
  }
  return { ok: true };
}

/** Skip path · keeps session in token-only mode (vendor will need email link next time). */
export function skipOnboarding(): void {
  const session = getVendorSession();
  if (!session) return;
  persistVendorSession({
    ...session,
    must_change_password: true,
    is_token_only: true,
  });
}
