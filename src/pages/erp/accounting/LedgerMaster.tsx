import { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Wallet, Lock, Plus, Landmark, Building2, CreditCard, Banknote,
  TrendingUp, TrendingDown, Receipt, Users, Truck, GitBranch,
  PiggyBank, HandCoins, ArrowLeft, Edit2, Ban,
} from 'lucide-react';
import { toast } from 'sonner';
import { MOCK_ENTITIES } from '@/data/mock-entities';

// ─── Types (Two-Table Architecture) ───────────────────────────────────

interface CashLedgerDefinition {
  id: string;
  name: string;
  code: string;               // 'CASH-000001' or 'SMRT-CASH-000001'
  alias: string;
  parentGroupCode: string;    // 'CASH' or FinFrame L4 code
  parentGroupName: string;
  entityId: string | null;    // null = group level
  entityShortCode: string | null;
  status: 'active' | 'inactive';
}

interface EntityLedgerInstance {
  id: string;
  ledgerDefinitionId: string;
  entityId: string;
  entityName: string;
  entityShortCode: string;
  openingBalance: number;     // always Dr for cash
  isActive: boolean;
  displayCode: string;        // shortCode + '/' + definitionCode
}

// ─── localStorage Helpers ─────────────────────────────────────────────

const loadDefinitions = (): CashLedgerDefinition[] => {
  const raw = localStorage.getItem('erp_group_ledger_definitions');
  const all: CashLedgerDefinition[] = raw ? JSON.parse(raw) : [];
  return all.filter(d => d.parentGroupCode === 'CASH' || d.parentGroupCode?.startsWith('CASH'));
};

const saveDefinition = (def: CashLedgerDefinition) => {
  // [JWT] POST /api/group/finecore/ledger-definitions
  const raw = localStorage.getItem('erp_group_ledger_definitions');
  const all: CashLedgerDefinition[] = raw ? JSON.parse(raw) : [];
  const idx = all.findIndex(d => d.id === def.id);
  if (idx >= 0) all[idx] = def; else all.push(def);
  localStorage.setItem('erp_group_ledger_definitions', JSON.stringify(all));
};

const loadInstances = (entityId: string): EntityLedgerInstance[] => {
  const raw = localStorage.getItem(`erp_entity_${entityId}_ledger_instances`);
  return raw ? JSON.parse(raw) : [];
};

const saveInstance = (inst: EntityLedgerInstance) => {
  // [JWT] PATCH /api/entity/{entityId}/finecore/ledger-instances
  const raw = localStorage.getItem(`erp_entity_${inst.entityId}_ledger_instances`);
  const all: EntityLedgerInstance[] = raw ? JSON.parse(raw) : [];
  const idx = all.findIndex(i => i.id === inst.id);
  if (idx >= 0) all[idx] = inst; else all.push(inst);
  localStorage.setItem(`erp_entity_${inst.entityId}_ledger_instances`, JSON.stringify(all));
};

// ─── Code Generation ──────────────────────────────────────────────────

const genGroupCode = (all: CashLedgerDefinition[]) =>
  'CASH-' + String(all.filter(d => !d.entityId).length + 1).padStart(6, '0');

const genEntityCode = (all: CashLedgerDefinition[], sc: string) =>
  `${sc}-CASH-${String(all.filter(d => d.entityShortCode === sc).length + 1).padStart(6, '0')}`;

// ─── Auto-Create Instances (Group Level Save) ─────────────────────────

const autoCreateInstances = (def: CashLedgerDefinition, openingBalance: number) => {
  MOCK_ENTITIES.forEach((entity, idx) => {
    saveInstance({
      id: crypto.randomUUID(),
      ledgerDefinitionId: def.id,
      entityId: entity.id,
      entityName: entity.name,
      entityShortCode: entity.shortCode,
      openingBalance: idx === 0 ? openingBalance : 0,
      isActive: true,
      displayCode: def.code,
    });
  });
};

// ─── FinFrame L4 Groups Reader ────────────────────────────────────────

