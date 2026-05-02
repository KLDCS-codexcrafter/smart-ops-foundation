/**
 * DraftRecoveryDialog — Sprint 2.7-d-1
 * Modal shown on form mount (view='new') when a draft exists in localStorage.
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  formKey: string;
  entityCode: string;
  open: boolean;
  draftAge: number; // seconds
  onRecover: () => void;
  onDiscard: () => void;
  onClose: () => void;
}

function humanizeAge(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr`;
  return `${Math.floor(seconds / 86400)} days`;
}

export function DraftRecoveryDialog({ formKey, entityCode, open, draftAge, onRecover, onDiscard, onClose }: Props) {
  // formKey + entityCode reserved for future analytics/labelling. Reference to keep them in scope.
  void formKey;
  void entityCode;
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unsaved draft found</DialogTitle>
          <DialogDescription>
            We found an unsaved draft from {humanizeAge(draftAge)} ago. Recover it, discard it, or decide later.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={onClose}>Decide Later</Button>
          <Button variant="outline" onClick={onDiscard}>Discard</Button>
          <Button onClick={onRecover}>Recover Draft</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
