/**
 * useGSTRegister.ts — GST register read hook
 * [JWT] Replace with GET /api/accounting/gst-register
 */
import { useState, useCallback } from 'react';
import type { GSTEntry } from '@/types/voucher';
import { gstRegisterKey } from '@/lib/finecore-engine';

function ls<T>(key: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function useGSTRegister(entityCode: string) {
  const [entries] = useState<GSTEntry[]>(() => ls<GSTEntry>(gstRegisterKey(entityCode)));

  const getGSTR1Data = useCallback((period: string) => {
    // period format: '2026-04' → filter by month
    return entries.filter(e =>
      !e.is_cancelled && e.date.startsWith(period) &&
      ['Sales', 'Credit Note', 'Debit Note'].includes(e.base_voucher_type)
    );
  }, [entries]);

  const getITCSummary = useCallback((period: string) => {
    const filtered = entries.filter(e =>
      !e.is_cancelled && e.date.startsWith(period) && e.itc_eligible
    );
    return {
      totalTaxable: filtered.reduce((s, e) => s + e.taxable_value, 0),
      totalCGST: filtered.reduce((s, e) => s + e.cgst_amount, 0),
      totalSGST: filtered.reduce((s, e) => s + e.sgst_amount, 0),
      totalIGST: filtered.reduce((s, e) => s + e.igst_amount, 0),
      totalCess: filtered.reduce((s, e) => s + e.cess_amount, 0),
    };
  }, [entries]);

  const getHSNSummary = useCallback(() => {
    const map = new Map<string, { hsn: string; taxable: number; tax: number; count: number }>();
    for (const e of entries) {
      if (e.is_cancelled || !e.hsn_code) continue;
      const ex = map.get(e.hsn_code) || { hsn: e.hsn_code, taxable: 0, tax: 0, count: 0 };
      ex.taxable += e.taxable_value;
      ex.tax += e.total_tax;
      ex.count += 1;
      map.set(e.hsn_code, ex);
    }
    return Array.from(map.values());
  }, [entries]);

  return { entries, getGSTR1Data, getITCSummary, getHSNSummary };
}
