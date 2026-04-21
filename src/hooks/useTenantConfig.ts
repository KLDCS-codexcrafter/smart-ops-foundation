/**
 * useTenantConfig — React hook exposing tenant config to components.
 *
 * PURPOSE      Components NEVER touch tenant-config-engine directly; they go through this hook.
 * INPUT        entityCode
 * OUTPUT       { config, update, accountingMode }
 * DEPENDENCIES @/lib/tenant-config-engine
 * TALLY-ON-TOP BEHAVIOR  accountingMode drives chip visibility + GL posting routing
 * SPEC DOC     /docs/Operix_Phase1_Roadmap.xlsx — D-002, D-003
 */
import { useMemo, useState, useCallback } from 'react';
import {
  loadTenantConfig, updateTenantConfig,
  type TenantConfig,
} from '@/lib/tenant-config-engine';

export function useTenantConfig(entityCode: string) {
  const [version, setVersion] = useState(0);
  const config = useMemo<TenantConfig>(
    () => loadTenantConfig(entityCode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, version],
  );
  const update = useCallback(
    (patch: Parameters<typeof updateTenantConfig>[1]) => {
      updateTenantConfig(entityCode, patch);
      setVersion(v => v + 1);
    },
    [entityCode],
  );
  return { config, update, accountingMode: config.accounting_mode };
}
