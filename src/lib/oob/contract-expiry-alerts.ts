/**
 * contract-expiry-alerts.ts — OOB-54
 * Sprint T-Phase-1.2.6f-a
 */
export interface ContractExpiryAlert {
  vendor_id: string;
  vendor_name: string;
  contract_no: string;
  expires_on: string;
  days_remaining: number;
}

const KEY = (entityCode: string): string => `erp_vendor_contracts_${entityCode}`;

interface VendorContract {
  vendor_id: string;
  vendor_name: string;
  contract_no: string;
  expires_on: string;
}

export function getExpiringContracts(entityCode: string, withinDays: number = 30): ContractExpiryAlert[] {
  // [JWT] GET /api/vendors/contracts/expiring
  try {
    const raw = localStorage.getItem(KEY(entityCode));
    const all = raw ? (JSON.parse(raw) as VendorContract[]) : [];
    const today = Date.now();
    return all
      .map<ContractExpiryAlert>((c) => ({
        vendor_id: c.vendor_id,
        vendor_name: c.vendor_name,
        contract_no: c.contract_no,
        expires_on: c.expires_on,
        days_remaining: Math.floor((new Date(c.expires_on).getTime() - today) / 86400000),
      }))
      .filter((a) => a.days_remaining >= 0 && a.days_remaining <= withinDays);
  } catch {
    return [];
  }
}
