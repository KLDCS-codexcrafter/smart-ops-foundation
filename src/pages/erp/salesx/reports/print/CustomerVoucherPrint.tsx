/**
 * CustomerVoucherPrint.tsx — UPRA-1 Phase A · T1-2 · A4 print
 */
import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { CustomerVoucherUnified } from '../CustomerVoucherRegister';

const fmtINR = (paise: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(paise / 100)}`;

interface Props { voucher: CustomerVoucherUnified; onClose?: () => void }

export function CustomerVoucherPrint({ voucher, onClose }: Props) {
  const { entityCode } = useCardEntitlement();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };
  const isIn = voucher._kind === 'in';

  return (
    <UniversalPrintFrame
      company={company}
      title={isIn ? 'Customer In-Voucher' : 'Customer Out-Voucher'}
      docNo={voucher.voucher_no}
      voucherDate={voucher._date}
      onClose={onClose}
      signatories={['Customer', 'Service Tech', 'Authorised Signatory']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3">
          <div><span className="font-semibold">Ticket:</span> {voucher.ticket_id}</div>
          <div><span className="font-semibold">Branch:</span> {voucher.branch_id}</div>
          <div><span className="font-semibold">Direction:</span> {isIn ? 'In (intake)' : 'Out (delivery)'}</div>
          <div><span className="font-semibold">FY:</span> {voucher.fiscal_year_id ?? '—'}</div>
        </div>
      }
      termsAndConditions="Customer acknowledges the condition described above at the time of receipt/delivery."
    >
      {isIn ? (
        <div className="space-y-3 text-sm">
          <div><span className="font-semibold">Serial:</span> {voucher.serial}</div>
          <div><span className="font-semibold">Internal No:</span> {voucher.internal_no}</div>
          <div><span className="font-semibold">Warranty:</span> {voucher.warranty_status_at_intake.replace(/_/g, ' ')}</div>
          <div><span className="font-semibold">Condition Notes:</span><br />{voucher.condition_notes || '—'}</div>
          <div><span className="font-semibold">Received By:</span> {voucher.received_by} on {voucher.received_at.slice(0, 16).replace('T', ' ')}</div>
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          <div><span className="font-semibold">Old → New Serial:</span> {voucher.old_serial} → {voucher.new_serial}</div>
          <div><span className="font-semibold">Resolution:</span><br />{voucher.resolution_summary || '—'}</div>
          <div><span className="font-semibold">Spares Consumed:</span> {voucher.spares_consumed_summary || '—'}</div>
          <div><span className="font-semibold">Charges:</span> {fmtINR(voucher.charges_paise)} · {voucher.paid ? `Paid via ${voucher.payment_method ?? '—'}` : 'Unpaid'}</div>
          <div><span className="font-semibold">Delivered To:</span> {voucher.delivered_to} on {voucher.delivered_at.slice(0, 16).replace('T', ' ')}</div>
        </div>
      )}
    </UniversalPrintFrame>
  );
}
