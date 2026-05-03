/**
 * Procure360 panels — Sprint T-Phase-1.2.6f-a
 * Minimal compilable panels covering all module IDs.
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listEnquiries, promoteIndentToProcurementEnquiry } from '@/lib/procurement-enquiry-engine';
import { getPendingPurchaseIndents, type PendingPurchaseIndent } from '@/lib/procurement-pr-receiver';
import { listRfqs } from '@/lib/rfq-engine';
import {
  computeRfqRegister, computePendingRfqs, computeAwardHistory,
  computeVendorPerformance, computeBestPriceAnalysis, computeSpendByVendor,
  computeWelcomeKpis, applyReportFilter, type ReportFilter,
} from '@/lib/procure360-report-engine';
import { listQuotations, compareQuotations, validateQuotationCompliance } from '@/lib/vendor-quotation-engine';
import { emitLeakEvent } from '@/lib/leak-register-engine';
import { Input } from '@/components/ui/input';
import { getTopVendorsByScore, type VendorScore } from '@/lib/vendor-scoring-engine';
import { getOverdueRfqFollowups } from '@/lib/procure-followup-engine';
import { subscribeProcurementPulse, type PulseAlert } from '@/lib/procurement-pulse-stub';
import { getExpiringContracts } from '@/lib/oob/contract-expiry-alerts';
import { toast } from 'sonner';
import type { Procure360Module } from './Procure360Sidebar.types';

const inr = (n: number): string => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

interface NavProps { onNavigate?: (m: Procure360Module) => void }

export function Procure360Welcome({ onNavigate }: NavProps): JSX.Element {
  const { entityCode } = useEntityCode();
  const [pulses, setPulses] = useState<PulseAlert[]>([]);

  const kpis = useMemo(() => computeWelcomeKpis(entityCode), [entityCode]);
  const expiring = useMemo(() => getExpiringContracts(entityCode, 30), [entityCode]);

  useEffect(() => {
    const handle = subscribeProcurementPulse((a) => setPulses((p) => [a, ...p].slice(0, 8)), 30000);
    return () => handle.stop();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Procure360</h1>
        <p className="text-sm text-muted-foreground">Procurement Enquiry → RFQ → Quotation → Award</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Pending Enquiries" value={kpis.pendingEnquiries} />
        <KpiCard label="Active RFQs" value={kpis.activeRfqs} />
        <KpiCard label="Awaiting Quotations" value={kpis.awaitingQuotations} />
        <KpiCard label="Overdue Follow-ups" value={kpis.overdueFollowups} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-x-2">
            <Button onClick={() => onNavigate?.('enquiry-entry')}>New Enquiry</Button>
            <Button variant="outline" onClick={() => onNavigate?.('rfq-list')}>RFQ List</Button>
            <Button variant="outline" onClick={() => onNavigate?.('quotation-comparison')}>Compare</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Procurement Pulse</CardTitle></CardHeader>
          <CardContent>
            {pulses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Listening for alerts…</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {pulses.map((p) => (
                  <li key={p.id} className="flex justify-between">
                    <span>{p.message}</span>
                    <Badge variant="outline">{p.severity}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      {expiring.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Contract Expiry Alerts</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {expiring.map((e) => (
                <li key={e.contract_no}>
                  {e.vendor_name} · {e.contract_no} · {e.days_remaining} days remaining
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold font-mono mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

export function ProcurementEnquiryEntryPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [pending, setPending] = useState<PendingPurchaseIndent[]>([]);

  useEffect(() => {
    setPending(getPendingPurchaseIndents(entityCode));
  }, [entityCode]);

  const promote = (indentId: string): void => {
    const result = promoteIndentToProcurementEnquiry([indentId], entityCode, 'mock-user');
    if (result) {
      toast.success(`Promoted to Enquiry ${result.enquiry_no}`);
      setPending(getPendingPurchaseIndents(entityCode));
    } else {
      toast.error('Could not promote indent');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Procurement Enquiry · New</h1>
        <p className="text-sm text-muted-foreground">
          Promote pending-purchase indents OR create standalone enquiry (Tier-3 approval).
        </p>
      </div>
      <Card>
        <CardHeader><CardTitle>Pending Purchase Indents</CardTitle></CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No indents pending promotion.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Indent No</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Lines</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((p) => (
                  <TableRow key={p.indent_id}>
                    <TableCell className="font-mono">{p.indent_no}</TableCell>
                    <TableCell>{p.originating_department_name}</TableCell>
                    <TableCell>{p.line_count}</TableCell>
                    <TableCell className="font-mono">{inr(p.total_value)}</TableCell>
                    <TableCell>{p.days_pending}{p.is_urgent ? ' ⚠' : ''}</TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => promote(p.indent_id)}>Promote</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function EnquiryListPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const enquiries = listEnquiries(entityCode);
  return (
    <PanelList
      title="Enquiry List"
      headers={['Enquiry No', 'Date', 'Mode', 'Lines', 'Status']}
      rows={enquiries.map((e) => [e.enquiry_no, e.enquiry_date, e.vendor_mode, String(e.lines.length), e.status])}
    />
  );
}

export function RfqListPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const rfqs = listRfqs(entityCode);
  return (
    <PanelList
      title="RFQ List"
      headers={['RFQ No', 'Vendor', 'Channel', 'Status', 'Sent']}
      rows={rfqs.map((r) => [r.rfq_no, r.vendor_name, r.primary_channel, r.status, r.sent_at ?? '—'])}
    />
  );
}

export function QuotationComparisonPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const enquiries = listEnquiries(entityCode);
  const [selected, setSelected] = useState<string>('');
  const rows = selected ? compareQuotations(selected, entityCode) : [];

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Quotation Comparison</h1>
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex flex-wrap gap-2">
            {enquiries.map((e) => (
              <Button
                key={e.id}
                size="sm"
                variant={selected === e.id ? 'default' : 'outline'}
                onClick={() => setSelected(e.id)}
              >
                {e.enquiry_no}
              </Button>
            ))}
            {enquiries.length === 0 && (
              <p className="text-sm text-muted-foreground">No enquiries available.</p>
            )}
          </div>
          {selected && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">No quotations received yet.</p>
          )}
          {rows.map((r) => (
            <Card key={r.enquiry_line_id}>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Line {r.enquiry_line_id}</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Delivery (days)</TableHead>
                      <TableHead>Best</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {r.cells.map((c) => (
                      <TableRow key={c.vendor_id}>
                        <TableCell>{c.vendor_name}</TableCell>
                        <TableCell className="font-mono">{inr(c.rate)}</TableCell>
                        <TableCell className="font-mono">{inr(c.amount_after_tax)}</TableCell>
                        <TableCell>{c.delivery_days}</TableCell>
                        <TableCell>{c.vendor_id === r.best_price_vendor_id ? '★' : ''}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function AwardHistoryPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const awards = listQuotations(entityCode).filter((q) => q.is_awarded);
  return (
    <PanelList
      title="Awards"
      headers={['Quotation No', 'Vendor', 'Amount', 'Awarded At']}
      rows={awards.map((a) => [a.quotation_no, a.vendor_name, inr(a.total_after_tax), a.award_at ?? '—'])}
    />
  );
}

export function RfqRegisterReportPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const rows = computeRfqRegister(entityCode);
  return (
    <PanelList
      title="RFQ Register"
      headers={['RFQ No', 'Vendor', 'Status', 'Sent', 'Age (days)']}
      rows={rows.map((r) => [r.rfq_no, r.vendor_name, r.status, r.sent_at ?? '—', String(r.age_days)])}
    />
  );
}

export function PendingRfqReportPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const rows = computePendingRfqs(entityCode);
  return (
    <PanelList
      title="Pending RFQs"
      headers={['RFQ No', 'Vendor', 'Status', 'Timeout At']}
      rows={rows.map((r) => [r.rfq_no, r.vendor_name, r.status, r.timeout_at ?? '—'])}
    />
  );
}

export function ComparisonReportPanel(): JSX.Element {
  return <QuotationComparisonPanel />;
}

export function AwardHistoryReportPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const rows = computeAwardHistory(entityCode);
  return (
    <PanelList
      title="Award History"
      headers={['Quotation No', 'Vendor', 'Amount', 'Awarded At', 'Remarks']}
      rows={rows.map((a) => [a.quotation_no, a.vendor_name, inr(a.amount), a.awarded_at ?? '—', a.remarks ?? ''])}
    />
  );
}

export function VendorPerfReportPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const rows = computeVendorPerformance(entityCode);
  return (
    <PanelList
      title="Vendor Performance"
      headers={['Vendor', 'RFQs', 'Quoted', 'Awarded', 'Spend', 'Response %']}
      rows={rows.map((r) => [
        r.vendor_name, String(r.rfq_count), String(r.quoted_count),
        String(r.awarded_count), inr(r.total_spend), `${r.response_rate}%`,
      ])}
    />
  );
}

export function BestPriceReportPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const items = Array.from(new Set(listQuotations(entityCode).flatMap((q) => q.lines.map((l) => l.item_id))));
  const [selected, setSelected] = useState<string>(items[0] ?? '');
  const rows = selected ? computeBestPriceAnalysis(selected, entityCode) : [];
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Best Price Analysis</h1>
      <div className="flex flex-wrap gap-2">
        {items.map((id) => (
          <Button key={id} size="sm" variant={selected === id ? 'default' : 'outline'} onClick={() => setSelected(id)}>
            {id}
          </Button>
        ))}
      </div>
      <Card><CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead><TableHead>Rate</TableHead><TableHead>Quoted At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={`${r.vendor_id}-${i}`}>
                <TableCell>{r.vendor_name}</TableCell>
                <TableCell className="font-mono">{inr(r.rate)}</TableCell>
                <TableCell>{r.quoted_at}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

export function SpendByVendorReportPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const rows = computeSpendByVendor(entityCode);
  return (
    <PanelList
      title="Spend by Vendor"
      headers={['Vendor', 'Spend', 'Awards']}
      rows={rows.map((r) => [r.vendor_name, inr(r.spend), String(r.award_count)])}
    />
  );
}

export function RfqFollowupRegisterReportPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const overdue = getOverdueRfqFollowups(entityCode);
  return (
    <PanelList
      title="RFQ Follow-up Register"
      headers={['RFQ ID', 'Days Overdue']}
      rows={overdue.map((o) => [o.rfq_id, String(o.days_overdue)])}
    />
  );
}

export function CrossDeptHandoffPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const enquiries = listEnquiries(entityCode);
  const rfqs = listRfqs(entityCode);
  const quotations = listQuotations(entityCode);
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Cross-Dept Procurement Handoff</h1>
      <p className="text-sm text-muted-foreground">8-stage pipeline · MOAT #20</p>
      <Card><CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Enquiry</TableHead><TableHead>Source Indents</TableHead>
              <TableHead>RFQs</TableHead><TableHead>Quotes</TableHead>
              <TableHead>Awarded</TableHead><TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enquiries.map((e) => {
              const rs = rfqs.filter((r) => r.parent_enquiry_id === e.id);
              const qs = quotations.filter((q) => q.parent_enquiry_id === e.id);
              const aw = qs.filter((q) => q.is_awarded).length;
              return (
                <TableRow key={e.id}>
                  <TableCell className="font-mono">{e.enquiry_no}</TableCell>
                  <TableCell>{e.source_indent_ids.length}</TableCell>
                  <TableCell>{rs.length}</TableCell>
                  <TableCell>{qs.length}</TableCell>
                  <TableCell>{aw}</TableCell>
                  <TableCell><Badge variant="outline">{e.status}</Badge></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

export function VendorScoringDashboardPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [scores, setScores] = useState<VendorScore[]>([]);
  useEffect(() => { setScores(getTopVendorsByScore(entityCode, 20)); }, [entityCode]);
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Vendor Scoring Dashboard</h1>
      <p className="text-sm text-muted-foreground">Top 20 vendors · 6-factor weighted score (D-244)</p>
      <Card><CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead><TableHead>Total</TableHead>
              <TableHead>RFQs</TableHead><TableHead>Quotes</TableHead><TableHead>Awards</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scores.map((s) => (
              <TableRow key={s.vendor_id}>
                <TableCell>{s.vendor_name}</TableCell>
                <TableCell className="font-mono">{s.total_score}</TableCell>
                <TableCell>{s.rfq_count}</TableCell>
                <TableCell>{s.quote_count}</TableCell>
                <TableCell>{s.award_count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

function PanelList(props: { title: string; headers: string[]; rows: string[][] }): JSX.Element {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">{props.title}</h1>
      <Card><CardContent className="pt-6">
        {props.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No records.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>{props.headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {props.rows.map((r, i) => (
                <TableRow key={`row-${i}`}>
                  {r.map((c, j) => <TableCell key={`c-${i}-${j}`}>{c}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  );
}
