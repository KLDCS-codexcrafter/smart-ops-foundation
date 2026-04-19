/**
 * DistributorHierarchyMaster.tsx — Tenant-internal visual tree editor
 * Sprint 11a. Route: /erp/distributor-hub/hierarchy
 * Indigo-600 accent. Panel export pattern.
 * [JWT] GET/POST /api/erp/distributor/hierarchy
 */
import { useEffect, useMemo, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Crown, Truck, Store, ShoppingBag, Plus, Save, Search, Network, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import {
  hierarchyNodesKey, HIERARCHY_ROLE_LABELS, HIERARCHY_ROLE_COLOURS,
  type HierarchyNode, type HierarchyRole,
} from '@/types/distributor-hierarchy';
import {
  buildTree, canAssignParent, wouldCreateCycle, computeNodePath, computeDepth,
  type HierarchyTreeNode,
} from '@/lib/hierarchy-engine';

interface CustomerLite { id: string; partyCode: string; partyName: string; }

const ROLE_ICON: Record<HierarchyRole, typeof Crown> = {
  super_stockist: Crown,
  distributor: Truck,
  sub_dealer: Store,
  retailer: ShoppingBag,
};

function loadCustomers(): CustomerLite[] {
  try {
    // [JWT] GET /api/masters/customers
    const raw = localStorage.getItem('erp_group_customer_master');
    if (!raw) return [];
    return (JSON.parse(raw) as CustomerLite[]).map(c => ({
      id: c.id, partyCode: c.partyCode, partyName: c.partyName,
    }));
  } catch { return []; }
}

function loadNodes(entityCode: string): HierarchyNode[] {
  try {
    // [JWT] GET /api/erp/distributor/hierarchy
    const raw = localStorage.getItem(hierarchyNodesKey(entityCode));
    return raw ? (JSON.parse(raw) as HierarchyNode[]) : [];
  } catch { return []; }
}

function persistNodes(entityCode: string, nodes: HierarchyNode[]): void {
  try {
    // [JWT] POST /api/erp/distributor/hierarchy
    localStorage.setItem(hierarchyNodesKey(entityCode), JSON.stringify(nodes));
  } catch { /* noop */ }
}

interface PanelProps { entityCode?: string; }

export function DistributorHierarchyMasterPanel({ entityCode = 'SMRT' }: PanelProps) {
  const customers = useMemo(() => loadCustomers(), []);
  const [nodes, setNodes] = useState<HierarchyNode[]>(() => loadNodes(entityCode));
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addCustomer, setAddCustomer] = useState<string>('');
  const [addRole, setAddRole] = useState<HierarchyRole>('distributor');
  const [addParent, setAddParent] = useState<string>('__none__');
  const [dirty, setDirty] = useState(false);

  const tree = useMemo(() => buildTree(nodes), [nodes]);
  const selected = useMemo(() => nodes.find(n => n.id === selectedId) ?? null, [nodes, selectedId]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter(c =>
      !q || c.partyName.toLowerCase().includes(q) || c.partyCode.toLowerCase().includes(q),
    );
  }, [customers, search]);

  const stats = useMemo(() => ({
    total: nodes.length,
    super_stockist: nodes.filter(n => n.role === 'super_stockist').length,
    distributor: nodes.filter(n => n.role === 'distributor').length,
    sub_dealer: nodes.filter(n => n.role === 'sub_dealer').length,
    retailer: nodes.filter(n => n.role === 'retailer').length,
  }), [nodes]);

  const handleSaveSelected = () => {
    if (!selected) return;
    const check = canAssignParent(selected.role, selected.parent_node_id
      ? nodes.find(n => n.id === selected.parent_node_id)?.role ?? null
      : null);
    if (!check.ok) { toast.error(check.reason ?? 'Invalid parent'); return; }
    if (selected.parent_node_id && wouldCreateCycle(selected.id, selected.parent_node_id, nodes)) {
      toast.error('Cycle detected — pick a different parent'); return;
    }
    // Recompute path/depth for self and descendants
    const updated = nodes.map(n => ({ ...n }));
    const recomputeAll = (list: HierarchyNode[]): HierarchyNode[] =>
      list.map(n => ({
        ...n,
        path: computeNodePath(n.id, list),
        depth: computeDepth(n.id, list),
        updated_at: new Date().toISOString(),
      }));
    const recomputed = recomputeAll(updated);
    setNodes(recomputed);
    persistNodes(entityCode, recomputed);
    setDirty(false);
    toast.success('Hierarchy saved');
  };

  useCtrlS(dirty ? handleSaveSelected : () => { /* noop */ });

  useEffect(() => {
    if (!selectedId && nodes.length > 0) setSelectedId(nodes[0].id);
  }, [nodes, selectedId]);

  const handleAddNode = () => {
    if (!addCustomer) { toast.error('Pick a customer'); return; }
    const cust = customers.find(c => c.id === addCustomer);
    if (!cust) { toast.error('Customer not found'); return; }
    const parentId = addParent === '__none__' ? null : addParent;
    const parentNode = parentId ? nodes.find(n => n.id === parentId) : null;
    const check = canAssignParent(addRole, parentNode?.role ?? null);
    if (!check.ok) { toast.error(check.reason ?? 'Invalid'); return; }
    const id = 'hn-' + Math.random().toString(36).slice(2, 10);
    const now = new Date().toISOString();
    const draft: HierarchyNode = {
      id,
      entity_id: entityCode,
      customer_id: cust.id,
      distributor_id: null,
      role: addRole,
      parent_node_id: parentId,
      path: parentNode ? `${parentNode.path}/${id}` : `/${id}`,
      depth: parentNode ? parentNode.depth + 1 : 0,
      display_name: cust.partyName,
      territory_id: null,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    const next = [...nodes, draft];
    setNodes(next);
    persistNodes(entityCode, next);
    setAddOpen(false);
    setSelectedId(id);
    setAddCustomer(''); setAddRole('distributor'); setAddParent('__none__');
    toast.success(`Added ${cust.partyName}`);
  };

  const handleExportCsv = () => {
    const header = 'id,role,display_name,parent_node_id,path,depth,is_active';
    const rows = nodes.map(n => [
      n.id, n.role, n.display_name.replace(/,/g, ' '),
      n.parent_node_id ?? '', n.path, String(n.depth), String(n.is_active),
    ].join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `hierarchy-${entityCode}-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const renderTree = (treeNodes: HierarchyTreeNode[], level: number = 0): JSX.Element[] =>
    treeNodes.map(({ node, children }) => {
      const Icon = ROLE_ICON[node.role];
      const isSel = node.id === selectedId;
      return (
        <div key={node.id}>
          <button
            type="button"
            onClick={() => setSelectedId(node.id)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors ${
              isSel
                ? 'bg-indigo-600/15 text-indigo-700 border border-indigo-600/30'
                : 'hover:bg-muted/60 border border-transparent'
            }`}
            style={{ paddingLeft: 8 + level * 18 }}
          >
            <ChevronRight className={`h-3 w-3 ${children.length ? '' : 'opacity-0'}`} />
            <Icon className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <span className="truncate flex-1 font-medium">{node.display_name}</span>
            <Badge variant="outline" className={`${HIERARCHY_ROLE_COLOURS[node.role]} text-[9px] px-1 py-0`}>
              {HIERARCHY_ROLE_LABELS[node.role]}
            </Badge>
          </button>
          {children.length > 0 && renderTree(children, level + 1)}
        </div>
      );
    });

  const validParentNodes = useMemo(
    () => nodes.filter(n =>
      addRole === 'super_stockist' ? false
      : addRole === 'distributor' ? n.role === 'super_stockist'
      : addRole === 'sub_dealer' ? n.role === 'distributor' || n.role === 'super_stockist'
      : n.role === 'sub_dealer' || n.role === 'distributor'
    ),
    [nodes, addRole],
  );

  return (
    <>
      <div className="space-y-4 animate-fade-in" data-keyboard-form>
        {/* Header band */}
        <div
          className="rounded-lg p-4 flex items-center justify-between"
          style={{ background: 'hsl(222 47% 11%)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-indigo-600/15">
              <Network className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Distribution Tree</h2>
              <p className="text-[11px] text-white/60">Define who reports to whom · {stats.total} nodes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCsv}>Export Tree</Button>
            <Button
              size="sm"
              data-primary
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />Add Node
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT — Customer picker */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                Customers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="relative">
                <Search className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-8 pl-7 text-xs"
                  placeholder="Search customer"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={onEnterNext}
                />
              </div>
              <div className="max-h-[420px] overflow-y-auto space-y-0.5">
                {filteredCustomers.slice(0, 200).map(c => {
                  const inTree = nodes.some(n => n.customer_id === c.id);
                  return (
                    <div
                      key={c.id}
                      className="text-[11px] px-2 py-1 rounded flex items-center justify-between hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{c.partyName}</p>
                        <p className="font-mono text-[9px] text-muted-foreground">{c.partyCode}</p>
                      </div>
                      {inTree
                        ? <Badge variant="outline" className="text-[8px] bg-indigo-600/10 text-indigo-700 border-indigo-600/30">In tree</Badge>
                        : <Button size="sm" variant="ghost" className="h-6 text-[10px] text-indigo-600" onClick={() => { setAddCustomer(c.id); setAddOpen(true); }}>Add</Button>}
                    </div>
                  );
                })}
                {filteredCustomers.length === 0 && (
                  <p className="text-[10px] text-muted-foreground py-2 text-center">No customers</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* CENTRE — Tree */}
          <Card className="lg:col-span-5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                Tree
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nodes.length === 0
                ? (
                  <div className="text-center py-10 text-xs text-muted-foreground">
                    <Network className="h-8 w-8 mx-auto mb-2 text-indigo-600/40" />
                    No nodes yet — click <span className="text-indigo-600 font-medium">Add Node</span> to start.
                  </div>
                )
                : <div className="space-y-0.5">{renderTree(tree)}</div>}
            </CardContent>
          </Card>

          {/* RIGHT — Detail */}
          <Card className="lg:col-span-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                Node Detail
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!selected
                ? <p className="text-xs text-muted-foreground py-4 text-center">Pick a node from the tree</p>
                : (
                  <>
                    <div>
                      <Label className="text-xs">Display Name</Label>
                      <Input
                        className="h-8 text-xs"
                        value={selected.display_name}
                        onKeyDown={onEnterNext}
                        onChange={e => {
                          setNodes(prev => prev.map(n => n.id === selected.id ? { ...n, display_name: e.target.value } : n));
                          setDirty(true);
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Role</Label>
                      <Select
                        value={selected.role}
                        onValueChange={v => {
                          setNodes(prev => prev.map(n => n.id === selected.id ? { ...n, role: v as HierarchyRole } : n));
                          setDirty(true);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(HIERARCHY_ROLE_LABELS) as HierarchyRole[]).map(r => (
                            <SelectItem key={r} value={r}>{HIERARCHY_ROLE_LABELS[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Parent</Label>
                      <Select
                        value={selected.parent_node_id ?? '__none__'}
                        onValueChange={v => {
                          const newParent = v === '__none__' ? null : v;
                          if (newParent && wouldCreateCycle(selected.id, newParent, nodes)) {
                            toast.error('Cycle detected'); return;
                          }
                          setNodes(prev => prev.map(n => n.id === selected.id ? { ...n, parent_node_id: newParent } : n));
                          setDirty(true);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— None (top of tree) —</SelectItem>
                          {nodes.filter(n => n.id !== selected.id).map(n => (
                            <SelectItem key={n.id} value={n.id}>
                              {n.display_name} ({HIERARCHY_ROLE_LABELS[n.role]})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Active</Label>
                      <Switch
                        checked={selected.is_active}
                        onCheckedChange={v => {
                          setNodes(prev => prev.map(n => n.id === selected.id ? { ...n, is_active: v } : n));
                          setDirty(true);
                        }}
                      />
                    </div>
                    <Button
                      data-primary
                      onClick={handleSaveSelected}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                      disabled={!dirty}
                    >
                      <Save className="h-3.5 w-3.5 mr-1" />Save Changes
                    </Button>
                    <p className="text-[9px] font-mono text-muted-foreground break-all">
                      Path: {selected.path}
                    </p>
                  </>
                )}
            </CardContent>
          </Card>
        </div>

        {/* Footer stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          {[
            { label: 'Total', val: stats.total },
            { label: 'Super Stockists', val: stats.super_stockist },
            { label: 'Distributors', val: stats.distributor },
            { label: 'Sub-Dealers', val: stats.sub_dealer },
            { label: 'Retailers', val: stats.retailer },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-3">
                <p className="text-[10px] uppercase text-muted-foreground tracking-wider">{s.label}</p>
                <p className="text-lg font-mono font-bold text-indigo-600">{s.val}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Add Node Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Add Hierarchy Node</DialogTitle>
            <DialogDescription>Place a customer in the distribution tree.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3" data-keyboard-form>
            <div>
              <Label className="text-xs">Customer</Label>
              <Select value={addCustomer} onValueChange={setAddCustomer}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.slice(0, 200).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.partyName} ({c.partyCode})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Role</Label>
              <Select value={addRole} onValueChange={v => setAddRole(v as HierarchyRole)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(HIERARCHY_ROLE_LABELS) as HierarchyRole[]).map(r => (
                    <SelectItem key={r} value={r}>{HIERARCHY_ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Parent</Label>
              <Select value={addParent} onValueChange={setAddParent}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None (top of tree) —</SelectItem>
                  {validParentNodes.map(n => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.display_name} ({HIERARCHY_ROLE_LABELS[n.role]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button data-primary className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleAddNode}>
              <Plus className="h-3.5 w-3.5 mr-1" />Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function DistributorHierarchyMaster() {
  return <DistributorHierarchyMasterPanel entityCode="SMRT" />;
}
