/**
 * @file     SalesInvoicePrint.tsx
 * @purpose  A4 Tax Invoice — 3-copy (Original/Duplicate/Triplicate) · GST + IRN QR + UPI.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created Sprint 9 · Last updated Apr-2026 (T10-pre.2b.3b-B2 — toggle-gating)
 * @sprint   Sprint 9 (original), T10-pre.2b.3b-B2 (resolved_toggles gating)
 * @iso      Functional Suitability (HIGH — all 15 applicable toggles honored) · Usability (HIGH — Tally F12 parity) · Maintainability (HIGH)
 * @whom     Customer (recipient) · Transporter · Supplier (us) · Accountant
 * @depends  invoice-print-engine.ts · print-config-storage.ts · PrintSheetFrame
 */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft, FileText } from 'lucide-react';
import type { Voucher } from '@/types/voucher';
import type { IRNRecord } from '@/types/irn';
import { irnRecordsKey, ewbRecordsKey } from '@/types/irn';
import type { EntityGSTConfig } from '@/types/entity-gst';
import { entityGstKey, DEFAULT_ENTITY_GST_CONFIG } from '@/types/entity-gst';
import {
  buildInvoicePrintPayload, type InvoicePrintPayload,
} from '@/lib/invoice-print-engine';
import { vouchersKey } from '@/lib/finecore-engine';
import { buildUpiIntent } from '@/lib/payment-gateway-engine';
import { resolveCustomerAddress, formatDDMMMYYYY, formatDateTimeIST } from '@/lib/customer-address-lookup';
import { loadPrintConfig } from '@/lib/print-config-storage';

function loadOne<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function loadList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}

