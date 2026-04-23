/**
 * StockAdjustmentPrint.tsx — A4 printable Stock Adjustment voucher.
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PrintSheetFrame } from '@/components/finecore/print/PrintSheetFrame';
import {
  buildStockAdjustmentPrintPayload, STOCK_ADJUSTMENT_COPY_CONFIG,
  formatDDMMMYYYY,
  type StockAdjustmentPrintPayload,
} from '@/lib/stock-adjustment-print-engine';
import { loadVoucher, loadEntityGst } from '@/lib/voucher-print-shared';

export function StockAdjustmentPrintPanel() {
  const [params] = useSearchParams();
  const voucherId = params.get('voucher_id') ?? '';
  const entityCode = params.get('entity') ?? '';
  const copyKey = params.get('copy') ?? STOCK_ADJUSTMENT_COPY_CONFIG.default;

  const [payload, setPayload] = useState<StockAdjustmentPrintPayload | null>(null);

  useEffect(() => {
    if (!voucherId || !entityCode) return;
    const voucher = loadVoucher(entityCode, voucherId);
    if (!voucher) return;
    const gst = loadEntityGst(entityCode);
    setPayload(buildStockAdjustmentPrintPayload(voucher, gst, copyKey));
  }, [voucherId, entityCode, copyKey]);

  const content = useMemo(() => {
    if (!payload) return <div className="text-sm text-muted-foreground">Loading voucher…</div>;
    return (
      <>
        <div className="grid grid-cols-2 gap-4 text-[11px]">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Entity</div>
            <div className="font-semibold text-[13px]">{payload.supplier.legal_name}</div>
            <div className="text-muted-foreground text-[10px]">{payload.supplier_address}</div>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <div className="text-muted-foreground">SA No</div>
            <div className="font-mono text-right">{payload.voucher_no}</div>
            <div className="text-muted-foreground">Date</div>
            <div className="font-mono text-right">{formatDDMMMYYYY(payload.voucher_date)}</div>
            {payload.department && (
              <>
                <div className="text-muted-foreground">Department</div>
                <div className="text-right">{payload.department}</div>
              </>
            )}
            {payload.ref_no && (
              <>
                <div className="text-muted-foreground">Ref No</div>
                <div className="font-mono text-right">{payload.ref_no}</div>
              </>
            )}
          </div>
        </div>

        <table className="w-full mt-4 text-[10px] border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="border border-border p-1.5 text-left">#</th>
              <th className="border border-border p-1.5 text-left">Item</th>
              <th className="border border-border p-1.5 text-left">Godown</th>
              <th className="border border-border p-1.5 text-left">Direction</th>
              <th className="border border-border p-1.5 text-right">Qty</th>
              <th className="border border-border p-1.5 text-left">UOM</th>
              <th className="border border-border p-1.5 text-left">Reason</th>
            </tr>
          </thead>
          <tbody>
            {payload.lines.map(l => (
              <tr key={`sa-${l.sl_no}`}>
                <td className="border border-border p-1.5">{l.sl_no}</td>
                <td className="border border-border p-1.5">{l.item_name}</td>
                <td className="border border-border p-1.5">{l.godown}</td>
                <td className="border border-border p-1.5">
                  <span className={l.direction === 'Write-Off' ? 'text-destructive font-semibold' : 'text-success font-semibold'}>
                    {l.direction}
                  </span>
                </td>
                <td className="border border-border p-1.5 text-right font-mono">{l.qty}</td>
                <td className="border border-border p-1.5">{l.uom}</td>
                <td className="border border-border p-1.5">{l.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 grid grid-cols-2 gap-4 text-[11px]">
          <div className="text-muted-foreground">
            Total Write-Off Qty: <span className="font-mono font-semibold text-foreground">{payload.total_write_off_qty}</span>
          </div>
          <div className="text-muted-foreground">
            Total Write-On Qty: <span className="font-mono font-semibold text-foreground">{payload.total_write_on_qty}</span>
          </div>
        </div>

        {payload.narration && (
          <div className="mt-3 text-[10px]">
            <span className="text-muted-foreground uppercase tracking-wider text-[9px]">Narration: </span>
            {payload.narration}
          </div>
        )}

        <div className="mt-10 flex justify-end text-[10px]">
          <div className="text-right">
            <div className="border-t border-border pt-1 w-48">{payload.authorised_signatory}</div>
            <div className="text-muted-foreground mt-0.5">Authorised Signatory</div>
          </div>
        </div>
      </>
    );
  }, [payload]);

  return (
    <PrintSheetFrame
      documentTitle="STOCK ADJUSTMENT"
      documentNumber={payload?.voucher_no ?? ''}
      copyLabel={payload?.copy_label ?? ''}
    >
      {content}
    </PrintSheetFrame>
  );
}

export default StockAdjustmentPrintPanel;
