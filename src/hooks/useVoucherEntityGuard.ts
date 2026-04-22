/**
 * useVoucherEntityGuard — Protect voucher forms during entity switch.
 *
 * PURPOSE
 * Every FinCore-conformant voucher form subscribes via this hook. When the user
 * switches entity in the header dropdown:
 *   1. Hook intercepts via eventBus.on('entity.beforeChange').
 *   2. If the form is dirty, it calls payload.prevent() (aborting the switch
 *      mid-flight) and opens a 3-choice AlertDialog:
 *      - Discard       → clears form, then forceSwitchEntity(target)
 *      - Save as Draft → calls onSaveDraft tagged with the CURRENT entity,
 *                        clears form, then forceSwitchEntity(target)
 *      - Cancel        → leaves form intact, switch stays aborted
 *   3. If the form is clean, the switch proceeds silently.
 *
 * INPUT
 *   isDirty            — form's own dirty check
 *   serializeFormState — capture current state for draft persistence
 *   onSaveDraft        — existing FinCorePage callback (optional)
 *   clearForm          — reset to blank state
 *   voucherTypeName    — for dialog copy + draft label
 *   fineCoreModule     — module id used to re-open the draft from DraftTray
 *   currentEntityCode  — entity to tag the draft with
 *
 * OUTPUT { GuardDialog: ReactNode } — render this inside your voucher form.
 *
 * DEPENDENCIES react, shadcn AlertDialog, event-bus, sonner toast,
 *              ERPCompanyProvider.useForceSwitchEntity, DraftTray types.
 *
 * SPEC DOC     Sprint T10-pre.1c Session A — Q1 / Q6 / Q7 decisions.
 */
import { useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { eventBus } from '@/lib/event-bus';
import { toast } from 'sonner';
import { useForceSwitchEntity } from '@/components/layout/ERPCompanyProvider';
import type { DraftEntry, FineCoreModule } from '@/components/finecore/DraftTray';
import type { Voucher } from '@/types/voucher';

interface VoucherEntityGuardParams {
  isDirty: () => boolean;
  serializeFormState: () => Partial<Voucher>;
  onSaveDraft?: (draft: DraftEntry) => void;
  clearForm: () => void;
  voucherTypeName: string;
  fineCoreModule: FineCoreModule;
  currentEntityCode: string;
}

interface VoucherEntityGuardReturn {
  GuardDialog: ReactNode;
}

interface PendingSwitch {
  fromEntityCode: string;
  toEntityCode: string;
}

export function useVoucherEntityGuard({
  isDirty, serializeFormState, onSaveDraft, clearForm,
  voucherTypeName, fineCoreModule, currentEntityCode,
}: VoucherEntityGuardParams): VoucherEntityGuardReturn {
  const [pending, setPending] = useState<PendingSwitch | null>(null);
  const forceSwitch = useForceSwitchEntity();

  useEffect(() => {
    const off = eventBus.on('entity.beforeChange', (payload) => {
      if (!isDirty()) return;            // clean form → let switch proceed
      payload.prevent();                  // dirty form → abort, open dialog
      setPending({
        fromEntityCode: payload.fromEntityCode,
        toEntityCode: payload.toEntityCode,
      });
    });
    return () => { off(); };
    // isDirty is captured by closure; subscribing once per mount is correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDiscard = useCallback(() => {
    if (!pending) return;
    const target = pending.toEntityCode;
    clearForm();
    setPending(null);
    toast.info('Voucher discarded. Switching company…');
    forceSwitch(target);
  }, [pending, clearForm, forceSwitch]);

  const handleSaveAsDraft = useCallback(() => {
    if (!pending) return;
    if (!onSaveDraft) {
      toast.error('Draft save unavailable here — please cancel or discard.');
      return;
    }
    const target = pending.toEntityCode;
    const formState = serializeFormState();
    onSaveDraft({
      id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      module: fineCoreModule,
      label: `${voucherTypeName} — draft`,
      voucherTypeName,
      formState: { ...formState, entity_id: currentEntityCode },
      savedAt: new Date().toISOString(),
      entityId: currentEntityCode,
    });
    clearForm();
    setPending(null);
    toast.success(`${voucherTypeName} saved as draft. Switching company…`);
    forceSwitch(target);
  }, [
    pending, onSaveDraft, serializeFormState, clearForm,
    voucherTypeName, fineCoreModule, currentEntityCode, forceSwitch,
  ]);

  const handleCancel = useCallback(() => {
    setPending(null);
    toast.info('Switch cancelled. Staying on current company.');
  }, []);

  const GuardDialog: ReactNode = (
    <AlertDialog
      open={pending !== null}
      onOpenChange={(open) => { if (!open && pending) handleCancel(); }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved work on this {voucherTypeName} voucher. Switching to a
            different company will lose it unless you save it as a draft.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
          <Button variant="destructive" onClick={handleDiscard}>Discard</Button>
          <Button variant="default" onClick={handleSaveAsDraft}>Save as Draft</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { GuardDialog };
}
