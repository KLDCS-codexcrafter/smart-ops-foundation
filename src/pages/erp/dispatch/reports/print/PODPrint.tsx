/**
 * PODPrint.tsx — UPRA-1 Phase A · T1-6 · A4 print
 */
import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { POD } from '@/types/pod';

interface Props { pod: POD; onClose?: () => void }

export function PODPrint({ pod, onClose }: Props) {
  const { entityCode } = useCardEntitlement();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };
  return (
    <UniversalPrintFrame
      company={company}
      title="Proof of Delivery"
      docNo={pod.dln_voucher_no}
      voucherDate={pod.captured_at.slice(0, 10)}
      onClose={onClose}
      signatories={['Driver', 'Consignee', 'Authorised Signatory']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3">
          <div><span className="font-semibold">Captured By:</span> {pod.captured_by}</div>
          <div><span className="font-semibold">Captured At:</span> {pod.captured_at.slice(0, 16).replace('T', ' ')}</div>
          <div><span className="font-semibold">Consignee:</span> {pod.consignee.name}</div>
          <div><span className="font-semibold">Mobile:</span> {pod.consignee.mobile ?? '—'}</div>
          <div><span className="font-semibold">Status:</span> {pod.status}</div>
          <div><span className="font-semibold">FY:</span> {pod.fiscal_year_id ?? '—'}</div>
        </div>
      }
      termsAndConditions="Delivery confirmed by GPS, photo, signature and OTP as captured."
    >
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div><span className="font-semibold">GPS:</span> {pod.gps_verified ? 'Verified' : 'Not verified'} · {pod.gps_latitude?.toFixed(4)}, {pod.gps_longitude?.toFixed(4)}</div>
          <div><span className="font-semibold">Distance from ship-to:</span> {pod.distance_from_ship_to_m ?? '—'} m</div>
          <div><span className="font-semibold">Photo:</span> {pod.photo_verified ? 'Captured' : 'Missing'}</div>
          <div><span className="font-semibold">Signature:</span> {pod.signature_verified ? 'Captured' : 'Missing'}</div>
          <div><span className="font-semibold">OTP:</span> {pod.otp_verified ? 'Verified' : 'Missing'}</div>
        </div>
        {pod.is_exception && (
          <div className="border border-warning/40 rounded p-2">
            <p className="font-semibold">Exception: {pod.exception_type}</p>
            <p>{pod.exception_notes ?? '—'}</p>
          </div>
        )}
        {pod.dispute_reason && (
          <div className="border border-destructive/40 rounded p-2">
            <p className="font-semibold">Dispute reason</p>
            <p>{pod.dispute_reason}</p>
          </div>
        )}
      </div>
    </UniversalPrintFrame>
  );
}
