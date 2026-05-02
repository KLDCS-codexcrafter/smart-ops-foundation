/**
 * useFormKeyboardShortcuts · Sprint T-Phase-2.7-d-2 · Q1-a centralized form-level shortcuts
 *
 * Sibling to existing useCtrlS/onEnterNext (kept · zero behavior change in 10+ forms).
 * This hook adds the rich set: F1/F2/F4/Ctrl+F/Alt+I/Alt+D/etc.
 *
 * Forms typically call BOTH:
 *   useCtrlS(handleSave)                          // existing · save shortcut
 *   useFormKeyboardShortcuts({...handlers})       // new · rich form bindings
 *
 * To avoid double-fire on Ctrl+S · forms should NOT pass `onSaveDraft` here
 * (existing useCtrlS handles save) · this hook handles everything else.
 */
import { useEffect, useRef } from 'react';
import {
  UNIVERSAL_FORM_BINDINGS,
  matchFormShortcut,
  type ShortcutAction,
  type ShortcutBinding,
} from '@/lib/form-keyboard-engine';

export interface FormKeyboardConfig {
  // Voucher commands
  onSaveDraft?: () => void;
  onSavePost?: () => void;
  onSaveAndNew?: () => void;
  // Cell + grid
  onEditCell?: () => void;
  onOpenPicker?: () => void;
  onFindInVoucher?: () => void;
  onFindReplace?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onInsertLine?: () => void;
  onDeleteLine?: () => void;
  onDuplicateLine?: () => void;
  onMergeWithAbove?: () => void;
  onMoveLineUp?: () => void;
  onMoveLineDown?: () => void;
  onGoToLine?: () => void;
  // Safety
  onCancelOrClose?: () => void;
  // Help
  onHelp?: () => void;
  // Custom bindings
  customBindings?: Array<{ binding: ShortcutBinding; handler: () => void }>;
  /** Disable hook when modal is open (prevents shortcut conflict). */
  disabled?: boolean;
}

const ACTION_TO_KEY: Record<ShortcutAction, keyof FormKeyboardConfig> = {
  save_draft:       'onSaveDraft',
  save_post:        'onSavePost',
  save_and_new:     'onSaveAndNew',
  edit_cell:        'onEditCell',
  open_picker:      'onOpenPicker',
  find_in_voucher:  'onFindInVoucher',
  find_replace:     'onFindReplace',
  undo:             'onUndo',
  redo:             'onRedo',
  insert_line:      'onInsertLine',
  delete_line:      'onDeleteLine',
  duplicate_line:   'onDuplicateLine',
  merge_with_above: 'onMergeWithAbove',
  move_line_up:     'onMoveLineUp',
  move_line_down:   'onMoveLineDown',
  goto_line:        'onGoToLine',
  cancel_or_close:  'onCancelOrClose',
  help:             'onHelp',
};

export function useFormKeyboardShortcuts(config: FormKeyboardConfig): void {
  const cfgRef = useRef(config);
  cfgRef.current = config;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cfg = cfgRef.current;
      if (cfg.disabled) return;

      // Custom bindings first (allow override of universal)
      const allBindings = [
        ...(cfg.customBindings?.map((c) => c.binding) ?? []),
        ...UNIVERSAL_FORM_BINDINGS,
      ];
      const m = matchFormShortcut(e, allBindings);
      if (!m) return;

      // Custom binding handler
      const custom = cfg.customBindings?.find((c) => c.binding.combo === m.binding.combo);
      if (custom) {
        e.preventDefault();
        custom.handler();
        return;
      }

      const handlerKey = ACTION_TO_KEY[m.binding.action];
      const handler = cfg[handlerKey] as (() => void) | undefined;
      if (typeof handler === 'function') {
        e.preventDefault();
        handler();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
