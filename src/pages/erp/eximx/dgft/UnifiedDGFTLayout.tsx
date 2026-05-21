/**
 * @file        src/pages/erp/eximx/dgft/UnifiedDGFTLayout.tsx
 * @purpose     EX-10 parent composition · 5 DGFT tabs · EximX.types.ts 0-DIFF (Q9=a · 5th application)
 * @sprint      T-Phase-1.EX-10-DGFT-Scrip-VendorScorecard-HSNReclass-D-NEW-FF
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Award, TrendingUp, Wallet, FileText, Building2 } from 'lucide-react';
import { loadDGFTSchemes, loadEPCGLicenses, checkEPCGFulfillmentStatus } from '@/lib/dgft-scheme-engine';
import { loadDGFTScrips } from '@/lib/dgft-scrip-engine';
import { VendorScorecardDashboard } from './VendorScorecardDashboard';
import type { DGFTScheme, EPCGLicense } from '@/types/dgft-scheme';
import type { DGFTScrip } from '@/types/dgft-scrip';

type DGFTTab = 'scrip-wallet' | 'rodtep' | 'drawback' | 'seis-meis' | 'epcg' | 'vendor-scorecard';

export function UnifiedDGFTLayout(): JSX.Element {
  const tradingCode = 'sinha-trading';
  const steelCode = 'sinha-steel';
  const [tab, setTab] = useState<DGFTTab>('scrip-wallet');
  const [scrips, setScrips] = useState<DGFTScrip[]>([]);
  const [schemes, setSchemes] = useState<DGFTScheme[]>([]);
  const [epcg, setEpcg] = useState<EPCGLicense[]>([]);

  useEffect(() => {
    setScrips(loadDGFTScrips(tradingCode));
    setSchemes(loadDGFTSchemes(tradingCode));
    setEpcg(loadEPCGLicenses(steelCode));
  }, []);

  const tabs: { id: DGFTTab; label: string; icon: typeof Award }[] = [
    { id: 'scrip-wallet', label: 'Scrip Wallet', icon: Wallet },
    { id: 'rodtep', label: 'RoDTEP', icon: Award },
    { id: 'drawback', label: 'Drawback', icon: Award },
    { id: 'seis-meis', label: 'SEIS · MEIS', icon: TrendingUp },
    { id: 'epcg', label: 'EPCG', icon: FileText },
    { id: 'vendor-scorecard', label: 'Vendor Scorecard (Moat #21)', icon: Building2 },
  ];

  const totalScripValue = scrips.reduce((s, x) => s + x.scrip_face_value_inr, 0);
  const utilizedValue = scrips.reduce((s, x) => s + x.utilization_amount_inr, 0);
  const remainingValue = scrips.reduce((s, x) => s + x.remaining_balance_inr, 0);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold"><Award className="w-5 h-5 inline mr-2" />Unified DGFT Suite (Moat #20 PRIMARY)</h1>
        <p className="text-sm text-muted-foreground">EX-10 · 5 DGFT schemes (RoDTEP · Drawback · SEIS · MEIS · EPCG) + Scrip 6-state lifecycle + Vendor Scorecard (Moat #21) · D-NEW-FF resolved · D-NEW-FH closed</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return <Button key={t.id} variant={tab === t.id ? 'default' : 'outline'} size="sm" onClick={() => setTab(t.id)}><Icon className="w-4 h-4 mr-2" />{t.label}</Button>;
        })}
      </div>

      {tab === 'scrip-wallet' && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{scrips.length}</div><div className="text-xs text-muted-foreground">Total Scrips</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-2xl font-bold font-mono">₹{totalScripValue.toLocaleString()}</div><div className="text-xs text-muted-foreground">Face Value</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-2xl font-bold font-mono text-success">₹{utilizedValue.toLocaleString()}</div><div className="text-xs text-muted-foreground">Utilized</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-2xl font-bold font-mono text-warning">₹{remainingValue.toLocaleString()}</div><div className="text-xs text-muted-foreground">Remaining</div></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Scrip Wallet</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Scrip No</TableHead><TableHead>Scheme</TableHead><TableHead>State</TableHead><TableHead>FOB Source (₹)</TableHead><TableHead>Face Value (₹)</TableHead><TableHead>Remaining (₹)</TableHead><TableHead>Validity</TableHead></TableRow></TableHeader>
                <TableBody>
                  {scrips.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.scrip_no}</TableCell>
                      <TableCell><Badge variant="outline">{s.scheme_kind}</Badge></TableCell>
                      <TableCell><Badge variant={s.state === 'utilized' ? 'default' : s.state === 'expired' ? 'destructive' : 'outline'}>{s.state}</Badge></TableCell>
                      <TableCell className="text-right font-mono">{s.source_fob_value_inr.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono">{s.scrip_face_value_inr.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono">{s.remaining_balance_inr.toLocaleString()}</TableCell>
                      <TableCell className="text-xs font-mono">{s.validity_to ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {tab === 'rodtep' && (
        <Card><CardHeader><CardTitle>RoDTEP Schemes</CardTitle></CardHeader><CardContent>
          <Table><TableHeader><TableRow><TableHead>CTH</TableHead><TableHead>Country</TableHead><TableHead>Rate</TableHead><TableHead>Notif</TableHead></TableRow></TableHeader>
          <TableBody>{schemes.filter((s) => s.scheme_kind === 'RoDTEP').map((s) => (
            <TableRow key={s.id}><TableCell className="font-mono">{s.cth_code}</TableCell><TableCell>{s.destination_country_code ?? 'Global'}</TableCell><TableCell className="font-mono">{s.rate_percentage}% of FOB</TableCell><TableCell className="text-xs">{s.notification_no}</TableCell></TableRow>
          ))}</TableBody></Table>
        </CardContent></Card>
      )}

      {tab === 'drawback' && (
        <Card><CardHeader><CardTitle>Drawback All-Industry Rates</CardTitle></CardHeader><CardContent>
          <Table><TableHeader><TableRow><TableHead>CTH</TableHead><TableHead>Rate</TableHead><TableHead>Notif</TableHead></TableRow></TableHeader>
          <TableBody>{schemes.filter((s) => s.scheme_kind === 'Drawback').map((s) => (
            <TableRow key={s.id}><TableCell className="font-mono">{s.cth_code}</TableCell><TableCell className="font-mono">{s.rate_percentage}% of FOB</TableCell><TableCell className="text-xs">{s.notification_no}</TableCell></TableRow>
          ))}</TableBody></Table>
        </CardContent></Card>
      )}

      {tab === 'seis-meis' && (
        <Card><CardHeader><CardTitle>SEIS + MEIS (legacy)</CardTitle></CardHeader><CardContent className="text-sm">
          <p>SEIS · IT services category · 5% reward · validity FY 2025-26.</p>
          <p className="mt-2 text-muted-foreground">MEIS phased out from 2021 for most CTHs. Refer DGFT FTP 2023 for residual cases.</p>
        </CardContent></Card>
      )}

      {tab === 'epcg' && (
        <Card><CardHeader><CardTitle>EPCG Licenses + Export Obligation Tracker</CardTitle></CardHeader><CardContent>
          <Table><TableHeader><TableRow><TableHead>License No</TableHead><TableHead>BCD Saved (₹)</TableHead><TableHead>Obligation (₹)</TableHead><TableHead>Fulfilled (₹)</TableHead><TableHead>%</TableHead><TableHead>On Track?</TableHead></TableRow></TableHeader>
          <TableBody>{epcg.map((l) => {
            const f = checkEPCGFulfillmentStatus(l);
            return <TableRow key={l.id}><TableCell className="font-mono text-xs">{l.license_no}</TableCell><TableCell className="text-right font-mono">{l.bcd_saved_inr.toLocaleString()}</TableCell><TableCell className="text-right font-mono">{l.export_obligation_inr.toLocaleString()}</TableCell><TableCell className="text-right font-mono">{l.exports_fulfilled_inr.toLocaleString()}</TableCell><TableCell className="font-mono">{l.fulfillment_pct}%</TableCell><TableCell><Badge variant={f.is_on_track ? 'default' : 'destructive'}>{f.is_on_track ? 'On Track' : `Behind ₹${f.shortfall_inr.toLocaleString()}`}</Badge></TableCell></TableRow>;
          })}</TableBody></Table>
        </CardContent></Card>
      )}

      {tab === 'vendor-scorecard' && <VendorScorecardDashboard />}
    </div>
  );
}
