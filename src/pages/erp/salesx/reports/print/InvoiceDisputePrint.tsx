/**
 * InvoiceDisputePrint.tsx — UPRA-1 Phase A · T1-7 · A4 print (NEW shape · NOT a reuse of ProformaInvoicePrint)
 */
import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import {
  DISPUTE_STATUS_LABELS, DISPUTE_REASON_LABELS,
  type InvoiceDispute,
} from '@/types/invoice-dispute';

const fmtINR = (paise: number | null): string =>
  paise == null ? '—' : `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(paise / 100)}`;

interface Props { dispute: InvoiceDispute; onClose?: () => void }

export function InvoiceDisputePrint({ dispute, onClose }: Props) {
  const { entityCode } = useCardEntitlement();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };
  return (
    <UniversalPrintFrame
      company={company}
      title="Invoice Dispute"
      docNo={dispute.dispute_no}
      voucherDate={dispute.dispute_date}
      onClose={onClose}
      signatories={['Distributor', 'Operations', 'Authorised Signatory']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3">
          <div><span className="font-semibold">Against Invoice:</span> {dispute.voucher_no}</div>
          <div><span className="font-semibold">Reason:</span> {DISPUTE_REASON_LABELS[dispute.reason]}</div>
          <div><span className="font-semibold">Status:</span> {DISPUTE_STATUS_LABELS[dispute.status]}</div>
          <div><span className="font-semibold">FY:</span> {dispute.fiscal_year_id ?? '—'}</div>
        </div>
      }
      termsAndConditions="Resolution subject to commercial review. Credit note (if any) is the final settlement."
    >
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-3 gap-3">
          <div><span className="font-semibold">Billed Qty:</span> {dispute.billed_quantity}</div>
          <div><span className="font-semibold">Received Qty:</span> {dispute.received_quantity}</div>
          <div><span className="font-semibold">Variance:</span> {dispute.billed_quantity - dispute.received_quantity}</div>
          <div><span className="font-semibold">Disputed ₹:</span> {fmtINR(dispute.disputed_amount_paise)}</div>
          <div><span className="font-semibold">Approved ₹:</span> {fmtINR(dispute.approved_amount_paise)}</div>
          <div><span className="font-semibold">Resolution:</span> {dispute.resolution_type ?? '—'}</div>
        </div>
        <div>
          <p className="font-semibold">Distributor Remarks</p>
          <p className="mt-1">{dispute.distributor_remarks || '—'}</p>
        </div>
        {dispute.internal_remarks && (
          <div>
            <p className="font-semibold">Internal Remarks</p>
            <p className="mt-1">{dispute.internal_remarks}</p>
          </div>
        )}
        {dispute.rejection_reason && (
          <div>
            <p className="font-semibold">Rejection Reason</p>
            <p className="mt-1">{dispute.rejection_reason}</p>
          </div>
        )}
      </div>
    </UniversalPrintFrame>
  );
}
