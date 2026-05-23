/**
 * @file        src/components/production/BOMShortageDialog.tsx
 * @sprint      T-Phase-3.PROD-1 · Sub-theme 2/3
 * @purpose     Advisory dialog · shows BOM shortage list on PO release · offers "Create Indent" handoff to RequestX.
 */
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, FileText, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { BOMShortageItem } from '@/lib/stock-reservation-engine';

interface Props {
  open: boolean;
  onClose: () => void;
  onProceed: () => void;
  shortages: BOMShortageItem[];
  poDocNo: string;
  poId: string;
}

export function BOMShortageDialog({ open, onClose, onProceed, shortages, poDocNo, poId }: Props): JSX.Element {
  const navigate = useNavigate();

  const handleCreateIndent = (): void => {
    navigate('/erp/requestx/transactions/material-indent', {
      state: {
        prefill_source: 'production_shortage',
        prefill_po_id: poId,
        prefill_po_doc_no: poDocNo,
        prefill_notes: `Shortage from PO ${poDocNo} release`,
        prefill_items: shortages.map(s => ({
          item_id: s.item_id,
          item_name: s.item_name,
          qty: s.shortage_qty,
          uom: s.uom,
        })),
      },
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            BOM Component Shortage Detected
          </DialogTitle>
          <DialogDescription>
            PO {poDocNo} can be released, but the following components are short of available stock. You may
            create a Material Indent now or proceed anyway.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Item</th>
                <th className="text-right px-3 py-2">Required</th>
                <th className="text-right px-3 py-2">Available</th>
                <th className="text-right px-3 py-2">Shortage</th>
                <th className="text-left px-3 py-2">UOM</th>
              </tr>
            </thead>
            <tbody>
              {shortages.map(s => (
                <tr key={s.item_id} className="border-t border-border">
                  <td className="px-3 py-2">{s.item_name}</td>
                  <td className="px-3 py-2 text-right font-mono">{s.required_qty.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-mono">{s.available_qty.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    <Badge variant="destructive">{s.shortage_qty.toFixed(2)}</Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{s.uom}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onProceed}>
            Proceed Anyway
          </Button>
          <Button onClick={handleCreateIndent} className="gap-2">
            <FileText className="h-4 w-4" />
            Create Material Indent
            <ArrowRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BOMShortageDialog;
