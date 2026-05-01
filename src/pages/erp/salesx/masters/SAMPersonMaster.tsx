/**
 * SAMPersonMaster.tsx — Master for all 5 SAM person types
 * Drives view from personType prop. Uses useSAMPersons + useSAMHierarchy.
 */
import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus, Save, Trash2, ArrowLeft, Search, Edit2,
} from 'lucide-react';
import { useSAMPersons, useSAMHierarchy } from '@/hooks/useSAMPersons';
import { useStockGroups } from '@/hooks/useStockGroups';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { comply360SAMKey } from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import type { SAMConfig } from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import type {
  SAMPerson, SAMPersonType, SAMCommissionRateRow, SAMSlabRow, SAMPortfolioItem,
} from '@/types/sam-person';
import { SAM_GROUP_CODE } from '@/types/sam-person';
import { EMPLOYEES_KEY } from '@/types/employee';
import type { Employee } from '@/types/employee';
import { cn } from '@/lib/utils';

interface Props {
  personType: SAMPersonType;
  entityCode: string;
}

const TYPE_LABEL: Record<SAMPersonType, string> = {
  salesman: 'Salesman', agent: 'Agent', broker: 'Broker',
  receiver: 'Receiver', reference: 'Reference', project_manager: 'Project Manager',
};
const GROUP_LABEL: Record<string, string> = {
  SLSM: 'Sales Man', AGNT: 'Agent', BRKR: 'Broker',
  RCVR: 'Receiver', REFR: 'Reference', MGMT: 'Management',
};

type View = 'list' | 'form';

interface FormState {
  display_name: string;
  alias: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  pan: string;
  hierarchy_level_id: string | null;
  employee_id: string | null;
  employee_name: string | null;
  primary_agent_id: string | null;
  receiver_share_pct: number | null;
  tds_deductible: boolean;
  tds_section: '194H' | '194J' | 'not_applicable';
  is_active: boolean;
  commission_rates: SAMCommissionRateRow[];
  commission_slabs: SAMSlabRow[];
  portfolio: SAMPortfolioItem[];
  ledger_name: string;
  // ── SAM Mini-Sprint additions ──────────────────────────────────────
  commission_expense_ledger_id: string | null;
  commission_expense_ledger_name: string | null;
  treat_as_salesman: boolean;
}

const BLANK: FormState = {
  display_name: '', alias: '', phone: '', email: '', address: '',
  gstin: '', pan: '', hierarchy_level_id: null,
  employee_id: null, employee_name: null,
  primary_agent_id: null, receiver_share_pct: null,
  tds_deductible: false, tds_section: 'not_applicable',
  is_active: true,
  commission_rates: [],
  commission_slabs: [],
  portfolio: [],
  ledger_name: '',
  commission_expense_ledger_id: null,
  commission_expense_ledger_name: null,
  treat_as_salesman: false,
};

