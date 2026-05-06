/**
 * @file     useProductionConfig.ts
 * @sprint   T-Phase-1.3-3a-pre-1
 * @purpose  CC-Replica reader for ProductionConfig (FR-54).
 */
import { useEffect, useState, useCallback } from 'react';
import {
  comply360ProductionKey,
  DEFAULT_PRODUCTION_CONFIG,
  type ProductionConfig,
} from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityChangeEffect } from '@/hooks/useEntityChangeEffect';

export function useProductionConfig(): ProductionConfig {
  const { entityCode } = useEntityCode();
  const [config, setConfig] = useState<ProductionConfig>(DEFAULT_PRODUCTION_CONFIG);

  const reload = useCallback(() => {
    try {
      // [JWT] GET /api/comply360/production-config/:entityCode
      const raw = localStorage.getItem(comply360ProductionKey(entityCode));
      setConfig(
        raw
          ? { ...DEFAULT_PRODUCTION_CONFIG, ...(JSON.parse(raw) as Partial<ProductionConfig>) }
          : DEFAULT_PRODUCTION_CONFIG,
      );
    } catch {
      setConfig(DEFAULT_PRODUCTION_CONFIG);
    }
  }, [entityCode]);

  useEffect(() => { reload(); }, [reload]);
  useEntityChangeEffect(reload, [reload]);

  return config;
}
