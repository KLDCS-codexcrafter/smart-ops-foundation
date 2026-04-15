/**
 * FinFrame.tsx — Zone 3 Session 4
 * Account Group Hierarchy — 4-Level COA Structure
 * L1 → L2 → L3 (system-seeded, read-only) → L4 (user-created, nestable)
 * [JWT] Replace with GET/POST/PATCH/DELETE /api/accounting/user-groups
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft, ChevronRight, ChevronDown, Lock, Plus, Search,
  Edit2, XCircle, FolderTree, Layers, Package, TreePine,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  L1_PRIMARIES, L2_PARENT_GROUPS, L3_FINANCIAL_GROUPS, L4_INDUSTRY_PACKS,
  type L4IndustryGroup,
} from '@/data/finframe-seed-data';

// ─── Types ──────────────────────────────────────────────────────
interface UserGroup {
  id: string;
  name: string;
  code: string;
  parentL3Code: string | null;
  parentGroupId: string | null;
  nature: 'Dr' | 'Cr';
  gstApplicable: boolean;
  tdsApplicable: boolean;
  notes: string;
  status: 'active' | 'inactive';
}

// ─── Panel Export (Command Centre shell) ────────────────────────
export function FinFramePanel() {
  const navigate = useNavigate();
  const [namingMode, setNamingMode] = useState<'indas' | 'tally'>('indas');
  const [userGroups, setUserGroups] = useState<UserGroup[]>(() => {
    try {
      // [JWT] GET /api/accounting/finframe
      const raw = localStorage.getItem('erp_group_finframe_l4_groups');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  const saveGroups = (groups: UserGroup[]) => {
    setUserGroups(groups);
    // [JWT] PATCH /api/accounting/finframe
    localStorage.setItem('erp_group_finframe_l4_groups', JSON.stringify(groups));
    // [JWT] Replace with sync to /api/group/finecore/account-groups
  };

  // Tree expand state
  const [expandedL1, setExpandedL1] = useState<Set<string>>(new Set(['A']));
  const [expandedL2, setExpandedL2] = useState<Set<string>>(new Set());
  const [expandedL3, setExpandedL3] = useState<Set<string>>(new Set());
  const [expandedL4, setExpandedL4] = useState<Set<string>>(new Set());

  // Create/Edit L4 dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    parentL3Code: '', parentGroupId: '', name: '', code: '',
    nature: 'Dr' as 'Dr' | 'Cr', gstApplicable: false,
    tdsApplicable: false, notes: '',
  });

  // Search & filter (My Groups tab)
  const [searchTerm, setSearchTerm] = useState('');
  const [filterL3, setFilterL3] = useState('all');

  // ─── Helpers ────────────────────────────────────────────────
  const getL3ByCode = (code: string) => L3_FINANCIAL_GROUPS.find(g => g.code === code);
  const getL2ByCode = (code: string) => L2_PARENT_GROUPS.find(g => g.code === code);
  const getL1ByCode = (code: string) => L1_PRIMARIES.find(g => g.code === code);

  const l3DisplayName = (g: { name: string; tallyName: string }) =>
    namingMode === 'indas'
      ? `${g.name} (${g.tallyName})`
      : `${g.tallyName} (${g.name})`;

  const getChildrenOfL3 = (l3Code: string) =>
    userGroups.filter(g => g.parentL3Code === l3Code && g.status === 'active');
  const getChildrenOfL4 = (groupId: string) =>
    userGroups.filter(g => g.parentGroupId === groupId && g.status === 'active');

  const getParentName = (group: UserGroup): string => {
    if (group.parentL3Code) {
      const l3 = getL3ByCode(group.parentL3Code);
      return l3 ? l3.name : group.parentL3Code;
    }
    if (group.parentGroupId) {
      const parent = userGroups.find(g => g.id === group.parentGroupId);
      return parent ? parent.name : 'Unknown';
    }
    return '—';
  };

  // ─── Toggle helpers ─────────────────────────────────────────
  const toggle = (set: Set<string>, key: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    next.has(key) ? next.delete(key) : next.add(key);
    setter(next);
  };

  // ─── (Quick Setup removed — industry packs loaded via Entity Auto-Setup) ──

  // ─── Create / Edit L4 ──────────────────────────────────────
  const openCreate = (l3Code?: string, parentGroupId?: string) => {
    setEditingId(null);
    const l3 = l3Code ? getL3ByCode(l3Code) : null;
    const parentL4 = parentGroupId ? userGroups.find(g => g.id === parentGroupId) : null;

    // Auto-suggest code
    const parentCode = l3Code || '';
    const existingCount = userGroups.filter(g => g.parentL3Code === l3Code || g.code.startsWith(parentCode)).length;
    const suggestedCode = `${parentCode}-${String(existingCount + 1).padStart(6, '0')}`;

    setCreateForm({
      parentL3Code: l3Code || '',
      parentGroupId: parentGroupId || '',
      name: '',
      code: suggestedCode.toUpperCase(),
      nature: l3?.nature ?? parentL4?.nature ?? 'Dr',
      gstApplicable: l3?.gstApplicable ?? false,
      tdsApplicable: l3?.tdsApplicable ?? false,
      notes: '',
    });
    setCreateOpen(true);
  };

  const openEdit = (group: UserGroup) => {
    setEditingId(group.id);
    setCreateForm({
      parentL3Code: group.parentL3Code || '',
      parentGroupId: group.parentGroupId || '',
      name: group.name,
      code: group.code,
      nature: group.nature,
      gstApplicable: group.gstApplicable,
      tdsApplicable: group.tdsApplicable,
      notes: group.notes,
    });
    setCreateOpen(true);
  };

  const handleSave = () => {
    if (!createForm.name.trim()) { toast.error('Group name is required'); return; }
    if (!createForm.parentL3Code && !createForm.parentGroupId) { toast.error('Select a parent group'); return; }

    const parentName = createForm.parentL3Code
      ? getL3ByCode(createForm.parentL3Code)?.name || createForm.parentL3Code
      : userGroups.find(g => g.id === createForm.parentGroupId)?.name || 'group';

    if (editingId) {
      // [JWT] Replace with PATCH /api/accounting/user-groups/:id
      saveGroups(userGroups.map(g => g.id === editingId ? {
        ...g,
        name: createForm.name,
        code: createForm.code.toUpperCase(),
        parentL3Code: createForm.parentL3Code || null,
        parentGroupId: createForm.parentGroupId || null,
        nature: createForm.nature,
        gstApplicable: createForm.gstApplicable,
        tdsApplicable: createForm.tdsApplicable,
        notes: createForm.notes,
      } : g));
      toast.success(`${createForm.name} updated`);
    } else {
      // [JWT] Replace with POST /api/accounting/user-groups
      const newGroup: UserGroup = {
        id: crypto.randomUUID(),
        name: createForm.name,
        code: createForm.code.toUpperCase(),
        parentL3Code: createForm.parentL3Code || null,
        parentGroupId: createForm.parentGroupId || null,
        nature: createForm.nature,
        gstApplicable: createForm.gstApplicable,
        tdsApplicable: createForm.tdsApplicable,
        notes: createForm.notes,
        status: 'active',
      };
      saveGroups([...userGroups, newGroup]);
      toast.success(`${createForm.name} added under ${parentName}`);
    }
    setCreateOpen(false);
  };

  const handleDeactivate = (id: string) => {
    // [JWT] Replace with PATCH /api/accounting/user-groups/:id/deactivate
    saveGroups(userGroups.map(g => g.id === id ? { ...g, status: g.status === 'active' ? 'inactive' as const : 'active' as const } : g));
    toast.success('Group status updated');
  };

  const handleParentChange = (value: string) => {
    const isL3 = L3_FINANCIAL_GROUPS.some(g => g.code === value);
    if (isL3) {
      const l3 = getL3ByCode(value)!;
      setCreateForm(f => ({
        ...f,
        parentL3Code: value,
        parentGroupId: '',
        nature: l3.nature,
        gstApplicable: l3.gstApplicable,
        tdsApplicable: l3.tdsApplicable,
        code: `${value}-${String(userGroups.filter(g => g.parentL3Code === value).length + 1).padStart(6, '0')}`.toUpperCase(),
      }));
    } else {
      const parent = userGroups.find(g => g.id === value);
      if (parent) {
        const rootL3 = parent.parentL3Code ? getL3ByCode(parent.parentL3Code) : null;
        setCreateForm(f => ({
          ...f,
          parentL3Code: '',
          parentGroupId: value,
          nature: parent.nature,
          gstApplicable: rootL3?.gstApplicable ?? parent.gstApplicable,
          tdsApplicable: rootL3?.tdsApplicable ?? parent.tdsApplicable,
          code: `${parent.code}-${String(getChildrenOfL4(value).length + 1).padStart(6, '0')}`.toUpperCase(),
        }));
      }
    }
  };

  // ─── Filtered groups for My Groups tab ──────────────────────
  const filteredGroups = useMemo(() => {
    let groups = userGroups;
    if (filterL3 !== 'all') groups = groups.filter(g => g.parentL3Code === filterL3);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      groups = groups.filter(g => g.name.toLowerCase().includes(q) || g.code.toLowerCase().includes(q));
    }
    return groups;
  }, [userGroups, filterL3, searchTerm]);

  // ─── Flag badges ────────────────────────────────────────────
  const FlagBadges = ({ g }: { g: typeof L3_FINANCIAL_GROUPS[0] }) => (
    <>
      {g.isBank && <Badge className="text-[9px] bg-blue-500/10 text-blue-600 border-blue-500/20">BANK</Badge>}
      {g.isCash && <Badge className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">CASH</Badge>}
      {g.isParty && <Badge className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/20">PARTY</Badge>}
      {g.isStatutory && <Badge className="text-[9px] bg-red-500/10 text-red-600 border-red-500/20">STATUTORY</Badge>}
    </>
  );

  // ─── L4 Tree Row (recursive) ────────────────────────────────
  const L4Row = ({ group, depth }: { group: UserGroup; depth: number }) => {
    const children = getChildrenOfL4(group.id);
    const isExpanded = expandedL4.has(group.id);
    return (
      <>
        <div
          className="flex items-center gap-2 py-1.5 px-3 hover:bg-muted/40 rounded-lg group/l4"
          style={{ paddingLeft: `${48 + depth * 16}px` }}
        >
          {children.length > 0 ? (
            <button onClick={() => toggle(expandedL4, group.id, setExpandedL4)} className="p-0.5">
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          ) : <span className="w-4" />}
          <span className="text-sm text-foreground">{group.name}</span>
          <Badge variant="outline" className={`text-[9px] ${group.nature === 'Dr' ? 'text-blue-600 border-blue-500/30' : 'text-emerald-600 border-emerald-500/30'}`}>
            {group.nature}
          </Badge>
          {children.length > 0 && (
            <span className="text-[10px] text-muted-foreground">{children.length} sub</span>
          )}
          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover/l4:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={() => openCreate(undefined, group.id)}>
              <Plus className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={() => openEdit(group)}>
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={() => handleDeactivate(group.id)}>
              <XCircle className="h-3 w-3" />
            </Button>
          </div>
        </div>
        {isExpanded && children.map(child => (
          <L4Row key={child.id} group={child} depth={depth + 1} />
        ))}
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/erp/accounting')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">FinFrame</h1>
              <p className="text-sm text-muted-foreground">Account Group Hierarchy</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5">
            <button
              onClick={() => setNamingMode('indas')}
              className={`text-xs px-2 py-1 rounded ${namingMode === 'indas' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >Ind AS / Schedule III</button>
            <button
              onClick={() => setNamingMode('tally')}
              className={`text-xs px-2 py-1 rounded ${namingMode === 'tally' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >Tally Prime</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'L3 System Groups', value: L3_FINANCIAL_GROUPS.length, icon: TreePine },
          { label: 'Your Groups', value: userGroups.filter(g => g.status === 'active').length, icon: FolderTree },
          { label: 'L2 Parent Groups', value: L2_PARENT_GROUPS.length, icon: Package },
          { label: 'Total Groups', value: L3_FINANCIAL_GROUPS.length + userGroups.filter(g => g.status === 'active').length, icon: Layers },
        ].map(s => (
          <Card key={s.label} className="bg-card/60 backdrop-blur-xl border-border">
            <CardContent className="p-4 text-center">
              <s.icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold text-foreground font-mono">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tree" className="w-full">
        <TabsList>
          <TabsTrigger value="tree">Account Tree</TabsTrigger>
          <TabsTrigger value="mygroups">My Groups</TabsTrigger>
        </TabsList>

        {/* Tab 1 — Account Tree */}
        <TabsContent value="tree" className="space-y-4">
          {userGroups.length === 0 && (
            <Card className="border-muted">
              <CardContent className="p-4 text-center text-sm text-muted-foreground">
                No account groups yet. Use the <strong>+ Add Group</strong> button next to any L3 group to create your first group.
              </CardContent>
            </Card>
          )}

          {/* Tree */}
          <Card>
            <CardContent className="p-2">
              {L1_PRIMARIES.map(l1 => {
                const l2s = L2_PARENT_GROUPS.filter(g => g.l1Code === l1.code);
                const isL1Open = expandedL1.has(l1.code);
                const totalL3 = l2s.reduce((sum, l2) => sum + L3_FINANCIAL_GROUPS.filter(g => g.l2Code === l2.code).length, 0);
                return (
                  <div key={l1.code}>
                    {/* L1 Row */}
                    <button
                      onClick={() => toggle(expandedL1, l1.code, setExpandedL1)}
                      className="w-full flex items-center gap-2 py-2.5 px-3 hover:bg-muted/40 rounded-lg"
                    >
                      {isL1Open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="text-base font-semibold text-foreground">{l1.name}</span>
                      <Badge variant="outline" className={`text-[10px] ${l1.nature === 'Dr' ? 'text-blue-600 border-blue-500/30' : 'text-emerald-600 border-emerald-500/30'}`}>
                        {l1.nature}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto">{totalL3} groups</span>
                    </button>

                    {isL1Open && l2s.map(l2 => {
                      const l3s = L3_FINANCIAL_GROUPS.filter(g => g.l2Code === l2.code);
                      const isL2Open = expandedL2.has(l2.code);
                      return (
                        <div key={l2.code}>
                          {/* L2 Row */}
                          <button
                            onClick={() => toggle(expandedL2, l2.code, setExpandedL2)}
                            className="w-full flex items-center gap-2 py-2 hover:bg-muted/40 rounded-lg"
                            style={{ paddingLeft: '16px' }}
                          >
                            {isL2Open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            <span className="text-sm font-medium text-foreground">{l2.name}</span>
                            <span className="text-xs text-muted-foreground ml-auto">{l3s.length} groups</span>
                          </button>

                          {isL2Open && l3s.map(l3 => {
                            const isL3Open = expandedL3.has(l3.code);
                            const l4Children = getChildrenOfL3(l3.code);
                            return (
                              <div key={l3.code}>
                                {/* L3 Row */}
                                <div
                                  className="flex items-center gap-2 py-1.5 hover:bg-muted/40 rounded-lg group/l3"
                                  style={{ paddingLeft: '32px' }}
                                >
                                  <button onClick={() => toggle(expandedL3, l3.code, setExpandedL3)} className="p-0.5">
                                    {isL3Open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                                  </button>
                                  <Lock className="h-3 w-3 text-muted-foreground/50" />
                                  <span className="text-sm text-foreground">{l3DisplayName(l3)}</span>
                                  <FlagBadges g={l3} />
                                  <Badge variant="outline" className={`text-[9px] ${l3.nature === 'Dr' ? 'text-blue-600 border-blue-500/30' : 'text-emerald-600 border-emerald-500/30'}`}>
                                    {l3.nature}
                                  </Badge>
                                  {l4Children.length > 0 && (
                                    <span className="text-[10px] text-muted-foreground">{l4Children.length} groups</span>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 px-2 text-[10px] ml-auto opacity-0 group-hover/l3:opacity-100 transition-opacity"
                                    onClick={() => openCreate(l3.code)}
                                  >
                                    <Plus className="h-3 w-3 mr-0.5" /> Add Group
                                  </Button>
                                </div>

                                {/* L4 children under L3 */}
                                {isL3Open && l4Children.map(group => (
                                  <L4Row key={group.id} group={group} depth={0} />
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2 — My Groups */}
        <TabsContent value="mygroups" className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name or code..."
                className="pl-9 h-9"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterL3} onValueChange={setFilterL3}>
              <SelectTrigger className="w-[220px] h-9">
                <SelectValue placeholder="Filter by L3 parent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All L3 Parents</SelectItem>
                {L3_FINANCIAL_GROUPS.map(g => (
                  <SelectItem key={g.code} value={g.code}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => openCreate()}>
              <Plus className="h-4 w-4 mr-1" /> Add Group
            </Button>
          </div>

          {filteredGroups.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FolderTree className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No account groups yet. Load an industry pack or add groups manually from the Account Tree tab.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Group Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Parent</TableHead>
                      <TableHead>Nature</TableHead>
                      <TableHead>GST</TableHead>
                      <TableHead>TDS</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGroups.map(g => (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium">{g.name}</TableCell>
                        <TableCell className="font-mono text-xs">{g.code}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{getParentName(g)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${g.nature === 'Dr' ? 'text-blue-600 border-blue-500/30' : 'text-emerald-600 border-emerald-500/30'}`}>
                            {g.nature}
                          </Badge>
                        </TableCell>
                        <TableCell>{g.gstApplicable ? '✓' : '—'}</TableCell>
                        <TableCell>{g.tdsApplicable ? '✓' : '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${g.status === 'active' ? 'text-emerald-600 border-emerald-500/30' : 'text-muted-foreground'}`}>
                            {g.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => openEdit(g)}>
                              <Edit2 className="h-3 w-3 mr-1" /> Edit
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleDeactivate(g.id)}>
                              {g.status === 'active' ? 'Deactivate' : 'Activate'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>




      {/* ─── Create / Edit L4 Group Dialog ───────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit' : 'Create'} Account Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Field 1 — Parent Group */}
            <div className="space-y-2">
              <Label>Parent Group *</Label>
              <Select value={createForm.parentL3Code || createForm.parentGroupId || ''} onValueChange={handleParentChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>System Groups (L3)</SelectLabel>
                    {L3_FINANCIAL_GROUPS.map(g => {
                      const l2 = getL2ByCode(g.l2Code);
                      const l1 = l2 ? getL1ByCode(l2.l1Code) : null;
                      return (
                        <SelectItem key={g.code} value={g.code}>
                          {l1?.name} › {l2?.name} › {g.name} ({g.tallyName})
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                  {userGroups.filter(g => g.status === 'active').length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Your Groups</SelectLabel>
                      {userGroups.filter(g => g.status === 'active').map(g => (
                        <SelectItem key={g.id} value={g.id}>
                          ... › {g.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Field 2 — Group Name */}
            <div className="space-y-2">
              <Label>Group Name *</Label>
              <Input
                placeholder="e.g. Plant & Machinery"
                value={createForm.name}
                onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                disabled={!createForm.parentL3Code && !createForm.parentGroupId}
              />
            </div>

            {/* Field 3 — Group Code */}
            <div className="space-y-2">
              <Label>Group Code</Label>
              <Input
                placeholder="Auto-generated"
                value={createForm.code}
                onChange={e => setCreateForm(f => ({ ...f, code: e.target.value.toUpperCase().slice(0, 10) }))}
                disabled={!createForm.parentL3Code && !createForm.parentGroupId}
                maxLength={10}
                className="font-mono"
              />
            </div>

            {/* Field 4 — Nature */}
            <div className="space-y-2">
              <Label>Nature</Label>
              <Select
                value={createForm.nature}
                onValueChange={(v) => setCreateForm(f => ({ ...f, nature: v as 'Dr' | 'Cr' }))}
                disabled={!createForm.parentL3Code && !createForm.parentGroupId}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dr">Dr (Debit)</SelectItem>
                  <SelectItem value="Cr">Cr (Credit)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Field 5 & 6 — GST & TDS */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label>GST Applicable</Label>
                <Switch
                  checked={createForm.gstApplicable}
                  onCheckedChange={(v) => setCreateForm(f => ({ ...f, gstApplicable: v }))}
                  disabled={!createForm.parentL3Code && !createForm.parentGroupId}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>TDS Applicable</Label>
                <Switch
                  checked={createForm.tdsApplicable}
                  onCheckedChange={(v) => setCreateForm(f => ({ ...f, tdsApplicable: v }))}
                  disabled={!createForm.parentL3Code && !createForm.parentGroupId}
                />
              </div>
            </div>

            {/* Field 7 — Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Optional notes..."
                rows={2}
                value={createForm.notes}
                onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))}
                disabled={!createForm.parentL3Code && !createForm.parentGroupId}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!createForm.name.trim() || (!createForm.parentL3Code && !createForm.parentGroupId)}>
              {editingId ? 'Update' : 'Create'} Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Standalone Page Export ──────────────────────────────────────
export default function FinFrame() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-svh w-full bg-background">
        <div className="flex flex-col flex-1">
          <ERPHeader
            breadcrumbs={[
              { label: 'Operix Core', href: '/erp/dashboard' },
              { label: 'FineCore', href: '/erp/accounting' },
              { label: 'FinFrame' },
            ]}
            showDatePicker={false}
            showCompany={false}
          />
          <main className="p-6 space-y-6">
            <FinFramePanel />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
