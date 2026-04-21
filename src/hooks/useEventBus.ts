/**
 * useEventBus — React hook wrapping event-bus for lifecycle-safe listeners.
 *
 * PURPOSE      Auto-unsubscribes the listener on unmount.
 * INPUT        event name + listener fn
 * OUTPUT       void
 * DEPENDENCIES @/lib/event-bus
 * TALLY-ON-TOP BEHAVIOR  none (pure plumbing)
 * SPEC DOC     /docs/Operix_Phase1_Roadmap.xlsx — D-013
 */
import { useEffect } from 'react';
import { on, type EventMap } from '@/lib/event-bus';

export function useEventBus<K extends keyof EventMap>(
  event: K,
  listener: (payload: EventMap[K]) => void,
) {
  useEffect(() => {
    const unsubscribe = on(event, listener);
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);
}
