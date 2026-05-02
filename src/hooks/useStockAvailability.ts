/**
 * useStockAvailability.ts — React wrapper for stock-reservation-engine
 * Sprint T-Phase-1.1.1m · Operix MOAT #19 · D-186
 *
 * Sprint T-Phase-2.7-d-1 (Q1-d) · adds sibling `useDetailedStockAvailability`
 * for level-tagged breakdown (quote vs order). Existing hook UNCHANGED.
 *
 * [JWT] Phase 2: replaces localStorage reads with GET /api/inventory/availability
 */
import { useEffect, useMemo, useState } from 'react';
import {
  getAvailabilityMap,
  getDetailedAvailabilityMap,
  sweepExpiredReservations,
  type DetailedAvailabilityCell,
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

/**
 * Sprint 2.7-d-1 · Q1-d · sibling hook for detailed level-tagged breakdown.
 * Existing useStockAvailability remains untouched (QuotationEntry "Avail" column).
 */
export function useDetailedStockAvailability(
  entityCode: string,
  itemNames: string[],
  requestedQtyByItem?: Map<string, number>,
): { availabilityMap: Map<string, DetailedAvailabilityCell>; isLoading: boolean; refresh: () => void } {
  const [version, setVersion] = useState(0);

  const namesKey = useMemo(
    () => Array.from(new Set(itemNames.filter(n => n && n.trim()))).sort().join('|'),
    [itemNames],
  );

  // Stable key for requested-qty dependency
  const requestedKey = useMemo(() => {
    if (!requestedQtyByItem || requestedQtyByItem.size === 0) return '';
    return Array.from(requestedQtyByItem.entries())
      .filter(([k]) => k && k.trim())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join('|');
  }, [requestedQtyByItem]);

  useEffect(() => {
    if (!entityCode) return;
    sweepExpiredReservations(entityCode);
    setVersion(v => v + 1);
  }, [entityCode]);

  const availabilityMap = useMemo<Map<string, DetailedAvailabilityCell>>(() => {
    if (!entityCode) return new Map();
    return getDetailedAvailabilityMap(
      namesKey ? namesKey.split('|') : [],
      entityCode,
      requestedQtyByItem,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, namesKey, requestedKey, version]);

  return { availabilityMap, isLoading: false, refresh: () => setVersion(v => v + 1) };
}
