/**
 * FactoryContext.tsx — Global Factory selection state (D-574)
 * Sprint T-Phase-1.3-3-PlantOps-pre-1 · adapted from craft-company-canvas
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useFactories } from '@/hooks/useFactories';
import { getTemplateById } from '@/config/manufacturing-templates';
import { FactoryContext } from '@/contexts/FactoryContext.types';
import type { FactoryContextValue } from '@/contexts/FactoryContext.types';

const STORAGE_KEY = 'erp_selected_factory_id';

export function FactoryProvider({ children }: { children: React.ReactNode }) {
  const [selectedFactoryId, setSelectedFactoryId] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  });

  const { allFactories, reload } = useFactories();

  const factoryList = allFactories;
  const configuredFactories = useMemo(
    () => factoryList.filter(f => f.manufacturing_config !== null),
    [factoryList],
  );
  const unconfiguredFactories = useMemo(
    () => factoryList.filter(f => f.manufacturing_config === null),
    [factoryList],
  );

  const selectedFactory = useMemo(
    () => factoryList.find(f => f.id === selectedFactoryId) ?? null,
    [factoryList, selectedFactoryId],
  );

  const factoryConfig = selectedFactory?.manufacturing_config ?? null;
  const template = factoryConfig ? getTemplateById(factoryConfig.primary_template_id) ?? null : null;

  const selectFactory = useCallback((factoryId: string) => {
    setSelectedFactoryId(factoryId);
    try { localStorage.setItem(STORAGE_KEY, factoryId); } catch { /* silent */ }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFactoryId(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* silent */ }
  }, []);

  const isModuleEnabled = useCallback(
    (moduleKey: string) => factoryConfig?.enabled_modules.includes(moduleKey) ?? false,
    [factoryConfig],
  );

  const getPrimaryKPIs = useCallback(() => template?.primary_kpis ?? [], [template]);
  const getSecondaryKPIs = useCallback(() => template?.secondary_kpis ?? [], [template]);
  const getQCParameters = useCallback(() => template?.qc_parameters ?? [], [template]);
  const getComplianceStandards = useCallback(() => template?.compliance_standards ?? [], [template]);

  const value: FactoryContextValue = {
    selectedFactoryId,
    selectedFactory,
    factoryConfig,
    template,
    configuredFactories,
    unconfiguredFactories,
    allFactories: factoryList,
    isLoading: false,
    selectFactory,
    clearSelection,
    refreshFactories: reload,
    isModuleEnabled,
    getPrimaryKPIs,
    getSecondaryKPIs,
    getQCParameters,
    getComplianceStandards,
  };

  return <FactoryContext.Provider value={value}>{children}</FactoryContext.Provider>;
}

