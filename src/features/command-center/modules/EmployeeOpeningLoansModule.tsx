/**
 * EmployeeOpeningLoansModule.tsx — 3-tab opening entry for employee loans, advances and director borrowings
 * Tab 1: Loan Receivable (employee loans)
 * Tab 2: Salary / Expense Advance
 * Tab 3: Loan Payable (Director / Promoter)
 * [JWT] All localStorage keys are entity-scoped via useOpeningBalances hook.
 */
import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { Plus, Trash2, Lock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';
import { useOpeningBalances } from '@/hooks/useOpeningBalances';
import { onEnterNext, toIndianFormat, amountInputProps } from '@/lib/keyboard';
import type { OpeningLoanEntry } from '@/types/opening-balance';
import type { Employee } from '@/types/employee';
import { EMPLOYEES_KEY } from '@/types/employee';
import type { LoanType } from '@/types/payroll-masters';
import { LOAN_TYPES_KEY } from '@/types/payroll-masters';
import { loadEntities } from '@/data/mock-entities';
import { L3_FINANCIAL_GROUPS } from '@/data/finframe-seed-data';

interface LedgerDef {
  id: string;
  ledgerType: string;
  name: string;
  parentGroupCode: string;
}

const newId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export function EmployeeOpeningLoansModule() {
  const { entityCode } = useEntityCode();
  if (!entityCode) {
    return <SelectCompanyGate title="Select a company to enter employee opening loans" />;
  }
  return <EmployeeOpeningLoansInner entityCode={entityCode} />;
}

function EmployeeOpeningLoansInner({ entityCode }: { entityCode: string }) {
  const ob = useOpeningBalances(entityCode);
  const [tab, setTab] = useState<'recv' | 'adv' | 'pay'>('recv');

  const entity = useMemo(() => {
    const all = loadEntities();
    return all.find(e => e.shortCode === entityCode) || all[0];
  }, [entityCode]);

  const employees = useMemo<Employee[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/employees
      const raw = localStorage.getItem(EMPLOYEES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, []);

  const loanTypes = useMemo<LoanType[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/loan-types
      const raw = localStorage.getItem(LOAN_TYPES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, []);

  // Entity ledgers for GL selection
  const entityLedgers = useMemo<LedgerDef[]>(() => {
    if (!entity) return [];
    try {
      // [INTENTIONAL] Group-level master — entityShortCode per row controls scope
      // [JWT] GET /api/accounting/ledger-definitions
      const raw = localStorage.getItem('erp_group_ledger_definitions');
      const all: (LedgerDef & { entityShortCode: string | null })[] = raw ? JSON.parse(raw) : [];
      return all.filter(d => d.entityShortCode === entityCode || d.entityShortCode === null);
    } catch { return []; }
  }, [entity, entityCode]);

  const receivableLedgers = entityLedgers.filter(d => ['LTLA', 'STLA', 'ADVRC', 'EMPL'].includes(d.parentGroupCode));
  const payableLedgers = entityLedgers.filter(d => ['LTBOR', 'STBOR'].includes(d.parentGroupCode));

  const recvEntries = ob.loans.filter(l => l.entry_type === 'loan_receivable');
  const advEntries = ob.loans.filter(l => l.entry_type === 'advance_receivable');
  const payEntries = ob.loans.filter(l => l.entry_type === 'loan_payable');

  const updateLoan = <K extends keyof OpeningLoanEntry>(id: string, field: K, value: OpeningLoanEntry[K]) => {
    const l = ob.loans.find(x => x.id === id);
    if (!l) return;
    const next = { ...l, [field]: value };
    if (field === 'original_amount' || field === 'recovered_amount') {
      next.outstanding_amount = (next.original_amount || 0) - (next.recovered_amount || 0);
    }
    ob.upsertLoan(next);
  };

  const addRecv = () => ob.upsertLoan({
    id: newId('opnloan'), entity_id: entityCode, entry_type: 'loan_receivable',
    person_name: '', disbursement_date: new Date().toISOString().slice(0, 10),
    original_amount: 0, recovered_amount: 0, outstanding_amount: 0,
    interest_rate: 0, emi_amount: 0, remaining_tenure_months: 0,
    ledger_id: '', status: 'draft', created_at: new Date().toISOString(),
  });
  const addAdv = () => ob.upsertLoan({
    id: newId('opnadv'), entity_id: entityCode, entry_type: 'advance_receivable',
    person_name: '', disbursement_date: new Date().toISOString().slice(0, 10),
    original_amount: 0, recovered_amount: 0, outstanding_amount: 0,
    interest_rate: 0, emi_amount: 0, remaining_tenure_months: 0,
    ledger_id: '', status: 'draft', created_at: new Date().toISOString(),
  });
  const addPay = () => ob.upsertLoan({
    id: newId('opnpay'), entity_id: entityCode, entry_type: 'loan_payable',
    person_name: '', disbursement_date: new Date().toISOString().slice(0, 10),
    original_amount: 0, recovered_amount: 0, outstanding_amount: 0,
    interest_rate: 0, emi_amount: 0, remaining_tenure_months: 0,
    ledger_id: '', status: 'draft', created_at: new Date().toISOString(),
  });

  const handlePost = () => {
    const draft = ob.loans.filter(l => l.status === 'draft');
    if (draft.length === 0) {
      toast.warning('Nothing to post');
      return;
    }
    const invalid = draft.find(l => !l.ledger_id || (l.entry_type !== 'loan_payable' && !l.employee_id) || l.outstanding_amount <= 0);
    if (invalid) {
      toast.error('Each row needs Employee/Person, GL Ledger and Outstanding > 0');
      return;
    }
    ob.postLoans(draft);
    toast.success(`Posted ${draft.length} opening loan entries`);
  };

  const isPosted = ob.status.employee_loans_posted;
  const totalsByTab = {
    recv: recvEntries.reduce((s, l) => s + l.outstanding_amount, 0),
    adv: advEntries.reduce((s, l) => s + l.outstanding_amount, 0),
    pay: payEntries.reduce((s, l) => s + l.outstanding_amount, 0),
  };

  return (
    <div data-keyboard-form className="space-y-4 animate-fade-in">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 -mx-6 -mt-6 px-6 py-3 mb-4 backdrop-blur-xl border-b border-border/50 bg-background/80">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Loans Receivable</p>
              <p className="font-mono text-sm font-semibold text-success">₹ {toIndianFormat(totalsByTab.recv)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Advances</p>
              <p className="font-mono text-sm font-semibold text-success">₹ {toIndianFormat(totalsByTab.adv)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Loans Payable</p>
              <p className="font-mono text-sm font-semibold text-primary">₹ {toIndianFormat(totalsByTab.pay)}</p>
            </div>
          </div>
          <Button data-primary onClick={handlePost} disabled={isPosted}
            className={!isPosted ? 'bg-success hover:bg-success/90 text-success-foreground' : ''}>
            {isPosted ? <><Lock className="h-4 w-4 mr-2" /> Posted</>
              : <><CheckCircle2 className="h-4 w-4 mr-2" /> Post Employee Loans</>}
          </Button>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Employee Opening Loans</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Entity: <span className="font-mono text-foreground">{entityCode}</span> · {entity?.name}
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'recv' | 'adv' | 'pay')}>
        <TabsList>
          <TabsTrigger value="recv">Loan Receivable</TabsTrigger>
          <TabsTrigger value="adv">Salary / Expense Advance</TabsTrigger>
          <TabsTrigger value="pay">Loan Payable (Director)</TabsTrigger>
        </TabsList>

        <TabsContent value="recv">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm">Employee Loan Receivable Openings</CardTitle>
              <Button size="sm" onClick={addRecv}><Plus className="h-4 w-4 mr-1" /> Add Employee Loan</Button>
            </CardHeader>
            <CardContent>
              {recvEntries.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No entries yet — click "Add Employee Loan".</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Loan Type</TableHead>
                      <TableHead>Disb Date</TableHead>
                      <TableHead className="text-right">Original</TableHead>
                      <TableHead className="text-right">Recovered</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead className="text-right">Rate %</TableHead>
                      <TableHead className="text-right">EMI</TableHead>
                      <TableHead>Next EMI</TableHead>
                      <TableHead>Tenure</TableHead>
                      <TableHead>GL Ledger</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recvEntries.map(l => (
                      <TableRow key={l.id}>
                        <TableCell>
                          <Select value={l.employee_id || ''} onValueChange={(v) => {
                            const emp = employees.find(e => e.id === v);
                            if (emp) {
                              ob.upsertLoan({ ...l, employee_id: v, person_name: emp.displayName, person_code: emp.empCode });
                            }
                          }}>
                            <SelectTrigger className="h-8 w-44"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.empCode} — {e.displayName}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={l.loan_type_id || ''} onValueChange={(v) => {
                            const t = loanTypes.find(x => x.id === v);
                            if (t) ob.upsertLoan({ ...l, loan_type_id: v, loan_type_name: t.name });
                          }}>
                            <SelectTrigger className="h-8 w-36"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {loanTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><SmartDateInput value={l.disbursement_date} onChange={(v) => updateLoan(l.id, 'disbursement_date', v)} className="w-32" /></TableCell>
                        <TableCell><Input {...amountInputProps} className="h-8 w-28 text-right font-mono" defaultValue={l.original_amount || ''} onKeyDown={onEnterNext} onBlur={(e) => updateLoan(l.id, 'original_amount', parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell><Input {...amountInputProps} className="h-8 w-28 text-right font-mono" defaultValue={l.recovered_amount || ''} onKeyDown={onEnterNext} onBlur={(e) => updateLoan(l.id, 'recovered_amount', parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell className="text-right font-mono font-semibold">₹ {toIndianFormat(l.outstanding_amount)}</TableCell>
                        <TableCell><Input type="number" className="h-8 w-20 text-right font-mono" defaultValue={l.interest_rate || ''} onKeyDown={onEnterNext} onBlur={(e) => updateLoan(l.id, 'interest_rate', parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell><Input {...amountInputProps} className="h-8 w-24 text-right font-mono" defaultValue={l.emi_amount || ''} onKeyDown={onEnterNext} onBlur={(e) => updateLoan(l.id, 'emi_amount', parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell><SmartDateInput value={l.next_emi_date || ''} onChange={(v) => updateLoan(l.id, 'next_emi_date', v)} className="w-32" /></TableCell>
                        <TableCell><Input type="number" className="h-8 w-16 text-right font-mono" defaultValue={l.remaining_tenure_months || ''} onBlur={(e) => updateLoan(l.id, 'remaining_tenure_months', parseInt(e.target.value) || 0)} /></TableCell>
                        <TableCell>
                          <Select value={l.ledger_id} onValueChange={(v) => updateLoan(l.id, 'ledger_id', v)}>
                            <SelectTrigger className="h-8 w-44"><SelectValue placeholder="Select GL" /></SelectTrigger>
                            <SelectContent>
                              {receivableLedgers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => ob.removeLoan(l.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adv">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm">Salary / Expense Advance Openings</CardTitle>
              <Button size="sm" onClick={addAdv}><Plus className="h-4 w-4 mr-1" /> Add Advance</Button>
            </CardHeader>
            <CardContent>
              {advEntries.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No entries yet — click "Add Advance".</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Advance Date</TableHead>
                      <TableHead className="text-right">Original</TableHead>
                      <TableHead className="text-right">Recovered</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>GL Ledger</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {advEntries.map(l => (
                      <TableRow key={l.id}>
                        <TableCell>
                          <Select value={l.employee_id || ''} onValueChange={(v) => {
                            const emp = employees.find(e => e.id === v);
                            if (emp) ob.upsertLoan({ ...l, employee_id: v, person_name: emp.displayName, person_code: emp.empCode });
                          }}>
                            <SelectTrigger className="h-8 w-44"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.empCode} — {e.displayName}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><SmartDateInput value={l.disbursement_date} onChange={(v) => updateLoan(l.id, 'disbursement_date', v)} className="w-32" /></TableCell>
                        <TableCell><Input {...amountInputProps} className="h-8 w-28 text-right font-mono" defaultValue={l.original_amount || ''} onKeyDown={onEnterNext} onBlur={(e) => updateLoan(l.id, 'original_amount', parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell><Input {...amountInputProps} className="h-8 w-28 text-right font-mono" defaultValue={l.recovered_amount || ''} onKeyDown={onEnterNext} onBlur={(e) => updateLoan(l.id, 'recovered_amount', parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell className="text-right font-mono font-semibold">₹ {toIndianFormat(l.outstanding_amount)}</TableCell>
                        <TableCell><Input className="h-8" defaultValue={l.loan_type_name || ''} placeholder="Purpose" onKeyDown={onEnterNext} onBlur={(e) => updateLoan(l.id, 'loan_type_name', e.target.value)} /></TableCell>
                        <TableCell>
                          <Select value={l.ledger_id} onValueChange={(v) => updateLoan(l.id, 'ledger_id', v)}>
                            <SelectTrigger className="h-8 w-44"><SelectValue placeholder="Select GL" /></SelectTrigger>
                            <SelectContent>
                              {receivableLedgers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => ob.removeLoan(l.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pay">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm">Loan Payable — Director / Promoter Openings</CardTitle>
              <Button size="sm" onClick={addPay}><Plus className="h-4 w-4 mr-1" /> Add Loan Payable</Button>
            </CardHeader>
            <CardContent>
              {payEntries.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No entries yet — click "Add Loan Payable".</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Person Name</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Rate %</TableHead>
                      <TableHead>Repayment Terms</TableHead>
                      <TableHead>GL Ledger</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payEntries.map(l => (
                      <TableRow key={l.id}>
                        <TableCell><Input className="h-8 w-44" defaultValue={l.person_name} onKeyDown={onEnterNext} onBlur={(e) => updateLoan(l.id, 'person_name', e.target.value)} /></TableCell>
                        <TableCell><Input {...amountInputProps} className="h-8 w-32 text-right font-mono" defaultValue={l.original_amount || ''} onKeyDown={onEnterNext} onBlur={(e) => {
                          const v = parseFloat(e.target.value) || 0;
                          ob.upsertLoan({ ...l, original_amount: v, outstanding_amount: v });
                        }} /></TableCell>
                        <TableCell><SmartDateInput value={l.disbursement_date} onChange={(v) => updateLoan(l.id, 'disbursement_date', v)} className="w-32" /></TableCell>
                        <TableCell><Input type="number" className="h-8 w-20 text-right font-mono" defaultValue={l.interest_rate || ''} onKeyDown={onEnterNext} onBlur={(e) => updateLoan(l.id, 'interest_rate', parseFloat(e.target.value) || 0)} /></TableCell>
                        <TableCell><Input className="h-8 w-44" defaultValue={l.loan_type_name || ''} placeholder="Repayment terms" onKeyDown={onEnterNext} onBlur={(e) => updateLoan(l.id, 'loan_type_name', e.target.value)} /></TableCell>
                        <TableCell>
                          <Select value={l.ledger_id} onValueChange={(v) => updateLoan(l.id, 'ledger_id', v)}>
                            <SelectTrigger className="h-8 w-44"><SelectValue placeholder="Select GL" /></SelectTrigger>
                            <SelectContent>
                              {payableLedgers.length === 0 && <SelectItem value="_none" disabled>No borrowing ledgers</SelectItem>}
                              {payableLedgers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => ob.removeLoan(l.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
