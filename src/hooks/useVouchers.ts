/**
 * useVouchers.ts — CRUD hook for vouchers
 * [JWT] Replace with GET/POST /api/accounting/vouchers
 */
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { Voucher } from '@/types/voucher';
import { vouchersKey, postVoucher, cancelVoucher as cancelEngine, validateVoucher, generateVoucherNo } from '@/lib/finecore-engine';
import { getCurrentUserId } from '@/lib/auth-helpers';
// [T-T8.0-OrgTagFoundation] Derived metadata table · enables 5-tier slicing without voucher.ts schema change (D-128 preserved).
import { tagVoucher, getOperatorContext } from '@/lib/voucher-org-tag-engine';

function ls<T>(key: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function useVouchers(entityCode: string) {
  const key = vouchersKey(entityCode);
  const [vouchers, setVouchers] = useState<Voucher[]>(() => ls<Voucher>(key));

  const reload = useCallback(() => {
    setVouchers(ls<Voucher>(key));
  }, [key]);

  const listVouchers = useCallback((filters?: {
    voucherType?: string; status?: string; partyName?: string;
    dateFrom?: string; dateTo?: string;
  }) => {
    let result = vouchers;
    if (filters?.voucherType) result = result.filter(v => v.base_voucher_type === filters.voucherType);
    if (filters?.status) result = result.filter(v => v.status === filters.status);
    if (filters?.partyName) result = result.filter(v =>
      v.party_name?.toLowerCase().includes(filters.partyName!.toLowerCase()));
    if (filters?.dateFrom) result = result.filter(v => v.date >= filters.dateFrom!);
    if (filters?.dateTo) result = result.filter(v => v.date <= filters.dateTo!);
    return result;
  }, [vouchers]);

  const getVoucher = useCallback((id: string) => {
    return vouchers.find(v => v.id === id) || null;
  }, [vouchers]);

  const createVoucher = useCallback((voucher: Voucher, post = false) => {
    // Auto-set created_by if missing (T-H1.5-Z-Z3 actor threading)
    const enrichedVoucher: Voucher = {
      ...voucher,
      created_by: voucher.created_by || getCurrentUserId(),
    };

    if (post) {
      const validation = validateVoucher(enrichedVoucher);
      if (!validation.valid) {
        toast.error(validation.errors[0]);
        return null;
      }
      postVoucher(enrichedVoucher, entityCode);
      toast.success(`${enrichedVoucher.voucher_type_name} ${enrichedVoucher.voucher_no} posted`);
    } else {
      const existing = ls<Voucher>(key);
      existing.push({ ...enrichedVoucher, status: 'draft' });
      // [JWT] POST /api/accounting/vouchers (draft)
      localStorage.setItem(key, JSON.stringify(existing));
      toast.success(`${enrichedVoucher.voucher_type_name} saved as draft`);
    }
    reload();
    return enrichedVoucher;
  }, [entityCode, key, reload]);

  const cancelVoucher = useCallback((voucherId: string, reason: string) => {
    cancelEngine(voucherId, entityCode, reason);
    reload();
    toast.success('Voucher cancelled');
  }, [entityCode, reload]);

  const genNo = useCallback((prefix: string) => {
    return generateVoucherNo(prefix, entityCode);
  }, [entityCode]);

  return { vouchers, listVouchers, getVoucher, createVoucher, cancelVoucher, genNo, reload };
}
