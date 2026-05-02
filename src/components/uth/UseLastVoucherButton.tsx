/**
 * @file     UseLastVoucherButton.tsx — OOB-1 "Use Last Voucher" UI control
 * @sprint   T-Phase-1.2.6e-tally-1 · Q3-b · header + line items
 * @purpose  Click loads last voucher data for current party · operator confirms ·
 *           form pre-fills with header + line items.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { getUseLastData } from '@/lib/use-last-voucher-engine';

interface Props {
  entityCode: string;
  recordType: string;
  partyValue: string | null;
  partyLabel?: string;
  disabled?: boolean;
  onUse: (data: Record<string, unknown>) => void;
}

export function UseLastVoucherButton({
  entityCode, recordType, partyValue, partyLabel, disabled, onUse,
}: Props) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<{ data: Record<string, unknown>; sourceLabel: string } | null>(null);

  const handleClick = () => {
    const { found, data, sourceLabel } = getUseLastData(entityCode, recordType, partyValue);
    if (!found || !data) {
      toast.info(`No prior voucher found${partyLabel ? ` for ${partyLabel}` : ''}.`);
      return;
    }
    setPreview({ data, sourceLabel: sourceLabel ?? '' });
    setOpen(true);
  };

  const confirm = () => {
    if (preview) onUse(preview.data);
    setOpen(false);
    setPreview(null);
  };

  const isDisabled = disabled || !partyValue;

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        title={partyValue ? `Copy from last voucher for ${partyLabel ?? 'this party'}` : 'Select party first'}
      >
        <Copy className="h-3 w-3 mr-1" /> Use Last
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use Last Voucher?</DialogTitle>
            <DialogDescription>
              Found: <strong>{preview?.sourceLabel}</strong>
              <br />
              This will pre-fill the current form with header + line items from the last voucher
              (date and voucher number will be fresh · operator can edit any field).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" onClick={confirm}>Use This Voucher</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
