/**
 * @file        src/pages/erp/eximx/compliance/UnifiedComplianceLayout.tsx
 * @purpose     EX-9 parent composition · 10 compliance modules tabbed · EximX.types.ts 0-diff (Q13=a)
 * @sprint      T-Phase-1.EX-9-Compliance-Suite
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Award, Banknote, AlertTriangle, FileText, Globe, Search, FileWarning, TrendingDown, Sparkles } from 'lucide-react';
import { AEOBenefitsDashboard } from './AEOBenefitsDashboard';
import { CAROTARRoOMatrix } from './CAROTARRoOMatrix';
import { EWSDashboard } from './EWSDashboard';
import { ComplianceSaathiPanel } from '../saathi/ComplianceSaathiPanel';

type ComplianceTab = 'ews' | 'aeo' | 'carotar' | 'coo-embassy' | 'stpi-softex' | 'pca' | 'tp' | 'edpms' | 'sanctions' | 'dgtr';

export function UnifiedComplianceLayout(): JSX.Element {
  const [tab, setTab] = useState<ComplianceTab>('ews');
  const [showSaathi, setShowSaathi] = useState(false);

  const tabs: { id: ComplianceTab; label: string; icon: typeof Shield }[] = [
    { id: 'ews', label: 'EWS Aggregator', icon: AlertTriangle },
    { id: 'aeo', label: 'AEO FULL', icon: Award },
    { id: 'carotar', label: 'CAROTAR FULL', icon: FileText },
    { id: 'coo-embassy', label: 'CoO Embassy FULL', icon: Globe },
    { id: 'stpi-softex', label: 'STPI Softex FULL', icon: Banknote },
    { id: 'pca', label: 'PCA Audit', icon: Search },
    { id: 'tp', label: 'Transfer Pricing', icon: FileWarning },
    { id: 'edpms', label: 'EDPMS', icon: Banknote },
    { id: 'sanctions', label: 'Sanctions', icon: Shield },
    { id: 'dgtr', label: 'DGTR', icon: TrendingDown },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold"><Shield className="w-5 h-5 inline mr-2" />Unified Compliance Suite</h1>
          <p className="text-sm text-muted-foreground">EX-9 · 4 PRIMARY/FULL moats + 6 NEW modules · 5 v7 Gaps closed · Compliance Completion Sprint</p>
        </div>
        <Button variant="outline" onClick={() => setShowSaathi(!showSaathi)}><Sparkles className="w-4 h-4 mr-2" />{showSaathi ? 'Hide' : 'Show'} Saathi</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return <Button key={t.id} variant={tab === t.id ? 'default' : 'outline'} size="sm" onClick={() => setTab(t.id)}><Icon className="w-4 h-4 mr-2" />{t.label}</Button>;
        })}
      </div>

      <div className={`grid ${showSaathi ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6`}>
        <div className={showSaathi ? 'lg:col-span-2' : 'lg:col-span-1'}>
          {tab === 'ews' && <EWSDashboard />}
          {tab === 'aeo' && <AEOBenefitsDashboard />}
          {tab === 'carotar' && <CAROTARRoOMatrix />}
          {tab === 'coo-embassy' && (
            <Card><CardHeader><CardTitle>CoO Embassy FULL (Moat #10 PRIMARY)</CardTitle></CardHeader><CardContent className="text-sm space-y-2">
              <p>5-state embassy legalization workflow. Apostille for 16 Hague Convention countries · Embassy chain for non-Hague (UAE/Qatar/Saudi/Oman/Kuwait/Bahrain).</p>
              <p className="text-muted-foreground">Engine: coo-embassy-full-engine.ts (sibling extension · coo-legalization-engine.ts 0-diff).</p>
              <p className="text-muted-foreground">States: chamber_submitted → chamber_endorsed → mea_submitted → mea_attested → embassy_submitted → embassy_legalized → buyer_side_legalized.</p>
            </CardContent></Card>
          )}
          {tab === 'stpi-softex' && (
            <Card><CardHeader><CardTitle>STPI Softex FULL (v7 Gap #11)</CardTitle></CardHeader><CardContent className="text-sm space-y-2">
              <p>Form A/B classification · 30-day filing deadline · Positive NFE computation · consumes EX-7c is_stpi_export seeds.</p>
              <p className="text-muted-foreground">Engine: stpi-softex-engine.ts · export-realisation.ts STAYS 0-DIFF.</p>
              <p className="text-muted-foreground">Form A: software through data links · Form B: physical media. NFE = inflows - outflows · must be positive.</p>
            </CardContent></Card>
          )}
          {tab === 'pca' && (
            <Card><CardHeader><CardTitle>PCA · Post-Clearance Audit (v7 Gap #5)</CardTitle></CardHeader><CardContent className="text-sm space-y-2">
              <p>7-state audit workflow · auto-triggered on BoE Yellow/Red RMS lanes. Consumes EX-6 bill-of-entry-engine READ-ONLY.</p>
              <p className="text-muted-foreground">Triggers: rms_yellow_lane · rms_red_lane · cbic_random_selection · whistleblower · other.</p>
              <p className="text-muted-foreground">3 demo cases: PCA-001 (yellow lane document request) · PCA-002 (random selection closed clean) · PCA-003 (findings ₹12,950 demand).</p>
            </CardContent></Card>
          )}
          {tab === 'tp' && (
            <Card><CardHeader><CardTitle>Transfer Pricing (v7 Gap #6)</CardTitle></CardHeader><CardContent className="text-sm space-y-2">
              <p>ALP 5-method classifier (CUP · RPM · CPM · PSM · TNMM) · Form 3CEB deadline tracker · ₹20Cr threshold.</p>
              <p className="text-muted-foreground">Demo: sinha-trading USA parent (100% holding) · ₹28Cr above threshold · TNMM primary · Form 3CEB due 31-Oct-2026.</p>
            </CardContent></Card>
          )}
          {tab === 'edpms' && (
            <Card><CardHeader><CardTitle>EDPMS Dashboard (v7 Gap #7 UI Surfacing)</CardTitle></CardHeader><CardContent className="text-sm space-y-2">
              <p>EDPMS declaration list · bank reconciliation status · age buckets · BRC matching workflow UI.</p>
              <p className="text-muted-foreground">ebrc-edpms.ts STAYS 0-DIFF · UI elevation only. Q7=b lean.</p>
            </CardContent></Card>
          )}
          {tab === 'sanctions' && (
            <Card><CardHeader><CardTitle>Sanctions Watchlist (v7 Gap #8)</CardTitle></CardHeader><CardContent className="text-sm space-y-2">
              <p>4-source screening · OFAC SDN + UN Consolidated + EU CFSP + RBI EXIM Negative List · screens ForeignCustomer + ForeignVendor + Country.</p>
              <p className="text-muted-foreground">Engine: sanctions-screening-engine.ts · fuzzy + exact + false positive marking · override approval workflow.</p>
              <p className="text-muted-foreground">5 demo entries: KOMID (North Korea OFAC) · Khattab (UN Taliban) · Rusbank (EU CFSP Russia) · Iran (RBI) · GenericTrade (OFAC close-match demo).</p>
            </CardContent></Card>
          )}
          {tab === 'dgtr' && (
            <Card><CardHeader><CardTitle>DGTR · Trade Remedies</CardTitle></CardHeader><CardContent className="text-sm space-y-2">
              <p>Anti-dumping + safeguard + countervailing duty case register · BoE alert when imported CTH matches active case.</p>
              <p className="text-muted-foreground">Foundation-level · case status tracker · duty rate × validity period.</p>
            </CardContent></Card>
          )}
        </div>
        {showSaathi && <div className="lg:col-span-1"><ComplianceSaathiPanel activeTab={tab} /></div>}
      </div>
    </div>
  );
}
