/**
 * @file        src/pages/erp/servicedesk/reports/AMCRenewalForecastDrillDown.tsx
 * @purpose     Drill-down dialog for forecast bar
 * @sprint      T-Phase-1.C.1b · Block F.2
 * @iso        Usability
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { AMCRecord } from '@/types/servicedesk';

interface Props {
  open: boolean;
  month: string | null;
  records: AMCRecord[];
  onClose: () => void;
}

export function AMCRenewalForecastDrillDown({ open, month, records, onClose }: Props): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>AMCs in {month}</DialogTitle></DialogHeader>
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">OEM</th>
                <th className="px-3 py-2">End</th>
                <th className="px-3 py-2 text-right">Value</th>
                <th className="px-3 py-2 text-right">Renewal %</th>
                <th className="px-3 py-2">Risk</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.customer_id}</td>
                  <td className="px-3 py-2">{r.oem_name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.contract_end ?? '—'}</td>
                  <td className="px-3 py-2 text-right font-mono">₹{(r.contract_value_paise / 100).toLocaleString('en-IN')}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.renewal_probability}</td>
                  <td className="px-3 py-2">{r.risk_bucket}</td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No AMCs.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
