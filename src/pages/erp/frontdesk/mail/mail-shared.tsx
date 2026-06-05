/**
 * @file        src/pages/erp/frontdesk/mail/mail-shared.tsx
 * @sprint      S148.T1 hotfix · shared mail UI constants + edit dialog (reused by both pages)
 */
import { useEffect, useState } from 'react';
import { updateMail } from '@/lib/frontdesk-records-engine';
import type { MailItem } from '@/types/frontdesk';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

// S148.T1 · CSV column shape (asserted in tests)
export const MAIL_INWARD_CSV_COLUMNS = [
  'Mail No', 'Received', 'Kind', 'Description', 'Addressee', 'From', 'Status',
] as const;
export const MAIL_OUTWARD_CSV_COLUMNS = [
  'Mail No', 'Created', 'Kind', 'Description', 'Recipient', 'Mode', 'Status', 'Proof',
] as const;

// S148.T1 · UI-level editable field allowlist (immutable facts disabled in the form)
export const MAIL_EDITABLE_KEYS = [
  'description', 'courierName', 'awbDocketNo', 'notes', 'fromText', 'toText',
] as const;

export function MailEditDialog({ target, onClose, entityCode, userId }: {
  target: MailItem | null;
  onClose: () => void;
  entityCode: string;
  userId: string;
}): JSX.Element {
  const [description, setDescription] = useState('');
  const [courierName, setCourierName] = useState('');
  const [awbDocketNo, setAwbDocketNo] = useState('');
  const [notes, setNotes] = useState('');
  const [fromText, setFromText] = useState('');
  const [toText, setToText] = useState('');

  useEffect(() => {
    if (!target) return;
    setDescription(target.description);
    setCourierName(target.courierName ?? '');
    setAwbDocketNo(target.awbDocketNo ?? '');
    setNotes(target.notes ?? '');
    setFromText(target.fromText ?? '');
    setToText(target.toText ?? '');
  }, [target]);

  function submit(): void {
    if (!target) return;
    try {
      updateMail(entityCode, target.id, {
        description, courierName: courierName || null, awbDocketNo: awbDocketNo || null,
        notes: notes || null, fromText: fromText || null, toText: toText || null,
      }, userId);
      toast.success('Updated');
      onClose();
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Dialog open={!!target} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit mail · descriptive fields only</DialogTitle></DialogHeader>
        {target && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><Label className="text-xs">Mail No (immutable)</Label>
                <Input value={target.mailNo ?? '—'} disabled className="font-mono" /></div>
              <div><Label className="text-xs">Direction (immutable)</Label>
                <Input value={target.direction} disabled /></div>
              <div><Label className="text-xs">Kind (immutable)</Label>
                <Input value={target.kind} disabled /></div>
              <div><Label className="text-xs">{target.direction === 'inward' ? 'Received' : 'Sent'} (immutable)</Label>
                <Input value={target.receivedAt ?? target.sentAt ?? '—'} disabled className="font-mono text-xs" /></div>
            </div>
            <div><Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Courier</Label>
                <Input value={courierName} onChange={(e) => setCourierName(e.target.value)} /></div>
              <div><Label>AWB / Docket #</Label>
                <Input value={awbDocketNo} onChange={(e) => setAwbDocketNo(e.target.value)} /></div>
            </div>
            <div><Label>From (free-text)</Label>
              <Input value={fromText} onChange={(e) => setFromText(e.target.value)} /></div>
            <div><Label>To (free-text)</Label>
              <Input value={toText} onChange={(e) => setToText(e.target.value)} /></div>
            <div><Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
