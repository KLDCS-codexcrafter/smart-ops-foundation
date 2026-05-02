/**
 * drill.ts — D-226 UTS Drill-down state types
 *
 * Sprint T-Phase-1.2.6b · Card #2.6 sub-sprint 2 of 6 · Q-Final lock (a)
 *
 * A drill trail is an immutable stack of crumbs. Each crumb represents one
 * level of navigation (register → record → child register → child record).
 *
 * Consumers: useDrillDown hook, DrillBreadcrumb component, every register
 * + report that supports Tally-Prime style click-through (1.2.6b/c/d/e).
 */

export interface DrillCrumb {
  /** Stable identity, e.g. record id or `${module}:${recordId}`. */
  id: string;
  /** Human label rendered inside the breadcrumb chip. */
  label: string;
  /** Hierarchy depth — 0 = root register, 1 = record detail, 2+ = nested. */
  level: number;
  /** Module/registerCode this crumb belongs to (e.g. 'grn_register'). */
  module: string;
  /** Free-form payload consumers can hang any context on (record snapshot, filters, etc.). */
  payload?: unknown;
}

export interface DrillState {
  trail: DrillCrumb[];
}

export const initialDrillState: DrillState = { trail: [] };

/** Pure reducer · push appends a crumb to the trail. */
export function drillPush(state: DrillState, crumb: DrillCrumb): DrillState {
  return { trail: [...state.trail, crumb] };
}

/** Pure reducer · pop removes the last crumb (no-op when empty). */
export function drillPop(state: DrillState): DrillState {
  if (state.trail.length === 0) return state;
  return { trail: state.trail.slice(0, -1) };
}

/** Pure reducer · goTo truncates the trail to the given crumb id (inclusive). */
export function drillGoTo(state: DrillState, crumbId: string): DrillState {
  const idx = state.trail.findIndex(c => c.id === crumbId);
  if (idx < 0) return state;
  return { trail: state.trail.slice(0, idx + 1) };
}

/** Pure reducer · reset clears the trail. */
export function drillReset(): DrillState {
  return { trail: [] };
}

/** Returns the deepest (current) crumb, or null when the trail is empty. */
export function drillCurrent(state: DrillState): DrillCrumb | null {
  if (state.trail.length === 0) return null;
  return state.trail[state.trail.length - 1];
}
