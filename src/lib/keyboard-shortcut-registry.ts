/**
 * keyboard-shortcut-registry.ts — Global + per-card shortcuts
 * Single source of truth. ? opens help overlay.
 */

export interface KeyboardShortcut {
  id: string;
  combo: string;
  scope: 'global' | 'card';
  card_id?: string | null;
  description: string;
  handler?: () => void;
}

export const GLOBAL_SHORTCUTS: KeyboardShortcut[] = [
  { id: 'g-help',         combo: '?',           scope: 'global', description: 'Show keyboard shortcuts' },
  { id: 'g-palette',      combo: 'Ctrl+K',      scope: 'global', description: 'Command palette (Stage 3b)' },
  { id: 'g-search',       combo: 'Ctrl+Shift+F',scope: 'global', description: 'Cross-card search (Stage 3b)' },
  { id: 'g-switcher',     combo: 'Ctrl+Shift+D',scope: 'global', description: 'Department switcher' },
  { id: 'g-dashboard',    combo: 'Alt+D',       scope: 'global', description: 'Go to ERP Dashboard' },
  { id: 'g-back',         combo: 'Alt+B',       scope: 'global', description: 'Go back' },
  { id: 'g-home',         combo: 'Alt+H',       scope: 'global', description: 'Card home' },
  { id: 'c-masters',      combo: 'Alt+M',       scope: 'card',   description: 'Jump to Masters section' },
  { id: 'c-transactions', combo: 'Alt+T',       scope: 'card',   description: 'Jump to Transactions' },
  { id: 'c-reports',      combo: 'Alt+R',       scope: 'card',   description: 'Jump to Reports' },
];

/** Parse a KeyboardEvent and match to a combo string. */
export function matchCombo(e: KeyboardEvent, combo: string): boolean {
  const parts = combo.toLowerCase().split('+');
  const keyWant = parts[parts.length - 1];
  const needsCtrl  = parts.includes('ctrl');
  const needsShift = parts.includes('shift');
  const needsAlt   = parts.includes('alt');
  const needsMeta  = parts.includes('cmd') || parts.includes('meta');
  if (needsCtrl !== e.ctrlKey) return false;
  if (needsShift !== e.shiftKey) return false;
  if (needsAlt !== e.altKey) return false;
  if (needsMeta !== e.metaKey) return false;
  return e.key.toLowerCase() === keyWant;
}
