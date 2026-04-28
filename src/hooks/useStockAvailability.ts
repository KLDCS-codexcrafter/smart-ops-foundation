/**
 * useStockAvailability.ts — React wrapper for stock-reservation-engine
 * Sprint T-Phase-1.1.1m · Operix MOAT #19 · D-186
 *
 * Consumed by QuotationEntry.tsx for the "Avail" column.
 * [JWT] Phase 2: replaces localStorage reads with GET /api/inventory/availability
 */
import { useEffect, useMemo, useState } from 'react';
import {
  getAvailabilityMap,
  sweepExpiredReservations,
} from '@/lib/stock-reservation-engine';

export interface AvailabilityCell {
  onHand: number;
  reserved: number;
  available: number;
}

export function useStockAvailability(entityCode: string, itemNames: string[]) {
  const [version, setVersion] = useState(0);

  // Stable key for itemNames dependency
  const namesKey = useMemo(
    () => Array.from(new Set(itemNames.filter(n => n && n.trim()))).sort().join('|'),
    [itemNames],
  );

  // Sweep expired on mount + entity change
  useEffect(() => {
    if (!entityCode) return;
    sweepExpiredReservations(entityCode);
    setVersion(v => v + 1);
  }, [entityCode]);

  const availabilityMap = useMemo<Map<string, AvailabilityCell>>(() => {
    if (!entityCode) return new Map();
    return getAvailabilityMap(namesKey ? namesKey.split('|') : [], entityCode);
    // version invalidates after sweep
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, namesKey, version]);

  const refresh = () => setVersion(v => v + 1);

  return { availabilityMap, refresh };
}
