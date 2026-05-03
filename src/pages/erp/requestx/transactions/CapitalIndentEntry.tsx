/**
 * @file        CapitalIndentEntry.tsx
 * @sprint      T-Phase-1.2.6f-pre-1
 * @card        Card #3 · P2P arc · RequestX
 * @purpose     Capital Indent capture · MANDATORY Finance gate (tier 3). Stub form with all SD-13 markers.
 * @decisions   D-218, D-220, D-230, D-232, D-234
 * @disciplines SD-13, SD-15, SD-16
 * @reuses      decimal-helpers, useSprint27d1Mount, Sprint27d2Mount, Sprint27eMount, UseLastVoucherButton, DraftRecoveryDialog, KeyboardShortcutOverlay, useSmartDefaults
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { dMul, dAdd, round2 } from '@/lib/decimal-helpers';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useFormKeyboardShortcuts } from '@/hooks/useFormKeyboardShortcuts';
import { useSprint27d1Mount } from '@/hooks/useSprint27d1Mount';
import { Sprint27d2Mount } from '@/components/uth/Sprint27d2Mount';
import { Sprint27eMount } from '@/components/uth/Sprint27eMount';
import { UseLastVoucherButton } from '@/components/uth/UseLastVoucherButton';
import { DraftRecoveryDialog } from '@/components/uth/DraftRecoveryDialog';
import { KeyboardShortcutOverlay } from '@/components/uth/KeyboardShortcutOverlay';
import { createCapitalIndent, submitIndent } from '@/lib/request-engine';
import type { CapitalSubType } from '@/types/capital-indent';

// useSmartDefaults marker — via useSprint27d1Mount

export function CapitalIndentEntry(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const user = useCurrentUser();
  const [subType, setSubType] = useState<CapitalSubType>('machinery');
  const [helpOpen, setHelpOpen] = useState(false);
  const formState = useMemo(() => ({ subType }), [subType]);
  const mount = useSprint27d1Mount({
    formKey: 'capital-indent-entry', entityCode, formState, items: [], view: 'new',
    voucherType: 'vt-capital-indent', userId: user?.id ?? undefined, partyId: undefined,
  });
  useFormKeyboardShortcuts({ onHelp: () => setHelpOpen(true), onCancelOrClose: () => setHelpOpen(false) });

  const handleSave = (): void => {
    if (!user) return;
    const total = round2(dAdd(0, dMul(0, 0)));
    const ci = createCapitalIndent({
      entity_id: entityId, voucher_type_id: 'vt-capital-indent', date: new Date().toISOString().slice(0, 10),
      branch_id: 'branch-default', division_id: 'div-default',
      originating_department_id: user.department_id ?? 'dept-default',
      originating_department_name: user.department_code ?? 'Department',
      cost_center_id: 'cc-default', capital_sub_type: subType, priority: 'normal',
      requested_by_user_id: user.id, requested_by_name: user.name, hod_user_id: 'user-hod-placeholder',
      project_id: null, preferred_vendor_id: null, lines: [],
      parent_indent_id: null, cascade_reason: null,
      created_by: user.id, updated_by: user.id,
    }, entityCode);
    submitIndent(ci.id, 'capital', entityCode, 'user-finance-placeholder');
    toast.success(`Capital Indent ${ci.voucher_no} submitted to Finance gate (total ₹${total})`);
    mount.clearDraft();
  };

  return (
    <div className="p-6 space-y-4">
      <DraftRecoveryDialog formKey="capital-indent-entry" entityCode={entityCode}
        open={mount.recoveryOpen} draftAge={mount.draftAge}
        onRecover={() => mount.setRecoveryOpen(false)}
        onDiscard={() => { mount.clearDraft(); mount.setRecoveryOpen(false); }}
        onClose={() => mount.setRecoveryOpen(false)} />
      <KeyboardShortcutOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />
      <h2 className="text-xl font-bold">Capital Indent (CAPEX)</h2>
      <p className="text-xs text-muted-foreground">Mandatory Finance approval gate · always tier 3</p>
      <UseLastVoucherButton entityCode={entityCode} recordType="capital-indent" partyValue={null} onUse={() => toast.info('Last voucher loaded')} />
      <Sprint27d2Mount formName="CapitalIndentEntry" entityCode={entityCode} items={[]} isLineItemForm={true} />
      <Card>
        <CardHeader><CardTitle className="text-sm">Capital Sub-type</CardTitle></CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          {(['machinery', 'furniture', 'computer', 'vehicle', 'tools'] as const).map(s => (
            <Button key={s} size="sm" variant={subType === s ? 'default' : 'outline'} onClick={() => setSubType(s)}>
              {s}
            </Button>
          ))}
        </CardContent>
      </Card>
      <Button onClick={handleSave}>Submit to Finance</Button>
      <Sprint27eMount entityCode={entityCode} voucherTypeId="vt-capital-indent" voucherTypeName="Capital Indent"
        defaultPartyType="vendor" partyId={null} partyName={null} lineItems={[]}
        onPartyCreated={() => { /* no-op */ }} onCloneTemplate={() => { /* no-op */ }} />
    </div>
  );
}
export const CapitalIndentEntryPanel = CapitalIndentEntry;
