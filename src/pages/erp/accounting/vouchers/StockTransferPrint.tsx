/**
 * StockTransferPrint.tsx — A4 printable Stock Transfer voucher.
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PrintSheetFrame } from '@/components/finecore/print/PrintSheetFrame';
import {
  buildStockTransferPrintPayload, STOCK_TRANSFER_COPY_CONFIG,
  formatDDMMMYYYY,
  type StockTransferPrintPayload,
} from '@/lib/stock-transfer-print-engine';
import { loadVoucher, loadEntityGst } from '@/lib/voucher-print-shared';

export function StockTransferPrintPanel() {
  const [params] = useSearchParams();
  const voucherId = params.get('voucher_id') ?? '';
  const entityCode = params.get('entity') ?? '';
  const copyKey = params.get('copy') ?? STOCK_TRANSFER_COPY_CONFIG.default;

  const [payload, setPayload] = useState<StockTransferPrintPayload | null>(null);

  useEffect(() => {
    if (!voucherId || !entityCode) return;
    const voucher = loadVoucher(entityCode, voucherId);
    if (!voucher) return;
    const gst = loadEntityGst(entityCode);
    setPayload(buildStockTransferPrintPayload(voucher, gst, copyKey));
  }, [voucherId, entityCode, copyKey]);

  const content = useMemo(() => {
    if (!payload) return <div className="text-sm text-muted-foreground">Loading voucher…</div>;
    const isInTransit = payload.status === 'IN TRANSIT';
    return (
      <>
        <div className="grid grid-cols-2 gap-4 text-[11px]">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Entity</div>
            <div className="font-semibold text-[13px]">{payload.supplier.legal_name}</div>
            <div className="text-muted-foreground text-[10px]">{payload.supplier_address}</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={`px-3 py-1 rounded font-bold text-[12px] ${
              isInTransit ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success'
            }`}>
              {payload.status}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 w-full">
              <div className="text-muted-foreground">ST No</div>
              <div className="font-mono text-right">{payload.voucher_no}</div>
              <div className="text-muted-foreground">Date</div>
              <div className="font-mono text-right">{formatDDMMMYYYY(payload.voucher_date)}</div>
              {payload.ref_no && (
                <>
                  <div className="text-muted-foreground">Ref No</div>
                  <div className="font-mono text-right">{payload.ref_no}</div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 border-t border-b border-border py-2 grid grid-cols-2 gap-4 text-[11px]">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">From Department</div>
            <div className="font-semibold">{payload.from_dept || '—'}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">To Department</div>
            <div className="font-semibold">{payload.to_dept || '—'}</div>
          </div>
        </div>

        <table className="w-full mt-4 text-[10px] border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="border border-border p-1.5 text-left">#</th>
              <th className="border border-border p-1.5 text-left">Item</th>
              <th className="border border-border p-1.5 text-right">Qty</th>
              <th className="border border-border p-1.5 text-left">UOM</th>
              <th className="border border-border p-1.5 text-left">Godown</th>
              <th className="border border-border p-1.5 text-left">Batch</th>
            </tr>
          </thead>
          <tbody>
            {payload.lines.map(l => (
              <tr key={`st-${l.sl_no}`}>
                <td className="border border-border p-1.5">{l.sl_no}</td>
                <td className="border border-border p-1.5">{l.item_name}</td>
                <td className="border border-border p-1.5 text-right font-mono">{l.qty}</td>
                <td className="border border-border p-1.5">{l.uom}</td>
                <td className="border border-border p-1.5">{l.godown}</td>
                <td className="border border-border p-1.5 font-mono">{l.batch || '—'}</td>
              </tr>
            ))}
            <tr className="bg-muted/30 font-semibold">
              <td className="border border-border p-1.5" colSpan={2}>Total</td>
              <td className="border border-border p-1.5 text-right font-mono">{payload.total_qty}</td>
              <td className="border border-border p-1.5" colSpan={3}></td>
            </tr>
          </tbody>
        </table>

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
      documentTitle="STOCK TRANSFER"
      documentNumber={payload?.voucher_no ?? ''}
      copyLabel={payload?.copy_label ?? ''}
    >
      {content}
    </PrintSheetFrame>
  );
}

export default StockTransferPrintPanel;
