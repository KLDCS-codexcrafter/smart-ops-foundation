/**
 * @file        src/pages/erp/comply360/legal-ipr/LegalIPRDashboardPage.tsx
 * @purpose     Legal Contracts + IPR + Exim T2 dashboard · 4-tab · 23rd First-Class Standalone Page
 * @sprint      Sprint 94 · T-Phase-5.F.5.6 · Floor 5.6 CAPSTONE
 */
import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import { ReportChart, ScorecardTile } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig, resolveRag } from '@/lib/report-framework';
import {
  listVendorContracts, listCustomerContracts, listNDAs, listStampDuty,
  getLegalContractsSummary,
} from '@/lib/comply360-legal-contracts-engine';
import {
  listTrademarks, listPatents, listCopyrights, listDesigns, listIPRRenewals,
  getIPRSummary,
} from '@/lib/comply360-ipr-engine';
import {
  listADCodes, listBRCs, listMEISClaims, listRCMCs, listFEMAFilings,
  getTier2ExtensionsSummary,
} from '@/lib/comply360-tier2-extensions-engine';

type TabKey = 'contracts' | 'ipr' | 't2-deep' | 'exim-t2';

export default function LegalIPRDashboardPage(): JSX.Element {
  const [tab, setTab] = useState<TabKey>('contracts');
  const lc = useMemo(() => getLegalContractsSummary(), []);
  const ipr = useMemo(() => getIPRSummary(), []);
  const t2 = useMemo(() => getTier2ExtensionsSummary(), []);
  const ven = useMemo(() => listVendorContracts(), []);
  const cus = useMemo(() => listCustomerContracts(), []);
  const nda = useMemo(() => listNDAs(), []);
  const sd = useMemo(() => listStampDuty(), []);
  const tm = useMemo(() => listTrademarks(), []);
  const pt = useMemo(() => listPatents(), []);
  const cr = useMemo(() => listCopyrights(), []);
  const ds = useMemo(() => listDesigns(), []);
  const rn = useMemo(() => listIPRRenewals(), []);
  const ad = useMemo(() => listADCodes(), []);
  const brc = useMemo(() => listBRCs(), []);
  const meis = useMemo(() => listMEISClaims(), []);
  const rcmc = useMemo(() => listRCMCs(), []);
  const fema = useMemo(() => listFEMAFilings(), []);

  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Legal + IPR + Tier-2 Extensions · Q38</h1>
        <p className="text-sm text-muted-foreground">
          Vendor/Customer/NDA · Trademark/Patent/Copyright/Design · Exim Tier-2
        </p>
      </header>

      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono">{lc.vendor_executed + lc.customer_executed + lc.nda_count}</div>
          <div className="text-xs text-muted-foreground">Active Contracts</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono">{ipr.trademarks_active + ipr.patents_count + ipr.copyrights_count + ipr.designs_count}</div>
          <div className="text-xs text-muted-foreground">IPR Records</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono text-warning">{lc.expiring_90_days}</div>
          <div className="text-xs text-muted-foreground">Expiring 90d</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono">{t2.exim_brc_count + t2.rcmc_active + t2.fema_filings_count}</div>
          <div className="text-xs text-muted-foreground">Exim T2</div>
        </Card>
      </div>

      {(() => {
        const chartRows = [
          { category: 'Trademarks', count: tm.length },
          { category: 'Patents', count: pt.length },
          { category: 'Copyrights', count: cr.length },
          { category: 'Designs', count: ds.length },
        ];
        const totalActive = lc.vendor_executed + lc.customer_executed + lc.nda_count;
        const pct = totalActive > 0
          ? Math.round(((totalActive - lc.expiring_90_days) * 100) / totalActive)
          : 100;
        const kpi = getKpi('cmp-legal');
        const chartConfig = kpi?.defaultChart ?? defaultChartConfig({
          chartType: 'column', xKey: 'category',
          series: [{ key: 'count', label: 'IPR records' }],
          title: 'Legal · IPR record mix',
        });
        const rag = resolveRag(pct, kpi?.thresholds ?? { amber: 90, red: 75, direction: 'higher-good' });
        const sig = signReport(chartRows);
        return (
          <section className="space-y-3" data-testid="rpt2aiii-legal-section">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ScorecardTile label="Legal/IPR compliance %" value={`${pct}%`} rag={rag} hint="Active minus 90d-expiring" />
              <ScorecardTile label="IPR records" value={tm.length + pt.length + cr.length + ds.length} hint="TM · PT · CR · DS" />
              <Card className="p-3 flex items-center gap-2" data-testid="integrity-badge-legal">
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
          <TabsTrigger value="contracts">Legal Contracts</TabsTrigger>
          <TabsTrigger value="ipr">IPR</TabsTrigger>
          <TabsTrigger value="t2-deep">Tier-2 Deep View</TabsTrigger>
          <TabsTrigger value="exim-t2">Exim T2</TabsTrigger>
        </TabsList>

        <TabsContent value="contracts">
          <Card className="p-4 space-y-3">
            <div>
              <h2 className="text-lg font-semibold">Vendor ({ven.length}) · Customer ({cus.length}) · NDA ({nda.length})</h2>
              <ul className="space-y-1 mt-2">
                {[...ven, ...cus, ...nda].slice(0, 10).map((c) => (
                  <li key={c.id} className="text-sm border rounded-lg p-2 flex justify-between">
                    <span className="font-mono">{c.ref_no} · {c.counter_party}</span>
                    <Badge>{c.status}</Badge>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Stamp Duty (₹{(lc.total_stamp_duty_paise / 100).toFixed(0)} total)</h2>
              {sd.length === 0 ? (
                <p className="text-xs text-muted-foreground">No stamp duty records.</p>
              ) : (
                <ul className="space-y-1 mt-2">
                  {sd.map((r) => (
                    <li key={r.id} className="text-sm border rounded-lg p-2 flex justify-between">
                      <span className="font-mono">{r.instrument_kind} · {r.state}</span>
                      <span className="font-mono">₹{(r.duty_paise / 100).toFixed(0)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="ipr">
          <Card className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm font-mono">
              <div>Trademarks: {tm.length}</div>
              <div>Patents: {pt.length}</div>
              <div>Copyrights: {cr.length}</div>
              <div>Designs: {ds.length}</div>
              <div>Upcoming renewals (90d): {ipr.upcoming_renewals_90_days}</div>
              <div>Renewals tracked: {rn.length}</div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="t2-deep">
          <Card className="p-4 space-y-2">
            <h2 className="text-lg font-semibold">Tier-2 Extensions Deep View</h2>
            <div className="grid grid-cols-2 gap-2 text-sm font-mono">
              <div>GST T2 filings: {t2.gst_t2_filings}</div>
              <div>E-invoices: {t2.e_invoices_count}</div>
              <div>EWB: {t2.ewb_count}</div>
              <div>RFD-01 sanctioned: {t2.rfd01_sanctioned}</div>
              <div>TDS 195: {t2.tds_195_count}</div>
              <div>Advance Tax paid: {t2.advance_tax_paid}</div>
              <div>BRC: {t2.exim_brc_count}</div>
              <div>MEIS pending: {t2.meis_pending}</div>
              <div>RCMC active: {t2.rcmc_active}</div>
              <div>FEMA filings: {t2.fema_filings_count}</div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="exim-t2">
          <Card className="p-4 space-y-3">
            <div>
              <h2 className="text-lg font-semibold">AD Code ({ad.length}) · BRC ({brc.length})</h2>
            </div>
            <div>
              <h2 className="text-lg font-semibold">MEIS/RoDTEP/RoSCTL ({meis.length})</h2>
              <ul className="space-y-1 mt-2">
                {meis.slice(0, 5).map((r) => (
                  <li key={r.id} className="text-sm border rounded-lg p-2 flex justify-between">
                    <span className="font-mono">{r.scheme} · {r.shipping_bill_no}</span>
                    <Badge>{r.status}</Badge>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-lg font-semibold">RCMC ({rcmc.length}) · FEMA ({fema.length})</h2>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
