/**
 * DebitNotePrint.tsx — A4 Debit Note (purchase-side) print panel.
 *
 * Tri-copy GST document we issue to a vendor to increase our claim against
 * an existing bill (under-billing, price upward revision, additional
 * charges). CGST Rule 46 layout with HSN summary; reason_code rendered as
 * "—" until Voucher type is extended in a future sprint.
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PrintSheetFrame } from '@/components/finecore/print/PrintSheetFrame';
import {
  buildDebitNotePrintPayload, DEBIT_NOTE_COPY_CONFIG,
  formatINR, formatDDMMMYYYY,
  type DebitNotePrintPayload,
} from '@/lib/debit-note-print-engine';
import { loadVoucher, loadEntityGst } from '@/lib/voucher-print-shared';

export function DebitNotePrintPanel() {
  const [params] = useSearchParams();
  const voucherId = params.get('voucher_id') ?? '';
  const entityCode = params.get('entity') ?? '';
  const copyKey = params.get('copy') ?? DEBIT_NOTE_COPY_CONFIG.default;

  const [payload, setPayload] = useState<DebitNotePrintPayload | null>(null);

  useEffect(() => {
    if (!voucherId || !entityCode) return;
    const voucher = loadVoucher(entityCode, voucherId);
    if (!voucher) return;
    const gst = loadEntityGst(entityCode);
    setPayload(buildDebitNotePrintPayload(voucher, gst, copyKey));
  }, [voucherId, entityCode, copyKey]);

  const content = useMemo(() => {
    if (!payload) return (
      <div className="text-sm text-muted-foreground">Loading voucher…</div>
    );

    return (
      <>
        <div className="grid grid-cols-2 gap-4 text-[11px]">
          <div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Issuer (Supplier)</div>
            <div className="font-semibold text-[13px]">{payload.issuer.legal_name}</div>
            <div className="text-muted-foreground text-[10px]">{payload.issuer_address}</div>
            {payload.issuer.gstin && (
              <div className="font-mono text-[10px]">GSTIN: {payload.issuer.gstin}</div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <div className="text-muted-foreground">DN No</div>
            <div className="font-mono text-right">{payload.voucher_no}</div>
            <div className="text-muted-foreground">DN Date</div>
            <div className="font-mono text-right">{formatDDMMMYYYY(payload.voucher_date)}</div>
            <div className="text-muted-foreground">Against Bill</div>
            <div className="font-mono text-right">{payload.against_bill_no || '—'}</div>
            <div className="text-muted-foreground">Reason</div>
            <div className="text-right">{payload.reason_code}</div>
            <div className="text-muted-foreground">Place of Supply</div>
            <div className="font-mono text-right">{payload.place_of_supply || '—'}</div>
          </div>
        </div>

        <div className="mt-3 border-t border-border pt-3 text-[11px]">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Recipient (Vendor)</div>
          <div className="font-semibold text-[13px]">{payload.recipient_name || '—'}</div>
          {payload.recipient_gstin && (
            <div className="font-mono text-[10px]">GSTIN: {payload.recipient_gstin}</div>
          )}
          {payload.recipient_state && (
            <div className="text-[10px]">State Code: <span className="font-mono">{payload.recipient_state}</span></div>
          )}
        </div>

        <table className="w-full mt-4 text-[10px] border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="border border-border p-1.5 text-left">#</th>
              <th className="border border-border p-1.5 text-left">Description</th>
              <th className="border border-border p-1.5 text-left">HSN</th>
              <th className="border border-border p-1.5 text-right">Qty</th>
              <th className="border border-border p-1.5 text-right">Rate</th>
              <th className="border border-border p-1.5 text-right">Taxable</th>
              <th className="border border-border p-1.5 text-right">CGST</th>
              <th className="border border-border p-1.5 text-right">SGST</th>
              <th className="border border-border p-1.5 text-right">IGST</th>
              <th className="border border-border p-1.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {payload.lines.map((l) => (
              <tr key={`dn-l-${l.sl_no}`}>
                <td className="border border-border p-1.5">{l.sl_no}</td>
                <td className="border border-border p-1.5">{l.item_description}</td>
                <td className="border border-border p-1.5 font-mono">{l.hsn_sac}</td>
                <td className="border border-border p-1.5 text-right font-mono">{l.qty} {l.uom}</td>
                <td className="border border-border p-1.5 text-right font-mono">{formatINR(l.rate)}</td>
                <td className="border border-border p-1.5 text-right font-mono">{formatINR(l.taxable_value)}</td>
                <td className="border border-border p-1.5 text-right font-mono">
                  {l.cgst_amount > 0 ? `${l.cgst_rate}% ${formatINR(l.cgst_amount)}` : '—'}
                </td>
                <td className="border border-border p-1.5 text-right font-mono">
                  {l.sgst_amount > 0 ? `${l.sgst_rate}% ${formatINR(l.sgst_amount)}` : '—'}
                </td>
                <td className="border border-border p-1.5 text-right font-mono">
                  {l.igst_amount > 0 ? `${l.igst_rate}% ${formatINR(l.igst_amount)}` : '—'}
                </td>
                <td className="border border-border p-1.5 text-right font-mono">
                  {formatINR(l.taxable_value + l.cgst_amount + l.sgst_amount + l.igst_amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {payload.hsn_summary.length > 0 && (
          <>
            <div className="mt-4 text-[9px] uppercase tracking-wider text-muted-foreground">
              HSN / SAC Summary
            </div>
            <table className="w-full mt-1 text-[10px] border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border border-border p-1.5 text-left">HSN</th>
                  <th className="border border-border p-1.5 text-right">Taxable</th>
                  <th className="border border-border p-1.5 text-right">CGST</th>
                  <th className="border border-border p-1.5 text-right">SGST</th>
                  <th className="border border-border p-1.5 text-right">IGST</th>
                  <th className="border border-border p-1.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {payload.hsn_summary.map((h) => (
                  <tr key={`dn-hsn-${h.hsn_sac}`}>
                    <td className="border border-border p-1.5 font-mono">{h.hsn_sac || '—'}</td>
                    <td className="border border-border p-1.5 text-right font-mono">{formatINR(h.taxable)}</td>
                    <td className="border border-border p-1.5 text-right font-mono">{formatINR(h.cgst)}</td>
                    <td className="border border-border p-1.5 text-right font-mono">{formatINR(h.sgst)}</td>
                    <td className="border border-border p-1.5 text-right font-mono">{formatINR(h.igst)}</td>
                    <td className="border border-border p-1.5 text-right font-mono">{formatINR(h.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div className="mt-4 border-t border-border pt-2 grid grid-cols-2 gap-4 text-[11px]">
          <div className="flex-1">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Amount in words</div>
            <div className="italic">{payload.amount_in_words}</div>
            {payload.narration && (
              <div className="mt-2 text-[10px]">
                <span className="text-muted-foreground uppercase tracking-wider text-[9px]">Narration: </span>
                {payload.narration}
              </div>
            )}
          </div>
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxable Value</span>
              <span className="font-mono">{formatINR(payload.total_taxable)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">CGST</span>
              <span className="font-mono">{formatINR(payload.total_cgst)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">SGST</span>
              <span className="font-mono">{formatINR(payload.total_sgst)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IGST</span>
              <span className="font-mono">{formatINR(payload.total_igst)}</span>
            </div>
            {payload.round_off !== 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Round Off</span>
                <span className="font-mono">{formatINR(payload.round_off)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-1 font-bold">
              <span>Grand Total</span>
              <span className="font-mono">₹{formatINR(payload.grand_total)}</span>
            </div>
          </div>
        </div>

        <div className="mt-10 flex justify-end text-[10px]">
          <div className="text-right">
            <div className="border-t border-border pt-1 w-48">
              {payload.authorised_signatory}
            </div>
            <div className="text-muted-foreground mt-0.5">Authorised Signatory</div>
          </div>
        </div>
      </>
    );
  }, [payload]);

  return (
    <PrintSheetFrame
      documentTitle="DEBIT NOTE"
      documentNumber={payload?.voucher_no ?? ''}
      copyLabel={payload?.copy_label ?? ''}
    >
      {content}
    </PrintSheetFrame>
  );
}

export default DebitNotePrintPanel;
