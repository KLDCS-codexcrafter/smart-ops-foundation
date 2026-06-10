/**
 * @file        src/pages/erp/comply360/mca-tier2/MCATier2DashboardPage.tsx
 * @purpose     MCA Tier-2 dashboard · 4-tab · 22nd First-Class Standalone Page
 * @sprint      Sprint 94 · T-Phase-5.F.5.6 · Floor 5.6 CAPSTONE
 */
import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import {
  listCSR2Forms, listSection135, listFormMR3, listCSRCommitteeMeetings,
  getMCATier2Summary,
} from '@/lib/comply360-mca-tier2-engine';
import { listSTR, listCTR, listRiskAlerts, getPMLAComplianceSummary } from '@/lib/comply360-pmla-engine';
import { getTier2ExtensionsSummary } from '@/lib/comply360-tier2-extensions-engine';
import { ReportChart, ScorecardTile } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig, resolveRag } from '@/lib/report-framework';

type TabKey = 'csr' | 'sec204' | 't2-quick' | 'pmla';

export default function MCATier2DashboardPage(): JSX.Element {
  const [tab, setTab] = useState<TabKey>('csr');
  const fy = '2025-26';
  const mca = useMemo(() => getMCATier2Summary(fy), []);
  const pmla = useMemo(() => getPMLAComplianceSummary(), []);
  const t2 = useMemo(() => getTier2ExtensionsSummary(), []);
  const csr2 = useMemo(() => listCSR2Forms(), []);
  const s135 = useMemo(() => listSection135(), []);
  const mr3 = useMemo(() => listFormMR3(), []);
  const com = useMemo(() => listCSRCommitteeMeetings(), []);
  const str = useMemo(() => listSTR(), []);
  const ctr = useMemo(() => listCTR(), []);
  const risk = useMemo(() => listRiskAlerts(), []);

  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">MCA Tier-2 · Q38 CAPSTONE</h1>
        <p className="text-sm text-muted-foreground">
          CSR-2 · Section 135 CSR · Section 204 MR-3 · CSR Committee · PMLA STR/CTR · Tier-2 quick view
        </p>
      </header>

      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono">{mca.csr2_filed_current_fy}</div>
          <div className="text-xs text-muted-foreground">CSR-2 Filed FY</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono">{mca.mr3_filed_current_fy}</div>
          <div className="text-xs text-muted-foreground">MR-3 Filed FY</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono">{pmla.str_filed + pmla.ctr_filed}</div>
          <div className="text-xs text-muted-foreground">PMLA Filings</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono">{t2.gst_t2_filings + t2.tds_195_count + t2.exim_brc_count}</div>
          <div className="text-xs text-muted-foreground">Tier-2 Records</div>
        </Card>
      </div>

      <div className="text-sm">
        MCA status:{' '}
        <Badge variant={mca.overall_status === 'compliant' ? 'default' : 'destructive'}>
          {mca.overall_status}
        </Badge>
      </div>

      {(() => {
        const chartRows = [
          { status: 'CSR-2 Filed', count: mca.csr2_filed_current_fy },
          { status: 'MR-3 Filed', count: mca.mr3_filed_current_fy },
          { status: 'PMLA STR+CTR', count: pmla.str_filed + pmla.ctr_filed },
          { status: 'Tier-2 Records', count: t2.gst_t2_filings + t2.tds_195_count + t2.exim_brc_count },
        ];
        const totalFiled = chartRows.reduce((s, r) => s + r.count, 0);
        const pct = mca.overall_status === 'compliant' ? 100 : Math.min(95, Math.max(40, Math.round((totalFiled / Math.max(1, totalFiled + 5)) * 100)));
        const kpi = getKpi('cmp-mca');
        const chartConfig = kpi?.defaultChart ?? defaultChartConfig({ chartType: 'column', xKey: 'status', series: [{ key: 'count', label: 'MCA filings' }] });
        const rag = resolveRag(pct, kpi?.thresholds ?? { amber: 90, red: 70, direction: 'higher-good' });
        const sig = signReport(chartRows);
        return (
          <section className="space-y-3" data-testid="rpt2aii-mca-section">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ScorecardTile label="MCA filing compliance %" value={`${pct}%`} rag={rag} hint="CSR-2 + MR-3 + PMLA + Tier-2" />
              <ScorecardTile label="PMLA Filings" value={pmla.str_filed + pmla.ctr_filed} hint="STR + CTR" />
              <Card className="p-3 flex items-center gap-2" data-testid="integrity-badge-mca">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Integrity</span>
                <span className="font-mono text-xs">{sig.slice(0, 12)}</span>
              </Card>
            </div>
            <Card className="p-4">
              <div className="h-72">
                <ReportChart data={chartRows} config={chartConfig} />
              </div>
            </Card>
          </section>
        );
      })()}

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="csr">CSR (Sec 135 + CSR-2)</TabsTrigger>
          <TabsTrigger value="sec204">Sec 204 / MR-3</TabsTrigger>
          <TabsTrigger value="t2-quick">Tier-2 Quick View</TabsTrigger>
          <TabsTrigger value="pmla">PMLA</TabsTrigger>
        </TabsList>

        <TabsContent value="csr">
          <Card className="p-4 space-y-3">
            <div>
              <h2 className="text-lg font-semibold">CSR-2 Filings</h2>
              {csr2.length === 0 ? (
                <p className="text-xs text-muted-foreground">No CSR-2 forms.</p>
              ) : (
                <ul className="space-y-1 mt-2">
                  {csr2.map((r) => (
                    <li key={r.id} className="text-sm border rounded-lg p-2 flex justify-between">
                      <span className="font-mono">{r.fy} · {r.cin}</span>
                      <Badge>{r.filing_status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold">Section 135 CSR (2% Net Profit)</h2>
              {s135.length === 0 ? (
                <p className="text-xs text-muted-foreground">No Sec 135 records.</p>
              ) : (
                <ul className="space-y-1 mt-2">
                  {s135.map((r) => (
                    <li key={r.id} className="text-sm border rounded-lg p-2 flex justify-between">
                      <span className="font-mono">{r.fy} · {r.activity}</span>
                      <span className="font-mono text-xs">
                        ₹{(r.actual_spend_paise / 100).toFixed(0)} / ₹{(r.required_spend_paise / 100).toFixed(0)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold">CSR Committee Meetings</h2>
              {com.length === 0 ? (
                <p className="text-xs text-muted-foreground">No meetings recorded.</p>
              ) : (
                <ul className="space-y-1 mt-2">
                  {com.map((r) => (
                    <li key={r.id} className="text-sm border rounded-lg p-2 font-mono">
                      {r.meeting_date} · {r.attendees.length} attendees
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="sec204">
          <Card className="p-4 space-y-2">
            <h2 className="text-lg font-semibold">Form MR-3 · Secretarial Audit</h2>
            {mr3.length === 0 ? (
              <p className="text-xs text-muted-foreground">No MR-3 reports.</p>
            ) : (
              <ul className="space-y-1">
                {mr3.map((r) => (
                  <li key={r.id} className="text-sm border rounded-lg p-2 flex justify-between">
                    <span className="font-mono">{r.fy} · {r.cs_name} ({r.cs_membership_no})</span>
                    <Badge>{r.filing_status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="t2-quick">
          <Card className="p-4 space-y-2">
            <h2 className="text-lg font-semibold">Tier-2 Extensions Quick View</h2>
            <div className="grid grid-cols-2 gap-2 text-sm font-mono">
              <div>GST T2 filings: {t2.gst_t2_filings}</div>
              <div>E-invoices: {t2.e_invoices_count}</div>
              <div>EWB count: {t2.ewb_count}</div>
              <div>RFD-01 sanctioned: {t2.rfd01_sanctioned}</div>
              <div>TDS 195 records: {t2.tds_195_count}</div>
              <div>Advance Tax paid: {t2.advance_tax_paid}</div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="pmla">
          <Card className="p-4 space-y-3">
            <div>
              <h2 className="text-lg font-semibold">STR · Suspicious Transactions</h2>
              {str.length === 0 ? (
                <p className="text-xs text-muted-foreground">No STR.</p>
              ) : (
                <ul className="space-y-1 mt-2">
                  {str.map((r) => (
                    <li key={r.id} className="text-sm border rounded-lg p-2 flex justify-between">
                      <span className="font-mono">{r.reference} · {r.suspect_party}</span>
                      <Badge variant={r.risk === 'critical' ? 'destructive' : 'default'}>{r.risk}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold">CTR · Cash Transactions ≥ ₹10L</h2>
              {ctr.length === 0 ? (
                <p className="text-xs text-muted-foreground">No CTR.</p>
              ) : (
                <ul className="space-y-1 mt-2">
                  {ctr.map((r) => (
                    <li key={r.id} className="text-sm border rounded-lg p-2 flex justify-between">
                      <span className="font-mono">{r.party_name}</span>
                      <span className="font-mono">₹{(r.amount_paise / 100).toFixed(0)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold">Risk Alerts ({risk.length})</h2>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
