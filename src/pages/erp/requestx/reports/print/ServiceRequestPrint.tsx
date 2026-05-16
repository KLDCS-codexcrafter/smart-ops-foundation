/**
 * ServiceRequestPrint.tsx — UPRA-2 Phase A · T1-2 · A4 print
 */
import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { ServiceRequest } from '@/types/service-request';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;

interface Props { request: ServiceRequest; onClose?: () => void }

export function ServiceRequestPrint({ request, onClose }: Props) {
  const { entityCode } = useCardEntitlement();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };

  return (
    <UniversalPrintFrame
      company={company}
      title="Service Request"
      docNo={request.voucher_no}
      voucherDate={request.date}
      onClose={onClose}
      signatories={['Requester', 'HOD', 'Authorised Signatory']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3">
          <div><span className="font-semibold">Requester:</span> {request.requested_by_name}</div>
          <div><span className="font-semibold">Department:</span> {request.originating_department_name}</div>
          <div><span className="font-semibold">Track:</span> {request.service_track}</div>
          <div><span className="font-semibold">Priority:</span> {request.priority}</div>
          <div><span className="font-semibold">Category:</span> {request.category} / {request.sub_type}</div>
          <div><span className="font-semibold">FY:</span> {request.fiscal_year_id ?? '—'}</div>
        </div>
      }
      termsAndConditions="Service requests are subject to approval matrix tiering. Standard enquiry track requires 3 vendor quotations before PO."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Rate ₹</TableHead>
            <TableHead className="text-right">Value ₹</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {request.lines.map(l => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{l.line_no}</TableCell>
              <TableCell className="text-xs">{l.service_name}</TableCell>
              <TableCell className="text-xs">{l.description}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.qty} {l.uom}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.estimated_rate)}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.estimated_value)}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={5} className="text-right font-semibold">Total Estimated</TableCell>
            <TableCell className="text-right font-mono font-semibold">{fmtINR(request.total_estimated_value)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </UniversalPrintFrame>
  );
}
