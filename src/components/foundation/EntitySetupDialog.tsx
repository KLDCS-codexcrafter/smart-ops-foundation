/**
 * EntitySetupDialog.tsx — Confirmation dialog shown after entity save.
 * Presents preview of what will be created, then runs entity-setup-service.
 */
import { useState } from 'react';
import { CheckCircle2, Loader2, Package, FolderTree, GitBranch } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { runEntitySetup, loadEntities, type SetupResult } from '@/services/entity-setup-service';
import { L4_INDUSTRY_PACKS } from '@/data/finframe-seed-data';

interface EntitySetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityName: string;
  entityId: string;
  shortCode: string;
  entityType: 'parent' | 'subsidiary' | 'branch';
  businessEntity: string;
  industry: string;
  businessActivity: string;
  onComplete: (result: SetupResult) => void;
}

function getPreviewLedgerCount(businessActivity: string, businessEntity: string): number {
  const isService = ['Services', 'IT Services', 'Consulting'].includes(businessActivity);
  const isMfg = businessActivity === 'Manufacturing';
  // Base: 19 ledgers + conditional service revenue (1) + capital (1)
  let count = 19 + 1; // capital always added
  if (isService || isMfg) count += 1; // service revenue
  return count;
}

function getPreviewL4Count(businessActivity: string): number {
  const packKey = businessActivity === 'Manufacturing' ? 'manufacturing'
    : ['Trading', 'Import / Export', 'Distribution'].includes(businessActivity) ? 'trading'
    : ['Services', 'IT Services', 'Consulting'].includes(businessActivity) ? 'services'
    : null;
  let count = L4_INDUSTRY_PACKS.common.length;
  if (packKey) count += L4_INDUSTRY_PACKS[packKey].length;
  return count;
}

export function EntitySetupDialog({
  open, onOpenChange, entityName, entityId, shortCode,
  entityType, businessEntity, industry, businessActivity, onComplete,
}: EntitySetupDialogProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SetupResult | null>(null);

  const siblingEntities = loadEntities().filter(e => e.id !== entityId);
  const previewLedgers = getPreviewLedgerCount(businessActivity, businessEntity);
  const previewL4 = getPreviewL4Count(businessActivity);
  const previewBD = siblingEntities.length;

  const handleCreate = () => {
    setLoading(true);
    setTimeout(() => {
      const res = runEntitySetup({
        entityId, entityName, shortCode,
        entityType, businessEntity, industry, businessActivity,
        loadIndustryPack: true,
        siblingEntities,
      });
      setResult(res);
      setLoading(false);
      onComplete(res);
    }, 600);
  };

  const handleSkip = () => {
    onOpenChange(false);
    toast.info('Set up account structure manually in Ledger Master');
  };

  const handleClose = () => {
    setResult(null);
    onOpenChange(false);
    toast.success(`${entityName} is ready. Opening balances: set them in Ledger Master.`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-keyboard-form>
        {!result ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg">
                Set up account structure for {entityName}?
              </DialogTitle>
              <DialogDescription>
                This creates the default accounting structure — like Tally does automatically on company creation.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              <div className="flex items-start gap-3 text-sm">
                <Package className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>
                  <strong>{previewLedgers}</strong> default ledgers — Cash, GST, TDS, Salary, Capital, Sales, Purchases…
                </span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <FolderTree className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                <span>
                  <strong>{previewL4}</strong> account groups from{' '}
                  <Badge variant="outline" className="text-[10px] mx-1">{businessActivity}</Badge>
                  pack (FinFrame L4)
                </span>
              </div>
              {previewBD > 0 && (
                <div className="flex items-start gap-3 text-sm">
                  <GitBranch className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <span>
                    <strong>{previewBD}</strong> Branch/Division ledgers (one per sibling entity)
                  </span>
                </div>
              )}
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <span>All opening balances set to zero — edit in Ledger Master</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button data-primary onClick={handleCreate} disabled={loading} className="flex-1">
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Package className="h-4 w-4 mr-2" />}
                {loading ? 'Creating…' : 'Create Account Structure'}
              </Button>
              <Button variant="ghost" onClick={handleSkip} disabled={loading} className="flex-1">
                Skip — I'll set up manually
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground text-center pt-1">
              You can add or modify any ledger later in Ledger Master → FineCore Masters
            </p>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Account structure created for {entityName}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-4">
              <div className="flex items-center gap-2 text-sm">
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  {result.ledgersCreated}
                </Badge>
                <span>ledgers created ✓</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20">
                  {result.l4GroupsCreated}
                </Badge>
                <span>account groups loaded ✓</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                  {result.bdLedgersCreated}
                </Badge>
                <span>inter-entity ledgers created ✓</span>
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                Opening balances are all zero. Set them in Ledger Master → Opening Balances.
              </p>
            </div>

            <Button onClick={handleClose} className="w-full">Close</Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
