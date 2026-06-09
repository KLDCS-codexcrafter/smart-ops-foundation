/**
 * @file     src/pages/tower/ProvisioningManager.tsx
 * @sprint   SP.3 · T-SP3-Provisioning
 * @purpose  Super-admin Request/Provisioning Manager + 4-level Account Hierarchy.
 *           CONSUMES product-variant-engine + partner-portal-engine + card-entitlement.
 * @canon    Provisioning = STATUS-TRACK ONLY (Tier-L · honest Wave-2 banner).
 */
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle, CheckCircle2, Plus, RefreshCcw, Server, Users2,
  Network, PauseCircle, PlayCircle, ArrowRightCircle, Boxes,
} from 'lucide-react';
import { TowerLayout } from '@/components/layout/TowerLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  PROVISIONING_HONESTY,
  PROVISION_REQUEST_TYPES,
  type ProvisionRequest,
  type ProvisionRequestType,
  type ProvisionRequestStatus,
  type AccountNode,
} from '@/types/provisioning';
import {
  listProvisionRequests,
  createProvisionRequest,
  setRequestStatus,
  setRequestVariant,
  approveAndProvision,
  convertDemoToFinal,
  listAccountNodes,
  createAccountNode,
  ensureSuperAdminRoot,
  buildHierarchyTree,
  importPartnerClientsAsNodes,
  type HierarchyTreeNode,
} from '@/lib/provisioning-engine';
import { listVariants } from '@/lib/product-variant-engine';
import type { ProductVariant } from '@/types/product-variant';

const ENTITY = 'demo-entity';

const TYPE_LABEL: Record<ProvisionRequestType, string> = {
  demo: 'Demo',
  final_copy: 'Final Copy',
  channel_partner: 'Channel Partner',
  client: 'Direct Client',
  client_of_partner: 'Client of Partner',
};

const TYPE_BADGE: Record<ProvisionRequestType, string> = {
  demo: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  final_copy: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  channel_partner: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  client: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  client_of_partner: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
};

const STATUS_BADGE: Record<ProvisionRequestStatus, string> = {
  requested: 'bg-slate-500/15 text-slate-300 border-slate-500/20',
  approved: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  provisioned: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  suspended: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
};

const NODE_BADGE: Record<AccountNode['type'], string> = {
  super_admin: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  channel_partner: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  client: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  client_of_partner: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
};

