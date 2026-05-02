/**
 * Sprint27eMount · Sprint T-Phase-2.7-e
 *
 * DRY adapter that mounts the OOB-9 + OOB-10 trio in a transaction form:
 *   - InlineQuickAddDialog (Q1-b party Quick-Add)
 *   - PinFromVoucherButton (Q3-b pin)
 *   - PinnedTemplatesQuickLauncher (Q3-b clone)
 *   - Auto-clone-on-mount when URL has ?from_template=<id>
 *
 * Forms hand in their voucher state via render props · zero invasive changes
 * to existing form bodies · sibling pattern (matches Sprint27d2Mount).
 */
import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { InlineQuickAddDialog } from './InlineQuickAddDialog';
import { PinFromVoucherButton } from './PinFromVoucherButton';
import { PinnedTemplatesQuickLauncher } from './PinnedTemplatesQuickLauncher';
import { cloneTemplateToFormState, type ClonedTemplateState } from '@/lib/pinned-templates-engine';
import type { Party, PartyType } from '@/types/party';
import type { PinnedTemplateLineItem } from '@/types/pinned-template';

export interface Sprint27eMountHandle {
  openQuickAdd: (defaultName?: string) => void;
}

interface Props {
  entityCode: string;
  voucherTypeId: string;
  voucherTypeName: string;
  defaultPartyType: PartyType;
  partyId: string | null;
  partyName: string | null;
  lineItems: PinnedTemplateLineItem[];
  narration?: string | null;
  referenceNo?: string | null;
  /** Triggered when InlineQuickAddDialog creates a party. */
  onPartyCreated: (party: Party) => void;
  /** Triggered when operator clones a template (or auto-clones from URL). */
  onCloneTemplate: (state: ClonedTemplateState) => void;
  /** Suppress auto-clone on mount (e.g. when editing existing voucher). */
  disableAutoClone?: boolean;
  /** Hide the toolbar buttons · used when only Quick-Add is desired. */
  hideToolbar?: boolean;
}

export const Sprint27eMount = forwardRef<Sprint27eMountHandle, Props>(function Sprint27eMount(
  {
    entityCode,
    voucherTypeId,
    voucherTypeName,
    defaultPartyType,
    partyId,
    partyName,
    lineItems,
    narration,
    referenceNo,
    onPartyCreated,
    onCloneTemplate,
    disableAutoClone,
    hideToolbar,
  },
  ref,
) {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddName, setQuickAddName] = useState('');
  const autoCloneAppliedRef = useRef(false);

  useImperativeHandle(ref, () => ({
    openQuickAdd: (defaultName?: string) => {
      setQuickAddName(defaultName ?? '');
      setQuickAddOpen(true);
    },
  }), []);

  // Auto-clone on mount when ?from_template=<id>
  useEffect(() => {
    if (disableAutoClone || autoCloneAppliedRef.current) return;
    if (!entityCode) return;
    const params = new URLSearchParams(window.location.search);
    const tplId = params.get('from_template');
    if (!tplId) return;
    autoCloneAppliedRef.current = true;
    const state = cloneTemplateToFormState(entityCode, tplId);
    if (state) {
      onCloneTemplate(state);
      params.delete('from_template');
      const qs = params.toString();
      window.history.replaceState(
        {},
        '',
        window.location.pathname + (qs ? `?${qs}` : ''),
      );
    }
    // intentionally only on mount
  }, [entityCode, disableAutoClone, onCloneTemplate]);

  return (
    <>
      {!hideToolbar && (
        <div className="flex items-center gap-2 flex-wrap">
          <PinnedTemplatesQuickLauncher
            entityCode={entityCode}
            voucherTypeId={voucherTypeId}
            onClone={(s) => { if (s) onCloneTemplate(s); }}
          />
          <PinFromVoucherButton
            entityCode={entityCode}
            voucherTypeId={voucherTypeId}
            voucherTypeName={voucherTypeName}
            partyId={partyId}
            partyName={partyName}
            partyType={defaultPartyType}
            lineItems={lineItems}
            narration={narration}
            referenceNo={referenceNo}
          />
        </div>
      )}
      <InlineQuickAddDialog
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        entityCode={entityCode}
        defaultName={quickAddName}
        defaultPartyType={defaultPartyType}
        onCreated={(p) => {
          onPartyCreated(p);
          setQuickAddOpen(false);
        }}
      />
    </>
  );
});
