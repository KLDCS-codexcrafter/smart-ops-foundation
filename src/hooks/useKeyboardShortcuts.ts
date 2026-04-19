/**
 * useKeyboardShortcuts — Attach global keyboard handler
 */
import { useEffect } from 'react';
import {
  GLOBAL_SHORTCUTS, matchCombo,
} from '@/lib/keyboard-shortcut-registry';

export interface ShortcutHandlers {
  onHelp?: () => void;
  onPalette?: () => void;
  onSearch?: () => void;
  onSwitcher?: () => void;
  onDashboard?: () => void;
  onBack?: () => void;
  onHome?: () => void;
  onMasters?: () => void;
  onTransactions?: () => void;
  onReports?: () => void;
}

const MAP: Record<string, keyof ShortcutHandlers> = {
  'g-help': 'onHelp', 'g-palette': 'onPalette', 'g-search': 'onSearch',
  'g-switcher': 'onSwitcher', 'g-dashboard': 'onDashboard',
  'g-back': 'onBack', 'g-home': 'onHome',
  'c-masters': 'onMasters', 'c-transactions': 'onTransactions',
  'c-reports': 'onReports',
};

export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tgt = e.target as HTMLElement | null;
      const inField = !!tgt && ['INPUT', 'TEXTAREA', 'SELECT'].includes(tgt.tagName);
      for (const sc of GLOBAL_SHORTCUTS) {
        if (matchCombo(e, sc.combo)) {
          // Plain keys (no modifiers) shouldn't fire while typing
          if (inField && sc.combo === '?') continue;
          const hName = MAP[sc.id];
          const h = hName ? handlers[hName] : undefined;
          if (h) { e.preventDefault(); h(); }
          return;
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlers]);
}
