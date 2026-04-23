/**
 * ProformaInvoicePrint.tsx — A4 printable proforma invoice
 * Sprint 6B. Loads quotation by id and renders a print-optimised layout.
 * [JWT] GET /api/salesx/quotations/:id
 */
import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import { quotationsKey, type Quotation } from '@/types/quotation';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

interface Props { entityCode?: string }

function loadQuotation(entityCode: string, id: string): Quotation | null {
  try {
    // [JWT] GET /api/salesx/quotations/:id
    const list = JSON.parse(localStorage.getItem(quotationsKey(entityCode)) || '[]') as Quotation[];
    return list.find(q => q.id === id) ?? null;
  } catch { return null; }
}

export function ProformaInvoicePrintPanel({ entityCode = DEFAULT_ENTITY_SHORTCODE }: Props) {
  const { quotationId } = useParams<{ quotationId: string }>();
  const navigate = useNavigate();
  const q = useMemo(
    () => quotationId ? loadQuotation(entityCode, quotationId) : null,
    [entityCode, quotationId],
  );

  if (!q) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Quotation not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>
    );
  }

  const inr = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <div className="bg-white text-black min-h-screen">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
        @page { size: A4; margin: 15mm; }
      `}</style>

      <div className="no-print sticky top-0 bg-muted/95 backdrop-blur-sm border-b p-3 flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button data-primary onClick={() => window.print()}
          className="bg-orange-500 hover:bg-orange-600">
          <Printer className="h-4 w-4 mr-1" /> Print
        </Button>
      </div>

      <div className="max-w-[210mm] mx-auto p-8 space-y-5">
        {/* Company header */}
        <div className="border-b-2 border-black pb-3">
          <h1 className="text-2xl font-bold">Operix Trading Pvt Ltd</h1>
          <p className="text-xs">123 MG Road, Mumbai 400001 · GSTIN 27AAAAA0000A1Z5</p>
        </div>

        <h2 className="text-center text-xl font-bold tracking-wider">PROFORMA INVOICE</h2>

        {/* Bill To + Invoice block */}
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="font-semibold mb-1">Bill To</p>
            <p>{q.customer_name ?? '—'}</p>
          </div>
          <div className="text-right">
            <p><span className="font-semibold">Proforma No:</span> {q.proforma_no ?? '—'}</p>
            <p><span className="font-semibold">Proforma Date:</span> {q.proforma_date ?? '—'}</p>
            <p><span className="font-semibold">Valid Until:</span> {q.valid_until_date ?? '—'}</p>
            <p><span className="font-semibold">Ref Quotation:</span> {q.quotation_no}</p>
          </div>
        </div>

        {/* Lines */}
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-black">
              <th className="text-left py-2">Item</th>
              <th className="text-left py-2 w-20">HSN/SAC</th>
              <th className="text-right py-2 w-16">Qty</th>
              <th className="text-right py-2 w-24">Rate</th>
              <th className="text-right py-2 w-28">Amount</th>
            </tr>
          </thead>
          <tbody>
            {q.items.map(it => (
              <tr key={it.id} className="border-b border-gray-300">
                <td className="py-2">{it.item_name}</td>
                <td className="py-2 font-mono text-xs">—</td>
                <td className="text-right py-2 font-mono">{it.qty} {it.uom ?? ''}</td>
                <td className="text-right py-2 font-mono">{inr(it.rate)}</td>
                <td className="text-right py-2 font-mono">{inr(it.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-72 text-sm space-y-1">
            <div className="flex justify-between"><span>Sub Total</span><span className="font-mono">{inr(q.sub_total)}</span></div>
            <div className="flex justify-between"><span>Tax</span><span className="font-mono">{inr(q.tax_amount)}</span></div>
            <div className="flex justify-between border-t-2 border-black pt-1 font-bold text-base">
              <span>Grand Total</span><span className="font-mono">{inr(q.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Terms */}
        {q.terms_conditions && (
          <div className="text-xs">
            <p className="font-semibold">Terms &amp; Conditions</p>
            <p className="whitespace-pre-line">{q.terms_conditions}</p>
          </div>
        )}

        {/* Signatory */}
        <div className="grid grid-cols-2 gap-6 pt-12 text-sm">
          <div></div>
          <div className="text-right">
            <div className="border-t border-black pt-1 inline-block px-12">Authorised Signatory</div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-center pt-4 border-t border-gray-300">
          This is a proforma invoice. Goods/services will be supplied against a formal Sales Invoice.
        </p>
      </div>
    </div>
  );
}

export default function ProformaInvoicePrint() {
  return <ProformaInvoicePrintPanel />;
}
