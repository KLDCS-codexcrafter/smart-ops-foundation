/**
 * DeliveryNotePrint.tsx — A4 printable Delivery Note voucher.
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PrintSheetFrame } from '@/components/finecore/print/PrintSheetFrame';
import {
  buildDeliveryNotePrintPayload, DELIVERY_NOTE_COPY_CONFIG,
  formatINR, formatDDMMMYYYY,
  type DeliveryNotePrintPayload,
} from '@/lib/delivery-note-print-engine';
import { loadVoucher, loadEntityGst } from '@/lib/voucher-print-shared';

export function DeliveryNotePrintPanel() {
  const [params] = useSearchParams();
  const voucherId = params.get('voucher_id') ?? '';
  const entityCode = params.get('entity') ?? '';
  const copyKey = params.get('copy') ?? DELIVERY_NOTE_COPY_CONFIG.default;

  const [payload, setPayload] = useState<DeliveryNotePrintPayload | null>(null);

  useEffect(() => {
    if (!voucherId || !entityCode) return;
    const voucher = loadVoucher(entityCode, voucherId);
    if (!voucher) return;
    const gst = loadEntityGst(entityCode);
    setPayload(buildDeliveryNotePrintPayload(voucher, gst, copyKey));
  }, [voucherId, entityCode, copyKey]);

  const content = useMemo(() => {
    if (!payload) return <div className="text-sm text-muted-foreground">Loading voucher…</div>;
    return (
      <>
        <div className="grid grid-cols-2 gap-4 text-[11px]">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Consignor</div>
            <div className="font-semibold text-[13px]">{payload.consignor.legal_name}</div>
            <div className="text-muted-foreground text-[10px]">{payload.consignor_address}</div>
            {payload.consignor.gstin && (
              <div className="font-mono text-[10px]">GSTIN: {payload.consignor.gstin}</div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <div className="text-muted-foreground">DLN No</div>
            <div className="font-mono text-right">{payload.voucher_no}</div>
            <div className="text-muted-foreground">Date</div>
            <div className="font-mono text-right">{formatDDMMMYYYY(payload.voucher_date)}</div>
            {payload.against_invoice && (
              <>
                <div className="text-muted-foreground">Against</div>
                <div className="font-mono text-right">{payload.against_invoice}</div>
              </>
            )}
            {payload.transporter && (
              <>
                <div className="text-muted-foreground">Transporter</div>
                <div className="text-right">{payload.transporter}</div>
              </>
            )}
            {payload.vehicle_no && (
              <>
                <div className="text-muted-foreground">Vehicle No</div>
                <div className="font-mono text-right">{payload.vehicle_no}</div>
              </>
            )}
          </div>
        </div>

        <div className="mt-3 border-t border-border pt-3 text-[11px]">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Consignee</div>
          <div className="font-semibold text-[13px]">{payload.consignee_name || '—'}</div>
          {payload.consignee_gstin && (
            <div className="font-mono text-[10px]">GSTIN: {payload.consignee_gstin}</div>
          )}
        </div>

        <table className="w-full mt-4 text-[10px] border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="border border-border p-1.5 text-left">#</th>
              <th className="border border-border p-1.5 text-left">Description</th>
              <th className="border border-border p-1.5 text-right">Qty</th>
              <th className="border border-border p-1.5 text-left">UOM</th>
              <th className="border border-border p-1.5 text-right">Rate</th>
              <th className="border border-border p-1.5 text-right">Value</th>
              <th className="border border-border p-1.5 text-left">Godown</th>
              <th className="border border-border p-1.5 text-left">Batch</th>
            </tr>
          </thead>
          <tbody>
            {payload.lines.map(l => (
              <tr key={`dln-${l.sl_no}`}>
                <td className="border border-border p-1.5">{l.sl_no}</td>
                <td className="border border-border p-1.5">{l.item_description}</td>
                <td className="border border-border p-1.5 text-right font-mono">{l.qty}</td>
                <td className="border border-border p-1.5">{l.uom}</td>
                <td className="border border-border p-1.5 text-right font-mono">{formatINR(l.rate)}</td>
                <td className="border border-border p-1.5 text-right font-mono">{formatINR(l.value)}</td>
                <td className="border border-border p-1.5">{l.godown}</td>
                <td className="border border-border p-1.5 font-mono">{l.batch || '—'}</td>
              </tr>
            ))}
            <tr className="bg-muted/30 font-semibold">
              <td className="border border-border p-1.5" colSpan={2}>Total</td>
              <td className="border border-border p-1.5 text-right font-mono">{payload.total_qty}</td>
              <td className="border border-border p-1.5" colSpan={2}></td>
              <td className="border border-border p-1.5 text-right font-mono">{formatINR(payload.total_value)}</td>
              <td className="border border-border p-1.5" colSpan={2}></td>
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
      documentTitle="DELIVERY NOTE"
      documentNumber={payload?.voucher_no ?? ''}
      copyLabel={payload?.copy_label ?? ''}
    >
      {content}
    </PrintSheetFrame>
  );
}

export default DeliveryNotePrintPanel;
