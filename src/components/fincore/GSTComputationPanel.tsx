/**
 * GSTComputationPanel.tsx — Read-only GST summary
 */
import type { VoucherInventoryLine } from '@/types/voucher';

interface GSTComputationPanelProps {
  lines: VoucherInventoryLine[];
  isInterState: boolean;
}

export function GSTComputationPanel({ lines, isInterState }: GSTComputationPanelProps) {
  const taxable = lines.reduce((s, l) => s + l.taxable_value, 0);
  const cgst = lines.reduce((s, l) => s + l.cgst_amount, 0);
  const sgst = lines.reduce((s, l) => s + l.sgst_amount, 0);
  const igst = lines.reduce((s, l) => s + l.igst_amount, 0);
  const cess = lines.reduce((s, l) => s + l.cess_amount, 0);
  const total = lines.reduce((s, l) => s + l.total, 0);
  const roundOff = Math.round(total) - total;
  const net = Math.round(total);

  const fmt = (n: number) => '₹' + Math.round(n * 100 / 100).toLocaleString('en-IN');

  return (
    <div className="border rounded-md p-4 bg-muted/30 space-y-1 text-sm">
      <div className="flex justify-between"><span className="text-muted-foreground">Taxable Value</span><span className="font-mono">{fmt(taxable)}</span></div>
      {!isInterState && <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span className="font-mono">{fmt(cgst)}</span></div>}
      {!isInterState && <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span className="font-mono">{fmt(sgst)}</span></div>}
      {isInterState && <div className="flex justify-between"><span className="text-muted-foreground">IGST</span><span className="font-mono">{fmt(igst)}</span></div>}
      {cess > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Cess</span><span className="font-mono">{fmt(cess)}</span></div>}
      <div className="flex justify-between"><span className="text-muted-foreground">Round Off</span><span className="font-mono">{fmt(roundOff)}</span></div>
      <div className="flex justify-between font-bold border-t pt-1 mt-1"><span>Net Amount</span><span className="font-mono">{fmt(net)}</span></div>
    </div>
  );
}
