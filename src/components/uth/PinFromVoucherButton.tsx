/**
 * PinFromVoucherButton · Sprint T-Phase-2.7-e · OOB-10
 * Pin the current voucher state as a reusable template.
 */
import { useState } from 'react';
import { Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { pinTemplate } from '@/lib/pinned-templates-engine';
import type { PinnedTemplateLineItem } from '@/types/pinned-template';
import { getCurrentUser } from '@/lib/auth-helpers';

interface Props {
  entityCode: string;
  voucherTypeId: string;
  voucherTypeName: string;
  partyId: string | null;
  partyName: string | null;
  partyType?: 'customer' | 'vendor' | 'both' | null;
  lineItems: PinnedTemplateLineItem[];
  narration?: string | null;
  referenceNo?: string | null;
  disabled?: boolean;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function PinFromVoucherButton({
  entityCode,
  voucherTypeId,
  voucherTypeName,
  partyId,
  partyName,
  partyType,
  lineItems,
  narration,
  referenceNo,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const defaultName = partyName
    ? `${voucherTypeName} · ${partyName}`
    : `${voucherTypeName} · ${todayISO()}`;
  const [name, setName] = useState(defaultName);

  const isEmpty = !partyId && lineItems.length === 0;

  function handlePin() {
    if (!entityCode) {
      toast.error('Select a company first');
      return;
    }
    // [JWT] POST /api/templates/voucher
    pinTemplate({
      entity_id: entityCode,
      template_name: name.trim() || defaultName,
      voucher_type_id: voucherTypeId,
      voucher_type_name: voucherTypeName,
      party_id: partyId,
      party_name: partyName,
      party_type: partyType ?? null,
      line_items: lineItems,
      narration: narration ?? null,
      reference_no: referenceNo ?? null,
      pinned_by: getCurrentUser().id,
    });
    toast.success('Pinned · find in Templates widget');
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setName(defaultName);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isEmpty}
          className="gap-2"
          title={isEmpty ? 'Add party or line items first' : 'Pin as template'}
        >
          <Pin className="h-4 w-4" />
          Pin Template
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="pin-name">Template name</Label>
            <Input
              id="pin-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={defaultName}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handlePin}>Pin</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
