/**
 * @file     useVoucherClassMount.ts — Local hook for form-level voucher type state
 * @sprint   T-Phase-2.7-b · helper for VoucherClassMount embedding in 12 forms
 *
 *   Centralises the boilerplate · keeps each form mount to a single hook + JSX
 *   block · avoids react-refresh helper exports leaking from component files.
 */

import { useState, useCallback } from 'react';

export function useVoucherClassMount(initialId: string | null = null, initialName: string | null = null) {
  const [voucherTypeId, setVoucherTypeId] = useState<string | null>(initialId);
  const [voucherTypeName, setVoucherTypeName] = useState<string | null>(initialName);

  const onVoucherTypeChange = useCallback((id: string | null, name: string | null) => {
    setVoucherTypeId(id);
    setVoucherTypeName(name);
  }, []);

  return { voucherTypeId, voucherTypeName, onVoucherTypeChange };
}
