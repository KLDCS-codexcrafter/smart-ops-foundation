import React, { useState, useMemo, useCallback } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle, Plus, Search, Edit2, Trash2, TrendingDown, MapPin,
  Layers, ShoppingCart, Tag, Grid3X3, Copy, Save,
} from 'lucide-react';
import { toast } from 'sonner';
import type { LocationReorderRule, DepartmentTag, ReorderPriority } from '@/types/location-reorder-rule';
import type { InventoryItem } from '@/types/inventory-item';

const RRKEY = 'erp_location_reorder_rules';
const DTKEY = 'erp_department_tags';
const IKEY = 'erp_inventory_items';
const SLKEY = 'erp_stock_ledger';
const ls = <T,>(k: string): T[] => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };

const DEFAULT_DEPT_TAGS: DepartmentTag[] = [
  { id: 'dt-1', name: 'Production', color: '#7C3AED', is_system: true, created_at: '' },
  { id: 'dt-2', name: 'Sales / Dispatch', color: '#0F766E', is_system: true, created_at: '' },
  { id: 'dt-3', name: 'QC Hold', color: '#B45309', is_system: true, created_at: '' },
  { id: 'dt-4', name: 'Raw Material Store', color: '#1D4ED8', is_system: true, created_at: '' },
  { id: 'dt-5', name: 'Finished Goods Store', color: '#15803D', is_system: true, created_at: '' },
  { id: 'dt-6', name: 'Export', color: '#BE123C', is_system: true, created_at: '' },
];

const initDeptTags = (): DepartmentTag[] => {
  const stored = ls<DepartmentTag>(DTKEY);
  if (stored.length > 0) return stored;
  localStorage.setItem(DTKEY, JSON.stringify(DEFAULT_DEPT_TAGS)); /* [JWT] POST /api/inventory/department-tags/seed */
  return DEFAULT_DEPT_TAGS;
};

const PRIORITY_COLORS: Record<ReorderPriority, string> = {
  critical: 'bg-red-500/10 text-red-700',
  high: 'bg-amber-500/10 text-amber-700',
  normal: 'bg-slate-500/10 text-slate-600',
};

type ViewMode = 'global' | 'per_location' | 'by_department';

interface ThresholdRow {
  item_id: string;
  item_code: string;
  item_name: string;
  uom: string;
  safety_stock: string;
  min_stock: string;
  max_stock: string;
  reorder_qty: string;
  lead_time_days: string;
  department_tag_id: string;
  priority: ReorderPriority;
}

