/**
 * @file     ReceiptNotePrint.tsx
 * @purpose  A4 printable GRN voucher — multi-copy.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created T10-pre.2b.3a · Last updated Apr-2026 (T10-pre.2b.3b-B2 — toggle-gating)
 * @sprint   T10-pre.2b.3a (original), T10-pre.2b.3b-B2 (resolved_toggles gating)
 * @iso      Functional Suitability (HIGH) · Usability (HIGH) · Maintainability (HIGH)
 * @whom     Buyer (us) · Vendor (supplier)
 * @depends  receipt-note-print-engine.ts · print-config-storage.ts · print-render-helpers.ts · PrintSheetFrame
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PrintSheetFrame } from '@/components/finecore/print/PrintSheetFrame';
import {
  buildReceiptNotePrintPayload, RECEIPT_NOTE_COPY_CONFIG,
  formatINR, formatDDMMMYYYY,
  type ReceiptNotePrintPayload,
} from '@/lib/receipt-note-print-engine';
import { loadVoucher, loadEntityGst } from '@/lib/voucher-print-shared';
import { loadPrintConfig } from '@/lib/print-config-storage';

export function ReceiptNotePrintPanel() {
  const [params] = useSearchParams();
  const voucherId = params.get('voucher_id') ?? '';
  const entityCode = params.get('entity') ?? '';
  const copyKey = params.get('copy') ?? RECEIPT_NOTE_COPY_CONFIG.default;

  const [payload, setPayload] = useState<ReceiptNotePrintPayload | null>(null);

  useEffect(() => {
    if (!voucherId || !entityCode) return;
    const voucher = loadVoucher(entityCode, voucherId);
    if (!voucher) return;
    const gst = loadEntityGst(entityCode);
    // [Convergent] Load print config for this entity; engine resolves toggles into payload.resolved_toggles.
    const printConfig = loadPrintConfig(entityCode);
    setPayload(buildReceiptNotePrintPayload(voucher, gst, copyKey, printConfig));
  }, [voucherId, entityCode, copyKey]);

  const content = useMemo(() => {
    if (!payload) return <div className="text-sm text-muted-foreground">Loading voucher…</div>;
    const t = payload.resolved_toggles;
    return (
      <>
        <div className="grid grid-cols-2 gap-4 text-[11px]">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Buyer</div>
            <div className="font-semibold text-[13px]">{payload.buyer.legal_name}</div>
            <div className="text-muted-foreground text-[10px]">{payload.buyer_address}</div>
            {t.showHeaderGstin && payload.buyer.gstin && (
              <div className="font-mono text-[10px]">GSTIN: {payload.buyer.gstin}</div>
            )}
            {t.showHeaderPan && payload.buyer.pan && (
              <div className="font-mono text-[10px]">PAN: {payload.buyer.pan}</div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <div className="text-muted-foreground">GRN No</div>
            <div className="font-mono text-right">{payload.voucher_no}</div>
            <div className="text-muted-foreground">Date</div>
            <div className="font-mono text-right">{formatDDMMMYYYY(payload.voucher_date)}</div>
            {payload.vendor_challan_no && (
              <>
                <div className="text-muted-foreground">Vendor Challan</div>
                <div className="font-mono text-right">{payload.vendor_challan_no}</div>
              </>
            )}
            {payload.vendor_challan_date && (
              <>
                <div className="text-muted-foreground">Challan Date</div>
                <div className="font-mono text-right">{formatDDMMMYYYY(payload.vendor_challan_date)}</div>
              </>
            )}
            {t.showTransporterDetails && payload.transporter && (
              <>
                <div className="text-muted-foreground">Transporter</div>
                <div className="text-right">{payload.transporter}</div>
              </>
            )}
            {t.showTransporterDetails && payload.vehicle_no && (
              <>
                <div className="text-muted-foreground">Vehicle No</div>
                <div className="font-mono text-right">{payload.vehicle_no}</div>
              </>
            )}
          </div>
        </div>

        <div className="mt-3 border-t border-border pt-3 text-[11px]">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Vendor</div>
          <div className="font-semibold text-[13px]">{payload.vendor_name || '—'}</div>
          {t.showHeaderGstin && payload.vendor_gstin && (
            <div className="font-mono text-[10px]">GSTIN: {payload.vendor_gstin}</div>
          )}
        </div>

        <table className="w-full mt-4 text-[10px] border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="border border-border p-1.5 text-left">#</th>
              <th className="border border-border p-1.5 text-left">Description</th>
              <th className="border border-border p-1.5 text-right">Qty</th>
              <th className="border border-border p-1.5 text-left">UOM</th>
              {t.showRate && <th className="border border-border p-1.5 text-right">Rate</th>}
              {t.showValue && <th className="border border-border p-1.5 text-right">Value</th>}
              {t.showGodown && <th className="border border-border p-1.5 text-left">Godown</th>}
              {t.showBatch && <th className="border border-border p-1.5 text-left">Batch</th>}
            </tr>
          </thead>
          <tbody>
            {payload.lines.map(l => (
              <tr key={`grn-${l.sl_no}`}>
                <td className="border border-border p-1.5">{l.sl_no}</td>
                <td className="border border-border p-1.5">{l.item_description}</td>
                <td className="border border-border p-1.5 text-right font-mono">{l.qty}</td>
                <td className="border border-border p-1.5">{l.uom}</td>
                {t.showRate && <td className="border border-border p-1.5 text-right font-mono">{formatINR(l.rate)}</td>}
                {t.showValue && <td className="border border-border p-1.5 text-right font-mono">{formatINR(l.value)}</td>}
                {t.showGodown && <td className="border border-border p-1.5">{l.godown}</td>}
                {t.showBatch && <td className="border border-border p-1.5 font-mono">{l.batch || '—'}</td>}
              </tr>
            ))}
            {/* [Analytical] Positional totals — colSpans match visible cells. */}
            <tr className="bg-muted/30 font-semibold">
              <td className="border border-border p-1.5" colSpan={2}>Total</td>
              <td className="border border-border p-1.5 text-right font-mono">{payload.total_qty}</td>
              {(() => {
                const beforeValue = 1 + (t.showRate ? 1 : 0);
                return <td className="border border-border p-1.5" colSpan={beforeValue}></td>;
              })()}
              {t.showValue && (
                <td className="border border-border p-1.5 text-right font-mono">{formatINR(payload.total_value)}</td>
              )}
              {(t.showGodown || t.showBatch) && (
                <td
                  className="border border-border p-1.5"
                  colSpan={(t.showGodown ? 1 : 0) + (t.showBatch ? 1 : 0)}
                ></td>
              )}
            </tr>
          </tbody>
        </table>

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
      documentTitle="RECEIPT NOTE (GRN)"
      documentNumber={payload?.voucher_no ?? ''}
      copyLabel={payload?.copy_label ?? ''}
    >
      {content}
    </PrintSheetFrame>
  );
}

export default ReceiptNotePrintPanel;
