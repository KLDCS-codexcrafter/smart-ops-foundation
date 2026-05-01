/**
 * StockMoveSlipPrint.tsx — Sprint T-Phase-1.2.6
 * Auto-print discipline for A-class items on stock movements.
 * Manual button for B/C class.
 */
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { PrintNarrationHeader } from '@/components/inventory-print/PrintNarrationHeader';

export interface StockMoveSlipData {
  move_no: string;
  date: string;
  godown_name: string;
  from_bin: string;
  to_bin: string;
  item_name: string;
  heat_no?: string | null;
  qty: number;
  uom: string;
  abc_class?: 'A' | 'B' | 'C' | null;
}

export function StockMoveSlipPrintPanel({ data, autoPrintForA = true }: {
  data: StockMoveSlipData;
  autoPrintForA?: boolean;
}) {
  useEffect(() => {
    if (autoPrintForA && data.abc_class === 'A') {
      // Auto-print only for A-class
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [autoPrintForA, data.abc_class]);

  return (
    <div className="p-6 max-w-2xl mx-auto print:p-0">
      <div className="border-2 border-black p-4 print:border-1">
        <div className="text-center text-lg font-bold mb-2">STOCK MOVE SLIP</div>
        <PrintNarrationHeader
          baseVoucherType="Stock Transfer"
          voucherTypeName="Stock Move Slip"
          voucherNo={data.move_no}
        />
        <div className="grid grid-cols-3 gap-2 text-xs mb-3">
          <div><b>Move No:</b> {data.move_no}</div>
          <div><b>Date:</b> {data.date}</div>
          <div><b>Godown:</b> {data.godown_name}</div>
        </div>
        <div className="border-t border-b py-2 my-2 grid grid-cols-2 gap-2 text-sm">
          <div><b>FROM:</b> {data.from_bin}</div>
          <div><b>TO:</b> {data.to_bin}</div>
        </div>
        <div className="text-sm space-y-1">
          <div><b>Item:</b> {data.item_name}</div>
          {data.heat_no && <div><b>Heat:</b> {data.heat_no}</div>}
          <div><b>Qty:</b> {data.qty} {data.uom}</div>
          {data.abc_class && <div><b>ABC Class:</b> {data.abc_class}</div>}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
          <div>Moved By: ____________ Time: ___:___</div>
          <div>Verified By: ____________ Time: ___:___</div>
        </div>
      </div>
      <div className="mt-4 flex justify-end print:hidden">
        <Button size="sm" onClick={() => window.print()} className="gap-1">
          <Printer className="h-4 w-4" /> Print Slip
        </Button>
      </div>
    </div>
  );
}
