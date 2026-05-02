/**
 * @file     VoucherClassMount.tsx — Sprint T-Phase-2.7-b shared mount
 * @purpose  Single composite that hosts:
 *             - VoucherClassPicker (Q1-b progressive disclosure · auto-hidden when ≤1 type)
 *             - SaveButtonGroup (Q3-d context-aware actions)
 *             - validateFieldRules pre-save guard (Q2-c hard-block on posted)
 *
 *           Each form embeds <VoucherClassMount/> once · passes its current
 *           form data + value + status + a single `onPersist(status, reason?)`
 *           callback. Forms keep their existing Save buttons for backward
 *           compatibility · this mount adds the new approval-aware controls
 *           without rewriting the host form.
 *
 *   This file is intentionally a single component (no helper exports) so it
 *   complies with react-refresh and avoids cross-component coupling.
 */

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { VoucherClassPicker } from '@/components/uth/VoucherClassPicker';
import { SaveButtonGroup, type SaveButtonStatus } from '@/components/uth/SaveButtonGroup';
import { validateFieldRules, type FormState } from '@/lib/field-rule-engine';
import {
  findVoucherTypeById,
  getDefaultVoucherTypeForFamily,
  type NonFineCoreVoucherFamily,
  type NonFineCoreVoucherType,
} from '@/lib/non-finecore-voucher-type-registry';

export type VoucherPersistStatus =
  | 'draft'
  | 'posted'
  | 'submitted'
  | 'approved-then-posted'
  | 'rejected';

interface Props {
  entityCode: string;
  family: NonFineCoreVoucherFamily;
  /** Current form values · used by validateFieldRules. */
  formData: Record<string, unknown>;
  /** Total ₹ value for threshold breach check. */
  recordValue: number;
  /** Current record status (drives button selection). */
  recordStatus: SaveButtonStatus;
  /** Current voucher_type_id from form (may be null on first mount). */
  voucherTypeId: string | null;
  voucherTypeName: string | null;
  onVoucherTypeChange: (id: string | null, name: string | null) => void;
  /** Persist callback · the host form maps the status to its existing save flow. */
  onPersist: (status: VoucherPersistStatus, reason?: string) => void | Promise<void>;
  userRoles?: string[];
  saving?: boolean;
}

const FALLBACK_ROLES: string[] = [];

export function VoucherClassMount({
  entityCode, family, formData, recordValue, recordStatus,
  voucherTypeId, voucherTypeName, onVoucherTypeChange,
  onPersist, userRoles, saving,
}: Props) {
  const [bootstrapped, setBootstrapped] = useState(false);

  // Auto-populate voucher_type_id from family default on first mount.
  useEffect(() => {
    if (bootstrapped) return;
    if (!voucherTypeId) {
      const def = getDefaultVoucherTypeForFamily(entityCode, family);
      if (def) onVoucherTypeChange(def.id, def.display_name);
    }
    setBootstrapped(true);
  }, [bootstrapped, voucherTypeId, entityCode, family, onVoucherTypeChange]);

  const vt: NonFineCoreVoucherType | null = useMemo(
    () => (voucherTypeId ? findVoucherTypeById(entityCode, voucherTypeId) : null),
    [entityCode, voucherTypeId],
  );

  const guard = (status: VoucherPersistStatus): boolean => {
    const formState: FormState = status === 'draft' ? 'draft' : 'posted';
    const result = validateFieldRules(formData, vt?.field_rules, formState);
    if (!result.ok) {
      const count = Object.keys(result.errors).length;
      toast.error(`Cannot post · ${count} field(s) need attention`);
      Object.values(result.errors).slice(0, 2).forEach(msg => toast.error(msg));
      return false;
    }
    if (Object.keys(result.warnings).length > 0) {
      Object.values(result.warnings).slice(0, 2).forEach(msg => toast.warning(msg));
    }
    return true;
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <VoucherClassPicker
          entityCode={entityCode}
          family={family}
          voucherTypeId={voucherTypeId}
          voucherTypeName={voucherTypeName}
          onChange={(id, name) => onVoucherTypeChange(id, name)}
        />
        <SaveButtonGroup
          voucherType={vt}
          recordValue={recordValue}
          recordStatus={recordStatus}
          userRoles={userRoles ?? FALLBACK_ROLES}
          onSaveDraft={() => { if (guard('draft')) onPersist('draft'); }}
          onSaveAndPost={() => { if (guard('posted')) onPersist('posted'); }}
          onSubmitForApproval={() => { if (guard('posted')) onPersist('submitted'); }}
          onApproveAndPost={() => { if (guard('posted')) onPersist('approved-then-posted'); }}
          onReject={(reason) => onPersist('rejected', reason)}
          saving={saving}
        />
      </CardContent>
    </Card>
  );
}