function loadCfg(entityCode: string): SAMConfig | null {
  try {
    // [JWT] GET /api/compliance/comply360/sam/:entityCode
    const raw = localStorage.getItem(comply360SAMKey(entityCode));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function loadEmployees(): Employee[] {
  try {
    // [JWT] GET /api/payhub/employees
    return JSON.parse(localStorage.getItem(EMPLOYEES_KEY) || '[]');
  } catch { return []; }
}

export function SAMPersonMasterPanel({ personType, entityCode }: Props) {
  const cfg = useMemo(() => loadCfg(entityCode), [entityCode]);
  const { persons, createPerson, updatePerson } = useSAMPersons(entityCode);
  const { levels } = useSAMHierarchy(entityCode);
  const { groups } = useStockGroups();
  const employees = useMemo(() => loadEmployees(), []);

  // ── SAM Mini-Sprint: income/expense ledger options for commission booking ──
  const allDefs = useMemo(() => {
    try {
      // [JWT] GET /api/accounting/ledger-definitions
      const raw = localStorage.getItem('erp_group_ledger_definitions');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, []);
  const commissionLedgerOptions = useMemo(
    () => allDefs.filter((d: { ledgerType: string }) =>
      d.ledgerType === 'income' || d.ledgerType === 'expense'),
    [allDefs],
  );

  const [view, setView] = useState<View>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [form, setForm] = useState<FormState>(BLANK);

  const typeLabel = TYPE_LABEL[personType];
  const groupCode = SAM_GROUP_CODE[personType];

  const filtered = useMemo(() => {
    return persons
      .filter(p => p.person_type === personType)
      .filter(p => statusFilter === 'all'
        || (statusFilter === 'active' && p.is_active)
        || (statusFilter === 'inactive' && !p.is_active))
      .filter(p => !search.trim()
        || p.display_name.toLowerCase().includes(search.toLowerCase())
        || p.person_code.toLowerCase().includes(search.toLowerCase()));
  }, [persons, personType, statusFilter, search]);

  const startCreate = () => {
    setEditingId(null);
    setForm(BLANK);
    setView('form');
  };

  const startEdit = (p: SAMPerson) => {
    setEditingId(p.id);
    setForm({
      display_name: p.display_name,
      alias: p.alias ?? '',
      phone: p.phone ?? '',
      email: p.email ?? '',
      address: p.address ?? '',
      gstin: p.gstin ?? '',
      pan: p.pan ?? '',
      hierarchy_level_id: p.hierarchy_level_id ?? null,
      employee_id: p.employee_id ?? null,
      employee_name: p.employee_name ?? null,
      primary_agent_id: p.primary_agent_id ?? null,
      receiver_share_pct: p.receiver_share_pct ?? null,
      tds_deductible: !!p.tds_deductible,
      tds_section: (p.tds_section ?? 'not_applicable') as FormState['tds_section'],
      is_active: p.is_active,
      commission_rates: p.commission_rates ?? [],
      commission_slabs: p.commission_slabs ?? [],
      portfolio: p.portfolio ?? [],
      ledger_name: p.ledger_name ?? p.display_name,
      commission_expense_ledger_id: p.commission_expense_ledger_id ?? null,
      commission_expense_ledger_name: p.commission_expense_ledger_name ?? null,
      treat_as_salesman: p.treat_as_salesman ?? false,
    });
    setView('form');
  };

  const editingRecord = editingId ? persons.find(p => p.id === editingId) ?? null : null;

  const handleSave = useCallback(() => {
    if (!form.display_name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (editingId) {
      updatePerson(editingId, {
        display_name: form.display_name.trim(),
        alias: form.alias || null,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        gstin: form.gstin || null,
        pan: form.pan || null,
        hierarchy_level_id: form.hierarchy_level_id,
        employee_id: form.employee_id,
        employee_name: form.employee_name,
        primary_agent_id: form.primary_agent_id,
        receiver_share_pct: form.receiver_share_pct,
        tds_deductible: form.tds_deductible,
        tds_section: form.tds_section,
        is_active: form.is_active,
        commission_rates: form.commission_rates,
        commission_slabs: form.commission_slabs,
        portfolio: form.portfolio,
        ledger_name: form.display_name.trim(),
        commission_expense_ledger_id: form.commission_expense_ledger_id,
        commission_expense_ledger_name: form.commission_expense_ledger_name,
        treat_as_salesman: form.treat_as_salesman,
      });
    } else {
      const created = createPerson(personType, {
        display_name: form.display_name.trim(),
        alias: form.alias || null,
        ledger_name: form.display_name.trim(),
        hierarchy_level_id: form.hierarchy_level_id,
        phone: form.phone || null,
        email: form.email || null,
        gstin: form.gstin || null,
        pan: form.pan || null,
        address: form.address || null,
        employee_id: form.employee_id,
        employee_name: form.employee_name,
        tds_section: form.tds_section,
        tds_deductible: form.tds_deductible,
        commission_rates: form.commission_rates,
        commission_slabs: form.commission_slabs,
        portfolio: form.portfolio,
        primary_agent_id: form.primary_agent_id,
        receiver_share_pct: form.receiver_share_pct,
        is_active: form.is_active,
        commission_expense_ledger_id: form.commission_expense_ledger_id,
        commission_expense_ledger_name: form.commission_expense_ledger_name,
        treat_as_salesman: form.treat_as_salesman,
      });
      setEditingId(created.id);
    }
  }, [form, editingId, personType, createPerson, updatePerson]);

  useCtrlS(view === 'form' ? handleSave : () => {});

  // ── List view ──────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div data-keyboard-form className="space-y-3">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">{typeLabel} Master</CardTitle>
            <Button data-primary size="sm" onClick={startCreate}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Create {typeLabel}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search name or code"
                  className="h-8 text-xs pl-7" />
              </div>
              <Select value={statusFilter} onValueChange={v => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                No {typeLabel.toLowerCase()} records yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Code</TableHead>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Phone</TableHead>
                    <TableHead className="text-xs">TDS</TableHead>
                    <TableHead className="text-xs">Portfolio</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(p => (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => startEdit(p)}>
                      <TableCell className="text-xs font-mono">{p.person_code}</TableCell>
                      <TableCell className="text-xs font-medium">{p.display_name}</TableCell>
                      <TableCell className="text-xs font-mono">{p.phone ?? '—'}</TableCell>
                      <TableCell className="text-xs">{p.tds_section ?? '—'}</TableCell>
                      <TableCell className="text-xs font-mono">{p.portfolio?.length ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          'text-[10px]',
                          p.is_active
                            ? 'bg-success/15 text-success border-success/30'
                            : 'bg-destructive/15 text-destructive border-destructive/30',
                        )}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" className="h-6 w-6">
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Form view ──────────────────────────────────────────────────────
  const calcMethod = cfg?.commissionCalcMethod ?? 'item_amount';
  const showService = !!cfg?.enableCommissionOnService;
  const isReceiver = personType === 'receiver';
  const isSalesmanFromPayhub = personType === 'salesman' && cfg?.companySalesManSource === 'payhub';

  const addRate = () => {
    setForm(p => ({
      ...p,
      commission_rates: [
        ...p.commission_rates,
        { id: `rt-${Date.now()}`, applicable_from: new Date().toISOString().slice(0, 10) },
      ],
    }));
  };

  const updRate = (id: string, patch: Partial<SAMCommissionRateRow>) => {
    setForm(p => ({
      ...p,
      commission_rates: p.commission_rates.map(r => r.id === id ? { ...r, ...patch } : r),
    }));
  };

  const delRate = (id: string) => {
    setForm(p => ({ ...p, commission_rates: p.commission_rates.filter(r => r.id !== id) }));
  };

  const addSlab = () => {
    setForm(p => ({
      ...p,
      commission_slabs: [
        ...p.commission_slabs,
        { id: `sl-${Date.now()}`, from_amount: 0, to_amount: null, rate_pct: 0 },
      ],
    }));
  };
  const updSlab = (id: string, patch: Partial<SAMSlabRow>) => {
    setForm(p => ({
      ...p,
      commission_slabs: p.commission_slabs
        .map(s => s.id === id ? { ...s, ...patch } : s)
        .sort((a, b) => a.from_amount - b.from_amount),
    }));
  };
  const delSlab = (id: string) => {
    setForm(p => ({ ...p, commission_slabs: p.commission_slabs.filter(s => s.id !== id) }));
  };

  const togglePortfolio = (sg: { id: string; name: string }) => {
    setForm(p => {
      const exists = p.portfolio.find(x => x.stock_group_id === sg.id);
      if (exists) {
        return { ...p, portfolio: p.portfolio.filter(x => x.stock_group_id !== sg.id) };
      }
      return {
        ...p,
        portfolio: [...p.portfolio, {
          stock_group_id: sg.id, stock_group_name: sg.name, commission_override_pct: null,
        }],
      };
    });
  };

  const setOverride = (sgId: string, val: number | null) => {
    setForm(p => ({
      ...p,
      portfolio: p.portfolio.map(x =>
        x.stock_group_id === sgId ? { ...x, commission_override_pct: val } : x),
    }));
  };

  const sortedRates = [...form.commission_rates].sort(
    (a, b) => (b.applicable_from ?? '').localeCompare(a.applicable_from ?? ''),
  );

  return (
    <div data-keyboard-form className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setView('list')}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            {editingRecord ? `${editingRecord.person_code} • ` : 'New • '}
            {typeLabel} Master
          </p>
          <Button data-primary size="sm" onClick={handleSave}>
            <Save className="h-3.5 w-3.5 mr-1" /> Save
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic">Basic Details</TabsTrigger>
          <TabsTrigger value="rates">Commission</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="tds">TDS & Ledger</TabsTrigger>
        </TabsList>

        {/* ── Tab 1 ────────────────────────────────────────────── */}
        <TabsContent value="basic">
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Display Name *</label>
                  <Input value={form.display_name}
                    onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))}
                    onKeyDown={onEnterNext}
                    className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Alias</label>
                  <Input value={form.alias}
                    onChange={e => setForm(p => ({ ...p, alias: e.target.value }))}
                    onKeyDown={onEnterNext}
                    className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Phone</label>
                  <Input value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    onKeyDown={onEnterNext}
                    className="h-8 text-xs font-mono" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Email</label>
                  <Input type="email" value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    onKeyDown={onEnterNext}
                    className="h-8 text-xs" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">GSTIN</label>
                  <Input value={form.gstin} maxLength={15}
                    onChange={e => setForm(p => ({ ...p, gstin: e.target.value.toUpperCase() }))}
                    onKeyDown={onEnterNext}
                    className="h-8 text-xs font-mono" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">PAN</label>
                  <Input value={form.pan} maxLength={10}
                    onChange={e => setForm(p => ({ ...p, pan: e.target.value.toUpperCase() }))}
                    onKeyDown={onEnterNext}
                    className="h-8 text-xs font-mono" />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Address</label>
                <Textarea value={form.address}
                  onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                  rows={2}
                  className="text-xs" />
              </div>

              {isSalesmanFromPayhub && (
                <div>
                  <label className="text-xs text-muted-foreground">Linked Employee</label>
                  <Select
                    value={form.employee_id ?? 'none'}
                    onValueChange={v => {
                      if (v === 'none') {
                        setForm(p => ({ ...p, employee_id: null, employee_name: null }));
                        return;
                      }
                      const emp = employees.find(e => e.id === v);
                      setForm(p => ({
                        ...p,
                        employee_id: v,
                        employee_name: emp?.displayName ?? null,
                        display_name: p.display_name || (emp?.displayName ?? ''),
                      }));
                    }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {employees.map(e => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.empCode} — {e.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {cfg?.enableHierarchyMaster && (
                <div>
                  <label className="text-xs text-muted-foreground">Hierarchy Level</label>
                  <Select
                    value={form.hierarchy_level_id ?? 'none'}
                    onValueChange={v => setForm(p => ({
                      ...p, hierarchy_level_id: v === 'none' ? null : v,
                    }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {levels.map(l => (
                        <SelectItem key={l.id} value={l.id}>
                          Level {l.level_number} — {l.level_code} — {l.level_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {isReceiver && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Primary Agent</label>
                    <Select
                      value={form.primary_agent_id ?? 'none'}
                      onValueChange={v => setForm(p => ({
                        ...p, primary_agent_id: v === 'none' ? null : v,
                      }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select agent" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— None —</SelectItem>
                        {persons.filter(p => p.person_type === 'agent').map(a => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.person_code} — {a.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Receiver Share %</label>
                    <Input
                      type="number" min={0} max={100}
                      value={form.receiver_share_pct ?? ''}
                      onChange={e => setForm(p => ({
                        ...p,
                        receiver_share_pct: e.target.value === '' ? null : Number(e.target.value),
                      }))}
                      onKeyDown={onEnterNext}
                      className="h-8 text-xs font-mono" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2 — Commission ───────────────────────────────── */}
        <TabsContent value="rates">
          <Card>
            <CardContent className="pt-4">
              {isReceiver ? (
                <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/30 rounded">
                  <p>Receiver earns {form.receiver_share_pct ?? 0}% of primary agent commission.</p>
                  <p>Set in Basic Details tab.</p>
                </div>
              ) : calcMethod === 'slab_based' ? (
                <div className="space-y-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">From (₹)</TableHead>
                        <TableHead className="text-xs">To (₹, blank=∞)</TableHead>
                        <TableHead className="text-xs">Rate %</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.commission_slabs.map(s => (
                        <TableRow key={s.id}>
                          <TableCell>
                            <Input type="number" value={s.from_amount}
                              onChange={e => updSlab(s.id, { from_amount: Number(e.target.value) })}
                              className="h-7 text-xs font-mono" />
                          </TableCell>
                          <TableCell>
                            <Input type="number" value={s.to_amount ?? ''}
                              onChange={e => updSlab(s.id, {
                                to_amount: e.target.value === '' ? null : Number(e.target.value),
                              })}
                              className="h-7 text-xs font-mono" />
                          </TableCell>
                          <TableCell>
                            <Input type="number" value={s.rate_pct}
                              onChange={e => updSlab(s.id, { rate_pct: Number(e.target.value) })}
                              className="h-7 text-xs font-mono" />
                          </TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" className="h-6 w-6"
                              onClick={() => delSlab(s.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Button size="sm" variant="outline" onClick={addSlab}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Slab
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">From Date</TableHead>
                        {(calcMethod === 'item_amount' || calcMethod === 'both') && (
                          <TableHead className="text-xs">Item %</TableHead>
                        )}
                        {(calcMethod === 'item_qty' || calcMethod === 'both') && (
                          <TableHead className="text-xs">₹/Unit</TableHead>
                        )}
                        {calcMethod === 'net_margin' && (
                          <TableHead className="text-xs">Margin %</TableHead>
                        )}
                        {showService && <TableHead className="text-xs">Service %</TableHead>}
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedRates.map(r => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <Input type="date" value={r.applicable_from}
                              onChange={e => updRate(r.id, { applicable_from: e.target.value })}
                              className="h-7 text-xs" />
                          </TableCell>
                          {(calcMethod === 'item_amount' || calcMethod === 'both') && (
                            <TableCell>
                              <Input type="number" value={r.item_pct ?? ''}
                                onChange={e => updRate(r.id, {
                                  item_pct: e.target.value === '' ? null : Number(e.target.value),
                                })}
                                className="h-7 text-xs font-mono" />
                            </TableCell>
                          )}
                          {(calcMethod === 'item_qty' || calcMethod === 'both') && (
                            <TableCell>
                              <Input type="number" value={r.item_amt_per_unit ?? ''}
                                onChange={e => updRate(r.id, {
                                  item_amt_per_unit: e.target.value === '' ? null : Number(e.target.value),
                                })}
                                className="h-7 text-xs font-mono" />
                            </TableCell>
                          )}
                          {calcMethod === 'net_margin' && (
                            <TableCell>
                              <Input type="number" value={r.margin_pct ?? ''}
                                onChange={e => updRate(r.id, {
                                  margin_pct: e.target.value === '' ? null : Number(e.target.value),
                                })}
                                className="h-7 text-xs font-mono" />
                            </TableCell>
                          )}
                          {showService && (
                            <TableCell>
                              <Input type="number" value={r.service_pct ?? ''}
                                onChange={e => updRate(r.id, {
                                  service_pct: e.target.value === '' ? null : Number(e.target.value),
                                })}
                                className="h-7 text-xs font-mono" />
                            </TableCell>
                          )}
                          <TableCell>
                            <Button size="icon" variant="ghost" className="h-6 w-6"
                              onClick={() => delRate(r.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex items-center justify-between">
                    <Button size="sm" variant="outline" onClick={addRate}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Rate
                    </Button>
                    <p className="text-[10px] text-muted-foreground">
                      Most recent row where From Date ≤ invoice date is applied.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3 — Portfolio ────────────────────────────────── */}
        <TabsContent value="portfolio">
          <Card>
            <CardContent className="pt-4">
              {!cfg?.enablePortfolioAssignment ? (
                <div className="p-3 bg-muted/30 rounded text-xs text-muted-foreground">
                  Enable Portfolio Assignment in SAM Config first.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold mb-2">Available Stock Groups</p>
                    <div className="border rounded p-2 max-h-72 overflow-auto space-y-1">
                      {groups.length === 0 && (
                        <p className="text-xs text-muted-foreground">No stock groups yet.</p>
                      )}
                      {groups.filter(g => g.status === 'active').map(g => {
                        const checked = !!form.portfolio.find(x => x.stock_group_id === g.id);
                        return (
                          <label key={g.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/30 p-1 rounded">
                            <Checkbox checked={checked} onCheckedChange={() => togglePortfolio({ id: g.id, name: g.name })} />
                            <span>{g.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-2">Selected Portfolio</p>
                    <div className="border rounded p-2 max-h-72 overflow-auto space-y-1">
                      {form.portfolio.length === 0 && (
                        <p className="text-xs text-muted-foreground">No items selected.</p>
                      )}
                      {form.portfolio.map(item => (
                        <div key={item.stock_group_id} className="flex items-center gap-2 p-1">
                          <span className="text-xs flex-1 truncate">{item.stock_group_name}</span>
                          <Input
                            type="number"
                            value={item.commission_override_pct ?? ''}
                            placeholder="Override %"
                            onChange={e => setOverride(item.stock_group_id,
                              e.target.value === '' ? null : Number(e.target.value))}
                            className="h-6 w-20 text-xs font-mono" />
                          <Button size="icon" variant="ghost" className="h-6 w-6"
                            onClick={() => togglePortfolio({ id: item.stock_group_id, name: item.stock_group_name })}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Override % applies for items in this group; otherwise the rate from the
                      Commission tab is used.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 4 — TDS & Ledger ─────────────────────────────── */}
        <TabsContent value="tds">
          <Card>
            <CardContent className="pt-4 space-y-3">
              {/* ── Block A: Commission Expense Ledger ──────────────── */}
              <div className="space-y-1.5">
                <div>
                  <p className="text-xs font-medium">Commission Expense Ledger</p>
                  <p className="text-[10px] text-muted-foreground">
                    The P&amp;L ledger debited when commission is booked.
                    e.g. &quot;Commission on Sales&quot; under Indirect Expenses.
                  </p>
                </div>
                <Select
                  value={form.commission_expense_ledger_id ?? '__none__'}
                  onValueChange={v => setForm(p => ({
                    ...p,
                    commission_expense_ledger_id: v === '__none__' ? null : v,
                    commission_expense_ledger_name:
                      v === '__none__'
                        ? null
                        : (commissionLedgerOptions.find((d: { id: string; name: string }) =>
                          d.id === v)?.name ?? null),
                  }))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select income/expense ledger" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {commissionLedgerOptions.map((d: { id: string; name: string }) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {commissionLedgerOptions.length === 0 && (
                  <p className="text-[10px] text-amber-600">
                    No income/expense ledgers found. Create them in FineCore → Ledger Master first.
                  </p>
                )}
              </div>

              {/* ── Block B: Treat As Salesman (agent / broker only) ── */}
              {(personType === 'agent' || personType === 'broker') && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">Treat as Salesman</p>
                    <p className="text-[10px] text-muted-foreground">
                      This {personType} also appears in the salesman dropdown on transactions.
                      Enables dual-role assignment on a single invoice.
                    </p>
                  </div>
                  <Switch
                    checked={form.treat_as_salesman}
                    onCheckedChange={v => setForm(p => ({ ...p, treat_as_salesman: v }))}
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium">TDS Deductible</p>
                  <p className="text-[10px] text-muted-foreground">
                    Deduct TDS on commission paid to this person.
                  </p>
                </div>
                <Switch checked={form.tds_deductible}
                  onCheckedChange={v => setForm(p => ({ ...p, tds_deductible: v }))} />
              </div>

              {form.tds_deductible && (
                <div>
                  <label className="text-xs text-muted-foreground">TDS Section</label>
                  <Select value={form.tds_section}
                    onValueChange={v => setForm(p => ({
                      ...p, tds_section: v as FormState['tds_section'],
                    }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="194H">194H — Commission</SelectItem>
                      <SelectItem value="194J">194J — Professional</SelectItem>
                      <SelectItem value="not_applicable">Not Applicable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">Active</p>
                <Switch checked={form.is_active}
                  onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
              </div>

              {editingRecord && (
                <div className="border rounded p-3 space-y-1 bg-muted/30">
                  <p className="text-xs font-semibold mb-1">Accounting Ledger</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <span className="text-muted-foreground">Ledger Name:</span>
                    <span>{editingRecord.ledger_name}</span>
                    <span className="text-muted-foreground">Ledger Code:</span>
                    <span className="font-mono">{editingRecord.person_code}</span>
                    <span className="text-muted-foreground">Group:</span>
                    <span>{GROUP_LABEL[groupCode]}</span>
                    <span className="text-muted-foreground">Status:</span>
                    <span>Active</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    This ledger was auto-created under Sundry Creditor on save.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SAMPersonMaster(props: Props) {
  return <SAMPersonMasterPanel {...props} />;
}
