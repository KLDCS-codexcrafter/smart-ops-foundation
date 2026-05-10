/**
 * BOMPicker.tsx — Reusable BOM picker dialog
 *
 * Built for Sprint T10-pre.2a-S1b's Manufacturing Journal voucher to pick the
 * BOM that drives a production run. Lives under finecore/pickers alongside
 * LedgerPicker / GodownPicker for consistency.
 *
 * INPUT        open, onClose, onPick, productItemId?, activeOnly?, entityCode
 * OUTPUT       Calls onPick(bom) with the full Bom object then onClose().
 *
 * DEPENDENCIES shadcn Dialog + Input + Button + Badge + ScrollArea
 *              useBOM (CRUD hook) for entity-scoped reads
 *
 * No localStorage access here — useBOM owns persistence.
 */
import { useMemo, useState } from 'react';
import { Search, Layers } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBOM } from '@/hooks/useBOM';
import type { Bom } from '@/types/bom';

interface BOMPickerProps {
  /** Controlled open state */
  open: boolean;
  /** Callback when closed without selection */
  onClose: () => void;
  /** Callback when user picks a BOM. Receives the full Bom object. */
  onPick: (bom: Bom) => void;
  /** Optional: restrict picker to a specific product */
  productItemId?: string;
  /** Optional: restrict to active BOMs only (default true) */
  activeOnly?: boolean;
  /** The entityCode to scope BOMs by */
  entityCode: string;
}

function formatDateRange(validFrom: string, validTo: string | null | undefined): string {
  const to = validTo ?? 'open';
  return `valid ${validFrom} → ${to}`;
}

export function BOMPicker({
  open,
  onClose,
  onPick,
  productItemId,
  activeOnly = true,
  entityCode,
}: BOMPickerProps) {
  const { boms } = useBOM(entityCode);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return boms
      .filter(b => (productItemId ? b.product_item_id === productItemId : true))
      .filter(b => (activeOnly ? b.is_active : true))
      .filter(b => {
        if (!q) return true;
        return (
          b.product_item_name.toLowerCase().includes(q)
          || b.product_item_code.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const byName = a.product_item_name.localeCompare(b.product_item_name);
        if (byName !== 0) return byName;
        return b.version_no - a.version_no;
      });
  }, [boms, productItemId, activeOnly, search]);

  const handlePick = (bom: Bom) => {
    onPick(bom);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Select BOM
          </DialogTitle>
          <DialogDescription>
            {activeOnly
              ? 'Showing active BOMs only.'
              : 'Showing all BOM versions.'}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name or code…"
            className="pl-9"
            autoFocus
          />
        </div>

        <ScrollArea className="h-80 rounded-md border">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No BOMs match. Create one in Inventory → BOM Master.
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((bom) => (
                <button
                  key={bom.id}
                  type="button"
                  onClick={() => handlePick(bom)}
                  className="w-full text-left p-3 hover:bg-accent transition-colors flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold truncate">
                        {bom.product_item_name}
                      </p>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        v{bom.version_no}
                      </Badge>
                      {bom.is_active ? (
                        <Badge className="text-[10px] bg-success/15 text-success border-success/30">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                      {bom.product_item_code}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      output: {bom.output_qty} {bom.output_uom}
                      {' · '}
                      {formatDateRange(bom.valid_from, bom.valid_to)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BOMPicker;
