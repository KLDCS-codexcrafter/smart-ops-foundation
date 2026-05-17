/**
 * IRNPrint.tsx — UPRA-4 Phase B′ HOTFIX · NEW Print component
 * e-Invoice-style A4 portrait document with prominent QR code · matches NIC IRP schema v1.1.0 visual conventions.
 */
import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { useEntityCode } from '@/hooks/useEntityCode';
import type { IRNRecord } from '@/types/irn';

const inr = (n: number): string =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export interface IRNPrintProps {
  record: IRNRecord;
  onClose?: () => void;
}

export function IRNPrint({ record, onClose }: IRNPrintProps): JSX.Element {
  const { entityCode } = useEntityCode();
  const company: PrintCompany = {
    name: entityCode || 'Operix',
    gstin: record.supplier_gstin || '—',
    pan: '—',
  };

  return (
    <UniversalPrintFrame
      company={company}
      title="e-Invoice (IRN)"
      docNo={record.voucher_no}
      voucherDate={record.voucher_date.slice(0, 10)}
      onClose={onClose}
      signatories={['Issuer', 'Recipient', 'IRP (GSTN)']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="col-span-2">
            <span className="font-semibold">IRN:</span>{' '}
            <span className="font-mono break-all">{record.irn ?? '—'}</span>
          </div>
          <div><span className="font-semibold">Ack No:</span> {record.ack_no ?? '—'}</div>
          <div><span className="font-semibold">Ack Date:</span> {record.ack_date ?? '—'}</div>
          <div><span className="font-semibold">Supplier GSTIN:</span> {record.supplier_gstin}</div>
          <div><span className="font-semibold">Customer GSTIN:</span> {record.customer_gstin || 'Unregistered'}</div>
          <div><span className="font-semibold">Customer:</span> {record.customer_name}</div>
          <div><span className="font-semibold">Voucher Type:</span> {record.voucher_type}</div>
        </div>
      }
      termsAndConditions="e-Invoice generated per NIC IRP schema v1.1.0 · digitally signed by GSTN · IRN is the legal proof of invoice registration."
    >
      <div className="grid grid-cols-2 gap-6 mt-4">
        <div className="space-y-2 text-sm">
          <div className="font-semibold border-b pb-1 mb-2">Tax Breakup</div>
          <div className="flex justify-between"><span>Taxable Value</span><span className="font-mono">{inr(record.total_taxable_value)}</span></div>
          <div className="flex justify-between"><span>CGST</span><span className="font-mono">{inr(record.total_cgst)}</span></div>
          <div className="flex justify-between"><span>SGST</span><span className="font-mono">{inr(record.total_sgst)}</span></div>
          <div className="flex justify-between"><span>IGST</span><span className="font-mono">{inr(record.total_igst)}</span></div>
          <div className="flex justify-between font-bold border-t pt-2 mt-2">
            <span>Total Invoice Value</span>
            <span className="font-mono">{inr(record.total_invoice_value)}</span>
          </div>
        </div>
        <div className="flex items-center justify-center border-2 border-dashed border-muted rounded p-3">
          {record.signed_qr_code ? (
            <img
              src={`data:image/png;base64,${record.signed_qr_code}`}
              alt="Signed QR Code"
              className="max-w-[180px] max-h-[180px]"
            />
          ) : (
            <div className="text-xs text-muted-foreground text-center">
              No signed QR<br />(IRN not generated)
            </div>
          )}
        </div>
      </div>
    </UniversalPrintFrame>
  );
}
