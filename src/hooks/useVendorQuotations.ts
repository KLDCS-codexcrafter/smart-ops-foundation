/**
 * @file        useVendorQuotations.ts
 * @sprint      T-Phase-1.2.6f-a-fix · FIX-4
 * @[JWT]       GET /api/procure360/vendor-quotations
 */
import { useMemo } from 'react';
import { useEntityCode } from './useEntityCode';
import { vendorQuotationsKey, type VendorQuotation } from '@/types/vendor-quotation';

export function useVendorQuotations(): VendorQuotation[] {
  const { entityCode } = useEntityCode();
  return useMemo(() => {
    try {
      const raw = localStorage.getItem(vendorQuotationsKey(entityCode));
      return raw ? (JSON.parse(raw) as VendorQuotation[]) : [];
    } catch {
      return [];
    }
  }, [entityCode]);
}
