/**
 * @file     PurchaseInvoicePrint.tsx
 * @purpose  A4 internal copy of Purchase Invoice (audit trail of vendor bill posting).
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created T10-pre.2b.2 · Last updated Apr-2026 (T10-pre.2b.3b-B2 — toggle-gating)
 * @sprint   T10-pre.2b.2 (original), T10-pre.2b.3b-B2 (resolved_toggles gating), T10-pre.2c-mop (export wiring)
 * @iso      Functional Suitability (HIGH — 14 applicable toggles honored) · Usability (HIGH) · Maintainability (HIGH)
 * @whom     Accountant (internal copy)
 * @depends  purchase-print-engine.ts · print-config-storage.ts · print-render-helpers.ts · PrintSheetFrame
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PrintSheetFrame } from '@/components/finecore/print/PrintSheetFrame';
import {
  buildPurchasePrintPayload, PURCHASE_COPY_CONFIG,
  formatINR, formatDDMMMYYYY,
  buildPurchaseExportRows,
  type PurchasePrintPayload,
} from '@/lib/purchase-print-engine';
import { loadVoucher, loadEntityGst } from '@/lib/voucher-print-shared';
import { loadPrintConfig } from '@/lib/print-config-storage';

export function PurchaseInvoicePrintPanel() {
  const [params] = useSearchParams();
  const voucherId = params.get('voucher_id') ?? '';
  const entityCode = params.get('entity') ?? '';
  const copyKey = params.get('copy') ?? PURCHASE_COPY_CONFIG.default;

  const [payload, setPayload] = useState<PurchasePrintPayload | null>(null);

  useEffect(() => {
    if (!voucherId || !entityCode) return;
    const voucher = loadVoucher(entityCode, voucherId);
    if (!voucher) return;
    const gst = loadEntityGst(entityCode);
    // [Convergent] Load print config for this entity; engine resolves toggles into payload.resolved_toggles.
    const printConfig = loadPrintConfig(entityCode);
    setPayload(buildPurchasePrintPayload(voucher, gst, copyKey, printConfig));
  }, [voucherId, entityCode, copyKey]);

  const content = useMemo(() => {
    if (!payload) return (
      <div className="text-sm text-muted-foreground">Loading voucher…</div>
    );
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
            <div className="text-muted-foreground">Our Voucher No</div>
            <div className="font-mono text-right">{payload.voucher_no}</div>
            <div className="text-muted-foreground">Voucher Date</div>
            <div className="font-mono text-right">{formatDDMMMYYYY(payload.voucher_date)}</div>
            <div className="text-muted-foreground">Vendor Bill No</div>
            <div className="font-mono text-right">{payload.vendor_bill_no}</div>
            <div className="text-muted-foreground">Vendor Bill Date</div>
            <div className="font-mono text-right">{formatDDMMMYYYY(payload.vendor_bill_date)}</div>
            {payload.po_ref && (
              <>
                <div className="text-muted-foreground">Against PO</div>
                <div className="font-mono text-right">{payload.po_ref}</div>
              </>
            )}
            {t.showPlaceOfSupply && (
              <>
                <div className="text-muted-foreground">Place of Supply</div>
                <div className="font-mono text-right">{payload.place_of_supply}</div>
              </>
            )}
            {t.showReverseChargeFlag && (
              <>
                <div className="text-muted-foreground">RCM Applicable</div>
                <div className="text-right">{payload.is_rcm ? 'Yes' : 'No'}</div>
              </>
            )}
          </div>
        </div>

        <div className="mt-3 border-t border-border pt-3 text-[11px]">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Vendor (Supplier)</div>
          <div className="font-semibold text-[13px]">{payload.vendor_name || '—'}</div>
          {t.showHeaderGstin && payload.vendor_gstin && (
            <div className="font-mono text-[10px]">GSTIN: {payload.vendor_gstin}</div>
          )}
          {t.showHeaderStateCode && payload.vendor_state && (
            <div className="text-[10px]">State Code: <span className="font-mono">{payload.vendor_state}</span></div>
          )}
        </div>

        <table className="w-full mt-4 text-[10px] border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="border border-border p-1.5 text-left">#</th>
              <th className="border border-border p-1.5 text-left">Description</th>
              {t.showHsnSac && <th className="border border-border p-1.5 text-left">HSN</th>}
              <th className="border border-border p-1.5 text-right">Qty</th>
              {t.showRate && <th className="border border-border p-1.5 text-right">Rate</th>}
              {t.showDiscountColumn && <th className="border border-border p-1.5 text-right">Disc</th>}
              <th className="border border-border p-1.5 text-right">Taxable</th>
              <th className="border border-border p-1.5 text-right">CGST</th>
              <th className="border border-border p-1.5 text-right">SGST</th>
              <th className="border border-border p-1.5 text-right">IGST</th>
              <th className="border border-border p-1.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {payload.lines.map((l) => (
              <tr key={`pi-l-${l.sl_no}`}>
                <td className="border border-border p-1.5">{l.sl_no}</td>
                <td className="border border-border p-1.5">{l.item_description}</td>
                {t.showHsnSac && <td className="border border-border p-1.5 font-mono">{l.hsn_sac}</td>}
                <td className="border border-border p-1.5 text-right font-mono">{l.qty} {l.uom}</td>
                {t.showRate && <td className="border border-border p-1.5 text-right font-mono">{formatINR(l.rate)}</td>}
                {t.showDiscountColumn && <td className="border border-border p-1.5 text-right font-mono">—</td>}
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

        {t.showHsnSummary && payload.hsn_summary.length > 0 && (
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
                  <tr key={`pi-hsn-${h.hsn_sac}`}>
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
            {t.showAmountInWords && (
              <>
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Amount in words</div>
                <div className="italic">{payload.amount_in_words}</div>
              </>
            )}
            {t.showNarration && payload.narration && (
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
            {t.showRoundOff && payload.round_off !== 0 && (
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

        {t.showTermsAndConditions && (
          <div className="mt-4 text-[10px]">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Terms &amp; Conditions</div>
            <div className="text-muted-foreground mt-1">Internal copy. Subject to PO match and ITC eligibility.</div>
          </div>
        )}

        {t.showAuthorisedSignatory && (
          <div className="mt-10 flex justify-end text-[10px]">
            <div className="text-right">
              <div className="border-t border-border pt-1 w-48">
                {payload.authorised_signatory}
              </div>
              <div className="text-muted-foreground mt-0.5">Authorised Signatory</div>
            </div>
          </div>
        )}
      </>
    );
  }, [payload]);

  return (
    <PrintSheetFrame
      documentTitle="PURCHASE INVOICE — INTERNAL COPY"
      documentNumber={payload?.voucher_no ?? ''}
      copyLabel={payload?.copy_label ?? ''}
      exportData={payload ? { payload, buildRows: (p) => buildPurchaseExportRows(p as PurchasePrintPayload) } : undefined}
    >
      {content}
    </PrintSheetFrame>
  );
}

export default PurchaseInvoicePrintPanel;
