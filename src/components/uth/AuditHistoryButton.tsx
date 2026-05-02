/**
 * @file     AuditHistoryButton.tsx — Detail-panel control to open VoucherDiffViewer
 * @sprint   T-Phase-1.2.6d-hdr · D-228 UTH detail-side wiring
 *
 * Drop-in button that opens the VoucherDiffViewer dialog filtered to one
 * record. Used by every detail panel (GRN, MIN, RTV, Quotation, IM, ...).
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { History } from 'lucide-react';
import { VoucherDiffViewer } from '@/components/audit/VoucherDiffViewer';
import type { AuditEntityType } from '@/types/audit-trail';

interface Props {
  recordId: string;
  entityType: AuditEntityType;
  entityCode: string;
  currentRecord: Record<string, unknown>;
  size?: 'sm' | 'default';
}

export function AuditHistoryButton({
  recordId, entityType, entityCode, currentRecord, size = 'sm',
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size={size}
        variant="ghost"
        onClick={() => setOpen(true)}
        className="gap-2"
        type="button"
      >
        <History className="h-4 w-4" /> Audit History
      </Button>
      <VoucherDiffViewer
        open={open}
        onClose={() => setOpen(false)}
        recordId={recordId}
        entityType={entityType}
        entityCode={entityCode}
        currentRecord={currentRecord}
      />
    </>
  );
}
