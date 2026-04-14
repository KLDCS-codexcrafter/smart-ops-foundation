/**
 * useEntityList.ts — reads all entities from Foundation storage
 * Returns the entity list, selected entity, and multi-entity flag.
 * Used by Pay Hub, FineCore (Sprint 22), and all future modules.
 */
import { useMemo, useCallback } from 'react';
import { useERPCompany, type ERPCompany } from '@/components/layout/ERPCompanySelector';

export interface EntityListItem extends ERPCompany {
  entityType: 'parent' | 'company' | 'subsidiary' | 'branch';
  shortCode?: string;
}

function loadAllEntities(): EntityListItem[] {
  const entities: EntityListItem[] = [];
  try {
    // [JWT] GET /api/foundation/entities/all
    const parent = localStorage.getItem('erp_parent_company');
    if (parent) {
      const p = JSON.parse(parent);
      if (p.legalEntityName) {
        entities.push({
          id: 'parent-root',
          name: p.legalEntityName,
          gstin: p.gstRegs?.[0]?.gstin ?? undefined,
          shortCode: p.shortCode ?? undefined,
          entityType: 'parent',
        });
      }
    }
  } catch { /* ignore */ }

  try {
    // [JWT] GET /api/foundation/companies
    const companies = JSON.parse(localStorage.getItem('erp_companies') || '[]');
    companies.forEach((c: any) => {
      if (c.id && c.legalEntityName) {
        entities.push({
          id: c.id,
          name: c.legalEntityName,
          gstin: c.gstRegs?.[0]?.gstin ?? undefined,
          shortCode: c.shortCode ?? undefined,
          entityType: 'company',
        });
      }
    });
  } catch { /* ignore */ }

  try {
    // [JWT] GET /api/foundation/subsidiaries
    const subs = JSON.parse(localStorage.getItem('erp_subsidiaries') || '[]');
    subs.forEach((s: any) => {
      if (s.id && s.legalEntityName) {
        entities.push({
          id: s.id,
          name: s.legalEntityName,
          gstin: s.gstRegs?.[0]?.gstin ?? undefined,
          shortCode: s.shortCode ?? undefined,
          entityType: 'subsidiary',
        });
      }
    });
  } catch { /* ignore */ }

  try {
    // [JWT] GET /api/foundation/branch-offices
    const branches = JSON.parse(localStorage.getItem('erp_branch_offices') || '[]');
    branches.forEach((b: any) => {
      if (b.id && b.name && (b.status === 'Active' || b.status === 'active' || !b.status)) {
        entities.push({
          id: b.id,
          name: b.name,
          gstin: b.gstinNo ?? undefined,
          shortCode: b.shortCode ?? b.code ?? undefined,
          entityType: 'branch',
        });
      }
    });
  } catch { /* ignore */ }

  return entities;
}

export function useEntityList() {
  const [selectedEntityId, setSelectedEntityId] = useERPCompany();

  const entities = useMemo(() => loadAllEntities(), []);

  // If no entity is selected or the selection is stale, default to first entity
  const resolvedId = useMemo(() => {
    if (!selectedEntityId || selectedEntityId === 'all') {
      return entities[0]?.id ?? 'parent-root';
    }
    // Verify selected entity still exists
    if (entities.find(e => e.id === selectedEntityId)) return selectedEntityId;
    return entities[0]?.id ?? 'parent-root';
  }, [selectedEntityId, entities]);

  const selectedEntity = entities.find(e => e.id === resolvedId) ?? null;
  const isMultiEntity = entities.length > 1;

  const setEntity = useCallback((id: string) => {
    setSelectedEntityId(id);
  }, [setSelectedEntityId]);

  return {
    entities,           // all entities for the selector dropdown
    selectedEntityId: resolvedId,
    setSelectedEntityId: setEntity,
    selectedEntity,     // full entity object or null
    isMultiEntity,      // true if more than 1 entity — drives selector visibility
  };
}
