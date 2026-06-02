/**
 * @file        ConsolidatedFinancialsPage.tsx
 * @purpose     Standalone Page #39 — Consolidated Financials (BS + CF + NCI + Goodwill).
 *              S112 EXTENSION: Disclosure Pack tab (Schedule III + Ind AS 110) +
 *              Export PDF/XBRL buttons (consolidation-disclosure-engine).
 * @reads       consolidated-balance-sheet-engine · consolidated-cash-flow-engine ·
 *              consolidation-disclosure-engine (S112 NEW).
 * @sprint      T-Phase-6.C.2.3 · Sprint 111 · EXTENDED Sprint 112 · Arc 3 · Block 5
 * @scope-wall  DP-A3-9 · disclosure assembly + PDF/XBRL ONLY · NO new financial computation ·
 *              NO OOB · NO Pillar-C.3 (Arc 4).
 * NOT A SIBLING — First-Class Standalone Page that READS engines via their published API.
 */
import { useMemo, useState } from 'react';
import { Building2, CheckCircle2, AlertTriangle, RefreshCw, Play, FileDown, FileCode2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  buildBalanceSheet, computeNCI, computeGoodwill, loadConsolidatedBalanceSheet,
  type ConsolidatedBalanceSheet, type NCIEntry, type GoodwillEntry,
} from '@/lib/consolidated-balance-sheet-engine';
import {
  buildCashFlow, loadConsolidatedCashFlow, type ConsolidatedCashFlow,
} from '@/lib/consolidated-cash-flow-engine';
import {
  buildDisclosurePack, loadDisclosurePack,
  exportDisclosureXBRL, exportDisclosurePDF,
  type ConsolidationDisclosurePack,
} from '@/lib/consolidation-disclosure-engine';

