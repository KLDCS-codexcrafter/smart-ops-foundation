/**
 * @file     CompanyInfoModal.tsx
 * @purpose  Edit legal entity + taxonomy fields (typeOfBusinessEntity, natureOfBusiness,
 *           businessActivity, businessActivityCustom, operatingScale).
 * @sprint   T-H1.5-C-S4
 */
import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  INDUSTRY_SECTORS, getActivitiesForSector, OPERATING_SCALES, type OperatingScale,
} from '@/data/industry-taxonomy';

export interface CompanyInfoFields {
  typeOfBusinessEntity: string;
  natureOfBusiness: string;       // sector ID
  businessActivity: string;       // activity ID
  businessActivityCustom: string;
  operatingScale: OperatingScale | '';
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  value: CompanyInfoFields;
  onSave: (next: CompanyInfoFields) => void;
}

const ENTITY_TYPES: { value: string; label: string }[] = [
  { value: 'private_limited', label: 'Private Limited' },
  { value: 'public_limited',  label: 'Public Limited' },
  { value: 'llp',             label: 'LLP' },
  { value: 'partnership',     label: 'Partnership' },
  { value: 'proprietor',      label: 'Sole Proprietorship' },
  { value: 'opc',             label: 'OPC' },
  { value: 'huf',             label: 'HUF' },
  { value: 'individual',      label: 'Individual' },
  { value: 'trust',           label: 'Trust' },
  { value: 'other',           label: 'Other' },
];

export function CompanyInfoModal({ open, onOpenChange, value, onSave }: Props) {
  const [draft, setDraft] = useState<CompanyInfoFields>(value);
  useEffect(() => { if (open) setDraft(value); }, [open, value]);

  const upd = (patch: Partial<CompanyInfoFields>) => setDraft(prev => ({ ...prev, ...patch }));
  const activities = getActivitiesForSector(draft.natureOfBusiness);
  const showCustom = draft.businessActivity === 'others';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Company Information</DialogTitle>
          <DialogDescription>Legal entity type, sector, activity and operating scale.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Type of Business Entity</Label>
            <Select value={draft.typeOfBusinessEntity} onValueChange={v => upd({ typeOfBusinessEntity: v })}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Industry Sector</Label>
              <Select value={draft.natureOfBusiness}
                onValueChange={v => upd({ natureOfBusiness: v, businessActivity: '' })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select sector" /></SelectTrigger>
                <SelectContent>
                  {INDUSTRY_SECTORS.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Business Activity</Label>
              <Select value={draft.businessActivity}
                onValueChange={v => upd({ businessActivity: v, businessActivityCustom: v === 'others' ? draft.businessActivityCustom : '' })}
                disabled={!draft.natureOfBusiness}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select activity" /></SelectTrigger>
                <SelectContent>
                  {activities.map(a => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {showCustom && (
            <div>
              <Label className="text-xs">Custom Activity Description</Label>
              <Input value={draft.businessActivityCustom}
                onChange={e => upd({ businessActivityCustom: e.target.value })} className="h-9 text-xs" />
            </div>
          )}
          <div>
            <Label className="text-xs">Operating Scale</Label>
            <Select value={draft.operatingScale}
              onValueChange={v => upd({ operatingScale: v as OperatingScale })}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select scale" /></SelectTrigger>
              <SelectContent>
                {OPERATING_SCALES.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label} <span className="text-muted-foreground ml-1">— {s.hint}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button data-primary onClick={() => { onSave(draft); onOpenChange(false); }}>Save Company Info</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
