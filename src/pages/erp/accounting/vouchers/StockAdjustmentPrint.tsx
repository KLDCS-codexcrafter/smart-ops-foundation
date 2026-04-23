/**
 * @file     StockAdjustmentPrint.tsx
 * @purpose  A4 printable Stock Adjustment voucher.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created T10-pre.2b.3a · Last updated Apr-2026 (T10-pre.2b.3b-B2 — toggle-gating)
 * @sprint   T10-pre.2b.3a (original), T10-pre.2b.3b-B2 (resolved_toggles gating), T10-pre.2c-mop (export wiring)
 * @iso      Functional Suitability (HIGH) · Usability (HIGH) · Maintainability (HIGH)
 * @whom     Stores (warehouse adjustment trail)
 * @depends  stock-adjustment-print-engine.ts · print-config-storage.ts · PrintSheetFrame
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PrintSheetFrame } from '@/components/finecore/print/PrintSheetFrame';
import {
  buildStockAdjustmentPrintPayload, STOCK_ADJUSTMENT_COPY_CONFIG,
  formatDDMMMYYYY,
  buildStockAdjustmentExportRows,
  type StockAdjustmentPrintPayload,
} from '@/lib/stock-adjustment-print-engine';
import { loadVoucher, loadEntityGst } from '@/lib/voucher-print-shared';
import { loadPrintConfig } from '@/lib/print-config-storage';

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
    // [Convergent] Load print config for this entity; engine resolves toggles into payload.resolved_toggles.
    const printConfig = loadPrintConfig(entityCode);
    setPayload(buildStockAdjustmentPrintPayload(voucher, gst, copyKey, printConfig));
  }, [voucherId, entityCode, copyKey]);

  const content = useMemo(() => {
    if (!payload) return <div className="text-sm text-muted-foreground">Loading voucher…</div>;
    const t = payload.resolved_toggles;
    return (
      <>
        <div className="grid grid-cols-2 gap-4 text-[11px]">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Entity</div>
            <div className="font-semibold text-[13px]">{payload.supplier.legal_name}</div>
            <div className="text-muted-foreground text-[10px]">{payload.supplier_address}</div>
            {t.showHeaderGstin && payload.supplier.gstin && (
              <div className="font-mono text-[10px]">GSTIN: {payload.supplier.gstin}</div>
            )}
            {t.showHeaderPan && payload.supplier.pan && (
              <div className="font-mono text-[10px]">PAN: {payload.supplier.pan}</div>
            )}
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
              {t.showGodown && <th className="border border-border p-1.5 text-left">Godown</th>}
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
                {t.showGodown && <td className="border border-border p-1.5">{l.godown}</td>}
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

        {t.showNarration && payload.narration && (
          <div className="mt-3 text-[10px]">
            <span className="text-muted-foreground uppercase tracking-wider text-[9px]">Narration: </span>
            {payload.narration}
          </div>
        )}

        {t.showAuthorisedSignatory && (
          <div className="mt-10 flex justify-end text-[10px]">
            <div className="text-right">
              <div className="border-t border-border pt-1 w-48">{payload.authorised_signatory}</div>
              <div className="text-muted-foreground mt-0.5">Authorised Signatory</div>
            </div>
          </div>
        )}
      </>
    );
  }, [payload]);

  return (
    <PrintSheetFrame
      documentTitle="STOCK ADJUSTMENT"
      documentNumber={payload?.voucher_no ?? ''}
      copyLabel={payload?.copy_label ?? ''}
      exportData={payload ? { payload, buildRows: (p) => buildStockAdjustmentExportRows(p as StockAdjustmentPrintPayload) } : undefined}
    >
      {content}
    </PrintSheetFrame>
  );
}

export default StockAdjustmentPrintPanel;