const fmtINR = (n: number) =>
  `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function defaultFy(): string {
  const now = new Date();
  const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}

export default function ConsolidatedFinancialsPage() {
  const [fy, setFy] = useState<string>(defaultFy());
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const bs: ConsolidatedBalanceSheet | null = useMemo(
    () => { void tick; return loadConsolidatedBalanceSheet(fy); },
    [fy, tick],
  );
  const cf: ConsolidatedCashFlow | null = useMemo(
    () => { void tick; return loadConsolidatedCashFlow(fy); },
    [fy, tick],
  );
  const ncis: NCIEntry[] = useMemo(() => { void tick; return computeNCI({ fy }); }, [fy, tick]);
  const goodwill: GoodwillEntry[] = useMemo(() => { void tick; return computeGoodwill({ fy }); }, [fy, tick]);
  const pack: ConsolidationDisclosurePack | null = useMemo(
    () => { void tick; return loadDisclosurePack(fy); },
    [fy, tick],
  );

  const runAll = () => {
    buildBalanceSheet({ fy });
    buildCashFlow({ fy });
    refresh();
  };

  const buildPack = () => {
    buildDisclosurePack({ fy });
    refresh();
    toast.success(`Disclosure pack assembled for FY ${fy}`);
  };

  const exportPdf = () => {
    const { blob, filename } = exportDisclosurePDF({ fy });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast.success(`PDF exported · ${filename}`);
  };

  const exportXbrl = () => {
    const { download, validation } = exportDisclosureXBRL({ fy });
    const url = URL.createObjectURL(download.blob);
    const a = document.createElement('a');
    a.href = url; a.download = download.filename; a.click();
    URL.revokeObjectURL(url);
    toast.success(
      `XBRL exported · ${download.filename} · valid=${validation.is_valid}`,
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Consolidated Financials</h1>
            <p className="text-sm text-muted-foreground">
              Arc 3 · Schedule III BS + Ind AS 7 CF + Ind AS 110 NCI + Ind AS 103 Goodwill + S112 Disclosure Pack.
            </p>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <Label htmlFor="fy" className="text-xs">Financial Year</Label>
            <Input id="fy" value={fy} onChange={(e) => setFy(e.target.value)}
              className="h-9 w-32 font-mono" placeholder="2026-27" />
          </div>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-1" />Refresh
          </Button>
          <Button size="sm" onClick={runAll}>
            <Play className="h-4 w-4 mr-1" />Build BS + CF
          </Button>
        </div>
      </header>

      <Tabs defaultValue="bs" className="w-full">
        <TabsList>
          <TabsTrigger value="bs">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cf">Cash Flow</TabsTrigger>
          <TabsTrigger value="nci">NCI</TabsTrigger>
          <TabsTrigger value="gw">Goodwill</TabsTrigger>
          <TabsTrigger value="disclosure">Disclosure Pack</TabsTrigger>
        </TabsList>

        <TabsContent value="bs">
          <Card><CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Consolidated Balance Sheet</h2>
              {bs ? (
                bs.balanced ? (
                  <Badge variant="default" className="bg-success/15 text-success">
                    <CheckCircle2 className="h-3 w-3 mr-1" />Balanced
                  </Badge>
                ) : (
                  <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" />Unbalanced</Badge>
                )
              ) : null}
            </div>
            {!bs ? (
              <p className="text-sm text-muted-foreground">
                No BS for this FY yet. Click <span className="font-medium">Build BS + CF</span>.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <Card><CardContent className="p-3">
                  <div className="text-xs text-muted-foreground">Assets + Goodwill</div>
                  <div className="text-xl font-mono">{fmtINR(bs.asset_total)}</div>
                </CardContent></Card>
                <Card><CardContent className="p-3">
                  <div className="text-xs text-muted-foreground">Liabilities</div>
                  <div className="text-xl font-mono">{fmtINR(bs.liability_total)}</div>
                </CardContent></Card>
                <Card><CardContent className="p-3">
                  <div className="text-xs text-muted-foreground">Equity + NCI</div>
                  <div className="text-xl font-mono">{fmtINR(bs.equity_total + bs.nci_total)}</div>
                </CardContent></Card>
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="cf">
          <Card><CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-semibold">Consolidated Cash Flow (Ind AS 7)</h2>
            {!cf ? (
              <p className="text-sm text-muted-foreground">
                No CF for this FY yet. Click <span className="font-medium">Build BS + CF</span>.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                <Card><CardContent className="p-3">
                  <div className="text-xs text-muted-foreground">Operating</div>
                  <div className="text-xl font-mono">{fmtINR(cf.operating_total)}</div>
                </CardContent></Card>
                <Card><CardContent className="p-3">
                  <div className="text-xs text-muted-foreground">Investing</div>
                  <div className="text-xl font-mono">{fmtINR(cf.investing_total)}</div>
                </CardContent></Card>
                <Card><CardContent className="p-3">
                  <div className="text-xs text-muted-foreground">Financing</div>
                  <div className="text-xl font-mono">{fmtINR(cf.financing_total)}</div>
                </CardContent></Card>
                <Card><CardContent className="p-3">
                  <div className="text-xs text-muted-foreground">Net Change</div>
                  <div className="text-xl font-mono">{fmtINR(cf.net_change)}</div>
                </CardContent></Card>
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="nci">
          <Card><CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-semibold">Non-Controlling Interest (Ind AS 110)</h2>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Entity</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Ownership %</TableHead>
                <TableHead className="text-right">Net Assets</TableHead>
                <TableHead className="text-right">NCI Amount</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {ncis.map((n) => (
                  <TableRow key={n.entity_id}>
                    <TableCell className="font-mono text-xs">{n.entity_id}</TableCell>
                    <TableCell><Badge variant="outline" className="uppercase">{n.method}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{n.ownership_pct}</TableCell>
                    <TableCell className="text-right font-mono">{fmtINR(n.net_assets)}</TableCell>
                    <TableCell className="text-right font-mono">{fmtINR(n.nci_amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="gw">
          <Card><CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-semibold">Goodwill (Ind AS 103) · Impairment Flag (Ind AS 36)</h2>
            <p className="text-xs text-muted-foreground">
              Acquisition net assets default to current net assets when no historical input is supplied
              (the row is §L-flagged). Impairment is a surface indicator, not a DCF.
            </p>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Acquiree</TableHead>
                <TableHead className="text-right">Consideration</TableHead>
                <TableHead className="text-right">Acquired Share</TableHead>
                <TableHead className="text-right">Goodwill</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Impairment?</TableHead>
                <TableHead>Fallback?</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {goodwill.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-muted-foreground text-sm">
                    No capital_infusion IC transactions found for this FY.
                  </TableCell></TableRow>
                ) : goodwill.map((g) => (
                  <TableRow key={g.entity_id}>
                    <TableCell className="font-mono text-xs">{g.entity_id}</TableCell>
                    <TableCell className="text-right font-mono">{fmtINR(g.consideration)}</TableCell>
                    <TableCell className="text-right font-mono">{fmtINR(g.acquired_share_of_net_assets)}</TableCell>
                    <TableCell className="text-right font-mono">{fmtINR(g.goodwill)}</TableCell>
                    <TableCell><Badge variant="outline" className="uppercase">{g.classification}</Badge></TableCell>
                    <TableCell>
                      {g.impairment_flag ? (
                        <Badge variant="outline" className="bg-warning/15 text-warning">
                          <AlertTriangle className="h-3 w-3 mr-1" />flagged
                        </Badge>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {g.acquisition_fallback_used ? (
                        <Badge variant="outline">§L fallback</Badge>
                      ) : <span className="text-xs text-muted-foreground">no</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="disclosure">
          <Card><CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">
                  Consolidated Disclosure Pack · Schedule III + Ind AS 110
                </h2>
                <p className="text-xs text-muted-foreground">
                  Assembled from S109 P&amp;L + S111 BS/CF/NCI/Goodwill. XBRL via
                  comply360-xbrl-builder · PDF via board-pack pattern. No figure or
                  taxonomy rebuild (FR-44).
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={buildPack}>
                  <Play className="h-4 w-4 mr-1" />Assemble Pack
                </Button>
                <Button size="sm" variant="outline" onClick={exportPdf}>
                  <FileDown className="h-4 w-4 mr-1" />Export PDF
                </Button>
                <Button size="sm" onClick={exportXbrl}>
                  <FileCode2 className="h-4 w-4 mr-1" />Export XBRL
                </Button>
              </div>
            </div>
            {!pack ? (
              <p className="text-sm text-muted-foreground">
                No disclosure pack yet for FY {fy}. Click{' '}
                <span className="font-medium">Assemble Pack</span>.
              </p>
            ) : (
              <>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className={pack.schedule_iii_compliant ? 'bg-success/15 text-success' : ''}>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Schedule III {pack.schedule_iii_compliant ? 'compliant' : 'incomplete'}
                  </Badge>
                  <Badge variant="outline" className={pack.ind_as_110_compliant ? 'bg-success/15 text-success' : ''}>
                    Ind AS 110 {pack.ind_as_110_compliant ? 'compliant' : 'unbalanced'}
                  </Badge>
                  <Badge variant="outline">Taxonomy: {pack.taxonomy_version}</Badge>
                  <Badge variant="outline">Form 3CEB refs: {pack.form_3ceb_cross_ref_count}</Badge>
                </div>
                {pack.sections.map((section) => (
                  <div key={section.key} className="space-y-1">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">
                      {section.title} · {section.category}
                      {section.taxonomy_element_code ? ` · ${section.taxonomy_element_code}` : ''}
                    </div>
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Line</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {section.rows.map((r, i) => (
                          <TableRow key={`${section.key}-${i}`}>
                            <TableCell className="text-xs">{r.label}</TableCell>
                            <TableCell className="text-right font-mono">{fmtINR(r.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
