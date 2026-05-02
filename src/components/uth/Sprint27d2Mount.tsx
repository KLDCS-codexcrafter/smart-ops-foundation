/**
 * Sprint27d2Mount · Sprint T-Phase-2.7-d-2 uniform integration helper
 *
 * Single component that mounts the keyboard shortcut overlay, line-item search bar,
 * and bulk-paste dialog for a transaction form · plus registers the
 * useFormKeyboardShortcuts hook.
 *
 * Forms call this once · pass formName + items + onCommitBulkRows + isLineItemForm.
 * Existing useCtrlS(handleSave) calls in forms are PRESERVED — we don't pass
 * `onSaveDraft` to the new hook (avoids double-fire).
 */
import { useState, useEffect } from 'react';
import { useFormKeyboardShortcuts } from '@/hooks/useFormKeyboardShortcuts';
import { KeyboardShortcutOverlay } from '@/components/uth/KeyboardShortcutOverlay';
import { LineItemSearchBar } from '@/components/uth/LineItemSearchBar';
import { BulkPasteDialog } from '@/components/uth/BulkPasteDialog';
import { Button } from '@/components/ui/button';
import { ClipboardPaste } from 'lucide-react';
import { shouldAutoTriggerBulkPaste, type PasteRow } from '@/lib/bulk-paste-engine';
import { evaluateInlineFormula } from '@/lib/form-keyboard-engine';

interface Props {
  formName: string;
  entityCode: string;
  items: Array<Record<string, unknown>>;
  isLineItemForm: boolean;
  onCommitBulkRows?: (rows: PasteRow[]) => void;
  onJumpToRow?: (rowIndex: number) => void;
  showBulkPasteButton?: boolean;
}

export function Sprint27d2Mount({
  formName,
  entityCode,
  items,
  isLineItemForm,
  onCommitBulkRows,
  onJumpToRow,
  showBulkPasteButton = true,
}: Props) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [bulkPasteOpen, setBulkPasteOpen] = useState(false);
  const [pendingPaste, setPendingPaste] = useState<string | undefined>(undefined);

  useFormKeyboardShortcuts({
    onHelp: () => setHelpOpen(true),
    onFindInVoucher: isLineItemForm ? () => setSearchOpen(true) : undefined,
    onCancelOrClose: () => {
      if (helpOpen) setHelpOpen(false);
      else if (searchOpen) setSearchOpen(false);
      else if (bulkPasteOpen) setBulkPasteOpen(false);
    },
    disabled: helpOpen || bulkPasteOpen,
  });

  // Q2-d auto-detect: form-level paste listener · open dialog if ≥3 lines + tab/comma
  useEffect(() => {
    if (!isLineItemForm || !onCommitBulkRows) return;
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      // Skip when paste happens inside the bulk-paste textarea itself
      if (target?.closest('[role="dialog"]')) return;
      // Skip when focus is in an input/textarea (single-cell paste workflow)
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const text = e.clipboardData?.getData('text') ?? '';
      if (shouldAutoTriggerBulkPaste(text)) {
        e.preventDefault();
        setPendingPaste(text);
        setBulkPasteOpen(true);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [isLineItemForm, onCommitBulkRows]);

  function handleCommit(rows: PasteRow[]) {
    onCommitBulkRows?.(rows);
    setPendingPaste(undefined);
  }

  return (
    <>
      <KeyboardShortcutOverlay
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        formName={formName}
      />
      {isLineItemForm && (
        <>
          <LineItemSearchBar
            open={searchOpen}
            onClose={() => setSearchOpen(false)}
            items={items}
            onJumpToRow={(idx) => onJumpToRow?.(idx)}
          />
          {onCommitBulkRows && (
            <>
              {showBulkPasteButton && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setPendingPaste(undefined); setBulkPasteOpen(true); }}
                  className="gap-2"
                >
                  <ClipboardPaste className="h-4 w-4" />
                  Bulk Paste
                </Button>
              )}
              <BulkPasteDialog
                open={bulkPasteOpen}
                onClose={() => setBulkPasteOpen(false)}
                entityCode={entityCode}
                initialPaste={pendingPaste}
                onCommit={handleCommit}
              />
            </>
          )}
        </>
      )}
    </>
  );
}
