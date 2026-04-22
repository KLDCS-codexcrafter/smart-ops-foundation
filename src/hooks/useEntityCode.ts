/**
 * useEntityCode.ts — Resolves the active entity short-code (e.g. 'SMRT')
 * for the currently selected ERP company.
 *
 * SPRINT T10-pre.1c — Migrated to consume ERPCompanyProvider Context so every
 * caller re-renders when the user switches company in the header dropdown.
 *
 * Behavior:
 *   - When selectedCompany === 'all', returns entityCode='' so callers that
 *     gate on a non-empty entityCode correctly refuse to operate. Session B.1
 *     adds the "Select a company to continue" gate based on this.
 *   - Otherwise resolves through useEntityList to map ID → shortCode.
 *
 * INPUT        none (reads from ERPCompanyProvider)
 * OUTPUT       { entityCode, entityId }
 * DEPENDENCIES @/components/layout/ERPCompanyProvider, @/hooks/useEntityList
 */
import { useMemo } from 'react';
import { useEntityList } from '@/hooks/useEntityList';
import { useERPCompanyContext } from '@/components/layout/ERPCompanyProvider';

export function useEntityCode(): { entityCode: string; entityId: string } {
  const [selectedCompany] = useERPCompanyContext();
  const { entities, selectedEntity } = useEntityList();

  return useMemo(() => {
    if (selectedCompany === 'all') {
      return { entityCode: '', entityId: 'all' };
    }
    const entity = entities.find(
      e => e.id === selectedCompany || e.shortCode === selectedCompany,
    ) ?? selectedEntity;
    return {
      entityCode: entity?.shortCode ?? selectedCompany ?? 'SMRT',
      entityId: entity?.id ?? selectedCompany ?? '',
    };
  }, [selectedCompany, entities, selectedEntity]);
}
