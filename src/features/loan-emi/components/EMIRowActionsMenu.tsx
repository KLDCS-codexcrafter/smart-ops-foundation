/**
 * @file     EMIRowActionsMenu.tsx
 * @purpose  Per-row dropdown for EMI schedule rows. Mark Paid / Mark Bounced /
 *           Add Note / View Voucher. Lifecycle engine guards transitions —
 *           UI hides illegal options for paid rows.
 * @sprint   T-H1.5-D-D1
 */
import { useState } from 'react';
import { MoreHorizontal, Check, AlertTriangle, StickyNote, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { EMIScheduleLiveRow } from '../lib/emi-lifecycle-engine';

interface Props {
  row: EMIScheduleLiveRow;
  onMarkPaid: (emiNumber: number, paidDate: string, paidAmount: number, voucherId: string | null) => void;
  onMarkBounced: (emiNumber: number, bouncedDate: string, notes: string) => void;
  onAddNote: (emiNumber: number, note: string) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export function EMIRowActionsMenu({ row, onMarkPaid, onMarkBounced, onAddNote }: Props) {
  const [paidOpen, setPaidOpen] = useState(false);
  const [bouncedOpen, setBouncedOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);

  // Mark Paid form state
  const [paidDate, setPaidDate] = useState(today());
  const [paidAmount, setPaidAmount] = useState(row.totalEMI);
  const [voucherId, setVoucherId] = useState('');

  // Mark Bounced form state
  const [bouncedDate, setBouncedDate] = useState(today());
  const [bouncedNotes, setBouncedNotes] = useState('');

  // Add Note state
  const [noteText, setNoteText] = useState('');

  const isPaid = row.status === 'paid';

  const submitPaid = () => {
    if (paidAmount <= 0) { toast.error('Paid amount must be positive'); return; }
    try {
      onMarkPaid(row.emiNumber, paidDate, paidAmount, voucherId.trim() || null);
      toast.success(`EMI #${row.emiNumber} recorded`);
      setPaidOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to mark paid');
    }
  };

  const submitBounced = () => {
    try {
      onMarkBounced(row.emiNumber, bouncedDate, bouncedNotes.trim());
      toast.success(`EMI #${row.emiNumber} marked bounced`);
      setBouncedOpen(false);
      setBouncedNotes('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to mark bounced');
    }
  };

  const submitNote = () => {
    if (!noteText.trim()) { toast.error('Note cannot be empty'); return; }
    onAddNote(row.emiNumber, noteText.trim());
    toast.success('Note added');
    setNoteText('');
    setNoteOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {!isPaid && (
            <DropdownMenuItem onClick={() => { setPaidAmount(row.totalEMI); setPaidDate(today()); setPaidOpen(true); }}>
              <Check className="h-3.5 w-3.5 mr-2" />
              {row.status === 'bounced' ? 'Restore & Mark Paid' : 'Mark Paid'}
            </DropdownMenuItem>
          )}
          {!isPaid && row.status !== 'bounced' && (
            <DropdownMenuItem onClick={() => { setBouncedDate(today()); setBouncedOpen(true); }}>
              <AlertTriangle className="h-3.5 w-3.5 mr-2" />
              Mark Bounced
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setNoteOpen(true)}>
            <StickyNote className="h-3.5 w-3.5 mr-2" />
            Add Note
          </DropdownMenuItem>
          {row.paymentVoucherId && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <Receipt className="h-3.5 w-3.5 mr-2" />
                View Voucher #{row.paymentVoucherId}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Mark Paid Dialog */}
      <Dialog open={paidOpen} onOpenChange={setPaidOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark EMI #{row.emiNumber} as Paid</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Paid Date</Label>
              <Input type="date" value={paidDate} onChange={e => setPaidDate(e.target.value)} className="font-mono" />
            </div>
            <div>
              <Label className="text-xs">Paid Amount (₹)</Label>
              <Input type="number" step="0.01" value={paidAmount}
                onChange={e => setPaidAmount(Number(e.target.value) || 0)} className="font-mono" />
              <p className="text-[10px] text-muted-foreground mt-1">
                Full EMI: ₹{row.totalEMI.toLocaleString('en-IN')} · Partial payment will mark row as 'partial'.
              </p>
            </div>
            <div>
              <Label className="text-xs">Payment Voucher ID (optional)</Label>
              <Input value={voucherId} onChange={e => setVoucherId(e.target.value)}
                placeholder="V-XXXX" className="font-mono" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaidOpen(false)}>Cancel</Button>
            <Button onClick={submitPaid}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Bounced Dialog */}
      <Dialog open={bouncedOpen} onOpenChange={setBouncedOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark EMI #{row.emiNumber} as Bounced</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Bounce Date</Label>
              <Input type="date" value={bouncedDate} onChange={e => setBouncedDate(e.target.value)} className="font-mono" />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea rows={3} value={bouncedNotes}
                onChange={e => setBouncedNotes(e.target.value)}
                placeholder="Reason / cheque number / bank message" />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Current bounce count for this EMI: {row.bouncedCount}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBouncedOpen(false)}>Cancel</Button>
            <Button onClick={submitBounced}>Confirm Bounce</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Note · EMI #{row.emiNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {row.notes && (
              <div className="rounded-lg border border-border bg-muted/30 p-2">
                <p className="text-[10px] text-muted-foreground mb-1">Existing notes</p>
                <p className="text-xs">{row.notes}</p>
              </div>
            )}
            <div>
              <Label className="text-xs">New Note</Label>
              <Textarea rows={3} value={noteText} onChange={e => setNoteText(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteOpen(false)}>Cancel</Button>
            <Button onClick={submitNote}>Append</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
