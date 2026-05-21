/**
 * @file src/pages/erp/eximx/finance/PackingCreditDetail.tsx
 * @purpose D-NEW-FK · PC detail · lifecycle + liquidation history
 * @sprint T-Phase-2.A-EX-12-LC-PackingCredit · Block D
 */
import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEntityCode } from '@/hooks/useEntityCode';
import { getPC, generatePCVoucherEntries } from '@/lib/packing-credit-engine';
import { PC_VALID_TRANSITIONS } from '@/types/packing-credit';

export default function PackingCreditDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { entityCode } = useEntityCode();
  const pc = useMemo(() => (id && entityCode ? getPC(entityCode, id) : null), [id, entityCode]);

  if (!pc) {
    return <div className="p-6"><Card><CardContent className="p-6 text-sm text-muted-foreground">PC not found.</CardContent></Card></div>;
  }

  const nexts = PC_VALID_TRANSITIONS[pc.status];
  const vouchers = generatePCVoucherEntries(pc);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold font-mono">{pc.pc_contract_no}</h1>
        <Badge>{pc.status}</Badge>
        <Badge variant="outline">{pc.variant}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Bank + financial terms</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1 font-mono">
          <div>{pc.ad_bank_name} ({pc.ad_bank_code})</div>
          <div>Sanctioned: ₹{pc.sanctioned_amount_inr.toLocaleString('en-IN')} · Drawn: ₹{pc.drawn_amount_inr.toLocaleString('en-IN')}</div>
          <div>Interest: {pc.interest_rate_pct}% · RBI tenor: {pc.rbi_tenor_days} days</div>
          <div>Sanction date: {pc.sanction_date} · Drawdown: {pc.drawdown_date ?? '—'} · Deadline: {pc.liquidation_deadline || '—'}</div>
          <div>Days to deadline: {pc.days_to_deadline} · Outstanding: ₹{pc.outstanding_amount_inr.toLocaleString('en-IN')}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Linked Export PO</CardTitle></CardHeader>
        <CardContent className="text-sm">
          <Link to={`/erp/eximx/export/po/${pc.related_export_po_id}`} className="text-primary underline font-mono">
            {pc.related_export_po_no}
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Liquidation history</CardTitle></CardHeader>
        <CardContent className="text-sm">
          {pc.liquidations.length === 0 ? (
            <p className="text-muted-foreground">No liquidations yet.</p>
          ) : (
            <ul className="space-y-1">
              {pc.liquidations.map((l) => (
                <li key={`liq-${l.liquidation_no}`} className="font-mono text-xs">
                  #{l.liquidation_no} · {l.liquidated_via} · ₹{l.amount_inr.toLocaleString('en-IN')} · remaining ₹{l.outstanding_remaining_inr.toLocaleString('en-IN')}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Valid next transitions</CardTitle></CardHeader>
        <CardContent className="text-sm flex flex-wrap gap-2">
          {nexts.length === 0 ? (
            <span className="text-muted-foreground">Terminal state.</span>
          ) : (
            nexts.map((s) => <Badge key={s} variant="outline">{s}</Badge>)
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">D-NEW-FG voucher routing (9th consumer)</CardTitle></CardHeader>
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
