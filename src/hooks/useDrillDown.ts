/**
 * useDrillDown.ts — React hook wrapper around the pure drill state machine.
 *
 * Sprint T-Phase-1.2.6b · Card #2.6 sub-sprint 2 of 6 · Q-Final lock (a)
 *
 * Pattern: drill.push({ id, label, level, module, payload }) appends a crumb.
 * Consumers render the deepest crumb's payload — when the trail is empty, the
 * register itself is shown.
 *
 * The pure reducers (drillPush/Pop/GoTo/Reset/Current) live in
 * `src/types/drill.ts` so they remain unit-testable without React.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  type DrillCrumb,
  type DrillState,
  initialDrillState,
  drillPush,
  drillPop,
  drillGoTo,
  drillReset,
  drillCurrent,
} from '@/types/drill';

export interface DrillContext {
  state: DrillState;
  trail: DrillCrumb[];
  current: DrillCrumb | null;
  push: (crumb: DrillCrumb) => void;
  pop: () => void;
  goTo: (crumbId: string) => void;
  reset: () => void;
}

export function useDrillDown(): DrillContext {
  const [state, setState] = useState<DrillState>(initialDrillState);

  const push  = useCallback((crumb: DrillCrumb) => setState(s => drillPush(s, crumb)), []);
  const pop   = useCallback(() => setState(s => drillPop(s)), []);
  const goTo  = useCallback((crumbId: string) => setState(s => drillGoTo(s, crumbId)), []);
  const reset = useCallback(() => setState(() => drillReset()), []);

  const current = useMemo(() => drillCurrent(state), [state]);

  return { state, trail: state.trail, current, push, pop, goTo, reset };
}