export function SalesInvoicePrintPanel() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const voucherId = params.get('voucher_id') ?? '';
  const entityCode = params.get('entity') ?? 'SMRT';
  const copyType = (params.get('copy') ?? 'original') as 'original' | 'duplicate' | 'triplicate';

  const [payload, setPayload] = useState<InvoicePrintPayload | null>(null);

  useEffect(() => {
    if (!voucherId) return;
    // [JWT] GET /api/accounting/vouchers/:id
    const vouchers = loadList<Voucher>(vouchersKey(entityCode));
    const v = vouchers.find(x => x.id === voucherId);
    if (!v) return;
    // [JWT] GET /api/finecore/irn/:voucher_id
    const irns = loadList<IRNRecord>(irnRecordsKey(entityCode));
    const irn = irns.find(r => r.voucher_id === voucherId && r.status === 'generated') ?? null;
    const supplierGst = loadOne<EntityGSTConfig>(
      entityGstKey(entityCode),
      { ...DEFAULT_ENTITY_GST_CONFIG, entity_id: entityCode },
    );
    const upiUri = supplierGst.upi_vpa
      ? buildUpiIntent(
          v.net_amount,
          `Inv ${v.voucher_no}`,
          supplierGst.upi_vpa,
          supplierGst.upi_payee_name || supplierGst.legal_name,
        )
      : null;
    // Audit fix #4: real customer address (not party_name)
    const resolved = resolveCustomerAddress(
      v.party_id ?? null,
      v.party_name ?? null,
      v.customer_state_code ?? v.party_state_code ?? null,
    );
    // [Convergent] Load print config; engine resolves toggles into payload.resolved_toggles.
    const printConfig = loadPrintConfig(entityCode);
    const built = buildInvoicePrintPayload(
      {
        voucher: v,
        irn,
        supplierGst,
        customerName: resolved.legal_name || v.party_name || '',
        customerGstin: v.party_gstin ?? null,
        customerAddress: resolved.full_address || '—',
        customerStateCode: resolved.state_code || v.customer_state_code || v.party_state_code || '',
        paymentUpiUri: upiUri,
      },
      copyType,
      printConfig,
    );
    setPayload(built);
  }, [voucherId, entityCode, copyType]);

  const headerStyle = useMemo(() => ({
    background: 'linear-gradient(135deg, hsl(var(--primary) / 0.06), hsl(var(--primary) / 0.02))',
  }), []);

  if (!payload) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center text-sm text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
          Loading invoice…
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const ewbList = loadList<{ voucher_id: string; ewb_no: string | null; valid_until: string | null }>(
    ewbRecordsKey(entityCode),
  );
  const ewb = ewbList.find(e => e.voucher_id === voucherId && e.ewb_no);

  // [Convergent] Resolved toggles drive all visibility decisions below.
  const t = payload.resolved_toggles;
  // [Analytical] tfoot Total label colSpan = 3 fixed (#, Desc, Qty) + each toggleable col present.
  const totalLabelColSpan =
    3 +
    (t.showHsnSac ? 1 : 0) +
    (t.showRate ? 1 : 0) +
    (t.showDiscountColumn ? 1 : 0);

  return (
    <div className="min-h-screen bg-muted/40 print:bg-white">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body, html { background: white !important; }
          .invoice-sheet { box-shadow: none !important; margin: 0 !important; }
        }
        @page { size: A4; margin: 12mm; }
      `}</style>

      {/* Toolbar */}
      <div className="no-print sticky top-0 z-10 border-b border-border/50 bg-background/90 backdrop-blur px-4 py-2 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>
        <div className="flex-1 text-sm font-semibold">{payload.title} · {payload.voucher_no}</div>
        <Button data-primary size="sm" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5 mr-1" /> Print
        </Button>
      </div>

      {/* A4 sheet */}
      <div
        className="invoice-sheet mx-auto my-4 bg-white text-foreground shadow-lg"
        style={{ width: '210mm', minHeight: '297mm', padding: '12mm' }}
      >
        {/* Top header */}
        <div className="flex items-start justify-between border-b border-border pb-3" style={headerStyle}>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {payload.copy_label}
            </div>
            <h1 className="text-xl font-bold tracking-tight">{payload.title}</h1>
          </div>
          <div className="text-right">
            <div className="text-base font-bold">{payload.supplier_name}</div>
            <div className="text-[10px] text-muted-foreground">{payload.supplier_address}</div>
            {t.showHeaderGstin && (
              <div className="text-[10px] font-mono">GSTIN: {payload.supplier_gstin || '—'}</div>
            )}
            {t.showHeaderPan && (
              <div className="text-[10px] font-mono">PAN: {payload.supplier_pan || '—'}</div>
            )}
          </div>
        </div>

        {/* Invoice meta */}
        <div className="grid grid-cols-2 gap-4 mt-3 text-[11px]">
          <div className="space-y-1">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Bill To</div>
            <div className="font-semibold">{payload.bill_to_name}</div>
            <div className="text-muted-foreground">{payload.bill_to_address}</div>
            {payload.bill_to_gstin && (
              <div className="font-mono">GSTIN: {payload.bill_to_gstin}</div>
            )}
            {t.showHeaderStateCode && (
              <div>State Code: <span className="font-mono">{payload.bill_to_state}</span></div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <div className="text-muted-foreground">Invoice No</div>
            <div className="font-mono text-right">{payload.voucher_no}</div>
            <div className="text-muted-foreground">Invoice Date</div>
            <div className="font-mono text-right">{formatDDMMMYYYY(payload.voucher_date)}</div>
            {t.showPlaceOfSupply && (
              <>
                <div className="text-muted-foreground">Place of Supply</div>
                <div className="font-mono text-right">{payload.place_of_supply}</div>
              </>
            )}
            {t.showReverseChargeFlag && (
              <>
                <div className="text-muted-foreground">Reverse Charge</div>
                <div className="text-right">{payload.reverse_charge}</div>
              </>
            )}
            {t.showTransporterDetails && payload.transporter && (
              <>
                <div className="text-muted-foreground">Transporter</div>
                <div className="text-right">{payload.transporter}</div>
              </>
            )}
            {t.showTransporterDetails && payload.vehicle_number && (
              <>
                <div className="text-muted-foreground">Vehicle</div>
                <div className="font-mono text-right">{payload.vehicle_number}</div>
              </>
            )}
          </div>
        </div>

        {/* Line items */}
        <table className="w-full mt-4 text-[10px] border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="border border-border p-1.5 text-left">#</th>
              <th className="border border-border p-1.5 text-left">Description</th>
              {t.showHsnSac && (
                <th className="border border-border p-1.5 text-left">HSN</th>
              )}
              <th className="border border-border p-1.5 text-right">Qty</th>
              {t.showRate && (
                <th className="border border-border p-1.5 text-right">Rate</th>
              )}
              {t.showDiscountColumn && (
                <th className="border border-border p-1.5 text-right">Disc</th>
              )}
              <th className="border border-border p-1.5 text-right">Taxable</th>
              <th className="border border-border p-1.5 text-right">CGST</th>
              <th className="border border-border p-1.5 text-right">SGST</th>
              <th className="border border-border p-1.5 text-right">IGST</th>
            </tr>
          </thead>
          <tbody>
            {payload.lines.map(l => (
              <tr key={`line-${l.sl_no}`}>
                <td className="border border-border p-1.5">{l.sl_no}</td>
                <td className="border border-border p-1.5">{l.item_description}</td>
                {t.showHsnSac && (
                  <td className="border border-border p-1.5 font-mono">{l.hsn_sac}</td>
                )}
                <td className="border border-border p-1.5 text-right font-mono">{l.qty} {l.uom}</td>
                {t.showRate && (
                  <td className="border border-border p-1.5 text-right font-mono">₹{l.rate.toLocaleString('en-IN')}</td>
                )}
                {t.showDiscountColumn && (
                  <td className="border border-border p-1.5 text-right font-mono">₹{l.discount.toLocaleString('en-IN')}</td>
                )}
                <td className="border border-border p-1.5 text-right font-mono">₹{l.taxable_value.toLocaleString('en-IN')}</td>
                <td className="border border-border p-1.5 text-right font-mono">₹{l.cgst_amount.toLocaleString('en-IN')}</td>
                <td className="border border-border p-1.5 text-right font-mono">₹{l.sgst_amount.toLocaleString('en-IN')}</td>
                <td className="border border-border p-1.5 text-right font-mono">₹{l.igst_amount.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted/40 font-semibold">
              <td className="border border-border p-1.5" colSpan={totalLabelColSpan}>Total</td>
              <td className="border border-border p-1.5 text-right font-mono">₹{payload.total_taxable.toLocaleString('en-IN')}</td>
              <td className="border border-border p-1.5 text-right font-mono">₹{payload.total_cgst.toLocaleString('en-IN')}</td>
              <td className="border border-border p-1.5 text-right font-mono">₹{payload.total_sgst.toLocaleString('en-IN')}</td>
              <td className="border border-border p-1.5 text-right font-mono">₹{payload.total_igst.toLocaleString('en-IN')}</td>
            </tr>
          </tfoot>
        </table>

        {/* HSN Summary */}
        {t.showHsnSummary && payload.hsn_summary.length > 0 && (
          <div className="mt-4">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">HSN Summary</div>
            <table className="w-full text-[10px] border-collapse">
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
                {payload.hsn_summary.map(h => (
                  <tr key={`hsn-${h.hsn_sac || 'none'}`}>
                    <td className="border border-border p-1.5 font-mono">{h.hsn_sac || '—'}</td>
                    <td className="border border-border p-1.5 text-right font-mono">₹{h.taxable.toLocaleString('en-IN')}</td>
                    <td className="border border-border p-1.5 text-right font-mono">₹{h.cgst.toLocaleString('en-IN')}</td>
                    <td className="border border-border p-1.5 text-right font-mono">₹{h.sgst.toLocaleString('en-IN')}</td>
                    <td className="border border-border p-1.5 text-right font-mono">₹{h.igst.toLocaleString('en-IN')}</td>
                    <td className="border border-border p-1.5 text-right font-mono">₹{h.total.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals + amount in words */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="text-[10px] space-y-1">
            {t.showAmountInWords && (
              <>
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Amount in Words</div>
                <div className="italic">{payload.amount_in_words}</div>
              </>
            )}
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-3">Bank</div>
            <div>{payload.bank_name || '—'}</div>
            <div className="font-mono">A/C: {payload.bank_account_no || '—'}</div>
            <div className="font-mono">IFSC: {payload.bank_ifsc || '—'} · {payload.bank_branch || '—'}</div>
          </div>
          <div className="text-[11px]">
            <div className="grid grid-cols-2 gap-y-1">
              <div className="text-muted-foreground">Taxable Value</div>
              <div className="font-mono text-right">₹{payload.total_taxable.toLocaleString('en-IN')}</div>
              <div className="text-muted-foreground">CGST</div>
              <div className="font-mono text-right">₹{payload.total_cgst.toLocaleString('en-IN')}</div>
              <div className="text-muted-foreground">SGST</div>
              <div className="font-mono text-right">₹{payload.total_sgst.toLocaleString('en-IN')}</div>
              <div className="text-muted-foreground">IGST</div>
              <div className="font-mono text-right">₹{payload.total_igst.toLocaleString('en-IN')}</div>
              {t.showRoundOff && (
                <>
                  <div className="text-muted-foreground">Round Off</div>
                  <div className="font-mono text-right">₹{payload.round_off.toLocaleString('en-IN')}</div>
                </>
              )}
              <div className="font-bold pt-2 border-t border-border">Grand Total</div>
              <div className="font-bold font-mono text-right pt-2 border-t border-border">
                ₹{payload.grand_total.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>

        {/* QR codes + IRN block */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-border">
          {t.showEInvoiceQr && (
            <div className="text-[10px]">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">e-Invoice IRN</div>
              {payload.irn ? (
                <>
                  <div className="font-mono break-all">{payload.irn}</div>
                  <div>Ack No: <span className="font-mono">{payload.irn_ack_no}</span></div>
                  <div>Ack Date: <span className="font-mono">{formatDateTimeIST(payload.irn_ack_date)}</span></div>
                  {t.showEwayBillInfo && ewb && (
                    <div className="mt-1">EWB: <span className="font-mono">{ewb.ewb_no}</span></div>
                  )}
                  {t.showEwayBillInfo && ewb?.valid_until && (
                    <div>Valid Until: <span className="font-mono">{formatDDMMMYYYY(ewb.valid_until)}</span></div>
                  )}
                </>
              ) : (
                <div className="text-muted-foreground italic">Not generated</div>
              )}
            </div>
          )}
          {t.showEInvoiceQr && (
            <div className="flex flex-col items-center text-[10px]">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Signed QR</div>
              {payload.signed_qr_url ? (
                <img
                  src={payload.signed_qr_url}
                  alt="IRN signed QR"
                  className="w-[120px] h-[120px] border border-border"
                />
              ) : (
                <div className="w-[120px] h-[120px] border border-dashed border-border flex items-center justify-center text-[9px] text-muted-foreground text-center">
                  IRN not<br />generated
                </div>
              )}
            </div>
          )}
          <div className="flex flex-col items-center text-[10px]">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Pay via UPI</div>
            {payload.payment_qr_url ? (
              <>
                <img
                  src={payload.payment_qr_url}
                  alt="UPI payment QR"
                  className="w-[120px] h-[120px] border border-border"
                />
                <div className="font-mono mt-1">{payload.payment_upi_vpa}</div>
              </>
            ) : (
              <div className="w-[120px] h-[120px] border border-dashed border-border flex items-center justify-center text-[9px] text-muted-foreground text-center">
                UPI VPA not<br />configured
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="grid grid-cols-2 gap-4 mt-6 text-[10px]">
          {t.showTermsAndConditions ? (
            <div>
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Terms &amp; Conditions</div>
              <div className="text-muted-foreground mt-1">{payload.terms}</div>
            </div>
          ) : (
            <div />
          )}
          {t.showAuthorisedSignatory ? (
            <div className="text-right flex flex-col justify-end">
              <div className="font-semibold">For {payload.supplier_name}</div>
              <div className="mt-12 border-t border-border pt-1">{payload.authorised_signatory}</div>
              <div className="text-[9px] text-muted-foreground">Authorised Signatory</div>
            </div>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
}

export default function SalesInvoicePrint() {
  return <SalesInvoicePrintPanel />;
}
