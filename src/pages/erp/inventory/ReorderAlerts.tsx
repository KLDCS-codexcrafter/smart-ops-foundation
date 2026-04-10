import { useState, useMemo } from 'react';
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
import { AlertTriangle, Plus, Search, Edit2, Trash2, TrendingDown, MapPin, Layers, ShoppingCart, Tag } from 'lucide-react';
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
  localStorage.setItem(DTKEY, JSON.stringify(DEFAULT_DEPT_TAGS));
  return DEFAULT_DEPT_TAGS;
};

const PRIORITY_COLORS: Record<ReorderPriority, string> = {
  critical: 'bg-red-500/10 text-red-700',
  high: 'bg-amber-500/10 text-amber-700',
  normal: 'bg-slate-500/10 text-slate-600',
};

export function ReorderAlertsPanel() {
  const [rules, setRules] = useState<LocationReorderRule[]>(ls(RRKEY));
  // [JWT] GET /api/inventory/reorder-rules
  const [deptTags, setDeptTags] = useState<DepartmentTag[]>(initDeptTags);
  const [items] = useState<InventoryItem[]>(ls(IKEY));
  const [stockLedger] = useState<any[]>(ls(SLKEY));
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

  // Compute current stock per item from stock ledger
  const stockMap = useMemo(() => {
    const m: Record<string, number> = {};
    stockLedger.forEach(e => {
      if (!m[e.item_id]) m[e.item_id] = 0;
      m[e.item_id] += (e.qty_in || 0) - (e.qty_out || 0);
    });
    return m;
  }, [stockLedger]);

  const getStockStatus = (currentStock: number, min: number, max: number, safety: number) => {
    if (currentStock <= safety) return { label: 'Critical', color: 'bg-red-500/10 text-red-700', icon: '🔴' };
    if (currentStock <= min) return { label: 'Reorder Now', color: 'bg-amber-500/10 text-amber-700', icon: '🟠' };
    if (currentStock <= min * 1.2) return { label: 'Watch', color: 'bg-yellow-500/10 text-yellow-700', icon: '🟡' };
    if (currentStock >= max) return { label: 'Overstock', color: 'bg-blue-500/10 text-blue-700', icon: '🔵' };
    return { label: 'OK', color: 'bg-emerald-500/10 text-emerald-700', icon: '🟢' };
  };

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
      // [JWT] PATCH /api/inventory/reorder-rules/:id
    } else {
      const nr: LocationReorderRule = { ...ruleForm, id: `rr-${Date.now()}`, department_tag_id: ruleForm.department_tag_id || null, department_tag_name: ruleForm.department_tag_name || null, created_at: now, updated_at: now };
      const u = [nr, ...rules]; setRules(u); saveRules(u); toast.success('Reorder rule created');
      // [JWT] POST /api/inventory/reorder-rules
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

  // Alert computations
  const criticalRules = rules.filter(r => { const s = stockMap[r.item_id] || 0; return s <= r.safety_stock && r.is_active; });
  const reorderRules = rules.filter(r => { const s = stockMap[r.item_id] || 0; return s > r.safety_stock && s <= r.min_stock && r.is_active; });

  // Department view — aggregate by dept tag
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

  return (
    <div className="max-w-7xl mx-auto space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><AlertTriangle className="h-6 w-6" />Reorder & Min-Max Alerts</h1>
          <p className="text-sm text-muted-foreground">3-tier reorder monitoring: item level, location level, and department level</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setTagOpen(true)}>
            <Tag className="h-4 w-4" />Manage Tags
          </Button>
          <Button size="sm" className="gap-1" onClick={openCreateRule}>
            <Plus className="h-4 w-4" />New Rule
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="pb-2"><CardDescription>Critical (Below Safety)</CardDescription>
            <CardTitle className="text-2xl text-red-600">{criticalRules.length}</CardTitle></CardHeader>
        </Card>
        <Card className="border-amber-200 dark:border-amber-800">
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

      <Tabs defaultValue="item">
        <TabsList>
          <TabsTrigger value="item"><TrendingDown className="h-3.5 w-3.5 mr-1" />Item View ({rules.length})</TabsTrigger>
          <TabsTrigger value="location"><MapPin className="h-3.5 w-3.5 mr-1" />Location View</TabsTrigger>
          <TabsTrigger value="department"><Layers className="h-3.5 w-3.5 mr-1" />Department View</TabsTrigger>
          <TabsTrigger value="rate_alerts"><AlertTriangle className="h-3.5 w-3.5 mr-1" />Rate Alerts
            ({rateAlerts.missingMRP.length + rateAlerts.missingStdSell.length + rateAlerts.belowCost.length})</TabsTrigger>
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
                          // [JWT] DELETE /api/inventory/reorder-rules/:id
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
          {[
            { title: 'Missing MRP', desc: 'Finished Goods and Packaging items without MRP – Legal Metrology Act risk', items: rateAlerts.missingMRP, color: 'amber' },
            { title: 'Missing Std Selling Rate', desc: 'Items with no standard selling price – staff must manually enter price on every invoice', items: rateAlerts.missingStdSell, color: 'amber' },
            { title: 'Missing Std Purchase Rate', desc: 'Items with no standard purchase rate – staff must manually enter rate on every PO', items: rateAlerts.missingStdPurch, color: 'slate' },
            { title: 'Selling Below Cost', desc: 'Std Selling Rate is below Std Cost Rate – margin warning', items: rateAlerts.belowCost, color: 'red' },
          ].map(alert => (
            <Card key={alert.title} className={alert.items.length > 0 ? 'border-amber-200 dark:border-amber-800' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  {alert.items.length > 0 && <AlertTriangle className="h-4 w-4 text-amber-600" />}
                  {alert.title}
                  <Badge className={`text-xs ${alert.items.length > 0 ? 'bg-amber-500/10 text-amber-700' : 'bg-emerald-500/10 text-emerald-700'}`}>
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

      {/* Rule Create/Edit Dialog */}
      <Dialog open={ruleOpen} onOpenChange={setRuleOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editRule ? 'Edit Reorder Rule' : 'New Reorder Rule'}</DialogTitle>
            <DialogDescription>Set min/max stock levels and lead time for location-wise monitoring</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* Item picker */}
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
            {/* Godown */}
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
            {/* Department Tag */}
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
            {/* Stock levels */}
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
