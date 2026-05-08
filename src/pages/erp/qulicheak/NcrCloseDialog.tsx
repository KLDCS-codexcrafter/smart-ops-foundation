/**
 * @file src/pages/erp/qulicheak/NcrCloseDialog.tsx
 * @purpose Modal to close an NCR with outcome + emit applyQaOutcome to Procure360
 * @who Quality Inspector · QA Manager
 * @when 2026-05-08
 * @sprint T-Phase-1.A.5.a-bis-Qulicheak-NCR-Foundation
 * @iso 25010 Reliability + Operability
 * @whom QA Manager
 * @decisions D-NEW-AX (close emits applyQaOutcome · severity-based delta -2/-5/-10)
 * @disciplines FR-19 (Sibling · zero Procure360 touches) · FR-21
 * @reuses ncr-engine.closeNcr · qulicheak-bridges.emitQaOutcomeForVendor
 * @[JWT] writes via ncr-engine · POST /api/qulicheak/ncrs/:id/close
 */
import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { closeNcr } from '@/lib/ncr-engine';
import { emitQaOutcomeForVendor } from '@/lib/qulicheak-bridges';
import {
  NCR_OUTCOME_LABELS,
  type NonConformanceReport,
  type NcrOutcome,
} from '@/types/ncr';

interface Props {
  ncr: NonConformanceReport;
  onClose: () => void;
}

const OUTCOMES: NcrOutcome[] = ['rework', 'reject', 'concession_use', 'return_to_vendor'];

export function NcrCloseDialog({ ncr, onClose }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const [outcome, setOutcome] = useState<NcrOutcome>('rework');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleConfirm = (): void => {
    if (!user) {
      toast.error('User session not found');
      return;
    }
    setSaving(true);
    try {
      const updated = closeNcr(entityCode, user.id, ncr.id, outcome, note.trim() || undefined);
      if (!updated) {
        toast.error('NCR cannot be closed (already terminal)');
        return;
      }
      // Vendor-related NCRs feed Procure360 vendor scoring · zero touches there
      if (updated.related_party_id) {
        emitQaOutcomeForVendor({
          vendor_id: updated.related_party_id,
          ncr_id: updated.id,
          severity: updated.severity,
          outcome,
          entity_code: entityCode,
        });
      }
      toast.success(`NCR ${updated.id} closed (${outcome})`);
      onClose();
    } catch {
      toast.error('Failed to close NCR');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close NCR {ncr.id}</DialogTitle>
          <DialogDescription>
            Vendor-linked NCRs auto-feed Procure360 vendor scoring on close.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="mb-2 block">Outcome</Label>
            <RadioGroup
              value={outcome}
              onValueChange={(v) => setOutcome(v as NcrOutcome)}
              className="grid grid-cols-2 gap-2"
            >
              {OUTCOMES.map((o) => (
                <Label
                  key={o}
                  htmlFor={`out-${o}`}
                  className="flex items-center gap-2 border rounded-lg p-2 cursor-pointer hover:bg-muted/50"
                >
                  <RadioGroupItem value={o} id={`out-${o}`} />
                  <span className="text-sm">{NCR_OUTCOME_LABELS[o]}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="close-note">Closing notes</Label>
            <Textarea
              id="close-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional · audit trail"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? 'Closing…' : 'Confirm Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
