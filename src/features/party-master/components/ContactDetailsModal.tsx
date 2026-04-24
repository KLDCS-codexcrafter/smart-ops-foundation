/**
 * @file     ContactDetailsModal.tsx
 * @purpose  Multi-contact grid editor extracted into focused modal.
 *           Edits a contacts[] array — does not modify any other field.
 * @sprint   T-H1.5-C-S4
 */
import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export interface ContactRow {
  id: string;
  contactPerson: string;
  designation: string;
  phone: string;
  mobile: string;
  email: string;
  isPrimary: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contacts: ContactRow[];
  onSave: (next: ContactRow[]) => void;
}

export function ContactDetailsModal({ open, onOpenChange, contacts, onSave }: Props) {
  const [draft, setDraft] = useState<ContactRow[]>(contacts);
  useEffect(() => { if (open) setDraft(contacts); }, [open, contacts]);

  const upd = (idx: number, patch: Partial<ContactRow>) =>
    setDraft(prev => prev.map((c, i) => i === idx ? { ...c, ...patch } : c));
  const add = () => setDraft(prev => [...prev, {
    id: `ct-${Date.now()}`, contactPerson: '', designation: '',
    phone: '', mobile: '', email: '', isPrimary: prev.length === 0,
  }]);
  const remove = (idx: number) => setDraft(prev => prev.filter((_, i) => i !== idx));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Contact Details</DialogTitle>
          <DialogDescription>Add or edit multiple contacts. Mark one as primary.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {draft.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-6">No contacts yet.</div>
          )}
          {draft.map((c, idx) => (
            <div key={c.id} className="border border-border rounded-lg p-3 space-y-2 bg-muted/20">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Contact Person</Label>
                  <Input value={c.contactPerson} onChange={e => upd(idx, { contactPerson: e.target.value })} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">Designation</Label>
                  <Input value={c.designation} onChange={e => upd(idx, { designation: e.target.value })} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">Phone</Label>
                  <Input value={c.phone} onChange={e => upd(idx, { phone: e.target.value })} className="h-8 text-xs font-mono" />
                </div>
                <div>
                  <Label className="text-[10px]">Mobile</Label>
                  <Input value={c.mobile} onChange={e => upd(idx, { mobile: e.target.value })} className="h-8 text-xs font-mono" />
                </div>
                <div className="col-span-2">
                  <Label className="text-[10px]">Email</Label>
                  <Input value={c.email} onChange={e => upd(idx, { email: e.target.value })} className="h-8 text-xs" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch checked={c.isPrimary}
                    onCheckedChange={v => setDraft(prev => prev.map((x, i) => ({ ...x, isPrimary: i === idx ? v : (v ? false : x.isPrimary) })))} />
                  <Label className="text-[10px]">Primary</Label>
                </div>
                <Button variant="ghost" size="sm" onClick={() => remove(idx)} className="h-7 text-[10px] text-destructive gap-1">
                  <Trash2 className="h-3 w-3" /> Remove
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={add} className="w-full gap-1 text-xs">
            <Plus className="h-3 w-3" /> Add Contact
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button data-primary onClick={() => { onSave(draft); onOpenChange(false); }}>Save Contacts</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
