/**
 * @file        src/pages/erp/comply360/esg/BRSRComprehensivePage.tsx
 * @purpose     Sprint 77b · BRSR Comprehensive 9-principle SEBI disclosure surface.
 *              Consumes Pass A brsr-comprehensive-engine; brsr-fa-engine §H FROZEN.
 * @sprint      Sprint 77b · T-Phase-5.A.1.9-PASS-B · Block 4
 * @disciplines FR-7 · FR-13 · FR-19 (engines 0-DIFF) · FR-91
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building, AlertTriangle, CheckCircle2, Download, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  buildBRSRComprehensiveReport,
  recordBRSRIndicator,
  validateBRSRReport,
  PRINCIPLE_LABELS,
  type BRSRPrinciple,
} from '@/lib/comply360-brsr-comprehensive-engine';

const PRINCIPLES = Object.keys(PRINCIPLE_LABELS) as BRSRPrinciple[];

export default function BRSRComprehensivePage(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const [fy, setFy] = useState('FY25-26');
  const [principle, setPrinciple] = useState<BRSRPrinciple>('P6');
  const [indicatorRef, setIndicatorRef] = useState('P6-E-7');
  const [isLeadership, setIsLeadership] = useState(false);
  const [value, setValue] = useState('Scope-1 emissions: 1,820 tCO2e · Scope-2: 4,560 tCO2e (FY25-26)');
  const [tick, setTick] = useState(0);

  const report = useMemo(() => {
    if (!entityCode) return null;
    return buildBRSRComprehensiveReport(entityCode, fy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, fy, tick]);

  const validation = useMemo(() => (report ? validateBRSRReport(report) : null), [report]);

  if (!entityId || entityId === 'all') {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Select a company to continue</h2>
          <p className="text-muted-foreground">BRSR Comprehensive report is entity-scoped.</p>
        </Card>
      </div>
    );
  }

  const handleRecord = (): void => {
    recordBRSRIndicator(entityCode, fy, {
      principle, indicator_ref: indicatorRef, is_leadership: isLeadership, value,
    });
    setTick(t => t + 1);
    toast.success(`Indicator ${indicatorRef} recorded under ${principle}`);
  };

  const handleDownload = (): void => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `BRSR-${entityCode}-${fy}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success('BRSR report downloaded');
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">BRSR · Business Responsibility & Sustainability Report</h1>
          <p className="text-muted-foreground text-sm">SEBI 9-principle disclosure · essential + leadership indicators · FA carbon pull.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setTick(t => t + 1)}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={handleDownload} disabled={!report}>
            <Download className="h-4 w-4 mr-1" /> Download
          </Button>
        </div>
      </div>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div><Label className="text-xs">Financial Year</Label><Input value={fy} onChange={(e) => setFy(e.target.value)} className="font-mono" /></div>
        {report && (
          <>
            <div className="md:col-span-2 flex items-center gap-3 justify-end">
              <Badge variant="outline" className="font-mono">FA Carbon: {report.fa_carbon_kg_per_year.toLocaleString('en-IN')} kg/yr</Badge>
              <Badge variant="outline" className="font-mono">FA Coverage: {report.fa_coverage_pct}%</Badge>
              <Badge className={report.filing_eligible ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}>
                {report.filing_eligible ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                Overall {report.overall_coverage_pct}%
              </Badge>
            </div>
          </>
        )}
      </Card>

      {report && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">9 Principles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {report.principles.map(p => (
              <div key={p.principle} className="border rounded p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm">{p.principle}</span>
                  <Badge variant={p.coverage_pct >= 50 ? 'secondary' : 'destructive'} className="font-mono text-xs">{p.coverage_pct}%</Badge>
                </div>
                <div className="text-xs mt-1">{p.label}</div>
                <div className="text-xs text-muted-foreground mt-2">
                  E: {p.essential_indicators_disclosed} · L: {p.leadership_indicators_disclosed} · expected: {p.total_indicators_expected}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs">Principle</Label>
          <Select value={principle} onValueChange={(v) => setPrinciple(v as BRSRPrinciple)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PRINCIPLES.map(p => <SelectItem key={p} value={p}>{p} · {PRINCIPLE_LABELS[p]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Indicator Ref</Label><Input value={indicatorRef} onChange={(e) => setIndicatorRef(e.target.value)} className="font-mono" /></div>
        <div className="flex items-center gap-2"><Switch checked={isLeadership} onCheckedChange={setIsLeadership} /> <Label>Leadership</Label></div>
        <div className="md:col-span-4"><Label className="text-xs">Value</Label><Input value={value} onChange={(e) => setValue(e.target.value)} /></div>
      </Card>

      <Button onClick={handleRecord}>Record Indicator</Button>

      {validation && validation.warnings.length > 0 && (
        <Card className="p-4 border-amber-500">
          <h2 className="text-sm font-semibold uppercase text-amber-600 mb-2 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-1" /> Validation warnings
          </h2>
          <ul className="text-xs space-y-1">
            {validation.warnings.map((w, i) => <li key={`w-${i}`}>• {w}</li>)}
          </ul>
        </Card>
      )}
    </div>
  );
}
