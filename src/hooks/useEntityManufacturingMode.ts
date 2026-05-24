/**
 * @file        src/hooks/useEntityManufacturingMode.ts
 * @sprint      T-Phase-3.PROD-2.5 · Sub-theme 5 · Q-LOCK-11
 * @purpose     React hook · returns current entity's full MfgModePreset.
 * @disciplines Subscribes to useEntityChangeEffect · matches useProductionLaneKPIs pattern (PROD-1 ST6)
 */
import { useState, useCallback, useEffect } from 'react';
import { useEntityChangeEffect } from '@/hooks/useEntityChangeEffect';
import {
  getEntityManufacturingMode,
  loadManufacturingModePreset,
  type MfgModePreset,
} from '@/lib/entity-setup-service';

export function useEntityManufacturingMode(entityCode: string): MfgModePreset {
  const compute = useCallback(() => {
    const mode = getEntityManufacturingMode(entityCode);
    return loadManufacturingModePreset(mode);
  }, [entityCode]);

  const [preset, setPreset] = useState<MfgModePreset>(compute);

  const reload = useCallback(() => {
    setPreset(compute());
  }, [compute]);

  useEffect(() => { reload(); }, [reload]);
  useEntityChangeEffect(reload, [reload]);

  return preset;
}
