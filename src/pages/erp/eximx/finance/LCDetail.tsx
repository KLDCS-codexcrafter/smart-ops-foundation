/**
 * @file src/pages/erp/eximx/finance/LCDetail.tsx
 * @purpose D-NEW-FJ · LC detail · lifecycle + amendment history + linked ExportPO
 * @sprint T-Phase-2.A-EX-12-LC-PackingCredit · Block C
 */
import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEntityCode } from '@/hooks/useEntityCode';
import { getLC, generateLCVoucherEntries } from '@/lib/lc-engine';
import { LC_VALID_TRANSITIONS } from '@/types/letter-of-credit';

export default function LCDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { entityCode } = useEntityCode();
  const lc = useMemo(() => (id && entityCode ? getLC(entityCode, id) : null), [id, entityCode]);

  if (!lc) {
    return <div className="p-6"><Card><CardContent className="p-6 text-sm text-muted-foreground">LC not found.</CardContent></Card></div>;
  }

  const nextStates = LC_VALID_TRANSITIONS[lc.status];
  const vouchers = generateLCVoucherEntries(lc);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold font-mono">{lc.lc_no}</h1>
        <Badge>{lc.status}</Badge>
        <Badge variant="secondary">{lc.lc_type}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Bank parties</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          <div>Issuing: {lc.issuing_bank_name} ({lc.issuing_bank_swift}) · {lc.issuing_bank_country}</div>
          <div>Advising: {lc.advising_bank_name} ({lc.advising_bank_swift})</div>
          {lc.confirming_bank_name && <div>Confirming: {lc.confirming_bank_name} ({lc.confirming_bank_swift})</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Financial terms</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1 font-mono">
          <div>Amount: {lc.currency_code} {lc.lc_amount_foreign.toLocaleString('en-IN')} (₹{lc.lc_amount_inr_at_open.toLocaleString('en-IN')})</div>
          <div>Tolerance: {lc.tolerance_pct}% · Payment terms: {lc.payment_terms_days} days</div>
          <div>Expiry: {lc.expiry_date} · Latest shipment: {lc.latest_shipment_date}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Linked Export PO</CardTitle></CardHeader>
        <CardContent className="text-sm">
          <Link to={`/erp/eximx/export/po/${lc.related_export_po_id}`} className="text-primary underline font-mono">
            {lc.related_export_po_no}
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Amendment history</CardTitle></CardHeader>
        <CardContent className="text-sm">
          {lc.amendments.length === 0 ? (
            <p className="text-muted-foreground">No amendments.</p>
          ) : (
            <ul className="space-y-1">
              {lc.amendments.map((a) => (
                <li key={`amend-${a.amendment_no}`} className="font-mono text-xs">
                  #{a.amendment_no} · {a.field_changed}: {a.old_value} → {a.new_value} · consent: {String(a.buyer_consent_received)}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Valid next transitions</CardTitle></CardHeader>
        <CardContent className="text-sm flex flex-wrap gap-2">
          {nextStates.length === 0 ? (
            <span className="text-muted-foreground">Terminal state.</span>
          ) : (
            nextStates.map((s) => <Badge key={s} variant="outline">{s}</Badge>)
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">D-NEW-FG voucher routing (8th consumer)</CardTitle></CardHeader>
        <CardContent className="text-sm">
          {vouchers.length === 0 ? (
            <p className="text-muted-foreground">No voucher events at current state.</p>
          ) : (
            <ul className="space-y-1">
              {vouchers.map((v) => (
                <li key={`v-${v.event_type}-${v.generated_at}`} className="font-mono text-xs">
                  {v.event_type} · {v.ledger_account} · ₹{v.debit_inr.toLocaleString('en-IN')}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
