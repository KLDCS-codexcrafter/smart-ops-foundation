/**
 * useEntityChangeEffect — Run a side-effect when the user switches entity.
 *
 * PURPOSE      Clean replacement for ad-hoc useEffect+eventBus.on boilerplate.
 *              Use case: voucher forms that want to reset on entity switch,
 *              report wrappers that need to refetch.
 *
 * INPUT        effect: (payload: { fromEntityCode, toEntityCode, ... }) => void
 *              deps:   React dependency list (default [])
 *
 * OUTPUT       cleans up its own subscription on unmount
 *
 * DEPENDENCIES react, event-bus
 *
 * SPEC DOC     Sprint T10-pre.1c Session A — supports Q5 migration of 19 files
 *              from useERPCompany direct to useEntityCode + useEntityChangeEffect.
 */
import { useEffect, type DependencyList } from 'react';
import { eventBus } from '@/lib/event-bus';

export function useEntityChangeEffect(
  effect: (payload: {
    fromEntityCode: string;
    toEntityCode: string;
    userId: string;
    timestamp: string;
  }) => void,
  deps: DependencyList = [],
): void {
  useEffect(() => {
    const off = eventBus.on('entity.changed', effect);
    return () => { off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
