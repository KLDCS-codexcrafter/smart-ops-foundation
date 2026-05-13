/**
 * @file        src/pages/erp/servicedesk/repair-routing/SparesIssuedFromField.tsx
 * @purpose     Aggregated spares-issued-from-field register · read-only
 * @sprint      T-Phase-1.C.1c · Block E.2
 * @iso        Usability + Functional Suitability
 */
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { listAllSparesIssues } from '@/lib/servicedesk-engine';

export function SparesIssuedFromField(): JSX.Element {
  const spares = listAllSparesIssues();

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Spares Issued from Field</h1>
        <p className="text-sm text-muted-foreground">{spares.length} issuance(s)</p>
      </div>

      <Card className="p-0 overflow-hidden">
        {spares.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No spares issued yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="p-3 font-medium">Ticket</th>
                <th className="p-3 font-medium">Spare</th>
                <th className="p-3 font-medium">Qty</th>
                <th className="p-3 font-medium">Cost ₹</th>
                <th className="p-3 font-medium">Engineer</th>
                <th className="p-3 font-medium">Billable</th>
                <th className="p-3 font-medium">Issued</th>
              </tr>
            </thead>
            <tbody>
              {spares.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3 font-mono text-xs">{s.ticket_id}</td>
                  <td className="p-3">{s.spare_name}</td>
                  <td className="p-3 font-mono">{s.qty}</td>
                  <td className="p-3 font-mono">{(s.total_cost_paise / 100).toFixed(2)}</td>
                  <td className="p-3 text-xs">{s.engineer_id}</td>
                  <td className="p-3">
                    <Badge variant={s.billable_to_customer ? 'default' : 'outline'}>
                      {s.billable_to_customer ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                  <td className="p-3 font-mono text-xs">{s.issued_at.slice(0, 16).replace('T', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
