/**
 * PartyDispatchDialog.tsx — Tally Prime-style party dispatch + addressing sub-form.
 *
 * PURPOSE       Capture VoucherDispatchDetails after party selection.
 * DEPENDENCIES  shadcn Dialog/Input/Label/Select, SmartDateInput
 * TALLY-ON-TOP BEHAVIOR  none
 * SPEC DOC      Owner direction — Tally Prime-faithful dispatch + bill-to + ship-to
 */
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { onEnterNext } from '@/lib/keyboard';
import type { VoucherDispatchDetails } from '@/types/voucher';

export interface PartyAddressLite {
  id: string;
  label: string;
  addressLine: string;
  stateName: string;
  pinCode: string;
  isBilling?: boolean;
  isDefaultShipTo?: boolean;
}

interface PartyDispatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partyName: string;
  addresses: PartyAddressLite[];
  initial: VoucherDispatchDetails | undefined;
  onSave: (details: VoucherDispatchDetails) => void;
}

function addressSnapshot(a: PartyAddressLite | undefined): string {
  if (!a) return '';
  return `${a.label ? a.label + ' — ' : ''}${a.addressLine}, ${a.stateName} ${a.pinCode}`.trim();
}

export function PartyDispatchDialog({
  open, onOpenChange, partyName, addresses, initial, onSave,
}: PartyDispatchDialogProps) {
  const defaultBilling  = addresses.find(a => a.isBilling) ?? addresses[0];
  const defaultShipping = addresses.find(a => a.isDefaultShipTo) ?? defaultBilling;

  const [state, setState] = useState<VoucherDispatchDetails>(initial ?? {
    bill_to_address_id: defaultBilling?.id,
    ship_to_address_id: defaultShipping?.id,
  });

  useEffect(() => {
    if (open && !initial) {
      setState({
        bill_to_address_id: defaultBilling?.id,
        ship_to_address_id: defaultShipping?.id,
      });
    }
  }, [open, initial, defaultBilling?.id, defaultShipping?.id]);

  const set = <K extends keyof VoucherDispatchDetails>(k: K, v: VoucherDispatchDetails[K]) =>
    setState(s => ({ ...s, [k]: v }));

  const handleSave = () => {
    const billAddr = addresses.find(a => a.id === state.bill_to_address_id);
    const shipAddr = addresses.find(a => a.id === state.ship_to_address_id);
    onSave({
      ...state,
      bill_to_snapshot: addressSnapshot(billAddr),
      ship_to_snapshot: addressSnapshot(shipAddr),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Dispatch &amp; Addressing</DialogTitle>
          <DialogDescription>
            Party: <span className="font-medium text-foreground">{partyName}</span>
          </DialogDescription>
        </DialogHeader>

        <div data-keyboard-form className="space-y-5 py-2">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Dispatch</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Tracking No</Label>
                <Input value={state.tracking_no ?? ''} onChange={e => set('tracking_no', e.target.value)} onKeyDown={onEnterNext} className="h-9" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Dispatch Doc No</Label>
                <Input value={state.dispatch_doc_no ?? ''} onChange={e => set('dispatch_doc_no', e.target.value)} onKeyDown={onEnterNext} className="h-9" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Dispatch Doc Date</Label>
                <SmartDateInput value={state.dispatch_doc_date ?? ''} onChange={v => set('dispatch_doc_date', v)} className="h-9" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Dispatch Through</Label>
                <Input value={state.dispatch_through ?? ''} onChange={e => set('dispatch_through', e.target.value)} onKeyDown={onEnterNext} className="h-9" placeholder="Transporter / courier" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Vehicle No</Label>
                <Input value={state.vehicle_no ?? ''} onChange={e => set('vehicle_no', e.target.value)} onKeyDown={onEnterNext} className="h-9" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Destination</Label>
                <Input value={state.destination ?? ''} onChange={e => set('destination', e.target.value)} onKeyDown={onEnterNext} className="h-9" />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Bill To &amp; Ship To</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Bill To *</Label>
                <Select value={state.bill_to_address_id ?? ''} onValueChange={v => set('bill_to_address_id', v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select billing address" /></SelectTrigger>
                  <SelectContent>
                    {addresses.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        <span className="text-sm">{a.label ? a.label + ' — ' : ''}{a.addressLine}, {a.stateName} {a.pinCode}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Ship To *</Label>
                <Select value={state.ship_to_address_id ?? ''} onValueChange={v => set('ship_to_address_id', v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select shipping address" /></SelectTrigger>
                  <SelectContent>
                    {addresses.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        <span className="text-sm">{a.label ? a.label + ' — ' : ''}{a.addressLine}, {a.stateName} {a.pinCode}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {state.bill_to_address_id && state.ship_to_address_id && state.bill_to_address_id !== state.ship_to_address_id && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Bill-to and Ship-to differ — ensure place-of-supply is set correctly on the voucher.
              </p>
            )}
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button data-primary onClick={handleSave}>Save Dispatch Details</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
