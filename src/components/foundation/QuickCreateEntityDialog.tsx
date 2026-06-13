/**
 * QuickCreateEntityDialog.tsx — Minimal first-run company creator.
 *
 * Sprint W1C-6 · Block 3 — bypass the 7-step CompanyForm wizard for the
 * minimal "name + GSTIN + state" case. Writes through the foundation
 * engine helper createMinimalEntity(). CompanyForm.tsx stays 0-DIFF.
 *
 * After save: reloads so SelectCompanyGate / Dashboard banner re-evaluate
 * against the newly-populated erp_group_entities + erp_companies keys.
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createMinimalEntity } from '@/lib/entity-setup-service';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}

export function QuickCreateEntityDialog({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState('');
  const [gstin, setGstin] = useState('');
  const [state, setState] = useState('');
  const [busy, setBusy] = useState(false);

  function handleSave() {
    if (!name.trim()) {
      toast.error('Company name is required');
      return;
    }
    setBusy(true);
    try {
      const entity = createMinimalEntity(name.trim(), gstin.trim() || undefined, state.trim() || undefined);
      toast.success(`${entity.name} created · code ${entity.shortCode}`);
      onCreated?.();
      onOpenChange(false);
      // Refresh so gate / banner unmount and entity dropdown rebuilds.
      setTimeout(() => window.location.reload(), 250);
    } catch (err) {
      toast.error(`Could not create company: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick add company</DialogTitle>
          <DialogDescription>
            Minimal company so you can start working. Add the full profile later from
            Command Center → Companies.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="qc-name">Company name<span className="text-destructive">*</span></Label>
            <Input id="qc-name" value={name} onChange={e => setName(e.target.value)} placeholder="Sharma Traders Pvt Ltd" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="qc-gstin">GSTIN (optional)</Label>
            <Input id="qc-gstin" value={gstin} onChange={e => setGstin(e.target.value.toUpperCase())} placeholder="27ABCDE1234F1Z5" maxLength={15} className="font-mono" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="qc-state">State (optional)</Label>
            <Input id="qc-state" value={state} onChange={e => setState(e.target.value)} placeholder="Maharashtra" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={handleSave} disabled={busy || !name.trim()}>
            {busy ? 'Creating…' : 'Create company'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default QuickCreateEntityDialog;
