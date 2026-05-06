/**
 * useFactoryContext.ts — Factory context hooks (extracted from FactoryContext.tsx)
 * Sprint T-Phase-1.3-3-PlantOps-pre-1-fix-1 · D-577
 *
 * Hooks moved here to satisfy react-refresh/only-export-components.
 */
import { useContext } from 'react';
import { FactoryContext, type FactoryContextValue } from '@/contexts/FactoryContext';

export function useFactoryContext(): FactoryContextValue {
  const ctx = useContext(FactoryContext);
  if (!ctx) throw new Error('useFactoryContext must be used within FactoryProvider');
  return ctx;
}

export function useOptionalFactoryContext(): FactoryContextValue | null {
  return useContext(FactoryContext) ?? null;
}