export default function ProvisioningManager() {
  const [requests, setRequests] = useState<ProvisionRequest[]>([]);
  const [nodes, setNodes] = useState<AccountNode[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [filterType, setFilterType] = useState<ProvisionRequestType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ProvisionRequestStatus | 'all'>('all');

  // create-request dialog
  const [newOpen, setNewOpen] = useState(false);
  const [newType, setNewType] = useState<ProvisionRequestType>('demo');
  const [newName, setNewName] = useState('');
  const [newVariant, setNewVariant] = useState<string>('');
  const [newPartner, setNewPartner] = useState<string>('');
  const [newNotes, setNewNotes] = useState('');

  // add-partner dialog
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [partnerName, setPartnerName] = useState('');

  function refresh() {
    setRequests(listProvisionRequests(ENTITY));
    setNodes(listAccountNodes(ENTITY));
    setVariants(listVariants(ENTITY));
  }

  useEffect(() => {
    ensureSuperAdminRoot(ENTITY);
    refresh();
  }, []);

  const publishedVariants = useMemo(
    () => variants.filter((v) => v.status === 'published'),
    [variants],
  );

  const channelPartners = useMemo(
    () => nodes.filter((n) => n.type === 'channel_partner'),
    [nodes],
  );

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (filterType !== 'all' && r.type !== filterType) return false;
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      return true;
    });
  }, [requests, filterType, filterStatus]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tree = useMemo(() => buildHierarchyTree(ENTITY), [nodes]);

  function handleCreate() {
    if (!newName.trim()) {
      toast.error('Requester name required');
      return;
    }
    if (newType === 'client_of_partner' && !newPartner) {
      toast.error('Channel partner required for client-of-partner');
      return;
    }
    createProvisionRequest(ENTITY, {
      type: newType,
      requester_name: newName.trim(),
      assigned_variant_id: newVariant || null,
      partner_id: newPartner || null,
      notes: newNotes,
    });
    toast.success(`Request created · ${TYPE_LABEL[newType]}`);
    setNewOpen(false);
    setNewName(''); setNewVariant(''); setNewPartner(''); setNewNotes('');
    refresh();
  }

  function handleAssignVariant(req: ProvisionRequest, variantId: string) {
    setRequestVariant(ENTITY, req.id, variantId);
    refresh();
  }

  function handleApproveProvision(req: ProvisionRequest) {
    if (!req.assigned_variant_id) {
      toast.error('Assign a variant first');
      return;
    }
    const result = approveAndProvision(ENTITY, req.id);
    if (!result) {
      toast.error('Provisioning failed (guarded state)');
      return;
    }
    toast.success(
      `Provisioned · ${result.entitlement_count} entitlements seeded (status-track only · Wave-2 for real spin-up)`,
    );
    refresh();
  }

  function handleStatus(req: ProvisionRequest, next: ProvisionRequestStatus) {
    const ok = setRequestStatus(ENTITY, req.id, next);
    if (!ok) {
      toast.error(`Cannot transition ${req.status} → ${next}`);
      return;
    }
    toast.success(`Status → ${next}`);
    refresh();
  }

  function handleConvert(req: ProvisionRequest) {
    const updated = convertDemoToFinal(ENTITY, req.id);
    if (!updated) {
      toast.error('Only demo requests can be converted');
      return;
    }
    toast.success('Converted demo → final_copy');
    refresh();
  }

  function handleAddPartner() {
    if (!partnerName.trim()) {
      toast.error('Partner name required');
      return;
    }
    const root = ensureSuperAdminRoot(ENTITY);
    const node = createAccountNode(ENTITY, {
      type: 'channel_partner',
      name: partnerName.trim(),
      parent_id: root.id,
    });
    if (!node) {
      toast.error('Failed to add partner');
      return;
    }
    toast.success(`Channel partner added · ${node.name}`);
    setPartnerOpen(false);
    setPartnerName('');
    refresh();
  }

  function handleImportPartnerClients(partnerNodeId: string) {
    const result = importPartnerClientsAsNodes(ENTITY, partnerNodeId);
    if (result.imported.length === 0 && result.skipped === 0) {
      toast.info('No partner customers available to import');
      return;
    }
    toast.success(
      `Imported ${result.imported.length} clients-of-partner · ${result.skipped} skipped (already present)`,
    );
    refresh();
  }

  return (
    <TowerLayout title="Provisioning Manager">
      <div className="space-y-6">
        {/* Honest Wave-2 banner */}
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-200/90 font-mono">{PROVISIONING_HONESTY}</p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterType} onValueChange={(v) => setFilterType(v as ProvisionRequestType | 'all')}>
              <SelectTrigger className="w-44 bg-white/[0.04] border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {PROVISION_REQUEST_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as ProvisionRequestStatus | 'all')}>
              <SelectTrigger className="w-44 bg-white/[0.04] border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="requested">Requested</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="provisioned">Provisioned</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={refresh} className="border-white/10 text-white/70">
              <RefreshCcw className="h-4 w-4" /> Refresh
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setPartnerOpen(true)} variant="outline" className="border-white/10 text-white/80">
              <Users2 className="h-4 w-4" /> Add Channel Partner
            </Button>
            <Button onClick={() => setNewOpen(true)} className="bg-cyan-600 hover:bg-cyan-700">
              <Plus className="h-4 w-4" /> New Request
            </Button>
          </div>
        </div>

        {/* Two-column: queue + hierarchy */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Request Queue */}
          <Card className="xl:col-span-2 bg-white/[0.03] border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Server className="h-5 w-5 text-cyan-400" />
                Request Queue ({filteredRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredRequests.length === 0 ? (
                <p className="text-sm text-white/40 py-6 text-center">
                  No requests match the current filters.
                </p>
              ) : filteredRequests.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold text-white">{r.requester_name}</p>
                      <p className="text-xs text-white/50 font-mono">{r.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn('border', TYPE_BADGE[r.type])}>{TYPE_LABEL[r.type]}</Badge>
                      <Badge className={cn('border', STATUS_BADGE[r.status])}>{r.status}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Select
                      value={r.assigned_variant_id ?? ''}
                      onValueChange={(v) => handleAssignVariant(r, v)}
                    >
                      <SelectTrigger className="w-64 bg-white/[0.04] border-white/10 text-white text-xs">
                        <SelectValue placeholder="Assign Product Variant" />
                      </SelectTrigger>
                      <SelectContent>
                        {publishedVariants.length === 0 ? (
                          <SelectItem value="__none__" disabled>No published variants</SelectItem>
                        ) : publishedVariants.map((v) => (
                          <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(r.status === 'requested' || r.status === 'approved') && (
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleApproveProvision(r)}
                      >
                        <CheckCircle2 className="h-4 w-4" /> Approve + Provision
                      </Button>
                    )}
                    {r.status === 'provisioned' && (
                      <Button size="sm" onClick={() => handleStatus(r, 'active')} className="bg-emerald-600 hover:bg-emerald-700">
                        <PlayCircle className="h-4 w-4" /> Activate
                      </Button>
                    )}
                    {r.status === 'active' && (
                      <Button size="sm" variant="outline" onClick={() => handleStatus(r, 'suspended')} className="border-amber-500/40 text-amber-300">
                        <PauseCircle className="h-4 w-4" /> Suspend
                      </Button>
                    )}
                    {r.status === 'suspended' && (
                      <Button size="sm" onClick={() => handleStatus(r, 'active')} className="bg-emerald-600 hover:bg-emerald-700">
                        <PlayCircle className="h-4 w-4" /> Resume
                      </Button>
                    )}
                    {r.type === 'demo' && (
                      <Button size="sm" variant="outline" onClick={() => handleConvert(r)} className="border-white/10 text-white/80">
                        <ArrowRightCircle className="h-4 w-4" /> Convert → Final
                      </Button>
                    )}
                  </div>
                  {r.notes && (
                    <p className="text-xs text-white/50 italic">{r.notes}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Hierarchy */}
          <Card className="bg-white/[0.03] border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Network className="h-5 w-5 text-purple-400" />
                Account Hierarchy
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!tree ? (
                <p className="text-sm text-white/40">No hierarchy yet.</p>
              ) : (
                <HierarchyView node={tree} onImport={handleImportPartnerClients} />
              )}
              <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                <p className="text-xs text-white/40 uppercase tracking-wider">Legend</p>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(NODE_BADGE) as AccountNode['type'][]).map((t) => (
                    <Badge key={t} className={cn('border text-[10px]', NODE_BADGE[t])}>{t}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Variants context */}
        <Card className="bg-white/[0.03] border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-sm">
              <Boxes className="h-4 w-4 text-emerald-400" />
              Published Variants Available for Assignment ({publishedVariants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {publishedVariants.length === 0 ? (
              <p className="text-sm text-white/40">
                No published variants. Publish a variant in <a href="/tower/variants" className="text-cyan-400 underline">Product Variants</a> first.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {publishedVariants.map((v) => (
                  <Badge key={v.id} className="bg-blue-500/15 text-blue-300 border border-blue-500/20">
                    {v.name} · {v.product_kind ?? 'module'}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Request Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="bg-[#0D1B2A] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">New Provision Request</DialogTitle>
            <DialogDescription className="text-white/50">
              Status-track only · real spin-up arrives with Wave-2.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-white/70 text-xs">Type</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v as ProvisionRequestType)}>
                <SelectTrigger className="bg-white/[0.04] border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVISION_REQUEST_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/70 text-xs">Requester Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Acme India Pvt Ltd" className="bg-white/[0.04] border-white/10 text-white" />
            </div>
            <div>
              <Label className="text-white/70 text-xs">Variant (optional · can assign later)</Label>
              <Select value={newVariant} onValueChange={setNewVariant}>
                <SelectTrigger className="bg-white/[0.04] border-white/10 text-white"><SelectValue placeholder="— none —" /></SelectTrigger>
                <SelectContent>
                  {publishedVariants.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newType === 'client_of_partner' && (
              <div>
                <Label className="text-white/70 text-xs">Channel Partner</Label>
                <Select value={newPartner} onValueChange={setNewPartner}>
                  <SelectTrigger className="bg-white/[0.04] border-white/10 text-white"><SelectValue placeholder="Select a channel partner" /></SelectTrigger>
                  <SelectContent>
                    {channelPartners.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-white/70 text-xs">Notes</Label>
              <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} className="bg-white/[0.04] border-white/10 text-white" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)} className="border-white/10 text-white/70">Cancel</Button>
            <Button onClick={handleCreate} className="bg-cyan-600 hover:bg-cyan-700">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Partner Dialog */}
      <Dialog open={partnerOpen} onOpenChange={setPartnerOpen}>
        <DialogContent className="bg-[#0D1B2A] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Add Channel Partner</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-white/70 text-xs">Partner Name</Label>
            <Input value={partnerName} onChange={(e) => setPartnerName(e.target.value)} placeholder="KLDCS Resellers" className="bg-white/[0.04] border-white/10 text-white" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPartnerOpen(false)} className="border-white/10 text-white/70">Cancel</Button>
            <Button onClick={handleAddPartner} className="bg-cyan-600 hover:bg-cyan-700">Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TowerLayout>
  );
}

interface HierarchyViewProps {
  node: HierarchyTreeNode;
  onImport: (partnerNodeId: string) => void;
  depth?: number;
}

function HierarchyView({ node, onImport, depth = 0 }: HierarchyViewProps) {
  return (
    <div className="space-y-1.5">
      <div
        className="flex items-center justify-between gap-2 py-1"
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Badge className={cn('border text-[10px] shrink-0', NODE_BADGE[node.type])}>
            {node.type}
          </Badge>
          <span className="text-sm text-white/90 truncate">{node.name}</span>
        </div>
        {node.type === 'channel_partner' && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-[10px] text-cyan-400 hover:text-cyan-300"
            onClick={() => onImport(node.id)}
          >
            Import partner clients
          </Button>
        )}
      </div>
      {node.children.map((c) => (
        <HierarchyView key={c.id} node={c} onImport={onImport} depth={depth + 1} />
      ))}
    </div>
  );
}
