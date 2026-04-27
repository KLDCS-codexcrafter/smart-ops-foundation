/**
 * OpeningLedgerBalanceModule.tsx — Opening ledger balances + bill-by-bill party openings
 * Tab 1: All Ledger Balances (per-ledger Dr/Cr entry, grouped by L2 FinFrame category)
 * Tab 2: Party Bills (bill-by-bill bill entry for party ledgers)
 * [JWT] All localStorage keys are entity-scoped via useOpeningBalances hook.
 */
import { useMemo, useState, useEffect, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Plus, Trash2, Lock, CheckCircle2, RefreshCw, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';
import { useOpeningBalances } from '@/hooks/useOpeningBalances';
import { onEnterNext, toIndianFormat, amountInputProps } from '@/lib/keyboard';
import type { OpeningBillEntry } from '@/types/opening-balance';
import { L3_FINANCIAL_GROUPS, L2_PARENT_GROUPS, L4_INDUSTRY_PACKS } from '@/data/finframe-seed-data';
import { loadEntities } from '@/data/mock-entities';
import { runEntitySetup, type SetupOptions } from '@/services/entity-setup-service';

interface EntityLedgerInstance {
  id: string;
  ledgerDefinitionId: string;
  entityId: string;
  entityShortCode: string;
  openingBalance: number;
  openingBalanceType: 'Dr' | 'Cr';
  displayCode: string;
}
interface LedgerDef {
  id: string;
  ledgerType: string;
  name: string;
  parentGroupCode: string;
  parentGroupName: string;
}

const _PARTY_GROUPS = ['TREC', 'TPAY', 'STLA', 'LTLA', 'ADVRC'];
void _PARTY_GROUPS;

export function OpeningLedgerBalanceModule() {
  const { entityCode } = useEntityCode();
  if (!entityCode) {
    return <SelectCompanyGate title="Select a company to enter opening ledger balances" />;
  }
  return <OpeningLedgerBalanceInner entityCode={entityCode} />;
}

function OpeningLedgerBalanceInner({ entityCode }: { entityCode: string }) {
  const ob = useOpeningBalances(entityCode);

  const [tab, setTab] = useState<'ledgers' | 'bills'>('ledgers');
  const [filterLedgerId, setFilterLedgerId] = useState<string>('');
  const [refreshTick, _setRefreshTick] = useState(0);

  // Resolve entity record
  const entity = useMemo(() => {
    const all = loadEntities();
    return all.find(e => e.shortCode === entityCode) || all[0];
  }, [entityCode]);

  // Load ledger definitions (group-scoped) and entity instances
  const allDefs = useMemo<LedgerDef[]>(() => {
    try {
      // [INTENTIONAL] Group-level master — entityShortCode per row controls scope
      // [JWT] GET /api/accounting/ledger-definitions
      const raw = localStorage.getItem('erp_group_ledger_definitions');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, []);

  const [instances, setInstances] = useState<EntityLedgerInstance[]>(() => {
    if (!entity) return [];
    try {
      // [JWT] GET /api/ledger/instances/:entityId
      const raw = localStorage.getItem(`erp_entity_${entity.id}_ledger_instances`);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  useEffect(() => {
    if (!entity) return;
    try {
      // [JWT] GET /api/ledger/instances/:entityId
      const raw = localStorage.getItem(`erp_entity_${entity.id}_ledger_instances`);
      setInstances(raw ? JSON.parse(raw) : []);
    } catch { setInstances([]); }
  }, [entity, refreshTick]);

  // Build ledger rows joined with definitions
  const ledgerRows = useMemo(() => {
    return instances.map(inst => {
      const def = allDefs.find(d => d.id === inst.ledgerDefinitionId);
      return def ? { inst, def } : null;
    }).filter(Boolean) as { inst: EntityLedgerInstance; def: LedgerDef }[];
  }, [instances, allDefs]);

  // Group by L2 category
  const grouped = useMemo(() => {
    const map = new Map<string, { l2Name: string; rows: typeof ledgerRows }>();
    ledgerRows.forEach(r => {
      const l3 = L3_FINANCIAL_GROUPS.find(g => g.code === r.def.parentGroupCode);
      const l2Code = l3?.l2Code || 'OTHER';
      const l2 = L2_PARENT_GROUPS.find(p => p.code === l2Code);
      const l2Name = l2?.name || 'Other';
      const cur = map.get(l2Code) || { l2Name, rows: [] };
      cur.rows.push(r);
      map.set(l2Code, cur);
    });
    return Array.from(map.entries()).map(([l2Code, v]) => ({ l2Code, l2Name: v.l2Name, rows: v.rows }));
  }, [ledgerRows]);

  // Sticky balance totals from bills
  const totals = useMemo(() => {
    const dr = ob.bills.filter(b => b.dr_cr === 'Dr').reduce((s, b) => s + b.amount, 0);
    const cr = ob.bills.filter(b => b.dr_cr === 'Cr').reduce((s, b) => s + b.amount, 0);
    return { dr, cr, diff: dr - cr };
  }, [ob.bills]);

  const isBalanced = Math.abs(totals.diff) < 0.01;
  const isPosted = ob.status.party_bills_posted;

  // Update ledger Dr/Cr — also creates an OB-${ledgerCode} bill row
  const updateLedger = (instId: string, drVal: number, crVal: number, _note: string) => {
    if (!entity) return;
    const next = instances.map(i => i.id === instId
      ? { ...i, openingBalance: drVal > 0 ? drVal : crVal, openingBalanceType: drVal > 0 ? 'Dr' as const : 'Cr' as const }
      : i);
    setInstances(next);
    // [JWT] PATCH /api/ledger/instances/:entityId
    localStorage.setItem(`erp_entity_${entity.id}_ledger_instances`, JSON.stringify(next));

    const inst = next.find(i => i.id === instId);
    const def = allDefs.find(d => d.id === inst?.ledgerDefinitionId);
    if (!inst || !def) return;
    const billNo = `OB-${inst.displayCode || def.id.slice(-6)}`;
    const amount = drVal > 0 ? drVal : crVal;
    const dr_cr: 'Dr' | 'Cr' = drVal > 0 ? 'Dr' : 'Cr';
    const l3 = L3_FINANCIAL_GROUPS.find(g => g.code === def.parentGroupCode);
    const party_type: 'debtor' | 'creditor' = (l3?.nature === 'Cr') ? 'creditor' : 'debtor';
    const existing = ob.bills.find(b => b.bill_no === billNo);
    if (amount === 0) {
      if (existing) ob.removeBill(existing.id);
      return;
    }
    const bill: OpeningBillEntry = {
      id: existing?.id || `obbill-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      entity_id: entityCode,
      ledger_id: def.id,
      ledger_name: def.name,
      party_type,
      bill_type: 'invoice',
      bill_no: billNo,
      bill_date: new Date().toISOString().slice(0, 10),
      dr_cr, amount,
      tds_applicable: false,
      status: 'draft',
      created_at: existing?.created_at || new Date().toISOString(),
    };
    ob.upsertBill(bill);
  };

  const handlePost = () => {
    if (!isBalanced) {
      toast.error('Cannot post — Dr and Cr totals must match');
      return;
    }
    const draft = ob.bills.filter(b => b.status === 'draft');
    if (draft.length === 0) {
      toast.warning('Nothing to post — no draft entries');
      return;
    }
    ob.postBills(draft);
    toast.success(`Posted ${draft.length} opening entries`);
  };

  // ── Tab 2: Party Bills ────────────────────────────────────────
  const partyLedgers = useMemo(() => {
    return ledgerRows.filter(r => {
      const l3 = L3_FINANCIAL_GROUPS.find(g => g.code === r.def.parentGroupCode);
      return l3?.isParty;
    });
  }, [ledgerRows]);

  const tdsSections = useMemo(() => {
    try {
      // [JWT] GET /api/accounting/tds-sections
      const raw = localStorage.getItem('erp_tds_sections');
      return raw ? JSON.parse(raw) as { code: string; section: string; description: string }[] : [];
    } catch { return []; }
  }, []);

  const filteredBills = filterLedgerId
    ? ob.bills.filter(b => b.ledger_id === filterLedgerId && !b.bill_no.startsWith('OB-'))
    : ob.bills.filter(b => !b.bill_no.startsWith('OB-'));

  const ledgerBalanceForFilter = useMemo(() => {
    if (!filterLedgerId) return 0;
    const inst = ledgerRows.find(r => r.def.id === filterLedgerId)?.inst;
    return inst?.openingBalance || 0;
  }, [filterLedgerId, ledgerRows]);

  const allocatedForFilter = filteredBills.reduce((s, b) => s + b.amount, 0);
  const unallocated = ledgerBalanceForFilter - allocatedForFilter;

  const addBill = () => {
    if (!filterLedgerId) {
      toast.error('Select a party ledger first');
      return;
    }
    const lr = ledgerRows.find(r => r.def.id === filterLedgerId);
    if (!lr) return;
    const l3 = L3_FINANCIAL_GROUPS.find(g => g.code === lr.def.parentGroupCode);
    const party_type: 'debtor' | 'creditor' = (l3?.nature === 'Cr') ? 'creditor' : 'debtor';
    ob.upsertBill({
      id: `obbill-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      entity_id: entityCode,
      ledger_id: lr.def.id,
      ledger_name: lr.def.name,
      party_type,
      bill_type: 'invoice',
      bill_no: '',
      bill_date: new Date().toISOString().slice(0, 10),
      dr_cr: party_type === 'debtor' ? 'Dr' : 'Cr',
      amount: 0,
      tds_applicable: false,
      status: 'draft',
      created_at: new Date().toISOString(),
    });
  };

  const updateBill = <K extends keyof OpeningBillEntry>(id: string, field: K, value: OpeningBillEntry[K]) => {
    const b = ob.bills.find(x => x.id === id);
    if (!b) return;
    const next = { ...b, [field]: value };
    if (field === 'credit_days' && b.bill_date) {
      const days = Number(value) || 0;
      const due = new Date(b.bill_date);
      due.setDate(due.getDate() + days);
      next.due_date = due.toISOString().slice(0, 10);
    }
    ob.upsertBill(next);
  };

  return (
    <div data-keyboard-form className="space-y-4 animate-fade-in">
      {/* STICKY BALANCE BAR */}
      <div className="sticky top-0 z-20 -mx-6 -mt-6 px-6 py-3 mb-4 backdrop-blur-xl border-b border-border/50 bg-background/80">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Dr</p>
              <p className="font-mono text-lg font-semibold text-success">₹ {toIndianFormat(totals.dr)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Cr</p>
              <p className="font-mono text-lg font-semibold text-primary">₹ {toIndianFormat(totals.cr)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Difference</p>
              <p className={`font-mono text-lg font-semibold ${isBalanced ? 'text-success' : 'text-destructive'}`}>
                ₹ {toIndianFormat(Math.abs(totals.diff))} {totals.diff !== 0 && (totals.diff > 0 ? 'Dr' : 'Cr')}
              </p>
            </div>
          </div>
          <Button
            data-primary
            onClick={handlePost}
            disabled={!isBalanced || isPosted}
            className={isBalanced && !isPosted ? 'bg-success hover:bg-success/90 text-success-foreground' : ''}
          >
            {isPosted ? <><Lock className="h-4 w-4 mr-2" /> Posted</>
              : isBalanced ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Post Opening Balances</>
              : `Unbalanced (₹ ${toIndianFormat(Math.abs(totals.diff))})`}
          </Button>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Opening Ledger Balances</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Entity: <span className="font-mono text-foreground">{entityCode}</span> · {entity?.name}
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'ledgers' | 'bills')}>
        <TabsList>
          <TabsTrigger value="ledgers">All Ledger Balances</TabsTrigger>
          <TabsTrigger value="bills">Party Bills (Bill-by-Bill)</TabsTrigger>
        </TabsList>

        {/* TAB 1 — Ledger entry */}
        <TabsContent value="ledgers" className="space-y-4">
          {grouped.length === 0 && (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              No ledger instances exist for {entityCode}. Create ledgers first via Ledger Master.
            </CardContent></Card>
          )}
          {grouped.map(g => (
            <Card key={g.l2Code}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{g.l2Code}</span>
                  {g.l2Name}
                  <Badge variant="outline" className="ml-auto">{g.rows.length} ledgers</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ledger Name</TableHead>
                      <TableHead>Account Group</TableHead>
                      <TableHead className="text-right">Dr Amount</TableHead>
                      <TableHead className="text-right">Cr Amount</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead className="w-32">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.rows.map(({ inst, def }) => {
                      const l3 = L3_FINANCIAL_GROUPS.find(x => x.code === def.parentGroupCode);
                      const isParty = !!l3?.isParty;
                      const drVal = inst.openingBalanceType === 'Dr' ? inst.openingBalance : 0;
                      const crVal = inst.openingBalanceType === 'Cr' ? inst.openingBalance : 0;
                      const noteBill = ob.bills.find(b => b.bill_no === `OB-${inst.displayCode || def.id.slice(-6)}`);
                      return (
                        <TableRow key={inst.id}>
                          <TableCell className="font-medium">{def.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            <span className="font-mono">{def.parentGroupCode}</span> · {def.parentGroupName}
                          </TableCell>
                          <TableCell>
                            <Input
                              {...amountInputProps}
                              className="text-right font-mono h-8"
                              defaultValue={drVal || ''}
                              onKeyDown={onEnterNext}
                              onBlur={(e) => {
                                const v = parseFloat(e.target.value) || 0;
                                if (v !== drVal) updateLedger(inst.id, v, 0, '');
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              {...amountInputProps}
                              className="text-right font-mono h-8"
                              defaultValue={crVal || ''}
                              onKeyDown={onEnterNext}
                              onBlur={(e) => {
                                const v = parseFloat(e.target.value) || 0;
                                if (v !== crVal) updateLedger(inst.id, 0, v, '');
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8"
                              defaultValue={noteBill ? `${noteBill.bill_type}` : ''}
                              onKeyDown={onEnterNext}
                              placeholder="Note"
                            />
                          </TableCell>
                          <TableCell>
                            {isParty && (
                              <Button size="sm" variant="outline" className="h-8"
                                onClick={() => { setFilterLedgerId(def.id); setTab('bills'); }}>
                                Add Bills <ArrowRight className="h-3 w-3 ml-1" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* TAB 2 — Bill-by-bill */}
        <TabsContent value="bills" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Party Ledger:</span>
                  <Select value={filterLedgerId} onValueChange={setFilterLedgerId}>
                    <SelectTrigger className="w-80"><SelectValue placeholder="Select party ledger" /></SelectTrigger>
                    <SelectContent>
                      {partyLedgers.map(r => (
                        <SelectItem key={r.def.id} value={r.def.id}>{r.def.name} ({r.def.parentGroupCode})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={addBill} disabled={!filterLedgerId} size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Add Bill
                </Button>
              </div>
              {filterLedgerId && (
                <div className="flex gap-6 text-xs pt-2">
                  <span>Ledger Balance: <span className="font-mono font-semibold">₹ {toIndianFormat(ledgerBalanceForFilter)}</span></span>
                  <span>Allocated: <span className="font-mono font-semibold">₹ {toIndianFormat(allocatedForFilter)}</span></span>
                  <span className={Math.abs(unallocated) > 0.01 ? 'text-warning font-semibold' : 'text-success'}>
                    Unallocated: <span className="font-mono">₹ {toIndianFormat(unallocated)}</span>
                  </span>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {filteredBills.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  {filterLedgerId ? 'No bills entered yet — click "Add Bill" to start.' : 'Select a party ledger above to enter bills.'}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill No</TableHead>
                      <TableHead>Bill Date</TableHead>
                      <TableHead>Cr Days</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Dr/Cr</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>TDS</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead className="text-right">TDS Amt</TableHead>
                      <TableHead>PAN</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBills.map(b => {
                      const lr = ledgerRows.find(r => r.def.id === b.ledger_id);
                      const l3 = lr ? L3_FINANCIAL_GROUPS.find(x => x.code === lr.def.parentGroupCode) : null;
                      const tdsEligible = b.bill_type === 'advance' && l3 && ['STLA', 'LTLA', 'ADVRC'].includes(l3.code);
                      return (
                        <TableRow key={b.id}>
                          <TableCell>
                            <Input className="h-8" defaultValue={b.bill_no} onKeyDown={onEnterNext}
                              onBlur={(e) => updateBill(b.id, 'bill_no', e.target.value)} />
                          </TableCell>
                          <TableCell>
                            <Input type="date" className="h-8" defaultValue={b.bill_date}
                              onBlur={(e) => updateBill(b.id, 'bill_date', e.target.value)} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" className="h-8 w-20" defaultValue={b.credit_days || ''} onKeyDown={onEnterNext}
                              onBlur={(e) => updateBill(b.id, 'credit_days', parseInt(e.target.value) || 0)} />
                          </TableCell>
                          <TableCell>
                            <Input type="date" className="h-8" defaultValue={b.due_date || ''}
                              onBlur={(e) => updateBill(b.id, 'due_date', e.target.value)} />
                          </TableCell>
                          <TableCell>
                            <Input {...amountInputProps} className="h-8 text-right font-mono" defaultValue={b.amount || ''}
                              onKeyDown={onEnterNext}
                              onBlur={(e) => updateBill(b.id, 'amount', parseFloat(e.target.value) || 0)} />
                          </TableCell>
                          <TableCell>
                            <Select value={b.dr_cr} onValueChange={(v) => updateBill(b.id, 'dr_cr', v as 'Dr' | 'Cr')}>
                              <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Dr">Dr</SelectItem>
                                <SelectItem value="Cr">Cr</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select value={b.bill_type} onValueChange={(v) => updateBill(b.id, 'bill_type', v as OpeningBillEntry['bill_type'])}>
                              <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="invoice">Invoice</SelectItem>
                                <SelectItem value="advance">Advance</SelectItem>
                                <SelectItem value="credit_note">Credit Note</SelectItem>
                                <SelectItem value="debit_note">Debit Note</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {tdsEligible && (
                              <Select value={b.tds_applicable ? 'yes' : 'no'} onValueChange={(v) => updateBill(b.id, 'tds_applicable', v === 'yes')}>
                                <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="no">No</SelectItem>
                                  <SelectItem value="yes">Yes</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell>
                            {b.tds_applicable && (
                              <Select value={b.tds_section || ''} onValueChange={(v) => updateBill(b.id, 'tds_section', v)}>
                                <SelectTrigger className="h-8 w-24"><SelectValue placeholder="Section" /></SelectTrigger>
                                <SelectContent>
                                  {tdsSections.map(s => (
                                    <SelectItem key={s.code} value={s.code}>{s.section || s.code}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell>
                            {b.tds_applicable && (
                              <Input {...amountInputProps} className="h-8 w-24 text-right font-mono"
                                defaultValue={b.tds_amount || ''} onKeyDown={onEnterNext}
                                onBlur={(e) => updateBill(b.id, 'tds_amount', parseFloat(e.target.value) || 0)} />
                            )}
                          </TableCell>
                          <TableCell>
                            {b.tds_applicable && (
                              <Input className="h-8 w-28 font-mono uppercase" defaultValue={b.party_pan || ''} onKeyDown={onEnterNext}
                                onBlur={(e) => updateBill(b.id, 'party_pan', e.target.value.toUpperCase())} />
                            )}
                          </TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => ob.removeBill(b.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
