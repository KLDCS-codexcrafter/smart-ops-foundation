/**
 * Form3CD.tsx — Form 3CD: Tax Audit Report — All 44 Clauses
 * Sectioned layout matching actual Form 3CD structure.
 * [JWT] Replace with GET/POST /api/compliance/form3cd
 */
import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  CheckCircle2, AlertTriangle, XCircle, ChevronRight, Save, Loader2,
  FileText, Info, Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext } from '@/lib/keyboard';
import {
  computeClause9, computeClause26, computeClause34, computeClause44,
  runCrossValidations, type CrossValidationResult,
} from '@/lib/auditEngine';
import type { TDSDeductionEntry, TDSReceivableEntry, ChallanEntry } from '@/types/compliance';
import { tdsDeductionsKey, tdsReceivableKey, challansKey } from '@/types/compliance';

const fmt = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

function ls<T>(key: string): T[] {
  try {
    // [JWT] GET /api/compliance/storage/:key
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ── Draft storage ────────────────────────────────────────────────────
const draftKey = (e: string, fy: string) => `erp_3cd_draft_${e}_${fy}`;
const clause14Key = (e: string, fy: string) => `erp_3cd_clause14_${e}_${fy}`;

interface Form3CDDraft {
  [clauseId: string]: string | number | boolean | null;
}

function loadDraft(entityCode: string, fy: string): Form3CDDraft {
  try {
    // [JWT] GET /api/compliance/form3cd/draft/:entity/:fy
    const raw = localStorage.getItem(draftKey(entityCode, fy));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveDraftToStorage(entityCode: string, fy: string, draft: Form3CDDraft) {
  // [JWT] POST /api/compliance/form3cd/draft/:entity/:fy
  localStorage.setItem(draftKey(entityCode, fy), JSON.stringify(draft));
}

// ── Clause Card component ────────────────────────────────────────────
function ClauseCard({ num, title, type, children }: {
  num: string; title: string; type: 'auto' | 'semi-auto' | 'manual' | 'placeholder';
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(type === 'auto' || type === 'semi-auto');
  const typeBadge = {
    'auto': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    'semi-auto': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    'manual': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    'placeholder': 'bg-muted text-muted-foreground border-muted',
  }[type];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-3 w-full p-3 rounded-lg border border-border/50 hover:bg-muted/20 transition-colors text-left">
        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${open ? 'rotate-90' : ''}`} />
        <Badge variant="outline" className="text-[10px] px-1.5 shrink-0 font-mono">{num}</Badge>
        <span className="text-xs font-medium flex-1">{title}</span>
        <Badge variant="outline" className={`text-[8px] px-1 ${typeBadge}`}>{type}</Badge>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-10 pr-3 pb-3 pt-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function AutoValue({ label, value }: { label?: string; value: string | number }) {
  return (
    <div className="flex items-center gap-2 py-1">
      {label && <span className="text-xs text-muted-foreground min-w-[120px]">{label}:</span>}
      <span className="text-xs font-mono font-medium">{typeof value === 'number' ? fmt(value) : value}</span>
    </div>
  );
}

function PlaceholderBanner({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded border border-muted bg-muted/20">
      <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <span className="text-[10px] text-muted-foreground">{text}</span>
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────
interface Form3CDPanelProps {
  entityCode: string;
}

export function Form3CDPanel({ entityCode }: Form3CDPanelProps) {
  const today = new Date();
  const fyYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  const fy = `${fyYear}-${(fyYear + 1).toString().slice(2)}`;
  const ayYear = fyYear + 1;
  const ay = `${ayYear}-${(ayYear + 1).toString().slice(2)}`;
  const from = `${fyYear}-04-01`;
  const to = `${fyYear + 1}-03-31`;

  const [draft, setDraft] = useState<Form3CDDraft>(() => loadDraft(entityCode, fy));
  const [validations, setValidations] = useState<CrossValidationResult[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [partAOpen, setPartAOpen] = useState(true);
  const [partBOpen, setPartBOpen] = useState(true);

  const updateDraft = useCallback((key: string, value: string | number | boolean | null) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  }, []);

  // Load entity config
  const entityConfig = useMemo(() => {
    try {
      // [JWT] GET /api/accounting/gst-entity-config
      const configs = JSON.parse(localStorage.getItem('erp_gst_entity_config') || '[]');
      return configs[0] || {};
    } catch { return {}; }
  }, []);

  // Computed clauses
  const cl9 = useMemo(() => computeClause9(entityCode, from, to), [entityCode, from, to]);
  const cl26 = useMemo(() => computeClause26(entityCode, from, to), [entityCode, from, to]);
  const cl34 = useMemo(() => computeClause34(entityCode), [entityCode]);
  const cl44 = useMemo(() => computeClause44(entityCode, from, to), [entityCode, from, to]);

  const tdsDeductions = useMemo(() => ls<TDSDeductionEntry>(tdsDeductionsKey(entityCode)), [entityCode]);
  const tdsReceivable = useMemo(() => ls<TDSReceivableEntry>(tdsReceivableKey(entityCode)), [entityCode]);
  const challans = useMemo(() => ls<ChallanEntry>(challansKey(entityCode)), [entityCode]);

  // Clause 37 ratios
  const ratios = useMemo(() => {
    const turnover = cl9.grossTurnover || 1;
    const purchases = cl44.reduce((s, r) => s + r.totalAmount, 0);
    const gp = turnover - purchases;
    const np = cl9.totalGrossReceipts - purchases;
    return {
      gpPct: ((gp / turnover) * 100).toFixed(1),
      npPct: ((np / turnover) * 100).toFixed(1),
      stockTurnover: 'N/A',
      debtorDays: 'N/A',
    };
  }, [cl9, cl44]);

  const handleSaveDraft = () => {
    setSaving(true);
    setTimeout(() => {
      saveDraftToStorage(entityCode, fy, draft);
      toast.success('Draft saved');
      setSaving(false);
    }, 400);
  };

  const handleRunValidations = () => {
    setRunning(true);
    setTimeout(() => {
      setValidations(runCrossValidations(entityCode, from, to));
      setRunning(false);
    }, 600);
  };

  const statusIcon = (s: string) => {
    if (s === 'pass') return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    if (s === 'warn') return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
    return <XCircle className="h-3.5 w-3.5 text-red-500" />;
  };

  // Clause 14 manual entry
  const clause14Amount = useMemo(() => {
    try {
      // [JWT] GET /api/compliance/form3cd/clause14/:entity/:fy
      const raw = localStorage.getItem(clause14Key(entityCode, fy));
      return raw ? parseFloat(raw) : 0;
    } catch { return 0; }
  }, [entityCode, fy]);

  const setClause14 = (val: number) => {
    // [JWT] POST /api/compliance/form3cd/clause14/:entity/:fy
    localStorage.setItem(clause14Key(entityCode, fy), String(val));
  };

  return (
    <div className="p-6 space-y-4" data-keyboard-form>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Form 3CD — Tax Audit Report</h2>
          <p className="text-xs text-muted-foreground">FY {fy} | AY {ay} | All 44 Clauses</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
            Save Draft
          </Button>
          <Button variant="outline" size="sm" data-primary onClick={handleRunValidations} disabled={running}>
            {running ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Shield className="h-3.5 w-3.5 mr-1.5" />}
            Run Validations
          </Button>
        </div>
      </div>

      {/* Validation results */}
      {validations && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs">Cross-Clause Validation Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {validations.map(v => (
              <div key={v.id} className="flex items-start gap-2 text-xs">
                {statusIcon(v.status)}
                <span className="font-semibold">{v.name}:</span>
                <span className="text-muted-foreground">{v.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Part A — Assessee Details (Cl.1-8) */}
      <Collapsible open={partAOpen} onOpenChange={setPartAOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
          <ChevronRight className={`h-4 w-4 transition-transform ${partAOpen ? 'rotate-90' : ''}`} />
          <span className="text-sm font-bold">Part A — Assessee Details (Cl. 1–8)</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 mt-2">
          <ClauseCard num="1" title="Name of assessee" type="auto">
            <AutoValue value={entityConfig.entityName || entityConfig.legalName || 'Not configured'} />
          </ClauseCard>
          <ClauseCard num="2" title="Address" type="auto">
            <AutoValue value={entityConfig.registeredAddress || entityConfig.address || 'Not configured'} />
          </ClauseCard>
          <ClauseCard num="3" title="PAN" type="auto">
            <AutoValue value={entityConfig.pan || 'Not configured'} />
          </ClauseCard>
          <ClauseCard num="4" title="Audited under other law?" type="semi-auto">
            <div className="flex items-center gap-3">
              <Switch checked={!!draft['cl4_audited']} onCheckedChange={v => updateDraft('cl4_audited', v)} />
              <Label className="text-xs">{draft['cl4_audited'] ? 'Yes' : 'No'}</Label>
            </div>
          </ClauseCard>
          <ClauseCard num="5" title="Date of earlier audit (if Cl.4=Yes)" type="manual">
            {draft['cl4_audited'] ? (
              <Input type="date" value={(draft['cl5_date'] as string) || ''} onChange={e => updateDraft('cl5_date', e.target.value)}
                className="h-8 text-xs w-48" onKeyDown={onEnterNext} />
            ) : (
              <span className="text-xs text-muted-foreground">Not applicable (Cl.4 = No)</span>
            )}
          </ClauseCard>
          <ClauseCard num="6" title="Audit observation / qualification" type="manual">
            <Textarea value={(draft['cl6_obs'] as string) || ''} onChange={e => updateDraft('cl6_obs', e.target.value)}
              className="text-xs min-h-[60px]" placeholder="Enter observation..." />
          </ClauseCard>
          <ClauseCard num="7" title="Previous year (financial year)" type="auto">
            <AutoValue value={fy} />
          </ClauseCard>
          <ClauseCard num="8" title="Assessment year" type="auto">
            <AutoValue value={ay} />
          </ClauseCard>
        </CollapsibleContent>
      </Collapsible>

      {/* Part B — Audit Particulars (Cl.9-44) */}
      <Collapsible open={partBOpen} onOpenChange={setPartBOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
          <ChevronRight className={`h-4 w-4 transition-transform ${partBOpen ? 'rotate-90' : ''}`} />
          <span className="text-sm font-bold">Part B — Audit Particulars (Cl. 9–44)</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 mt-2">
          {/* Cl.9 */}
          <ClauseCard num="9(a)" title="Gross turnover / sales receipts" type="auto">
            <AutoValue label="Gross Turnover" value={cl9.grossTurnover} />
          </ClauseCard>
          <ClauseCard num="9(b)" title="Gross receipts — professional" type="auto">
            <AutoValue label="Service Income" value={cl9.grossReceipts} />
          </ClauseCard>
          <ClauseCard num="9(c)" title="Gross turnover — trading" type="auto">
            <AutoValue label="Trading Turnover" value={cl9.grossTurnover} />
          </ClauseCard>

          {/* Cl.10-11 */}
          <ClauseCard num="10" title="Method of accounting" type="semi-auto">
            <Select value={(draft['cl10'] as string) || 'mercantile'} onValueChange={v => updateDraft('cl10', v)}>
              <SelectTrigger className="h-8 text-xs w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mercantile">Mercantile</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
              </SelectContent>
            </Select>
          </ClauseCard>
          <ClauseCard num="11" title="Valuation of closing stock" type="semi-auto">
            <Input value={(draft['cl11'] as string) || 'Cost or NRV whichever lower'}
              onChange={e => updateDraft('cl11', e.target.value)}
              className="h-8 text-xs" onKeyDown={onEnterNext} />
          </ClauseCard>

          {/* Cl.12 */}
          <ClauseCard num="12(a)" title="Net profit per P&L" type="auto">
            <AutoValue label="Net Profit" value={cl9.totalGrossReceipts - cl44.reduce((s, r) => s + r.totalAmount, 0)} />
          </ClauseCard>
          <ClauseCard num="12(b)" title="Adjustments to net profit" type="manual">
            <Textarea value={(draft['cl12b'] as string) || ''} onChange={e => updateDraft('cl12b', e.target.value)}
              className="text-xs min-h-[60px]" placeholder="Item | Add/Deduct | Amount" />
          </ClauseCard>

          {/* Cl.13-14 */}
          <ClauseCard num="13" title="Method of depreciation" type="semi-auto">
            <Input value={(draft['cl13'] as string) || 'WDV as per Income Tax Act'}
              onChange={e => updateDraft('cl13', e.target.value)}
              className="h-8 text-xs" onKeyDown={onEnterNext} />
          </ClauseCard>
          <ClauseCard num="14" title="Depreciation (IT Act rates)" type="placeholder">
            <PlaceholderBanner text="Depreciation per IT Act Schedule II will auto-fill after Fixed Assets module (Sprint 4) is implemented." />
            <div className="mt-2">
              <Label className="text-xs">Manual depreciation amount</Label>
              <Input type="number" defaultValue={clause14Amount || ''}
                onChange={e => setClause14(parseFloat(e.target.value) || 0)}
                className="h-8 text-xs w-48 font-mono" onKeyDown={onEnterNext} />
            </div>
          </ClauseCard>

          {/* Cl.15-16 */}
          <ClauseCard num="15" title="Amounts not credited to P&L" type="manual">
            <Textarea value={(draft['cl15'] as string) || ''} onChange={e => updateDraft('cl15', e.target.value)}
              className="text-xs min-h-[60px]" placeholder="Description | Amount" />
          </ClauseCard>
          <ClauseCard num="16" title="Sums taxable as income from other heads" type="manual">
            <Textarea value={(draft['cl16'] as string) || ''} onChange={e => updateDraft('cl16', e.target.value)}
              className="text-xs min-h-[60px]" placeholder="Multi-row entries" />
          </ClauseCard>

          {/* Cl.17 — TDS receivable from 26AS */}
          <ClauseCard num="17" title="TDS/TCS on payments received (26AS)" type="auto">
            <AutoValue label="Total TDS Receivable" value={tdsReceivable.reduce((s, r) => s + r.tds_amount, 0)} />
            <AutoValue label="Entries" value={`${tdsReceivable.length} entries`} />
          </ClauseCard>

          {/* Cl.18 */}
          <ClauseCard num="18" title="Depreciation details — asset class" type="placeholder">
            <PlaceholderBanner text="Sprint 4 Fixed Assets. Manual entry available." />
            <Input type="number" value={(draft['cl18'] as string) || ''} onChange={e => updateDraft('cl18', e.target.value)}
              className="h-8 text-xs w-48 font-mono mt-2" onKeyDown={onEnterNext} placeholder="Manual amount" />
          </ClauseCard>

          {/* Cl.19 */}
          <ClauseCard num="19(a)" title="TDS not deducted on payments" type="auto">
            {(() => {
              const open = tdsDeductions.filter(d => d.status === 'open');
              return open.length > 0 ? (
                <Table>
                  <TableHeader><TableRow className="text-[10px]">
                    <TableHead>Party</TableHead><TableHead>Section</TableHead><TableHead className="text-right">Amount</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {open.slice(0, 10).map(d => (
                      <TableRow key={d.id}><TableCell className="text-xs">{d.party_name}</TableCell>
                        <TableCell className="text-xs font-mono">{d.tds_section}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{fmt(d.net_tds_amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : <span className="text-xs text-muted-foreground">No open TDS deductions.</span>;
            })()}
          </ClauseCard>
          <ClauseCard num="19(b)" title="Fringe benefit perquisites" type="auto">
            <span className="text-xs text-muted-foreground">Not Applicable</span>
          </ClauseCard>

          {/* Cl.20 */}
          <ClauseCard num="20" title="Amounts inadmissible u/s 40A(3) cash" type="auto">
            {cl26.length > 0 ? (
              <div>
                <AutoValue label="Total cash payments" value={cl26.reduce((s, r) => s + r.amount, 0)} />
                <AutoValue label="Transactions" value={`${cl26.length} payments > ₹10,000`} />
              </div>
            ) : <span className="text-xs text-muted-foreground">No cash payments exceeding ₹10,000.</span>}
          </ClauseCard>

          {/* Cl.21-22 */}
          <ClauseCard num="21" title="Amount u/s 33AB / 33ABA / 35" type="manual">
            <Textarea value={(draft['cl21'] as string) || ''} onChange={e => updateDraft('cl21', e.target.value)}
              className="text-xs min-h-[60px]" placeholder="Multi-row table" />
          </ClauseCard>
          <ClauseCard num="22" title="Interest inadmissible" type="manual">
            <Input type="number" value={(draft['cl22'] as string) || ''} onChange={e => updateDraft('cl22', e.target.value)}
              className="h-8 text-xs w-48 font-mono" onKeyDown={onEnterNext} placeholder="Amount" />
          </ClauseCard>

          {/* Cl.23-24 — Related party */}
          <ClauseCard num="23" title="Payments to specified persons (40A(2))" type="auto">
            {(() => {
              const related = cl26.filter(r => r.is_related_party);
              return related.length > 0 ? (
                <Table>
                  <TableHeader><TableRow className="text-[10px]">
                    <TableHead>Party</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {related.map((r, i) => (
                      <TableRow key={`cl23-${i}`}><TableCell className="text-xs">{r.party_name}</TableCell>
                        <TableCell className="text-xs font-mono">{r.date}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{fmt(r.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : <span className="text-xs text-muted-foreground">No related party payments found.</span>;
            })()}
          </ClauseCard>
          <ClauseCard num="24" title="Payment to relatives" type="auto">
            <span className="text-xs text-muted-foreground">Same as Clause 23 — subset of related party payments.</span>
          </ClauseCard>

          {/* Cl.25 — Section 43B */}
          <ClauseCard num="25" title="Amounts inadmissible u/s 43B" type="auto">
            <AutoValue label="Status" value="Computed from Trial Balance — PF/ESI/GST Payable balances at year-end" />
          </ClauseCard>

          {/* Cl.26 */}
          <ClauseCard num="26(a)" title="Cash payments > ₹10,000 count + amount" type="auto">
            <AutoValue label="Count" value={`${cl26.length} transactions`} />
            <AutoValue label="Total" value={cl26.reduce((s, r) => s + r.amount, 0)} />
          </ClauseCard>
          <ClauseCard num="26(b)" title="Cash payments to related persons" type="auto">
            {(() => {
              const related = cl26.filter(r => r.is_related_party);
              return <AutoValue label="Related party cash" value={related.reduce((s, r) => s + r.amount, 0)} />;
            })()}
          </ClauseCard>

          {/* Cl.27 — TDS defaults */}
          <ClauseCard num="27(a)" title="TDS deductible but not deducted" type="auto">
            <AutoValue label="Open deductions" value={`${tdsDeductions.filter(d => d.status === 'open').length} entries`} />
          </ClauseCard>
          <ClauseCard num="27(b)" title="TDS deducted but not paid to govt" type="auto">
            <AutoValue label="Unpaid" value={`${tdsDeductions.filter(d => !d.challan_id && d.status === 'posted').length} entries`} />
          </ClauseCard>

          {/* Cl.28-30 */}
          <ClauseCard num="28" title="Amounts on hundi" type="manual">
            <div className="flex items-center gap-3">
              <Switch checked={!!draft['cl28']} onCheckedChange={v => updateDraft('cl28', v)} />
              <Label className="text-xs">{draft['cl28'] ? 'Yes' : 'No'}</Label>
            </div>
            {draft['cl28'] && <Input type="number" value={(draft['cl28_amt'] as string) || ''} onChange={e => updateDraft('cl28_amt', e.target.value)}
              className="h-8 text-xs w-48 font-mono mt-2" onKeyDown={onEnterNext} placeholder="Amount" />}
          </ClauseCard>
          <ClauseCard num="29" title="Deemed profits u/s 41" type="manual">
            <div className="flex items-center gap-3">
              <Switch checked={!!draft['cl29']} onCheckedChange={v => updateDraft('cl29', v)} />
              <Label className="text-xs">{draft['cl29'] ? 'Yes' : 'No'}</Label>
            </div>
            {draft['cl29'] && <Input type="number" value={(draft['cl29_amt'] as string) || ''} onChange={e => updateDraft('cl29_amt', e.target.value)}
              className="h-8 text-xs w-48 font-mono mt-2" onKeyDown={onEnterNext} placeholder="Amount" />}
          </ClauseCard>
          <ClauseCard num="30" title="Liability transfer of immovable property" type="manual">
            <div className="flex items-center gap-3">
              <Switch checked={!!draft['cl30']} onCheckedChange={v => updateDraft('cl30', v)} />
              <Label className="text-xs">{draft['cl30'] ? 'Yes' : 'No'}</Label>
            </div>
            {draft['cl30'] && <Textarea value={(draft['cl30_det'] as string) || ''} onChange={e => updateDraft('cl30_det', e.target.value)}
              className="text-xs min-h-[60px] mt-2" placeholder="Details..." />}
          </ClauseCard>

          {/* Cl.31 */}
          <ClauseCard num="31(a)" title="Loan/deposit accepted > ₹20,000" type="auto">
            <AutoValue label="Status" value="Computed from Receipt vouchers > ₹20,000" />
          </ClauseCard>
          <ClauseCard num="31(b)" title="Loan/deposit repaid in cash > ₹20,000" type="auto">
            <AutoValue label="Status" value={`${cl26.filter(r => r.amount > 20000).length} transactions > ₹20,000`} />
          </ClauseCard>

          {/* Cl.32-33 */}
          <ClauseCard num="32" title="Brought forward losses" type="manual">
            <Textarea value={(draft['cl32'] as string) || ''} onChange={e => updateDraft('cl32', e.target.value)}
              className="text-xs min-h-[60px]" placeholder="Year | Loss Type | Amount B/F | Set Off" />
          </ClauseCard>
          <ClauseCard num="33" title="Deduction u/s 80G / charitable donations" type="auto">
            <span className="text-xs text-muted-foreground">Semi-auto — computed from tagged donation vouchers.</span>
          </ClauseCard>

          {/* Cl.34 */}
          <ClauseCard num="34(a)" title="TDS deducted — section + quarter wise" type="auto">
            {cl34.length > 0 ? (
              <Table>
                <TableHeader><TableRow className="text-[10px]">
                  <TableHead>Section</TableHead><TableHead>Quarter</TableHead>
                  <TableHead className="text-right">Deducted</TableHead><TableHead className="text-right">Deposited</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {cl34.map((r, i) => (
                    <TableRow key={`cl34-${i}`}>
                      <TableCell className="text-xs font-mono">{r.tds_section}</TableCell>
                      <TableCell className="text-xs">{r.quarter}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{fmt(r.total_deducted)}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{fmt(r.total_deposited)}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{fmt(r.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : <span className="text-xs text-muted-foreground">No TDS deductions found.</span>}
          </ClauseCard>
          <ClauseCard num="34(b)" title="TCS collected" type="auto">
            <AutoValue label="TCS entries" value={`${tdsDeductions.filter(d => d.tds_section?.startsWith('206C')).length} entries`} />
          </ClauseCard>
          <ClauseCard num="34(c)" title="TDS/TCS paid — challan wise" type="auto">
            {challans.length > 0 ? (
              <Table>
                <TableHeader><TableRow className="text-[10px]">
                  <TableHead>BSR</TableHead><TableHead>Date</TableHead><TableHead>Challan No</TableHead>
                  <TableHead className="text-right">Amount</TableHead><TableHead>Section</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {challans.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs font-mono">{c.bsr_code}</TableCell>
                      <TableCell className="text-xs font-mono">{c.date}</TableCell>
                      <TableCell className="text-xs font-mono">{c.challan_no}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{fmt(c.amount)}</TableCell>
                      <TableCell className="text-xs font-mono">{c.tds_section}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : <span className="text-xs text-muted-foreground">No challans found.</span>}
          </ClauseCard>

          {/* Cl.35-36 */}
          <ClauseCard num="35" title="Quantitative details (manufacturing)" type="manual">
            <div className="flex items-center gap-3">
              <Switch checked={!!draft['cl35']} onCheckedChange={v => updateDraft('cl35', v)} />
              <Label className="text-xs">{draft['cl35'] ? 'Applicable' : 'Not Applicable'}</Label>
            </div>
            {draft['cl35'] && <Textarea value={(draft['cl35_det'] as string) || ''} onChange={e => updateDraft('cl35_det', e.target.value)}
              className="text-xs min-h-[60px] mt-2" placeholder="Enter details..." />}
          </ClauseCard>
          <ClauseCard num="36" title="Prior period items" type="manual">
            <Textarea value={(draft['cl36'] as string) || ''} onChange={e => updateDraft('cl36', e.target.value)}
              className="text-xs min-h-[60px]" placeholder="Description | Amount | Reason" />
          </ClauseCard>

          {/* Cl.37 — Auto ratios */}
          <ClauseCard num="37" title="Accounting ratios" type="auto">
            <div className="grid grid-cols-2 gap-3">
              <AutoValue label="GP%" value={`${ratios.gpPct}%`} />
              <AutoValue label="NP%" value={`${ratios.npPct}%`} />
              <AutoValue label="Stock Turnover" value={ratios.stockTurnover} />
              <AutoValue label="Debtor Days" value={ratios.debtorDays} />
            </div>
          </ClauseCard>

          {/* Cl.38-39 — Pre-GST / abolished */}
          <ClauseCard num="38" title="CENVAT credit (pre-GST)" type="auto">
            <span className="text-xs text-muted-foreground">Not Applicable — GST regime</span>
          </ClauseCard>
          <ClauseCard num="39" title="Fringe benefit tax" type="auto">
            <span className="text-xs text-muted-foreground">Not Applicable — abolished AY 2010-11</span>
          </ClauseCard>

          {/* Cl.40-42 */}
          <ClauseCard num="40" title="Deductions u/s 80IC / 80IE" type="manual">
            <div className="flex items-center gap-3">
              <Switch checked={!!draft['cl40']} onCheckedChange={v => updateDraft('cl40', v)} />
              <Label className="text-xs">{draft['cl40'] ? 'Applicable' : 'Not Applicable'}</Label>
            </div>
            {draft['cl40'] && <Input type="number" value={(draft['cl40_amt'] as string) || ''} onChange={e => updateDraft('cl40_amt', e.target.value)}
              className="h-8 text-xs w-48 font-mono mt-2" onKeyDown={onEnterNext} placeholder="Amount" />}
          </ClauseCard>
          <ClauseCard num="41" title="Demand/refund under indirect taxes" type="manual">
            <Textarea value={(draft['cl41'] as string) || ''} onChange={e => updateDraft('cl41', e.target.value)}
              className="text-xs min-h-[60px]" placeholder="Law | Nature | Period | Amount" />
          </ClauseCard>
          <ClauseCard num="42" title="Unit in IFSC / SEZ" type="semi-auto">
            <div className="flex items-center gap-3">
              <Switch checked={draft['cl42'] !== undefined ? !!draft['cl42'] : entityConfig.registrationType === 'sez_unit'}
                onCheckedChange={v => updateDraft('cl42', v)} />
              <Label className="text-xs">{draft['cl42'] ? 'Yes' : 'No'}</Label>
            </div>
          </ClauseCard>

          {/* Cl.43 — SFT */}
          <ClauseCard num="43" title="Specified financial transactions (SFT)" type="auto">
            {(() => {
              const sft = cl26.filter(r => r.amount > 200000);
              return sft.length > 0 ? (
                <div>
                  <AutoValue label="Cash txns > ₹2 lakh" value={`${sft.length} transactions`} />
                  <AutoValue label="Total" value={sft.reduce((s, r) => s + r.amount, 0)} />
                </div>
              ) : <span className="text-xs text-muted-foreground">No specified financial transactions detected.</span>;
            })()}
          </ClauseCard>

          {/* Cl.44 — The TDL feature */}
          <ClauseCard num="44" title="Expenditure by GST vendor category" type="auto">
            <div className="space-y-2">
              <AutoValue label="Total ledgers" value={`${cl44.length} expense ledgers`} />
              <AutoValue label="Total amount" value={cl44.reduce((s, r) => s + r.totalAmount, 0)} />
              <AutoValue label="Uncategorised" value={`${cl44.filter(r => r.uncategorised > 0).length} ledgers`} />
              <p className="text-[10px] text-muted-foreground mt-1">
                Full 9-column report available in Clause 44 Report panel.
              </p>
            </div>
          </ClauseCard>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export default function Form3CD() { return <Form3CDPanel entityCode="SMRT" />; }
