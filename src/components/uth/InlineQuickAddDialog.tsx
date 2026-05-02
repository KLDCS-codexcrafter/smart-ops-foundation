/**
 * InlineQuickAddDialog · Sprint T-Phase-2.7-e · OOB-9 · Q1-b
 *
 * 4-field minimal create modal for customer/vendor parties.
 * - Non-blocking GSTIN validation (warning only · Q2-c)
 * - State code auto-fill from GSTIN[0:2]
 * - Sets created_via_quick_add: true for finance team retroactive audit
 */
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Check, AlertTriangle } from 'lucide-react';
import type { Party, PartyType } from '@/types/party';
import { upsertParty } from '@/lib/party-master-engine';
import { validateGSTIN } from '@/lib/gstin-validator';
import { STATE_CODE_NAMES } from '@/lib/place-of-supply-engine';
import { getCurrentUser } from '@/lib/auth-helpers';

interface Props {
  open: boolean;
  onClose: () => void;
  entityCode: string;
  defaultName?: string;
  defaultPartyType?: PartyType;
  onCreated: (party: Party) => void;
}

export function InlineQuickAddDialog({
  open,
  onClose,
  entityCode,
  defaultName = '',
  defaultPartyType = 'customer',
  onCreated,
}: Props) {
  const [name, setName] = useState(defaultName);
  const [partyType, setPartyType] = useState<PartyType>(defaultPartyType);
  const [gstin, setGstin] = useState('');
  const [stateCode, setStateCode] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(defaultName);
      setPartyType(defaultPartyType);
      setGstin('');
      setStateCode('');
    }
  }, [open, defaultName, defaultPartyType]);

  const gstinResult = gstin ? validateGSTIN(gstin) : null;

  // Auto-fill state code from valid GSTIN
  useEffect(() => {
    if (gstinResult?.valid && gstinResult.state_code && !stateCode) {
      setStateCode(gstinResult.state_code);
    }
  }, [gstinResult, stateCode]);

  function handleSave() {
    if (!name.trim()) {
      toast.error('Party name is required');
      return;
    }
    if (!entityCode) {
      toast.error('Select a company first');
      return;
    }
    setSaving(true);
    try {
      // [JWT] POST /api/masters/parties
      const result = upsertParty({
        entity_id: entityCode,
        party_name: name.trim(),
        party_type: partyType,
        gstin: gstin.trim() || null,
        state_code: stateCode || null,
        created_via_quick_add: true,
        created_by: getCurrentUser().id,
      });
      if (result.warnings.length > 0) {
        toast.warning(result.warnings[0]);
      }
      toast.success(`${result.isNew ? 'Created' : 'Updated'} · ready to use`);
      onCreated(result.party);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  }

  const stateOptions = Object.entries(STATE_CODE_NAMES);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md" onKeyDown={handleKey}>
        <DialogHeader>
          <DialogTitle>Quick Add · {partyType === 'vendor' ? 'Vendor' : partyType === 'customer' ? 'Customer' : 'Party'}</DialogTitle>
          <DialogDescription>
            Minimal master record · finish later in Master Setup.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="qa-name">Party Name *</Label>
            <Input
              id="qa-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ABC Industries Pvt Ltd"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Party Type *</Label>
            <RadioGroup
              value={partyType}
              onValueChange={(v) => setPartyType(v as PartyType)}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="vendor" id="qa-vendor" />
                <Label htmlFor="qa-vendor" className="font-normal cursor-pointer">Vendor</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="customer" id="qa-customer" />
                <Label htmlFor="qa-customer" className="font-normal cursor-pointer">Customer</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="both" id="qa-both" />
                <Label htmlFor="qa-both" className="font-normal cursor-pointer">Both</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qa-gstin">GSTIN (optional)</Label>
            <div className="relative">
              <Input
                id="qa-gstin"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
                className="font-mono pr-8"
              />
              {gstin && gstinResult && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2">
                  {gstinResult.valid ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                </span>
              )}
            </div>
            {gstin && gstinResult && !gstinResult.valid && (
              <p className="text-xs text-amber-600">
                GSTIN format invalid · save allowed · fix later in Master Setup.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qa-state">State Code{gstin ? ' *' : ''}</Label>
            <Select value={stateCode} onValueChange={setStateCode}>
              <SelectTrigger id="qa-state">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {stateOptions.map(([code, label]) => (
                  <SelectItem key={code} value={code}>
                    {code} · {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground border-t pt-3">
            Minimal master record. Opening balance, credit limit and other details
            can be added in Master Setup later. This party is flagged
            <span className="font-medium"> "Created via Quick Add"</span> for finance review.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            Save &amp; Use in Voucher
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
