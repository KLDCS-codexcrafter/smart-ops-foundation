/**
 * PackingSlipPrint.tsx — UPRA-1 Phase A · T1-4 · A4 print (record-shaped)
 * NOTE: this is a NEW file. The existing transactions/PackingSlipPrint.tsx is a
 * full DLN-picker Panel and is not shape-compatible with a single-slip print.
 * It is preserved 0-diff per scope rules.
 */
import { UniversalPrintFrame, type PrintCompany } from '@/components/print/UniversalPrintFrame';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { PackingSlip } from '@/types/packing-slip';

interface Props { slip: PackingSlip; onClose?: () => void }

export function PackingSlipPrint({ slip, onClose }: Props) {
  const { entityCode } = useCardEntitlement();
  const company: PrintCompany = { name: entityCode || 'Operix', gstin: '—', pan: '—' };

  return (
    <UniversalPrintFrame
      company={company}
      title="Packing Slip"
      docNo={slip.dln_voucher_no}
      voucherDate={slip.dln_date}
      onClose={onClose}
      signatories={['Packer', 'Checker', 'Authorised Signatory']}
      referenceBlock={
        <div className="grid grid-cols-2 gap-3">
          <div><span className="font-semibold">Party:</span> {slip.party_name}</div>
          <div><span className="font-semibold">Status:</span> {slip.status}</div>
          <div className="col-span-2"><span className="font-semibold">Ship To:</span> {slip.ship_to_address}, {slip.ship_to_city}, {slip.ship_to_state} — {slip.ship_to_pincode}</div>
          <div><span className="font-semibold">Transporter:</span> {slip.transporter_name ?? '—'}</div>
          <div><span className="font-semibold">Vehicle:</span> {slip.vehicle_no ?? '—'}</div>
        </div>
      }
      termsAndConditions="Goods packed as per dispatch instructions. Verify quantity and condition on receipt."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Cartons</TableHead>
            <TableHead className="text-right">Loose</TableHead>
            <TableHead className="text-right">Gross Kg</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {slip.lines.map((l, i) => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{i + 1}</TableCell>
              <TableCell className="text-xs">{l.item_code} · {l.item_name}</TableCell>
              <TableCell className="text-xs">{l.uom}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.qty}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.full_cartons}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.loose_packs}</TableCell>
              <TableCell className="text-right text-xs font-mono">{l.total_gross_kg}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={4} className="text-right font-semibold">Totals</TableCell>
            <TableCell className="text-right font-mono font-semibold">{slip.total_full_cartons}</TableCell>
            <TableCell className="text-right font-mono font-semibold">{slip.total_loose_packs}</TableCell>
            <TableCell className="text-right font-mono font-semibold">{slip.total_gross_kg}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </UniversalPrintFrame>
  );
}
