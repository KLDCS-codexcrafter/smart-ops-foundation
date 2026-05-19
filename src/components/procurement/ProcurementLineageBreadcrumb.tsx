/**
 * @file        src/components/procurement/ProcurementLineageBreadcrumb.tsx
 * @purpose     Sprint B.2 · Shared procurement-specific breadcrumb · renders the P2P chain
 *              (Indent → RFQ → Quote → PO → GRN → PI) for a given voucher · clickable navigation
 *              hooks · "View lineage" button opens IndentLineageTreeSvg modal · CONSUME existing
 *              DrillBreadcrumb where applicable + indent-cascade-lineage engine
 * @who         Internal procurement admin · consumed by IndentRegister · PoListPanel · VendorInvoiceAdminReview
 * @when        2026-05-19 (Sprint B.2)
 * @sprint      T-Phase-1.B-2-Procurement-Pulse-Enrichment-Demo-Seed
 * @iso         ISO 25010 Functional Suitability · Usability (cross-card navigation)
 * @whom        Audit Owner
 * @decisions   D-NEW-ES ProcurementLineageBreadcrumb shared component (B2-Q2=B 3 high-traffic
 *              consumers) · D-NEW-EV lineage drawer pattern · consumes indent-cascade-lineage
 *              engine · graceful no-render when no source provided
 * @disciplines FR-30 · FR-50 · FR-58 · FR-67 (Three Greps · single component · 3 consumers)
 * @reuses      indent-cascade-lineage.walkAncestors · walkDescendants · IndentLineageTreeSvg ·
 *              shadcn/ui Button + Badge + Dialog · lucide GitBranch
 * @[JWT]       Phase 2: GET /api/procurement/lineage/:voucher_no
 */
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronRight, GitBranch } from 'lucide-react';
import { walkAncestors, walkDescendants } from '@/lib/indent-cascade-lineage';
import type { IndentLineageNode } from '@/types/requisition-common';
import { IndentLineageTreeSvg } from './IndentLineageTreeSvg';

export type ProcurementVoucherKind = 'indent' | 'rfq' | 'quote' | 'po' | 'grn' | 'pi';

interface ProcurementLineageBreadcrumbProps {
  sourceVoucherNo?: string | null;
  sourceKind: ProcurementVoucherKind;
  sourceId?: string | null;
  entityCode: string;
  onLineageOpen?: () => void;
}

const KIND_LABEL: Record<ProcurementVoucherKind, string> = {
  indent: 'Indent',
  rfq: 'RFQ',
  quote: 'Quote',
  po: 'PO',
  grn: 'GRN',
  pi: 'PI',
};

const KIND_COLOR: Record<ProcurementVoucherKind, string> = {
  indent: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  rfq: 'bg-purple-500/10 text-purple-700 border-purple-500/30',
  quote: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  po: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  grn: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/30',
  pi: 'bg-rose-500/10 text-rose-700 border-rose-500/30',
};

export function ProcurementLineageBreadcrumb({
  sourceVoucherNo, sourceKind, sourceId, entityCode, onLineageOpen,
}: ProcurementLineageBreadcrumbProps): JSX.Element | null {
  const [showLineageModal, setShowLineageModal] = useState(false);

  const ancestors = useMemo<IndentLineageNode[]>(() => {
    if (!sourceId) return [];
    try {
      return walkAncestors(sourceId, entityCode);
    } catch { return []; }
  }, [sourceId, entityCode]);

  const descendants = useMemo<IndentLineageNode[]>(() => {
    if (!sourceId) return [];
    try {
      return walkDescendants(sourceId, entityCode);
    } catch { return []; }
  }, [sourceId, entityCode]);

  if (!sourceVoucherNo) return null;

  const handleOpenLineage = (): void => {
    setShowLineageModal(true);
    onLineageOpen?.();
  };

  return (
    <>
      <nav
        aria-label="Procurement lineage breadcrumb"
        className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap rounded border border-slate-500/20 bg-slate-500/5 px-3 py-2"
      >
        <GitBranch className="h-3.5 w-3.5 text-slate-600" />
        <span className="text-[10px] uppercase tracking-wide text-slate-600">P2P Lineage:</span>

        {ancestors.slice().reverse().map((a) => (
          <span key={`anc-${a.id}`} className="inline-flex items-center gap-1">
            <Badge variant="outline" className={`text-[10px] font-mono ${KIND_COLOR.indent}`}>
              Indent {a.voucher_no}
            </Badge>
            <ChevronRight className="h-3 w-3 text-slate-400" />
          </span>
        ))}

        <Badge variant="outline" className={`text-[10px] font-mono font-semibold ${KIND_COLOR[sourceKind]}`}>
          {KIND_LABEL[sourceKind]} {sourceVoucherNo}
        </Badge>

        {descendants.map((d) => (
          <span key={`des-${d.id}`} className="inline-flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-slate-400" />
            <Badge variant="outline" className={`text-[10px] font-mono ${KIND_COLOR.indent}`}>
              Indent {d.voucher_no}
            </Badge>
          </span>
        ))}

        <span className="flex-1" />

        {sourceId && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[10px] gap-1"
            onClick={handleOpenLineage}
          >
            <GitBranch className="h-3 w-3" />
            View tree
          </Button>
        )}
      </nav>

      {sourceId && (
        <Dialog open={showLineageModal} onOpenChange={setShowLineageModal}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-slate-600" />
                P2P Lineage Tree · {KIND_LABEL[sourceKind]} {sourceVoucherNo}
              </DialogTitle>
            </DialogHeader>
            <IndentLineageTreeSvg
              rootIndentId={sourceId}
              entityCode={entityCode}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
