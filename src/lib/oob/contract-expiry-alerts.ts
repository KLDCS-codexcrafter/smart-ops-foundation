/**
 * contract-expiry-alerts.ts — OOB-54
 * Sprint T-Phase-1.2.6f-a · refactored T-Phase-1.2.6f-c-3-fix (Fix-D · Q1=A REPLACE)
 * THIN WRAPPER · delegates to rate-contract-engine. Backward-compat ContractExpiryAlert API preserved.
 */
import { listExpiringContracts } from '@/lib/rate-contract-engine';

export interface ContractExpiryAlert {
  vendor_id: string;
  vendor_name: string;
  contract_no: string;
  expires_on: string;
  days_remaining: number;
}

export function getExpiringContracts(entityCode: string, withinDays: number = 30): ContractExpiryAlert[] {
  // [JWT] GET /api/vendors/contracts/expiring
  const today = Date.now();
  return listExpiringContracts(entityCode, withinDays).map((c) => ({
    vendor_id: c.vendor_id,
    vendor_name: c.vendor_name,
    contract_no: c.contract_no,
    expires_on: c.valid_to,
    days_remaining: Math.floor((new Date(c.valid_to).getTime() - today) / 86400000),
  }));
}
