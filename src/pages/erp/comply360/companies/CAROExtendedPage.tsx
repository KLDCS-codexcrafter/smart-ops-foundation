/**
 * @file        src/pages/erp/comply360/companies/CAROExtendedPage.tsx
 * @purpose     Sprint 77b · CARO Extended (paragraph 3 clauses ii–xxi) surface.
 *              Consumes Pass A caro-extended-engine; caro-2020 §Y FROZEN.
 * @sprint      Sprint 77b · T-Phase-5.A.1.9-PASS-B · Block 3
 * @disciplines FR-7 · FR-13 · FR-19 (engine 0-DIFF) · FR-91
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building, CheckCircle2, AlertTriangle, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  buildCAROExtendedReport,
  recordCAROObservation,
  listQualifiedClauses,
  type CAROExtendedClause,
} from '@/lib/comply360-caro-extended-engine';

const CLAUSES: { id: CAROExtendedClause; label: string }[] = [
  { id: 'ii_inventory_verification', label: '3(ii) Inventory Verification' },
  { id: 'iii_loans_advances', label: '3(iii) Loans & Advances' },
  { id: 'iv_section_185_186', label: '3(iv) Section 185/186' },
  { id: 'v_deposits', label: '3(v) Deposits' },
  { id: 'vi_cost_records', label: '3(vi) Cost Records' },
  { id: 'vii_statutory_dues', label: '3(vii) Statutory Dues' },
  { id: 'viii_undisclosed_income', label: '3(viii) Undisclosed Income' },
  { id: 'ix_default_borrowings', label: '3(ix) Default on Borrowings' },
  { id: 'x_money_raised_ipo', label: '3(x) Money raised (IPO)' },
  { id: 'xi_fraud_reported', label: '3(xi) Fraud Reported' },
  { id: 'xii_nidhi', label: '3(xii) Nidhi' },
  { id: 'xiii_related_party_165', label: '3(xiii) Related Party / Sec 165' },
  { id: 'xiv_internal_audit', label: '3(xiv) Internal Audit' },
  { id: 'xv_non_cash_transactions', label: '3(xv) Non-cash Transactions' },
  { id: 'xvi_nbfc_registration', label: '3(xvi) NBFC Registration' },
  { id: 'xvii_cash_losses', label: '3(xvii) Cash Losses' },
  { id: 'xviii_auditor_resignation', label: '3(xviii) Auditor Resignation' },
  { id: 'xix_material_uncertainty', label: '3(xix) Material Uncertainty' },
  { id: 'xx_csr_unspent', label: '3(xx) CSR Unspent' },
  { id: 'xxi_consolidated_qualifications', label: '3(xxi) Consolidated Qualifications' },
];

export default function CAROExtendedPage(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const [fyStart, setFyStart] = useState('2025-04-01');
  const [fyEnd, setFyEnd] = useState('2026-03-31');
  const [clause, setClause] = useState<CAROExtendedClause>('vii_statutory_dues');
  const [obsText, setObsText] = useState('Provident Fund dues for Mar 2026 deposited 7 days after due date');
  const [qualified, setQualified] = useState(true);
  const [tick, setTick] = useState(0);

  const report = useMemo(() => {
    if (!entityCode) return null;
    return buildCAROExtendedReport(entityCode, fyStart, fyEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, fyStart, fyEnd, tick]);

  if (!entityId || entityId === 'all') {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Select a company to continue</h2>
          <p className="text-muted-foreground">CARO Extended report is entity-scoped.</p>
        </Card>
      </div>
    );
  }

  const handleRecord = (): void => {
    recordCAROObservation(entityCode, fyStart, {
      fy_end: fyEnd, clause, qualified, observation_text: obsText,
    });
    setTick(t => t + 1);
    toast.success('CARO observation recorded');
  };

  const qualifiedClauses = report ? listQualifiedClauses(report) : [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">CARO 2020 Extended · Clauses 3(ii)–3(xxi)</h1>
          <p className="text-muted-foreground text-sm">Complements caro-2020-engine paragraph 3(i). 20 clauses · qualified/clean tracking.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setTick(t => t + 1)}>
          <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><Label className="text-xs">FY Start</Label><Input value={fyStart} onChange={(e) => setFyStart(e.target.value)} className="font-mono" /></div>
        <div><Label className="text-xs">FY End</Label><Input value={fyEnd} onChange={(e) => setFyEnd(e.target.value)} className="font-mono" /></div>
      </Card>

      {report && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">Opinion</h2>
            <Badge className={report.clean_opinion ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}>
              {report.clean_opinion ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
              {report.clean_opinion ? 'Clean' : `${report.total_qualifications} qualification(s)`}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground mb-3">
            3(i) {report.paragraph_3i_pass ? 'pass' : `fail · failing sub-rules: ${report.paragraph_3i_failing_subrules.join(', ') || '—'}`}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {report.extended_clauses.map(c => {
              const meta = CLAUSES.find(x => x.id === c.clause);
              return (
                <div key={c.clause} className={`border rounded p-2 text-xs ${c.qualified ? 'border-amber-500' : ''}`}>
                  <div className="font-semibold">{meta?.label}</div>
                  <div className="text-muted-foreground">
                    {c.qualified ? <span className="text-amber-600">Qualified</span> : 'Clean'} · {c.observation_count} obs
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Clause</Label>
          <Select value={clause} onValueChange={(v) => setClause(v as CAROExtendedClause)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CLAUSES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2"><Switch checked={qualified} onCheckedChange={setQualified} /> <Label>Qualified</Label></div>
        <div className="md:col-span-3"><Label className="text-xs">Observation</Label><Input value={obsText} onChange={(e) => setObsText(e.target.value)} /></div>
      </Card>

      <Button onClick={handleRecord}>Record Observation</Button>

      {qualifiedClauses.length > 0 && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-2">Qualified clauses</h2>
          <div className="flex flex-wrap gap-2">
            {qualifiedClauses.map(c => (
              <Badge key={c} variant="secondary" className="font-mono text-xs">{c}</Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
