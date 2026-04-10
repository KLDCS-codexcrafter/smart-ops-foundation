import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Search, Plus, MoreHorizontal, Edit, Trash2, Eye, LayoutList,
  Grid3X3, Lock, Boxes, List, Settings2, ChevronLeft
} from 'lucide-react';

/* ─── Section 2: StockGroupTemplateLink Interface ─── */
interface StockGroupTemplateLink {
  id: string;
  stock_group_id: string;
  stock_group_name: string;
  stock_group_code: string;
  stock_group_level: number;
  parameter_template_id: string;
  parameter_template_name: string;
  parameter_template_code: string;
  parameter_count: number;
  is_mandatory: boolean;
  sort_order: number;
}

/* ─── Parameter Template types (baseline) ─── */
type ParameterType = 'text' | 'number' | 'select' | 'boolean' | 'date';
type TemplateScope = 'stock_item' | 'stock_matrix' | 'stock_group' | 'bom';

interface ParameterDefinition {
  id: string;
  name: string;
  code: string;
  type: ParameterType;
  is_required: boolean;
  default_value: string;
  options: string[];
  unit: string;
  sort_order: number;
}

interface ParameterTemplate {
  id: string;
  name: string;
  template_code: string;
  description: string;
  template_scope: TemplateScope[];
  parameters: ParameterDefinition[];
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const LS_KEY = 'erp_parameter_templates';

const SYSTEM_TEMPLATES: ParameterTemplate[] = [
  {
    id: 'sys-gen-001',
    name: 'GEN-001 — General Dimensions',
    template_code: 'GEN-001',
    description: 'Standard length, width, height, and weight parameters for all items.',
    template_scope: ['stock_item', 'stock_matrix'],
    parameters: [
      { id: 'p1', name: 'Length', code: 'LEN', type: 'number', is_required: false, default_value: '', options: [], unit: 'mm', sort_order: 0 },
      { id: 'p2', name: 'Width', code: 'WID', type: 'number', is_required: false, default_value: '', options: [], unit: 'mm', sort_order: 1 },
      { id: 'p3', name: 'Height', code: 'HGT', type: 'number', is_required: false, default_value: '', options: [], unit: 'mm', sort_order: 2 },
      { id: 'p4', name: 'Weight', code: 'WGT', type: 'number', is_required: false, default_value: '', options: [], unit: 'kg', sort_order: 3 },
    ],
    is_system: true,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

/* ─── Section 3: Mock Stock Groups ─── */
const MOCK_STOCK_GROUPS = [
  { id: 'sg-001', code: 'ALL', name: 'All Items', level: 1, parentId: null },
  { id: 'sg-002', code: 'FG', name: 'Finished Goods', level: 2, parentId: 'sg-001' },
  { id: 'sg-003', code: 'RM', name: 'Raw Materials', level: 2, parentId: 'sg-001' },
  { id: 'sg-004', code: 'WIP', name: 'Work-in-Progress', level: 2, parentId: 'sg-001' },
  { id: 'sg-005', code: 'PKG', name: 'Packing Materials', level: 2, parentId: 'sg-001' },
  { id: 'sg-006', code: 'SPARES', name: 'Spare Parts', level: 3, parentId: 'sg-003' },
];

const SCOPE_LABELS: Record<TemplateScope, string> = {
  stock_item: 'Stock Item',
  stock_matrix: 'Stock Matrix',
  stock_group: 'Stock Group',
  bom: 'Bill of Materials',
};

export default function Parametric() {
  /* ─── Template State ─── */
  const [templates, setTemplates] = useState<ParameterTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [activeTab, setActiveTab] = useState('templates');
  const [scopeFilter, setScopeFilter] = useState<TemplateScope | 'all'>('all');

  /* Dialog state */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ParameterTemplate | null>(null);
  const [displayTarget, setDisplayTarget] = useState<ParameterTemplate | null>(null);
  const [displayOpen, setDisplayOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ParameterTemplate | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  /* Form state */
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formScopes, setFormScopes] = useState<TemplateScope[]>([]);
  const [formParams, setFormParams] = useState<ParameterDefinition[]>([]);

  /* ─── Section 3: Group Assignment State ─── */
  const [groupLinks, setGroupLinks] = useState<StockGroupTemplateLink[]>([]);
  // [JWT] Replace with GET /api/inventory/stock-group-template-links
  const [selectedStockGroupId, setSelectedStockGroupId] = useState<string | null>(null);

  /* ─── Load Templates ─── */
  useEffect(() => {
    // [JWT] Replace with GET /api/inventory/parameter-templates
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ParameterTemplate[];
        // Merge system templates
        const sysIds = new Set(SYSTEM_TEMPLATES.map(s => s.id));
        const userTemplates = parsed.filter(t => !sysIds.has(t.id));
        setTemplates([...SYSTEM_TEMPLATES, ...userTemplates]);
      } catch {
        setTemplates([...SYSTEM_TEMPLATES]);
      }
    } else {
      setTemplates([...SYSTEM_TEMPLATES]);
    }
    setLoading(false);
  }, []);

  /* Persist */
  useEffect(() => {
    if (!loading) {
      // [JWT] Replace with POST/PUT /api/inventory/parameter-templates
      localStorage.setItem(LS_KEY, JSON.stringify(templates));
    }
  }, [templates, loading]);

  /* ─── Filtered ─── */
  const filteredTemplates = useMemo(() => {
    let result = templates;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.template_code.toLowerCase().includes(q)
      );
    }
    if (scopeFilter !== 'all') {
      result = result.filter(t => t.template_scope.includes(scopeFilter));
    }
    return result;
  }, [templates, searchQuery, scopeFilter]);

  /* ─── Section 4: Handler Functions ─── */
  const handleCreateTemplate = () => {
    setEditTarget(null);
    setFormName('');
    setFormCode('');
    setFormDesc('');
    setFormScopes([]);
    setFormParams([]);
    setDialogOpen(true);
  };

  const handleEditTemplate = (template: ParameterTemplate) => {
    if (template.is_system) return;
    setEditTarget(template);
    setFormName(template.name);
    setFormCode(template.template_code);
    setFormDesc(template.description);
    setFormScopes([...template.template_scope]);
    setFormParams([...template.parameters]);
    setDialogOpen(true);
  };

  const handleSaveTemplate = () => {
    if (!formName.trim() || !formCode.trim()) {
      toast.error('Name and code are required');
      return;
    }
    const now = new Date().toISOString();
    if (editTarget) {
      setTemplates(prev => prev.map(t => t.id === editTarget.id ? {
        ...t,
        name: formName.trim(),
        template_code: formCode.trim().toUpperCase(),
        description: formDesc.trim(),
        template_scope: formScopes,
        parameters: formParams,
        updated_at: now,
      } : t));
      // [JWT] Replace with PUT /api/inventory/parameter-templates/:id
      toast.success('Template updated');
    } else {
      const newTemplate: ParameterTemplate = {
        id: `tmpl-${Date.now()}`,
        name: formName.trim(),
        template_code: formCode.trim().toUpperCase(),
        description: formDesc.trim(),
        template_scope: formScopes,
        parameters: formParams,
        is_system: false,
        is_active: true,
        created_at: now,
        updated_at: now,
      };
      setTemplates(prev => [...prev, newTemplate]);
      // [JWT] Replace with POST /api/inventory/parameter-templates
      toast.success('Template created');
    }
    setDialogOpen(false);
  };

  const handleDeleteTemplate = () => {
    if (!deleteTarget || deleteTarget.is_system) return;
    setTemplates(prev => prev.filter(t => t.id !== deleteTarget.id));
    // [JWT] Replace with DELETE /api/inventory/parameter-templates/:id
    toast.success('Template deleted');
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  const handleAddGroupLink = (stockGroupId: string, templateId: string, isMandatory: boolean) => {
    const group = MOCK_STOCK_GROUPS.find(g => g.id === stockGroupId);
    const template = templates.find(t => t.id === templateId);
    if (!group || !template) return;
    const link: StockGroupTemplateLink = {
      id: `link-${Date.now()}`,
      stock_group_id: stockGroupId, stock_group_name: group.name,
      stock_group_code: group.code, stock_group_level: group.level,
      parameter_template_id: templateId, parameter_template_name: template.name,
      parameter_template_code: template.template_code,
      parameter_count: template.parameters.length,
      is_mandatory: isMandatory,
      sort_order: groupLinks.filter(l => l.stock_group_id === stockGroupId).length,
    };
    setGroupLinks(prev => [...prev, link]);
    // [JWT] Replace with POST /api/inventory/stock-group-template-links
  };

  const handleRemoveGroupLink = (linkId: string) => {
    setGroupLinks(prev => prev.filter(l => l.id !== linkId));
    // [JWT] Replace with DELETE /api/inventory/stock-group-template-links/:id
  };

  const handleToggleMandatory = (linkId: string) => {
    setGroupLinks(prev => prev.map(l =>
      l.id === linkId ? { ...l, is_mandatory: !l.is_mandatory } : l
    ));
    // [JWT] Replace with PATCH /api/inventory/stock-group-template-links/:id
  };

  /* ─── Parameter form helpers ─── */
  const addParameter = () => {
    setFormParams(prev => [...prev, {
      id: `param-${Date.now()}`,
      name: '',
      code: '',
      type: 'text',
      is_required: false,
      default_value: '',
      options: [],
      unit: '',
      sort_order: prev.length,
    }]);
  };

  const updateParameter = (idx: number, updates: Partial<ParameterDefinition>) => {
    setFormParams(prev => prev.map((p, i) => i === idx ? { ...p, ...updates } : p));
  };

  const removeParameter = (idx: number) => {
    setFormParams(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleScope = (scope: TemplateScope) => {
    setFormScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.history.back()}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Parametric Hub</h1>
              <p className="text-sm text-muted-foreground">
                Define parameter templates and link them to stock groups
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ─── Section 5: Stats Cards ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Templates</CardDescription>
              <CardTitle className="text-2xl">{templates.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Stock Matrix</CardDescription>
              <CardTitle className="text-2xl">
                {templates.filter(t => t.template_scope.includes('stock_matrix')).length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Groups Linked</CardDescription>
              <CardTitle className="text-2xl">
                {new Set(groupLinks.map(l => l.stock_group_id)).size}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>System Templates</CardDescription>
              <CardTitle className="text-2xl">
                {templates.filter(t => t.is_system).length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* ─── Tabs ─── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <TabsList>
              <TabsTrigger value="templates">
                <List className="h-4 w-4 mr-1.5" /> Templates
              </TabsTrigger>
              <TabsTrigger value="parameters">
                <Settings2 className="h-4 w-4 mr-1.5" /> Parameters
              </TabsTrigger>
              <TabsTrigger value="scopes">
                <Grid3X3 className="h-4 w-4 mr-1.5" /> Scopes
              </TabsTrigger>
              {/* ─── Section 8: Group Assignment Tab Trigger ─── */}
              <TabsTrigger value="groups">
                <Boxes className="h-4 w-4 mr-1.5" /> Group Assignment
              </TabsTrigger>
            </TabsList>
            {activeTab === 'templates' && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 w-56"
                  />
                </div>
                <Select value={scopeFilter} onValueChange={v => setScopeFilter(v as TemplateScope | 'all')}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="All scopes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Scopes</SelectItem>
                    {(Object.keys(SCOPE_LABELS) as TemplateScope[]).map(s => (
                      <SelectItem key={s} value={s}>{SCOPE_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex border rounded-md">
                  <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 rounded-r-none"
                    onClick={() => setViewMode('list')}>
                    <List className="h-4 w-4" />
                  </Button>
                  <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 rounded-l-none"
                    onClick={() => setViewMode('grid')}>
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                </div>
                <Button onClick={handleCreateTemplate}>
                  <Plus className="h-4 w-4 mr-1" /> Create Template
                </Button>
              </div>
            )}
          </div>

          {/* ─── Templates Tab ─── */}
          <TabsContent value="templates" className="mt-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="py-6">
                      <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredTemplates.length === 0 && !searchQuery ? (
              /* ─── Section 7: Empty State Card ─── */
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <LayoutList className="h-7 w-7 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold mb-1">No parameter templates yet</p>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      GEN-001 auto-creates for new companies. Add a custom template here.
                    </p>
                  </div>
                  <Button size="sm" onClick={handleCreateTemplate}>
                    <Plus className="h-4 w-4 mr-1" /> Create First Template
                  </Button>
                </CardContent>
              </Card>
            ) : viewMode === 'list' ? (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Scopes</TableHead>
                      <TableHead className="text-center">Params</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.map(template => (
                      <TableRow key={template.id}>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{template.name}</span>
                            {/* ─── Section 6: System Lock Icon ─── */}
                            {template.is_system && <Lock className="h-3 w-3 text-muted-foreground ml-1" />}
                          </div>
                          {template.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {template.description}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono text-xs">
                            {template.template_code}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {template.template_scope.map(s => (
                              <Badge key={s} variant="outline" className="text-xs">
                                {SCOPE_LABELS[s]}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{template.parameters.length}</TableCell>
                        <TableCell>
                          <Badge variant={template.is_active ? 'default' : 'secondary'}>
                            {template.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setDisplayTarget(template);
                                setDisplayOpen(true);
                              }}>
                                <Eye className="h-4 w-4 mr-2" /> View
                              </DropdownMenuItem>
                              {/* ─── Section 6: System Lock on Edit ─── */}
                              <DropdownMenuItem
                                onClick={() => !template.is_system && handleEditTemplate(template)}
                                className={template.is_system ? 'pointer-events-none opacity-40' : ''}
                              >
                                <Edit className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={template.is_system}
                                onClick={() => {
                                  setDeleteTarget(template);
                                  setDeleteOpen(true);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ) : (
              /* Grid view */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map(template => (
                  <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => { setDisplayTarget(template); setDisplayOpen(true); }}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="font-mono text-xs">{template.template_code}</Badge>
                        {template.is_system && <Lock className="h-3 w-3 text-muted-foreground" />}
                      </div>
                      <CardTitle className="text-base mt-2">{template.name}</CardTitle>
                      {template.description && (
                        <CardDescription className="line-clamp-2">{template.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {template.template_scope.map(s => (
                            <Badge key={s} variant="outline" className="text-xs">{SCOPE_LABELS[s]}</Badge>
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {template.parameters.length} params
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ─── Parameters Tab ─── */}
          <TabsContent value="parameters" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">All Parameters Across Templates</CardTitle>
                <CardDescription>Aggregated parameter definitions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parameter</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Template</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.flatMap(t => t.parameters.map(p => (
                      <TableRow key={`${t.id}-${p.id}`}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono text-xs">{p.code}</Badge>
                        </TableCell>
                        <TableCell className="capitalize">{p.type}</TableCell>
                        <TableCell>{p.unit || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{t.template_code}</TableCell>
                      </TableRow>
                    )))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Scopes Tab ─── */}
          <TabsContent value="scopes" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.keys(SCOPE_LABELS) as TemplateScope[]).map(scope => {
                const scopeTemplates = templates.filter(t => t.template_scope.includes(scope));
                return (
                  <Card key={scope}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{SCOPE_LABELS[scope]}</CardTitle>
                      <CardDescription>{scopeTemplates.length} template(s)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {scopeTemplates.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No templates</p>
                      ) : (
                        <div className="space-y-2">
                          {scopeTemplates.map(t => (
                            <div key={t.id} className="flex items-center justify-between text-sm py-1">
                              <span>{t.name}</span>
                              <Badge variant="secondary" className="font-mono text-xs">{t.template_code}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ─── Section 8: Group Assignment Tab ─── */}
          <TabsContent value="groups" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Left: Stock Group list */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Stock Groups</CardTitle>
                  <CardDescription>Select a group to manage its templates</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {MOCK_STOCK_GROUPS.map(group => (
                      <button key={group.id}
                        style={{ paddingLeft: `${(group.level - 1) * 16 + 16}px` }}
                        className={`w-full text-left py-2.5 pr-4 flex items-center justify-between
                          hover:bg-muted/50 transition-colors
                          ${selectedStockGroupId === group.id
                            ? 'bg-primary/5 border-l-2 border-primary' : ''}`}
                        onClick={() => setSelectedStockGroupId(group.id)}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{group.name}</span>
                          <Badge variant="secondary" className="font-mono text-xs">{group.code}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {groupLinks.filter(l => l.stock_group_id === group.id).length} linked
                        </span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Right: Linked Templates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {selectedStockGroupId
                      ? `Templates — ${MOCK_STOCK_GROUPS.find(g => g.id === selectedStockGroupId)?.name}`
                      : 'Select a group'}
                  </CardTitle>
                  {selectedStockGroupId && (
                    <Select onValueChange={id => handleAddGroupLink(selectedStockGroupId, id, false)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Add a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates
                          .filter(t => !groupLinks.some(l =>
                            l.stock_group_id === selectedStockGroupId
                            && l.parameter_template_id === t.id))
                          .map(t => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name} ({t.parameters.length} params)
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  {!selectedStockGroupId ? (
                    <p className="text-sm text-muted-foreground text-center py-12">
                      Select a group on the left
                    </p>
                  ) : groupLinks.filter(l => l.stock_group_id === selectedStockGroupId).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">
                      No templates linked yet
                    </p>
                  ) : (
                    <div className="divide-y">
                      {groupLinks
                        .filter(l => l.stock_group_id === selectedStockGroupId)
                        .map(link => (
                          <div key={link.id} className="flex items-center justify-between px-4 py-2.5 group">
                            <div>
                              <p className="text-sm font-medium">{link.parameter_template_name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="secondary" className="font-mono text-xs">
                                  {link.parameter_template_code}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {link.parameter_count} params
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                <input type="checkbox"
                                  checked={link.is_mandatory}
                                  onChange={() => handleToggleMandatory(link.id)}
                                  className="rounded" />
                                Mandatory
                              </label>
                              <Button variant="ghost" size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100"
                                onClick={() => handleRemoveGroupLink(link.id)}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── Create/Edit Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Template' : 'Create Template'}</DialogTitle>
            <DialogDescription>
              {editTarget ? 'Modify template details and parameters' : 'Define a new parameter template'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Electrical Specs" />
              </div>
              <div className="space-y-2">
                <Label>Template Code *</Label>
                <Input value={formCode} onChange={e => setFormCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ELEC-001" className="font-mono" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Describe this template..." />
            </div>
            <div className="space-y-2">
              <Label>Scopes</Label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(SCOPE_LABELS) as TemplateScope[]).map(scope => (
                  <Button key={scope} variant={formScopes.includes(scope) ? 'default' : 'outline'}
                    size="sm" onClick={() => toggleScope(scope)}>
                    {SCOPE_LABELS[scope]}
                  </Button>
                ))}
              </div>
            </div>

            {/* Parameters */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Parameters ({formParams.length})</Label>
                <Button variant="outline" size="sm" onClick={addParameter}>
                  <Plus className="h-3 w-3 mr-1" /> Add Parameter
                </Button>
              </div>
              {formParams.map((param, idx) => (
                <Card key={param.id} className="p-3">
                  <div className="grid grid-cols-4 gap-2">
                    <Input placeholder="Name" value={param.name}
                      onChange={e => updateParameter(idx, { name: e.target.value })} />
                    <Input placeholder="Code" value={param.code} className="font-mono"
                      onChange={e => updateParameter(idx, { code: e.target.value.toUpperCase() })} />
                    <Select value={param.type}
                      onValueChange={v => updateParameter(idx, { type: v as ParameterType })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="select">Select</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-1">
                      <Input placeholder="Unit" value={param.unit}
                        onChange={e => updateParameter(idx, { unit: e.target.value })} className="flex-1" />
                      <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0"
                        onClick={() => removeParameter(idx)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-1.5 text-xs">
                      <input type="checkbox" checked={param.is_required}
                        onChange={e => updateParameter(idx, { is_required: e.target.checked })}
                        className="rounded" />
                      Required
                    </label>
                    <Input placeholder="Default value" value={param.default_value}
                      onChange={e => updateParameter(idx, { default_value: e.target.value })}
                      className="flex-1 h-8 text-xs" />
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTemplate}>
              {editTarget ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Display Dialog ─── */}
      <Dialog open={displayOpen} onOpenChange={setDisplayOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{displayTarget?.name}</DialogTitle>
            <DialogDescription>{displayTarget?.description || 'No description'}</DialogDescription>
          </DialogHeader>
          {displayTarget && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge variant="secondary" className="font-mono">{displayTarget.template_code}</Badge>
                {displayTarget.is_system && <Badge variant="outline"><Lock className="h-3 w-3 mr-1" /> System</Badge>}
                <Badge variant={displayTarget.is_active ? 'default' : 'secondary'}>
                  {displayTarget.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Scopes</p>
                <div className="flex gap-1">
                  {displayTarget.template_scope.map(s => (
                    <Badge key={s} variant="outline">{SCOPE_LABELS[s]}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Parameters ({displayTarget.parameters.length})</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Unit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayTarget.parameters.map(p => (
                      <TableRow key={p.id}>
                        <TableCell>{p.name}</TableCell>
                        <TableCell><Badge variant="secondary" className="font-mono text-xs">{p.code}</Badge></TableCell>
                        <TableCell className="capitalize">{p.type}</TableCell>
                        <TableCell>{p.unit || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirm Dialog ─── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteTemplate}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