const getFinFrameL4CashGroups = (): { code: string; name: string }[] => {
  const raw = localStorage.getItem('erp_group_finframe_l4_groups');
  if (!raw) return [];
  try {
    const groups = JSON.parse(raw);
    return groups.filter((g: any) => g.l3Code === 'CASH');
  } catch { return []; }
};

// ─── Type Button Grid ─────────────────────────────────────────────────

const TYPE_BUTTONS = [
  { label: 'Cash', icon: Wallet, row: 'Balance Sheet', active: true },
  { label: 'Bank', icon: Landmark, row: 'Balance Sheet', active: false },
  { label: 'Asset', icon: Building2, row: 'Balance Sheet', active: false },
  { label: 'Liability', icon: CreditCard, row: 'Balance Sheet', active: false },
  { label: 'Capital/Equity', icon: PiggyBank, row: 'Balance Sheet', active: false },
  { label: 'Loan Given', icon: HandCoins, row: 'Balance Sheet', active: false },
  { label: 'Loan Taken', icon: Banknote, row: 'Balance Sheet', active: false },
  { label: 'Income', icon: TrendingUp, row: 'P&L', active: false },
  { label: 'Expense', icon: TrendingDown, row: 'P&L', active: false },
  { label: 'Duties & Taxes', icon: Receipt, row: 'P&L', active: false },
  { label: 'Customer', icon: Users, row: 'Masters', active: false },
  { label: 'Vendor', icon: Users, row: 'Masters', active: false },
  { label: 'Logistic', icon: Truck, row: 'Masters', active: false },
  { label: 'Branch & Division', icon: GitBranch, row: 'Masters', active: false },
];

// ─── Component ────────────────────────────────────────────────────────

