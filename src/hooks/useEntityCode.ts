/**
 * useEntityCode.ts — Resolves the active entity short-code (e.g. 'SMRT')
 * for the currently selected company in ERPHeader.
 *
 * PURPOSE      Replace hardcoded `'SMRT'` strings in voucher screens.
 * INPUT        none (reads from ERPCompany selection via useEntityList)
 * OUTPUT       { entityCode, entityId }
 * DEPENDENCIES @/hooks/useEntityList
 */
import { useMemo } from 'react';
import { useEntityList } from '@/hooks/useEntityList';

export function useEntityCode(): { entityCode: string; entityId: string } {
  const { selectedEntity, selectedEntityId } = useEntityList();
  return useMemo(() => ({
    entityCode: selectedEntity?.shortCode ?? 'SMRT',
    entityId: selectedEntityId,
  }), [selectedEntity, selectedEntityId]);
}
