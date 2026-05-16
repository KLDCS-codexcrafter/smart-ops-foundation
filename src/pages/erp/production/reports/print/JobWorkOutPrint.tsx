/**
 * JobWorkOutPrint.tsx — UPRA-2 Phase A · T2-3 · A4 print
 */
import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEntityCode } from '@/hooks/useEntityCode';
import type { JobWorkOutOrder } from '@/types/job-work-out-order';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;

interface Props { jwo: JobWorkOutOrder; onClose?: () => void }

export function JobWorkOutPrint({ jwo, onClose }: Props) {
  const { entityCode } = useEntityCode();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };

  return (
    <UniversalPrintFrame
      company={company}
      title="Job Work Out Order"
      docNo={jwo.doc_no}
      voucherDate={jwo.jwo_date}
      onClose={onClose}
      signatories={['Raised By', 'Stores', 'Authorised Signatory']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3">
          <div><span className="font-semibold">Vendor:</span> {jwo.vendor_name}</div>
          <div><span className="font-semibold">GSTIN:</span> {jwo.vendor_gstin ?? '—'}</div>
          <div><span className="font-semibold">Expected Return:</span> {jwo.expected_return_date}</div>
          <div><span className="font-semibold">Status:</span> {jwo.status}</div>
          <div><span className="font-semibold">Process:</span> {jwo.nature_of_processing ?? '—'}</div>
          <div><span className="font-semibold">FY:</span> {jwo.fiscal_year_id ?? '—'}</div>
        </div>
      }
      termsAndConditions="Goods sent for job work under ITC-04. Material must return within 1 year (inputs) / 3 years (capital goods)."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Item Sent</TableHead>
            <TableHead>Expected Output</TableHead>
            <TableHead className="text-right">Sent Qty</TableHead>
            <TableHead className="text-right">Rate ₹</TableHead>
            <TableHead className="text-right">Value ₹</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jwo.lines.map(l => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{l.line_no}</TableCell>
              <TableCell className="text-xs">{l.item_code} · {l.item_name}</TableCell>
              <TableCell className="text-xs">{l.expected_output_item_code} · {l.expected_output_item_name}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.sent_qty} {l.uom}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.job_work_rate)}</TableCell>
              <TableCell className="text-right text-xs font-mono">{fmtINR(l.job_work_value)}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={5} className="text-right font-semibold">Total JW Value</TableCell>
            <TableCell className="text-right font-mono font-semibold">{fmtINR(jwo.total_jw_value)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </UniversalPrintFrame>
  );
}