export function LedgerMasterPanel() {
  const [defs, setDefs] = useState<CashLedgerDefinition[]>(() => loadDefinitions());
  const [activeTab, setActiveTab] = useState<'definitions' | 'opening_balances'>('definitions');
  const [selEntityId, setSelEntityId] = useState(MOCK_ENTITIES[0].id);
  const [instances, setInstances] = useState<EntityLedgerInstance[]>(
    () => loadInstances(MOCK_ENTITIES[0].id)
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CashLedgerDefinition | null>(null);

  const defaultForm = {
    parentGroupCode: 'CASH',
    parentGroupName: 'Cash & Cash Equivalents (Cash-in-Hand)',
    name: '',
    alias: '',
    openingBalance: 0,
    scope: 'group' as 'group' | 'entity',
    entityId: '',
  };
  const [form, setForm] = useState(defaultForm);

  // Reload instances when entity changes
  useEffect(() => {
    setInstances(loadInstances(selEntityId));
  }, [selEntityId]);

  const refreshDefs = () => setDefs(loadDefinitions());
  const refreshInstances = () => setInstances(loadInstances(selEntityId));

  // ── Stats ──
  const totalDefined = defs.length;
  const groupLevel = defs.filter(d => !d.entityId).length;
  const entitySpecific = defs.filter(d => d.entityId).length;
  const activeLedgers = defs.filter(d => d.status === 'active').length;

  // ── Quick Start ──
  const handleQuickStart = (name: string) => {
    setForm({ ...defaultForm, name });
    setCreateOpen(true);
  };

  // ── Open Create ──
  const openCreate = () => {
    setForm(defaultForm);
    setEditTarget(null);
    setCreateOpen(true);
  };

  // ── Open Edit ──
  const openEdit = (def: CashLedgerDefinition) => {
    setEditTarget(def);
    setForm({
      parentGroupCode: def.parentGroupCode,
      parentGroupName: def.parentGroupName,
      name: def.name,
      alias: def.alias,
      openingBalance: 0,
      scope: def.entityId ? 'entity' : 'group',
      entityId: def.entityId ?? '',
    });
    setCreateOpen(true);
  };

  // ── Save ──
  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('Ledger name is required');
      return;
    }
    if (!form.parentGroupCode) {
      toast.error('Select a parent group first');
      return;
    }

    const allDefs = loadDefinitions();

    if (editTarget) {
      // [JWT] PUT /api/group/finecore/ledger-definitions/{id}
      const updated: CashLedgerDefinition = {
        ...editTarget,
        name: form.name.trim(),
        alias: form.alias.trim(),
        parentGroupCode: form.parentGroupCode,
        parentGroupName: form.parentGroupName,
      };
      saveDefinition(updated);
      toast.success(`${updated.name} updated`);
    } else if (form.scope === 'group') {
      const code = genGroupCode(allDefs);
      const def: CashLedgerDefinition = {
        id: crypto.randomUUID(),
        name: form.name.trim(),
        code,
        alias: form.alias.trim(),
        parentGroupCode: form.parentGroupCode,
        parentGroupName: form.parentGroupName,
        entityId: null,
        entityShortCode: null,
        status: 'active',
      };
      saveDefinition(def);
      autoCreateInstances(def, form.openingBalance);
      toast.success(`${form.name} created. Opening balances set for ${MOCK_ENTITIES.length} entities.`);
    } else {
      const entity = MOCK_ENTITIES.find(e => e.id === form.entityId);
      if (!entity) {
        toast.error('Select an entity');
        return;
      }
      const code = genEntityCode(allDefs, entity.shortCode);
      const def: CashLedgerDefinition = {
        id: crypto.randomUUID(),
        name: form.name.trim(),
        code,
        alias: form.alias.trim(),
        parentGroupCode: form.parentGroupCode,
        parentGroupName: form.parentGroupName,
        entityId: entity.id,
        entityShortCode: entity.shortCode,
        status: 'active',
      };
      saveDefinition(def);
      // [JWT] POST /api/entity/{id}/finecore/ledger-instances
      saveInstance({
        id: crypto.randomUUID(),
        ledgerDefinitionId: def.id,
        entityId: entity.id,
        entityName: entity.name,
        entityShortCode: entity.shortCode,
        openingBalance: form.openingBalance,
        isActive: true,
        displayCode: def.code,
      });
      toast.success(`${code} created for ${entity.name}`);
    }

    setCreateOpen(false);
    setEditTarget(null);
    setForm(defaultForm);
    refreshDefs();
    refreshInstances();
  };

  // ── Deactivate ──
  const handleDeactivate = (def: CashLedgerDefinition) => {
    // [JWT] PATCH /api/group/finecore/ledger-definitions/{id}/status
    const updated = { ...def, status: def.status === 'active' ? 'inactive' as const : 'active' as const };
    saveDefinition(updated);
    toast.success(`${def.name} ${updated.status === 'active' ? 'activated' : 'deactivated'}`);
    refreshDefs();
  };

  // ── Save Opening Balances ──
  const handleSaveBalances = () => {
    // [JWT] PATCH /api/entity/{entityId}/finecore/ledger-instances/bulk
    instances.forEach(inst => saveInstance(inst));
    toast.success('Opening balances saved');
  };

  // ── FinFrame L4 groups for parent picker ──
  const l4CashGroups = getFinFrameL4CashGroups();

  // Filter instances to only those with matching defs
  const groupDefIds = new Set(defs.filter(d => !d.entityId).map(d => d.id));
  const filteredInstances = instances.filter(i => groupDefIds.has(i.ledgerDefinitionId));

  const rows: Record<string, typeof TYPE_BUTTONS> = {};
  TYPE_BUTTONS.forEach(b => {
    if (!rows[b.row]) rows[b.row] = [];
    rows[b.row].push(b);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-foreground">Ledger Master</h1>
            <Badge className="text-[10px] bg-teal-500/10 text-teal-600 border-teal-500/20">Cash</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Financial accounts for all entities</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Defined', value: totalDefined },
          { label: 'Group Level', value: groupLevel },
          { label: 'Entity Specific', value: entitySpecific },
          { label: 'Active', value: activeLedgers },
        ].map(s => (
          <div key={s.label} className="rounded-xl bg-card/60 backdrop-blur-xl border border-border p-4 text-center">
            <p className="text-2xl font-bold text-foreground font-mono">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Start Templates */}
      <div className="flex gap-3">
        <button
          onClick={() => handleQuickStart('Main Cash')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/10 transition-colors text-sm font-medium text-teal-600"
        >
          <Plus className="h-4 w-4" /> Main Cash
        </button>
        <button
          onClick={() => handleQuickStart('Petty Cash')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/10 transition-colors text-sm font-medium text-teal-600"
        >
          <Plus className="h-4 w-4" /> Petty Cash
        </button>
      </div>

      {/* Type Button Grid */}
      <div className="space-y-2">
        {Object.entries(rows).map(([rowLabel, buttons]) => (
          <div key={rowLabel}>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{rowLabel}</p>
            <div className="flex flex-wrap gap-2">
              {buttons.map(btn => {
                const Icon = btn.icon;
                return btn.active ? (
                  <button
                    key={btn.label}
                    onClick={openCreate}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-500/10 text-teal-600 border border-teal-500/20 hover:bg-teal-500/20 transition-colors"
                  >
                    <Icon className="h-3.5 w-3.5" /> {btn.label}
                  </button>
                ) : (
                  <span
                    key={btn.label}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium opacity-50 pointer-events-none bg-muted/50 text-muted-foreground border border-border"
                  >
                    <Lock className="h-3 w-3" /> {btn.label}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="definitions">Ledger Definitions</TabsTrigger>
          <TabsTrigger value="opening_balances">Opening Balances</TabsTrigger>
        </TabsList>

        {/* Tab 1 — Definitions */}
        <TabsContent value="definitions">
          {defs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No cash ledgers yet. Click <span className="font-semibold text-teal-600">+ Cash</span> above or use a Quick Start template.
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Parent Group</TableHead>
                    <TableHead>Alias</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {defs.map(def => (
                    <TableRow key={def.id}>
                      <TableCell className="font-medium">{def.name}</TableCell>
                      <TableCell className="font-mono text-xs">{def.code}</TableCell>
                      <TableCell className="text-xs">{def.parentGroupName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{def.alias || '—'}</TableCell>
                      <TableCell>
                        {def.entityId ? (
                          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                            {MOCK_ENTITIES.find(e => e.id === def.entityId)?.name ?? def.entityShortCode}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-teal-500/10 text-teal-600 border-teal-500/20">
                            Group
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${def.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                          {def.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(def)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeactivate(def)}>
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Tab 2 — Opening Balances */}
        <TabsContent value="opening_balances">
          <div className="space-y-4">
            {/* Entity Selector */}
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium whitespace-nowrap">Entity:</Label>
              <Select value={selEntityId} onValueChange={setSelEntityId}>
                <SelectTrigger className="w-[320px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_ENTITIES.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} ({e.shortCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filteredInstances.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No ledger instances for this entity. Create a group-level ledger first.
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ledger Name</TableHead>
                        <TableHead>Display Code</TableHead>
                        <TableHead>Opening Balance (₹)</TableHead>
                        <TableHead>Active</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInstances.map((inst, idx) => {
                        const def = defs.find(d => d.id === inst.ledgerDefinitionId);
                        const displayCode = `${inst.entityShortCode}/${inst.displayCode}`;
                        return (
                          <TableRow key={inst.id}>
                            <TableCell className="font-medium">{def?.name ?? '—'}</TableCell>
                            <TableCell className="font-mono text-xs">{displayCode}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground text-sm">₹</span>
                                <Input
                                  type="number"
                                  className="w-32 h-8 text-sm"
                                  value={inst.openingBalance}
                                  onChange={(e) => {
                                    const updated = [...instances];
                                    const realIdx = instances.findIndex(i => i.id === inst.id);
                                    updated[realIdx] = { ...inst, openingBalance: parseFloat(e.target.value) || 0 };
                                    setInstances(updated);
                                  }}
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={inst.isActive}
                                onCheckedChange={(checked) => {
                                  const updated = [...instances];
                                  const realIdx = instances.findIndex(i => i.id === inst.id);
                                  updated[realIdx] = { ...inst, isActive: checked };
                                  setInstances(updated);
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveBalances}>Save Opening Balances</Button>
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create / Edit Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) { setCreateOpen(false); setEditTarget(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Cash Ledger' : 'Create Cash Ledger'}</DialogTitle>
            <DialogDescription>
              {editTarget ? 'Update ledger definition details.' : 'Define a new cash ledger for your group or a specific entity.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Parent Group Picker */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Parent Group <span className="text-destructive">*</span></Label>
              <Select
                value={form.parentGroupCode}
                onValueChange={(v) => {
                  if (v === 'CASH') {
                    setForm(f => ({ ...f, parentGroupCode: 'CASH', parentGroupName: 'Cash & Cash Equivalents (Cash-in-Hand)' }));
                  } else {
                    const l4 = l4CashGroups.find(g => g.code === v);
                    setForm(f => ({ ...f, parentGroupCode: v, parentGroupName: l4?.name ?? v }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">
                    <span className="flex items-center gap-1.5">
                      <Lock className="h-3 w-3 text-muted-foreground" />
                      Cash & Cash Equivalents (Cash-in-Hand)
                    </span>
                  </SelectItem>
                  {l4CashGroups.length > 0 && l4CashGroups.map(g => (
                    <SelectItem key={g.code} value={g.code}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">System Groups (L3) are locked. Your FinFrame L4 groups appear below.</p>
            </div>

            {/* Ledger Name */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Ledger Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g., Main Cash, Petty Cash — Delhi"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                disabled={!form.parentGroupCode}
              />
            </div>

            {/* Opening Balance */}
            {!editTarget && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Opening Balance</Label>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-sm">₹</span>
                  <Input
                    type="number"
                    value={form.openingBalance}
                    onChange={(e) => setForm(f => ({ ...f, openingBalance: parseFloat(e.target.value) || 0 }))}
                    disabled={!form.parentGroupCode}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Cash always Dr balance.</p>
              </div>
            )}

            {/* Alias */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Alias</Label>
              <Input
                placeholder="e.g., MCash, PettyCash-DEL"
                value={form.alias}
                onChange={(e) => setForm(f => ({ ...f, alias: e.target.value }))}
                disabled={!form.parentGroupCode}
              />
            </div>

            {/* Entity Scope */}
            {!editTarget && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Entity Scope</Label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, scope: 'group', entityId: '' }))}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      form.scope === 'group'
                        ? 'bg-teal-500/10 text-teal-600 border-teal-500/30'
                        : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                    }`}
                    disabled={!form.parentGroupCode}
                  >
                    Group Level
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, scope: 'entity' }))}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      form.scope === 'entity'
                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                        : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50'
                    }`}
                    disabled={!form.parentGroupCode}
                  >
                    Entity Specific
                  </button>
                </div>
              </div>
            )}

            {/* Entity Dropdown (conditional) */}
            {!editTarget && form.scope === 'entity' && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Entity <span className="text-destructive">*</span></Label>
                <Select value={form.entityId} onValueChange={(v) => setForm(f => ({ ...f, entityId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_ENTITIES.map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} ({e.shortCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setEditTarget(null); }}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!form.parentGroupCode}>
              {editTarget ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LedgerMaster() {
  return (
    <SidebarProvider defaultOpen={false}>
      <ERPHeader
        breadcrumbs={[
          { label: 'Operix Core', href: '/erp/dashboard' },
          { label: 'FineCore', href: '/erp/accounting' },
          { label: 'Ledger Master' },
        ]}
        showDatePicker={false}
        showCompany={false}
      />
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <LedgerMasterPanel />
      </div>
    </SidebarProvider>
  );
}