export function ReorderAlertsPanel() {
  const [rules, setRules] = useState<LocationReorderRule[]>(ls(RRKEY));
  const [deptTags, setDeptTags] = useState<DepartmentTag[]>(initDeptTags);
  const [items] = useState<InventoryItem[]>(ls(IKEY));
  const [stockLedger] = useState<any[]>(ls(SLKEY));

  // Main tab
  const [mainTab, setMainTab] = useState<'matrix' | 'alerts'>('matrix');

  // Matrix state
  const [viewMode, setViewMode] = useState<ViewMode>('global');
  const [selectedGodown, setSelectedGodown] = useState('');
  const [matrixSearch, setMatrixSearch] = useState('');
  const [matrixGroupFilter, setMatrixGroupFilter] = useState('all');
  const [pendingMatrix, setPendingMatrix] = useState<Record<string, ThresholdRow>>({});

  // Alert Dashboard state
  const [search, setSearch] = useState('');
  const [ruleOpen, setRuleOpen] = useState(false);
  const [editRule, setEditRule] = useState<LocationReorderRule | null>(null);
  const [tagOpen, setTagOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#0F766E');
  const [ruleForm, setRuleForm] = useState({
    item_id: '', item_code: '', item_name: '',
    godown_id: '', godown_name: '',
    department_tag_id: '', department_tag_name: '',
    min_stock: 0, max_stock: 0, reorder_qty: 0, safety_stock: 0,
    lead_time_days: 7, priority: 'normal' as ReorderPriority, is_active: true,
  });
  const [itemSearch, setItemSearch] = useState('');

  const godowns: any[] = ls('erp_godowns');
  const saveRules = (d: LocationReorderRule[]) => { localStorage.setItem(RRKEY, JSON.stringify(d)); /* [JWT] CRUD /api/inventory/reorder-rules */ };
  const saveTags = (d: DepartmentTag[]) => { localStorage.setItem(DTKEY, JSON.stringify(d)); /* [JWT] CRUD /api/inventory/department-tags */ };

  // Stock map
  const stockMap = useMemo(() => {
    const m: Record<string, number> = {};
    stockLedger.forEach(e => {
      if (!m[e.item_id]) m[e.item_id] = 0;
      m[e.item_id] += (e.qty_in || 0) - (e.qty_out || 0);
    });
    return m;
  }, [stockLedger]);

  const getStockStatus = (currentStock: number, min: number, max: number, safety: number) => {
    if (min === 0 && max === 0 && safety === 0) return { label: 'No Rule', color: '', icon: '·' };
    if (currentStock <= safety) return { label: 'Critical', color: 'bg-red-500/10 text-red-700', icon: '🔴' };
    if (currentStock <= min) return { label: 'Reorder Now', color: 'bg-amber-500/10 text-amber-700', icon: '🟠' };
    if (currentStock <= min * 1.2) return { label: 'Watch', color: 'bg-yellow-500/10 text-yellow-700', icon: '🟡' };
    if (currentStock >= max && max > 0) return { label: 'Overstock', color: 'bg-blue-500/10 text-blue-700', icon: '🔵' };
    return { label: 'OK', color: 'bg-emerald-500/10 text-emerald-700', icon: '🟢' };
  };

  // ── Matrix logic ──
  const viewKey = viewMode === 'per_location' && selectedGodown ? selectedGodown : 'global';

  const getExistingRule = useCallback((itemId: string): LocationReorderRule | undefined => {
    if (viewMode === 'global') {
      return rules.find(r => r.item_id === itemId && (!r.godown_id || r.godown_id === 'default'));
    }
    if (viewMode === 'per_location' && selectedGodown) {
      return rules.find(r => r.item_id === itemId && r.godown_id === selectedGodown);
    }
    return rules.find(r => r.item_id === itemId);
  }, [rules, viewMode, selectedGodown]);

  const activeItems = useMemo(() => items.filter(i => i.status === 'active'), [items]);

  const stockGroups = useMemo(() =>
    [...new Set(activeItems.map(i => i.stock_group_name).filter(Boolean))].sort() as string[],
    [activeItems]
  );

  const filteredMatrixItems = useMemo(() => {
    return activeItems.filter(i => {
      if (matrixGroupFilter !== 'all' && i.stock_group_name !== matrixGroupFilter) return false;
      if (matrixSearch) {
        const q = matrixSearch.toLowerCase();
        if (!i.name.toLowerCase().includes(q) && !i.code.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [activeItems, matrixGroupFilter, matrixSearch]);

  const pendingCount = Object.keys(pendingMatrix).length;

  const handleMatrixCell = useCallback((item: InventoryItem, field: keyof ThresholdRow, rawVal: string) => {
    const key = `${item.id}|${viewKey}`;
    setPendingMatrix(prev => {
      const existing = prev[key] || {
        item_id: item.id,
        item_code: item.code,
        item_name: item.name,
        uom: item.primary_uom_symbol || 'Nos',
        safety_stock: '',
        min_stock: '',
        max_stock: '',
        reorder_qty: '',
        lead_time_days: '',
        department_tag_id: '',
        priority: 'normal' as ReorderPriority,
      };
      const rule = getExistingRule(item.id);
      // Pre-fill from existing rule if first edit
      const prefilled: ThresholdRow = {
        ...existing,
        safety_stock: existing.safety_stock || String(rule?.safety_stock || ''),
        min_stock: existing.min_stock || String(rule?.min_stock || ''),
        max_stock: existing.max_stock || String(rule?.max_stock || ''),
        reorder_qty: existing.reorder_qty || String(rule?.reorder_qty || ''),
        lead_time_days: existing.lead_time_days || String(rule?.lead_time_days || ''),
        department_tag_id: existing.department_tag_id || rule?.department_tag_id || '',
        priority: existing.priority || rule?.priority || 'normal',
        [field]: rawVal,
      };
      return { ...prev, [key]: prefilled };
    });
  }, [viewKey, getExistingRule]);

  const handleMatrixSelect = useCallback((item: InventoryItem, field: 'department_tag_id' | 'priority', val: string) => {
    const key = `${item.id}|${viewKey}`;
    setPendingMatrix(prev => {
      const existing = prev[key];
      const rule = getExistingRule(item.id);
      const base: ThresholdRow = existing || {
        item_id: item.id,
        item_code: item.code,
        item_name: item.name,
        uom: item.primary_uom_symbol || 'Nos',
        safety_stock: String(rule?.safety_stock || ''),
        min_stock: String(rule?.min_stock || ''),
        max_stock: String(rule?.max_stock || ''),
        reorder_qty: String(rule?.reorder_qty || ''),
        lead_time_days: String(rule?.lead_time_days || ''),
        department_tag_id: rule?.department_tag_id || '',
        priority: rule?.priority || 'normal',
      };
      return { ...prev, [key]: { ...base, [field]: field === 'priority' ? val as ReorderPriority : val } };
    });
  }, [viewKey, getExistingRule]);

  const saveAllMatrix = useCallback(() => {
    const now = new Date().toISOString();
    let updated = [...rules];
    let created = 0;
    let updatedCount = 0;

    Object.entries(pendingMatrix).forEach(([compositeKey, row]) => {
      const min = parseFloat(row.min_stock) || 0;
      if (min === 0 && !parseFloat(row.safety_stock as string) && !parseFloat(row.max_stock as string)) return; // skip empty

      const [itemId, vk] = compositeKey.split('|');
      const godownId = vk === 'global' ? '' : vk;
      const godownName = godownId ? godowns.find((g: any) => g.id === godownId)?.name || '' : '';
      const deptTag = deptTags.find(t => t.id === row.department_tag_id);

      const existingIdx = updated.findIndex(r =>
        r.item_id === itemId && (godownId ? r.godown_id === godownId : (!r.godown_id || r.godown_id === 'default'))
      );

      if (existingIdx >= 0) {
        updated[existingIdx] = {
          ...updated[existingIdx],
          safety_stock: parseFloat(row.safety_stock) || 0,
          min_stock: min,
          max_stock: parseFloat(row.max_stock) || 0,
          reorder_qty: parseFloat(row.reorder_qty) || 0,
          lead_time_days: parseInt(row.lead_time_days) || 7,
          department_tag_id: row.department_tag_id || null,
          department_tag_name: deptTag?.name || null,
          priority: row.priority,
          updated_at: now,
        };
        updatedCount++;
      } else {
        const newRule: LocationReorderRule = {
          id: `rr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          item_id: itemId,
          item_code: row.item_code,
          item_name: row.item_name,
          godown_id: godownId || 'default',
          godown_name: godownName || 'Default',
          department_tag_id: row.department_tag_id || null,
          department_tag_name: deptTag?.name || null,
          safety_stock: parseFloat(row.safety_stock) || 0,
          min_stock: min,
          max_stock: parseFloat(row.max_stock) || 0,
          reorder_qty: parseFloat(row.reorder_qty) || 0,
          lead_time_days: parseInt(row.lead_time_days) || 7,
          priority: row.priority,
          is_active: true,
          created_at: now,
          updated_at: now,
        };
        updated.unshift(newRule);
        created++;
      }
    });

    setRules(updated);
    saveRules(updated);
    setPendingMatrix({});
    toast.success(`Saved: ${created} created, ${updatedCount} updated`);
    // [JWT] POST /api/inventory/reorder-rules/bulk-upsert
  }, [pendingMatrix, rules, godowns, deptTags]);

  const copyGlobalToGodown = useCallback(() => {
    if (!selectedGodown) return;
    const globalRules = rules.filter(r => !r.godown_id || r.godown_id === 'default');
    const newPending = { ...pendingMatrix };
    globalRules.forEach(r => {
      const key = `${r.item_id}|${selectedGodown}`;
      newPending[key] = {
        item_id: r.item_id,
        item_code: r.item_code,
        item_name: r.item_name,
        uom: items.find(it => it.id === r.item_id)?.primary_uom_symbol || 'Nos',
        safety_stock: String(r.safety_stock),
        min_stock: String(r.min_stock),
        max_stock: String(r.max_stock),
        reorder_qty: String(r.reorder_qty),
        lead_time_days: String(r.lead_time_days),
        department_tag_id: r.department_tag_id || '',
        priority: r.priority,
      };
    });
    setPendingMatrix(newPending);
    toast.info(`${globalRules.length} global thresholds staged for ${godowns.find((g: any) => g.id === selectedGodown)?.name}`);
  }, [selectedGodown, rules, pendingMatrix, items, godowns]);

  // ── Alert Dashboard logic ──
  const criticalRules = useMemo(() => rules.filter(r => {
    const s = stockMap[r.item_id] || 0;
    return s <= r.safety_stock && r.is_active;
  }), [rules, stockMap]);

  const reorderRules = useMemo(() => rules.filter(r => {
    const s = stockMap[r.item_id] || 0;
    return s > r.safety_stock && s <= r.min_stock && r.is_active;
  }), [rules, stockMap]);

  const alertBadgeCount = criticalRules.length + reorderRules.length;

  const openCreateRule = () => {
    setRuleForm({ item_id: '', item_code: '', item_name: '', godown_id: '', godown_name: '', department_tag_id: '', department_tag_name: '', min_stock: 0, max_stock: 0, reorder_qty: 0, safety_stock: 0, lead_time_days: 7, priority: 'normal', is_active: true });
    setEditRule(null); setRuleOpen(true);
  };

  const openEditRule = (r: LocationReorderRule) => {
    setRuleForm({ item_id: r.item_id, item_code: r.item_code, item_name: r.item_name, godown_id: r.godown_id, godown_name: r.godown_name, department_tag_id: r.department_tag_id || '', department_tag_name: r.department_tag_name || '', min_stock: r.min_stock, max_stock: r.max_stock, reorder_qty: r.reorder_qty, safety_stock: r.safety_stock, lead_time_days: r.lead_time_days, priority: r.priority, is_active: r.is_active });
    setEditRule(r); setRuleOpen(true);
  };

  const handleSaveRule = () => {
    if (!ruleForm.item_id) { toast.error('Select an item'); return; }
    if (ruleForm.min_stock <= 0) { toast.error('Min stock must be greater than 0'); return; }
    const now = new Date().toISOString();
    if (editRule) {
      const u = rules.map(x => x.id === editRule.id ? { ...x, ...ruleForm, updated_at: now } : x);
      setRules(u); saveRules(u); toast.success('Rule updated');
    } else {
      const nr: LocationReorderRule = { ...ruleForm, id: `rr-${Date.now()}`, department_tag_id: ruleForm.department_tag_id || null, department_tag_name: ruleForm.department_tag_name || null, created_at: now, updated_at: now };
      const u = [nr, ...rules]; setRules(u); saveRules(u); toast.success('Reorder rule created');
    }
    setRuleOpen(false);
  };

  const raisePO = (rule: LocationReorderRule) => {
    const item = items.find(i => i.id === rule.item_id);
    const stdRate = item?.std_purchase_rate;
    toast.info(`Raising PO for ${rule.item_name} — Qty: ${rule.reorder_qty}${stdRate ? ', Rate: ₹' + stdRate : ''} — Build A.6 to create POs`, { description: '[JWT] POST /api/procurement/purchase-orders/from-reorder/:ruleId' });
  };

  const addDeptTag = () => {
    if (!newTagName.trim()) { toast.error('Tag name required'); return; }
    const nt: DepartmentTag = { id: `dt-${Date.now()}`, name: newTagName.trim(), color: newTagColor, is_system: false, created_at: new Date().toISOString() };
    const u = [...deptTags, nt]; setDeptTags(u); saveTags(u);
    toast.success(`${newTagName} tag created`);
    setNewTagName(''); setTagOpen(false);
  };

  const filteredItems = useMemo(() => items.filter(i => {
    const q = itemSearch.toLowerCase();
    return !q || i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q);
  }).slice(0, 15), [items, itemSearch]);

  // Dept view
  const deptView = useMemo(() => {
    const agg: Record<string, { tag: DepartmentTag; items: Record<string, { item: InventoryItem | undefined; totalStock: number; totalMin: number }> }> = {};
    rules.filter(r => r.department_tag_id).forEach(r => {
      const tag = deptTags.find(t => t.id === r.department_tag_id);
      if (!tag) return;
      if (!agg[r.department_tag_id!]) agg[r.department_tag_id!] = { tag, items: {} };
      if (!agg[r.department_tag_id!].items[r.item_id])
        agg[r.department_tag_id!].items[r.item_id] = { item: items.find(i => i.id === r.item_id), totalStock: 0, totalMin: 0 };
      agg[r.department_tag_id!].items[r.item_id].totalStock += (stockMap[r.item_id] || 0);
      agg[r.department_tag_id!].items[r.item_id].totalMin += r.min_stock;
    });
    return agg;
  }, [rules, deptTags, items, stockMap]);

  // Rate alerts
  const rateAlerts = useMemo(() => ({
    missingMRP: items.filter(i => !i.mrp && ['Finished Goods', 'Packaging Material'].includes(i.item_type || '')),
    missingStdSell: items.filter(i => !i.std_selling_rate),
    missingStdPurch: items.filter(i => !i.std_purchase_rate),
    belowCost: items.filter(i => { const sc = i.std_cost_rate; const ss = i.std_selling_rate; return sc && ss && ss < sc; }),
  }), [items]);

  // Matrix: compute status per filtered item from SAVED rules
  const getItemStatus = useCallback((item: InventoryItem) => {
    const rule = getExistingRule(item.id);
    const currStock = stockMap[item.id] || 0;
    if (!rule) return { label: 'No Rule', color: '', icon: '·' };
    return getStockStatus(currStock, rule.min_stock, rule.max_stock, rule.safety_stock);
  }, [getExistingRule, stockMap]);

  const matrixCriticalCount = useMemo(() =>
    filteredMatrixItems.filter(i => getItemStatus(i).label === 'Critical').length
  , [filteredMatrixItems, getItemStatus]);

  const matrixReorderCount = useMemo(() =>
    filteredMatrixItems.filter(i => getItemStatus(i).label === 'Reorder Now').length
  , [filteredMatrixItems, getItemStatus]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><AlertTriangle className="h-6 w-6" />Reorder & Min-Max Alerts</h1>
          <p className="text-sm text-muted-foreground">Matrix-based threshold setup + alert monitoring</p>
        </div>
        <div className="flex gap-2">
          {mainTab === 'alerts' && (
            <>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setTagOpen(true)}>
                <Tag className="h-4 w-4" />Manage Tags
              </Button>
              <Button size="sm" className="gap-1" onClick={openCreateRule}>
                <Plus className="h-4 w-4" />New Rule
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats cards — always visible */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={criticalRules.length > 0 ? 'border-red-200 dark:border-red-800' : ''}>
          <CardHeader className="pb-2"><CardDescription>Critical (Below Safety)</CardDescription>
            <CardTitle className="text-2xl text-red-600">{criticalRules.length}</CardTitle></CardHeader>
        </Card>
        <Card className={reorderRules.length > 0 ? 'border-amber-200 dark:border-amber-800' : ''}>
          <CardHeader className="pb-2"><CardDescription>Reorder Now</CardDescription>
            <CardTitle className="text-2xl text-amber-600">{reorderRules.length}</CardTitle></CardHeader>
        </Card>
        <Card><CardHeader className="pb-2"><CardDescription>Active Rules</CardDescription>
          <CardTitle className="text-2xl">{rules.filter(r => r.is_active).length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Rate Alerts</CardDescription>
          <CardTitle className={`text-2xl ${(rateAlerts.missingMRP.length + rateAlerts.belowCost.length) > 0 ? 'text-amber-600' : ''}`}>
            {rateAlerts.missingMRP.length + rateAlerts.belowCost.length}
          </CardTitle></CardHeader></Card>
      </div>

      {/* Main tab toggle — segmented control */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 w-fit">
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mainTab === 'matrix' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setMainTab('matrix')}
        >
          <Grid3X3 className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />Reorder Matrix
        </button>
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors relative ${mainTab === 'alerts' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setMainTab('alerts')}
        >
          <AlertTriangle className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />Alert Dashboard
          {alertBadgeCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">
              {alertBadgeCount}
            </span>
          )}
        </button>
      </div>

      {/* ═══════════ REORDER MATRIX TAB ═══════════ */}
      {mainTab === 'matrix' && (
        <div className="space-y-4">
          {/* View toggle + filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 bg-muted/40 rounded-md p-0.5">
              {([
                { v: 'global' as ViewMode, l: 'Global' },
                { v: 'per_location' as ViewMode, l: 'Per Location' },
                { v: 'by_department' as ViewMode, l: 'By Department' },
              ]).map(({ v, l }) => (
                <button key={v}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === v ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setViewMode(v)}
                >{l}</button>
              ))}
            </div>

            {viewMode === 'per_location' && (
              <Select value={selectedGodown} onValueChange={setSelectedGodown}>
                <SelectTrigger className="w-48 h-8 text-xs"><SelectValue placeholder="Select godown..." /></SelectTrigger>
                <SelectContent>
                  {godowns.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            <Select value={matrixGroupFilter} onValueChange={setMatrixGroupFilter}>
              <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Stock Group" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock Groups</SelectItem>
                {stockGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8 h-8 text-xs" placeholder="Search items..." value={matrixSearch} onChange={e => setMatrixSearch(e.target.value)} />
            </div>

            <div className="ml-auto flex items-center gap-2">
              {viewMode === 'per_location' && selectedGodown && (
                <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={copyGlobalToGodown}>
                  <Copy className="h-3.5 w-3.5" />Copy Global → {godowns.find((g: any) => g.id === selectedGodown)?.name?.slice(0, 12)}
                </Button>
              )}
              {pendingCount > 0 && (
                <Button size="sm" className="h-8 gap-1 text-xs" onClick={saveAllMatrix}>
                  <Save className="h-3.5 w-3.5" />Save All Changes ({pendingCount})
                </Button>
              )}
            </div>
          </div>

          {/* Matrix grid */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[65vh]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      {['⚡', 'Code', 'Item Name', 'UOM', 'Curr Stock', 'Safety Stock', 'Min / Reorder', 'Max Stock', 'Reorder Qty', 'Lead Days', 'Department', 'Priority'].map(h => (
                        <TableHead key={h} className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMatrixItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-16 text-muted-foreground">
                          <Grid3X3 className="h-10 w-10 mx-auto mb-3 opacity-20" />
                          <p className="text-sm font-semibold text-foreground mb-1">No items match filters</p>
                          <p className="text-xs">Adjust stock group or search to see items</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredMatrixItems.map(item => {
                      const rule = getExistingRule(item.id);
                      const key = `${item.id}|${viewKey}`;
                      const pending = pendingMatrix[key];
                      const isPending = !!pending;
                      const currStock = stockMap[item.id] || 0;
                      const status = getItemStatus(item);

                      const getVal = (field: keyof ThresholdRow): string => {
                        if (pending && pending[field] !== undefined && pending[field] !== '') return String(pending[field]);
                        if (rule) return String((rule as any)[field] || '');
                        return '';
                      };

                      const isFieldPending = (field: keyof ThresholdRow): boolean => {
                        if (!pending) return false;
                        const pv = pending[field];
                        const rv = rule ? String((rule as any)[field] || '') : '';
                        return pv !== undefined && pv !== '' && String(pv) !== rv;
                      };

                      const numCellClass = (field: keyof ThresholdRow) =>
                        `h-7 w-20 text-xs font-mono text-right px-1.5 ${isFieldPending(field) ? 'bg-amber-50 border-amber-400 dark:bg-amber-950/30 dark:border-amber-600' : ''}`;

                      const stockColor = status.label === 'Critical' ? 'text-red-600 font-bold' :
                        status.label === 'Reorder Now' ? 'text-amber-600 font-semibold' : '';

                      return (
                        <TableRow key={item.id} className={isPending ? 'bg-amber-500/5' : ''}>
                          <TableCell className="text-center text-sm px-2" title={status.label}>{status.icon}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">{item.code}</TableCell>
                          <TableCell className="text-sm font-medium max-w-[200px] truncate" title={item.name}>{item.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{item.primary_uom_symbol || 'Nos'}</TableCell>
                          <TableCell className={`text-xs font-mono ${stockColor}`}>{currStock.toLocaleString('en-IN')}</TableCell>

                          {/* Editable threshold cells */}
                          {(['safety_stock', 'min_stock', 'max_stock', 'reorder_qty', 'lead_time_days'] as const).map(field => (
                            <TableCell key={field} className="px-1">
                              <Input
                                type="number"
                                min="0"
                                className={numCellClass(field)}
                                defaultValue={getVal(field)}
                                onFocus={e => e.target.select()}
                                onBlur={e => handleMatrixCell(item, field, e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                              />
                            </TableCell>
                          ))}

                          {/* Department inline select */}
                          <TableCell className="px-1">
                            <Select
                              value={pending?.department_tag_id || rule?.department_tag_id || 'none'}
                              onValueChange={v => handleMatrixSelect(item, 'department_tag_id', v === 'none' ? '' : v)}
                            >
                              <SelectTrigger className="h-7 w-32 text-xs border-0 bg-transparent shadow-none">
                                <SelectValue placeholder="—" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">—</SelectItem>
                                {deptTags.map(t => (
                                  <SelectItem key={t.id} value={t.id}>
                                    <span className="flex items-center gap-1.5"><span style={{ color: t.color }}>●</span>{t.name}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Priority inline select */}
                          <TableCell className="px-1">
                            <Select
                              value={pending?.priority || rule?.priority || 'normal'}
                              onValueChange={v => handleMatrixSelect(item, 'priority', v)}
                            >
                              <SelectTrigger className="h-7 w-24 text-xs border-0 bg-transparent shadow-none">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="critical">Critical</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="normal">Normal</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              {pendingCount > 0 && <span className="text-amber-600 font-medium">{pendingCount} pending change{pendingCount !== 1 ? 's' : ''}</span>}
              {matrixCriticalCount > 0 && <span className="text-red-600">🔴 {matrixCriticalCount} critical</span>}
              {matrixReorderCount > 0 && <span className="text-amber-600">🟠 {matrixReorderCount} reorder</span>}
            </div>
            <span>Status reflects saved thresholds, not pending changes</span>
          </div>
        </div>
      )}

      {/* ═══════════ ALERT DASHBOARD TAB ═══════════ */}
      {mainTab === 'alerts' && (
        <Tabs defaultValue="item">
          <TabsList>
            <TabsTrigger value="item"><TrendingDown className="h-3.5 w-3.5 mr-1" />Item View ({rules.length})</TabsTrigger>
            <TabsTrigger value="location"><MapPin className="h-3.5 w-3.5 mr-1" />Location View</TabsTrigger>
            <TabsTrigger value="department"><Layers className="h-3.5 w-3.5 mr-1" />Department View</TabsTrigger>
            <TabsTrigger value="rate_alerts"><AlertTriangle className="h-3.5 w-3.5 mr-1" />Rate Alerts
              ({rateAlerts.missingMRP.length + rateAlerts.missingStdSell.length + rateAlerts.missingStdPurch.length + rateAlerts.belowCost.length})</TabsTrigger>
          </TabsList>

          {/* TAB: Item View */}
          <TabsContent value="item" className="mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8 h-9" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <Card><CardContent className="p-0"><Table>
              <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
                {['Item', 'Godown', 'Department', 'Current Stock', 'Min', 'Max', 'Safety', 'Shortage', 'Lead Time', 'Priority', 'Status', ''].map(h => (
                  <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider whitespace-nowrap">{h}</TableHead>
                ))}
              </TableRow></TableHeader>
              <TableBody>
                {rules.length === 0 ? (
                  <TableRow><TableCell colSpan={12} className="text-center py-16 text-muted-foreground">
                    <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-semibold text-foreground mb-1">No reorder rules yet</p>
                    <p className="text-xs mb-4">Create rules to get alerts when stock falls below minimum levels</p>
                    <Button size="sm" onClick={openCreateRule}><Plus className="h-4 w-4 mr-1" />New Rule</Button>
                  </TableCell></TableRow>
                ) : rules.filter(r => { const q = search.toLowerCase(); return !q || r.item_name.toLowerCase().includes(q) || r.item_code.toLowerCase().includes(q); }).map(rule => {
                  const currStock = stockMap[rule.item_id] || 0;
                  const shortage = Math.max(0, rule.min_stock - currStock);
                  const status = getStockStatus(currStock, rule.min_stock, rule.max_stock, rule.safety_stock);
                  return (
                    <TableRow key={rule.id} className="group">
                      <TableCell className="font-medium text-sm">{rule.item_name}<div className="text-xs font-mono text-muted-foreground">{rule.item_code}</div></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{rule.godown_name || '—'}</TableCell>
                      <TableCell>
                        {rule.department_tag_name ? (
                          <Badge style={{ backgroundColor: deptTags.find(t => t.id === rule.department_tag_id)?.color + '22', color: deptTags.find(t => t.id === rule.department_tag_id)?.color }} className="text-xs border-0">{rule.department_tag_name}</Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{currStock.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{rule.min_stock.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{rule.max_stock.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{rule.safety_stock.toLocaleString('en-IN')}</TableCell>
                      <TableCell className={`text-xs font-mono font-medium ${shortage > 0 ? 'text-red-600' : ''}`}>{shortage > 0 ? shortage.toLocaleString('en-IN') : '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{rule.lead_time_days}d</TableCell>
                      <TableCell><Badge className={`text-xs ${PRIORITY_COLORS[rule.priority]}`}>{rule.priority}</Badge></TableCell>
                      <TableCell><Badge className={`text-xs ${status.color}`}>{status.icon} {status.label}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {shortage > 0 && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Raise PO" onClick={() => raisePO(rule)}>
                              <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditRule(rule)}>
                            <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            const u = rules.filter(x => x.id !== rule.id); setRules(u); saveRules(u); toast.success('Rule deleted');
                          }}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table></CardContent></Card>
          </TabsContent>

          {/* TAB: Location View */}
          <TabsContent value="location" className="mt-4">
            <Card><CardContent className="p-0"><Table>
              <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
                {['Item', 'Godown', 'Department', 'Current', 'Min', 'Safety', 'Shortage', 'Status', 'Action'].map(h => (
                  <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
                ))}
              </TableRow></TableHeader>
              <TableBody>
                {rules.map(rule => {
                  const currStock = stockMap[rule.item_id] || 0;
                  const shortage = Math.max(0, rule.min_stock - currStock);
                  const status = getStockStatus(currStock, rule.min_stock, rule.max_stock, rule.safety_stock);
                  return (
                    <TableRow key={rule.id} className={`${status.label === 'Critical' ? 'bg-red-500/5' : status.label === 'Reorder Now' ? 'bg-amber-500/5' : ''}`}>
                      <TableCell className="text-sm font-medium">{rule.item_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{rule.godown_name || 'Default'}</TableCell>
                      <TableCell>
                        {rule.department_tag_name ? (
                          <span className="text-xs" style={{ color: deptTags.find(t => t.id === rule.department_tag_id)?.color }}>● {rule.department_tag_name}</span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-semibold">{currStock.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{rule.min_stock.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{rule.safety_stock.toLocaleString('en-IN')}</TableCell>
                      <TableCell className={`text-xs font-mono ${shortage > 0 ? 'text-red-600 font-medium' : ''}`}>{shortage || '—'}</TableCell>
                      <TableCell><Badge className={`text-xs ${status.color}`}>{status.icon} {status.label}</Badge></TableCell>
                      <TableCell>
                        {shortage > 0 && (
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => raisePO(rule)}>
                            <ShoppingCart className="h-3 w-3" />Raise PO
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table></CardContent></Card>
          </TabsContent>

          {/* TAB: Department View */}
          <TabsContent value="department" className="mt-4 space-y-4">
            {Object.entries(deptView).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Layers className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-semibold text-foreground mb-1">No department rules yet</p>
                <p className="text-xs">When creating reorder rules, assign a department tag to see aggregated department stock here</p>
              </div>
            ) : Object.entries(deptView).map(([tagId, { tag, items: deptItems }]) => (
              <Card key={tagId}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span style={{ color: tag.color }}>●</span>{tag.name}
                    <span className="text-xs text-muted-foreground font-normal">{Object.keys(deptItems).length} items</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader><TableRow>
                      {['Item', 'Dept. Total Stock', 'Dept. Min Required', 'Shortage', 'Status'].map(h => (
                        <TableHead key={h} className="text-xs font-semibold uppercase">{h}</TableHead>
                      ))}
                    </TableRow></TableHeader>
                    <TableBody>
                      {Object.entries(deptItems).map(([itemId, { item, totalStock, totalMin }]) => {
                        const shortage = Math.max(0, totalMin - totalStock);
                        return (
                          <TableRow key={itemId}>
                            <TableCell className="text-sm font-medium">{item?.name || itemId}</TableCell>
                            <TableCell className="text-xs font-mono font-semibold">{totalStock.toLocaleString('en-IN')}</TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground">{totalMin.toLocaleString('en-IN')}</TableCell>
                            <TableCell className={`text-xs font-mono ${shortage > 0 ? 'text-red-600 font-medium' : ''}`}>{shortage || '—'}</TableCell>
                            <TableCell>
                              <Badge className={`text-xs ${shortage > 0 ? 'bg-amber-500/10 text-amber-700' : 'bg-emerald-500/10 text-emerald-700'}`}>
                                {shortage > 0 ? '⚠ Below Min' : '✓ OK'}
                              </Badge>
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

          {/* TAB: Rate Alerts */}
          <TabsContent value="rate_alerts" className="mt-4 space-y-4">
            {([
              { title: 'Missing MRP', desc: 'Finished Goods and Packaging items without MRP – Legal Metrology Act risk', items: rateAlerts.missingMRP, borderClass: 'border-amber-200 dark:border-amber-800', iconClass: 'text-amber-600', badgeClass: 'bg-amber-500/10 text-amber-700' },
              { title: 'Missing Std Selling Rate', desc: 'Items with no standard selling price – staff must manually enter price on every invoice', items: rateAlerts.missingStdSell, borderClass: 'border-amber-200 dark:border-amber-800', iconClass: 'text-amber-600', badgeClass: 'bg-amber-500/10 text-amber-700' },
              { title: 'Missing Std Purchase Rate', desc: 'Items with no standard purchase rate – staff must manually enter rate on every PO', items: rateAlerts.missingStdPurch, borderClass: 'border-slate-200 dark:border-slate-800', iconClass: 'text-slate-600', badgeClass: 'bg-slate-500/10 text-slate-700' },
              { title: 'Selling Below Cost', desc: 'Std Selling Rate is below Std Cost Rate – margin warning', items: rateAlerts.belowCost, borderClass: 'border-red-200 dark:border-red-800', iconClass: 'text-red-600', badgeClass: 'bg-red-500/10 text-red-700' },
            ] as const).map(alert => (
              <Card key={alert.title} className={alert.items.length > 0 ? alert.borderClass : ''}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {alert.items.length > 0 && <AlertTriangle className={`h-4 w-4 ${alert.iconClass}`} />}
                    {alert.title}
                    <Badge className={`text-xs ${alert.items.length > 0 ? alert.badgeClass : 'bg-emerald-500/10 text-emerald-700'}`}>
                      {alert.items.length > 0 ? `${alert.items.length} items` : 'All clear ✓'}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">{alert.desc}</CardDescription>
                </CardHeader>
                {alert.items.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-2">
                      {alert.items.slice(0, 20).map(item => (
                        <Badge key={item.id} variant="outline" className="text-xs">{item.code} — {item.name}</Badge>
                      ))}
                      {alert.items.length > 20 && <Badge variant="outline" className="text-xs">+{alert.items.length - 20} more</Badge>}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}

      {/* Rule Create/Edit Dialog */}
      <Dialog open={ruleOpen} onOpenChange={setRuleOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editRule ? 'Edit Reorder Rule' : 'New Reorder Rule'}</DialogTitle>
            <DialogDescription>Set min/max stock levels and lead time for location-wise monitoring</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Item *</Label>
              {ruleForm.item_id ? (
                <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30">
                  <div className="flex-1"><p className="text-sm font-medium">{ruleForm.item_name}</p><p className="text-xs font-mono text-muted-foreground">{ruleForm.item_code}</p></div>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setRuleForm(f => ({ ...f, item_id: '', item_code: '', item_name: '' }))}>Change</Button>
                </div>
              ) : (
                <>
                  <Input placeholder="Search items..." value={itemSearch} onChange={e => setItemSearch(e.target.value)} />
                  {itemSearch && filteredItems.length > 0 && (
                    <div className="border rounded-lg overflow-hidden max-h-32 overflow-y-auto">
                      {filteredItems.map(i => (
                        <button key={i.id} className="w-full text-left px-3 py-2 hover:bg-muted/50 border-b last:border-0"
                          onClick={() => { setRuleForm(f => ({ ...f, item_id: i.id, item_code: i.code, item_name: i.name, reorder_qty: i.moq || 10, lead_time_days: i.lead_time_days || 7, safety_stock: i.safety_stock || 0, min_stock: i.reorder_level || 0, max_stock: i.max_stock_level || 0 })); setItemSearch(''); }}>
                          <p className="text-sm">{i.name}</p><p className="text-xs font-mono text-muted-foreground">{i.code}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Godown</Label>
              <Select value={ruleForm.godown_id || 'default'} onValueChange={v => { const g = godowns.find((x: any) => x.id === v); setRuleForm(f => ({ ...f, godown_id: v, godown_name: g?.name || 'Default' })); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Warehouse</SelectItem>
                  {godowns.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Department Tag</Label>
              <Select value={ruleForm.department_tag_id || 'none'} onValueChange={v => { const t = deptTags.find(x => x.id === v); setRuleForm(f => ({ ...f, department_tag_id: v === 'none' ? '' : v, department_tag_name: t?.name || '' })); }}>
                <SelectTrigger><SelectValue placeholder="Optional — for department view" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No Department —</SelectItem>
                  {deptTags.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="flex items-center gap-2"><span style={{ color: t.color }}>●</span>{t.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              {[
                { f: 'safety_stock', l: 'Safety Stock', d: 'Buffer before stockout' },
                { f: 'min_stock', l: 'Min / Reorder Level', d: 'Trigger reorder when stock falls here' },
                { f: 'max_stock', l: 'Max Stock', d: 'Over-stock alert above this' },
                { f: 'reorder_qty', l: 'Reorder Qty', d: 'How much to order' },
              ].map(({ f, l, d }) => (
                <div key={f} className="space-y-1">
                  <Label className="text-xs">{l}</Label>
                  <Input type="number" min="0" className="h-8 text-xs" value={(ruleForm as any)[f] || ''}
                    onChange={e => setRuleForm(ff => ({ ...ff, [f]: parseFloat(e.target.value) || 0 }))} />
                  <p className="text-[10px] text-muted-foreground">{d}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Lead Time (days)</Label>
                <Input type="number" min="1" value={ruleForm.lead_time_days}
                  onChange={e => setRuleForm(f => ({ ...f, lead_time_days: parseInt(e.target.value) || 1 }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={ruleForm.priority} onValueChange={v => setRuleForm(f => ({ ...f, priority: v as ReorderPriority }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRule}>{editRule ? 'Update' : 'Create'} Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Department Tag Manager Dialog */}
      <Dialog open={tagOpen} onOpenChange={setTagOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Department Tags</DialogTitle>
            <DialogDescription>Manage tags for grouping godowns by department</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              {deptTags.map(tag => (
                <div key={tag.id} className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <span style={{ color: tag.color }} className="text-lg">●</span>
                    <span className="text-sm font-medium">{tag.name}</span>
                    {tag.is_system && <Badge variant="outline" className="text-[10px]">System</Badge>}
                  </div>
                  {!tag.is_system && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const u = deptTags.filter(t => t.id !== tag.id); setDeptTags(u); saveTags(u); toast.success(`${tag.name} removed`); }}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add New Tag</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Tag Name</Label>
                <Input className="h-8 text-sm" placeholder="e.g. Assembly Line" value={newTagName} onChange={e => setNewTagName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Colour</Label>
                <Input type="color" className="h-8 cursor-pointer p-1" value={newTagColor} onChange={e => setNewTagColor(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTagOpen(false)}>Close</Button>
            <Button size="sm" onClick={addDeptTag} disabled={!newTagName.trim()}>Add Tag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ReorderAlerts() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader /><main className="flex-1"><ReorderAlertsPanel /></main>
      </div>
    </SidebarProvider>
  );
}
