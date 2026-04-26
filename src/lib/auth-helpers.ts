/**
 * @file     auth-helpers.ts
 * @purpose  Phase 1 mock-auth helpers. getCurrentUser() reads from localStorage
 *           (set by MockAuthDevPanel). Phase 2 will replace this entire file
 *           with real auth context integration.
 * @who      Operix Engineering
 * @when     Apr-2026
 * @sprint   T-H1.5-Z-Z3
 * @iso      Maintainability (HIGH+ single boundary for auth · Phase 2 swap-friendly)
 *           Compatibility (HIGH+ clean boundary for real-auth integration)
 *           Security (HIGH+ establishes the abstraction Phase 2 RBAC consumes)
 * @whom     useVouchers.ts createVoucher · VoucherFormShell.tsx · all future actor-aware code
 * @depends  none (localStorage-only · zero deps)
 *
 * D-127 STORAGE-KEY:
 *   mockAuthKey = `erp_mock_auth_user` (singleton · not entity-scoped)
 *
 * GRACEFUL DEGRADATION:
 *   If no mock user is set, returns 'unknown-user' (logs console.warn).
 *   This prevents voucher saves from failing when dev panel hasn't been used.
 *
 * PHASE 2 NOTE:
 *   This file's API (getCurrentUser/setCurrentUser/clearCurrentUser) will be
 *   preserved in Phase 2; the implementation will swap from localStorage to
 *   real AuthContext. All consumers of getCurrentUser() should NOT need code changes.
 */

export const mockAuthKey = 'erp_mock_auth_user';

export interface MockUser {
  /** User ID · used for created_by/updated_by fields */
  id: string;
  /** Display name · for UI · NOT for audit trail */
  displayName: string;
  /** Optional role hint · Phase 2 RBAC will replace this */
  role?: 'admin' | 'accountant' | 'auditor' | 'data-entry';
}

const FALLBACK_USER: MockUser = { id: 'unknown-user', displayName: 'Unknown User' };

/** Returns current mock user · or safe default if none set. */
export function getCurrentUser(): MockUser {
  try {
    // [JWT] GET /api/auth/me
    const raw = localStorage.getItem(mockAuthKey);
    if (!raw) {
      console.warn('[auth-helpers] No mock user set · returning unknown-user');
      return FALLBACK_USER;
    }
    return JSON.parse(raw) as MockUser;
  } catch {
    return FALLBACK_USER;
  }
}

/** Just the user ID · convenience for created_by fields. */
export function getCurrentUserId(): string {
  return getCurrentUser().id;
}

/** Set the active mock user · used by MockAuthDevPanel. */
export function setCurrentUser(user: MockUser): void {
  // [JWT] POST /api/auth/login (mock)
  localStorage.setItem(mockAuthKey, JSON.stringify(user));
}

/** Clear active mock user. */
export function clearCurrentUser(): void {
  // [JWT] POST /api/auth/logout (mock)
  localStorage.removeItem(mockAuthKey);
}
