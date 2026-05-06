/**
 * FactoryContext.types.ts — Context object + type (extracted to satisfy react-refresh)
 * Sprint T-Phase-1.3-3-PlantOps-pre-1-fix-1 · D-577
 */
import { createContext } from 'react';
import type { Factory, ManufacturingConfig } from '@/types/factory';
import type { ManufacturingTemplate } from '@/config/manufacturing-templates';

export interface FactoryContextValue {
  selectedFactoryId: string | null;
  selectedFactory: Factory | null;
  factoryConfig: ManufacturingConfig | null;
  template: ManufacturingTemplate | null;

  configuredFactories: Factory[];
  unconfiguredFactories: Factory[];
  allFactories: Factory[];

  isLoading: boolean;

  selectFactory: (factoryId: string) => void;
  clearSelection: () => void;
  refreshFactories: () => void;

  isModuleEnabled: (moduleKey: string) => boolean;
  getPrimaryKPIs: () => string[];
  getSecondaryKPIs: () => string[];
  getQCParameters: () => ManufacturingTemplate['qc_parameters'];
  getComplianceStandards: () => string[];
}

export const FactoryContext = createContext<FactoryContextValue | undefined>(undefined);
