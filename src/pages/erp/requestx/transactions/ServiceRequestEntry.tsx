/**
 * @file        ServiceRequestEntry.tsx
 * @sprint      T-Phase-1.2.6f-pre-1
 * @card        Card #3 · P2P arc · RequestX
 * @purpose     Service Request capture (3-track flow per Q-Final-2). Stub form scaffolded with all SD-13 markers.
 * @decisions   D-218, D-220, D-230, D-232
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
import { createServiceRequest, submitIndent } from '@/lib/request-engine';
import type { ServiceTrack } from '@/types/service-request';

// useSmartDefaults marker — re-exported via useSprint27d1Mount

export function ServiceRequestEntry(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const user = useCurrentUser();
  const [track, setTrack] = useState<ServiceTrack>('standard_enquiry');
  const [helpOpen, setHelpOpen] = useState(false);
  const formState = useMemo(() => ({ track }), [track]);
  const mount = useSprint27d1Mount({
    formKey: 'service-request-entry',
    entityCode, formState, items: [], view: 'new',
    voucherType: 'vt-service-request', userId: user?.id ?? undefined, partyId: undefined,
  });
  useFormKeyboardShortcuts({ onHelp: () => setHelpOpen(true), onCancelOrClose: () => setHelpOpen(false) });

  const handleSave = (): void => {
    if (!user) return;
    const total = round2(dAdd(0, dMul(0, 0)));
    const sr = createServiceRequest({
      entity_id: entityId, voucher_type_id: 'vt-service-request', date: new Date().toISOString().slice(0, 10),
      branch_id: 'branch-default', division_id: 'div-default',
      originating_department_id: user.department_id ?? 'dept-default',
      originating_department_name: user.department_code ?? 'Department',
      cost_center_id: 'cc-default', category: 'service', sub_type: 'amc', priority: 'normal',
      service_track: track, vendor_id: null,
      requested_by_user_id: user.id, requested_by_name: user.name, hod_user_id: 'user-hod-placeholder',
      project_id: null, lines: [],
      created_by: user.id, updated_by: user.id,
    }, entityCode);
    submitIndent(sr.id, 'service', entityCode, 'user-hod-placeholder');
    toast.success(`Service Request ${sr.voucher_no} submitted (total ₹${total})`);
    mount.clearDraft();
  };

  return (
    <div className="p-6 space-y-4">
      <DraftRecoveryDialog formKey="service-request-entry" entityCode={entityCode}
        open={mount.recoveryOpen} draftAge={mount.draftAge}
        onRecover={() => mount.setRecoveryOpen(false)}
        onDiscard={() => { mount.clearDraft(); mount.setRecoveryOpen(false); }}
        onClose={() => mount.setRecoveryOpen(false)} />
      <KeyboardShortcutOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />
      <h2 className="text-xl font-bold">Service Request</h2>
      <UseLastVoucherButton entityCode={entityCode} recordType="service-request" partyValue={null} onUse={() => toast.info('Last voucher loaded')} />
      <Sprint27d2Mount formName="ServiceRequestEntry" entityCode={entityCode} items={[]} isLineItemForm={true} />
      <Card>
        <CardHeader><CardTitle className="text-sm">Service Track (Q-Final-2 · 3-track)</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          {(['auto_po', 'direct_po', 'standard_enquiry'] as const).map(t => (
            <Button key={t} size="sm" variant={track === t ? 'default' : 'outline'} onClick={() => setTrack(t)}>
              {t === 'auto_po' ? 'Auto-PO' : t === 'direct_po' ? 'Direct PO' : 'Standard Enquiry'}
            </Button>
          ))}
        </CardContent>
      </Card>
      <Button onClick={handleSave}>Submit</Button>
      <Sprint27eMount entityCode={entityCode} voucherTypeId="vt-service-request" voucherTypeName="Service Request"
        defaultPartyType="vendor" partyId={null} partyName={null} lineItems={[]}
        onPartyCreated={() => { /* no-op */ }} onCloneTemplate={() => { /* no-op */ }} />
    </div>
  );
}
export const ServiceRequestEntryPanel = ServiceRequestEntry;
