import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Search, Plus, Lock, Settings2, Boxes, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

export interface ParameterEntry {
  id: string;
  parameter_name: string;
  parameter_code: string;
  parameter_type: 'simple' | 'number' | 'list' | 'date' | 'yes-no';
  unit?: string;
  default_value?: string;
  is_mandatory: boolean;
  is_searchable: boolean;
  validation_min?: number;
  validation_max?: number;
  list_options?: string[];
}

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

interface ParameterTemplate {
  id: string;
  template_code: string;
  name: string;
  description?: string;
  industry_category: string;
  parameters: ParameterEntry[];
  name_pattern: string;
  parameter_count: number;
  is_system: boolean;
  is_active: boolean;
  template_scope: string[];
}

const INDUSTRY_CATEGORIES = [
  { value: 'general', label: 'General', emoji: '📋' },
  { value: 'steel', label: 'Steel', emoji: '🏭' },
  { value: 'pharma', label: 'Pharma', emoji: '💊' },
  { value: 'food', label: 'Food & Bev', emoji: '🍔' },
  { value: 'electronics', label: 'Electronics', emoji: '💻' },
  { value: 'automotive', label: 'Automotive', emoji: '🚗' },
  { value: 'textile', label: 'Textile', emoji: '🧵' },
  { value: 'chemicals', label: 'Chemicals', emoji: '🧪' },
  { value: 'plastics', label: 'Plastics', emoji: '♻️' },
  { value: 'packaging', label: 'Packaging', emoji: '📦' },
];

const PARAMETER_TYPES = [
  { value: 'simple', label: 'Simple Text' },
  { value: 'number', label: 'Number (with unit)' },
  { value: 'list', label: 'Dropdown List' },
  { value: 'date', label: 'Date' },
  { value: 'yes-no', label: 'Yes / No' },
];

// [JWT] Replace with GET /api/inventory/parameter-templates
const SYSTEM_TEMPLATES: ParameterTemplate[] = [
  {
    id: 'sys-001', template_code: 'GEN-001', name: 'General Parameters',
    industry_category: 'general', parameter_count: 5, is_system: true,
    is_active: true, template_scope: ['stock_matrix', 'general'],
    name_pattern: '{name}',
    parameters: [
      { id: 'p1', parameter_name: 'Item Name', parameter_code: 'NAME', parameter_type: 'simple', unit: '', is_mandatory: true, is_searchable: true },
      { id: 'p2', parameter_name: 'Grade', parameter_code: 'GRADE', parameter_type: 'simple', unit: '', is_mandatory: false, is_searchable: true },
      { id: 'p3', parameter_name: 'Quantity', parameter_code: 'QTY', parameter_type: 'number', unit: 'pcs', is_mandatory: false, is_searchable: false },
      { id: 'p4', parameter_name: 'Standard', parameter_code: 'STD', parameter_type: 'list', list_options: ['IS', 'DIN', 'ASTM', 'BS'], unit: '', is_mandatory: false, is_searchable: true },
      { id: 'p5', parameter_name: 'Remarks', parameter_code: 'REM', parameter_type: 'simple', unit: '', is_mandatory: false, is_searchable: false },
    ],
  },
  {
    id: 'sys-002', template_code: 'STL-001', name: 'Steel Parameters',
    industry_category: 'steel', parameter_count: 8, is_system: true,
    is_active: true, template_scope: ['stock_matrix', 'steel'],
    name_pattern: '{grade} {shape} {dia}mm × {length}mm',
    parameters: [
      { id: 's1', parameter_name: 'Grade', parameter_code: 'GRADE', parameter_type: 'list', list_options: ['MS', 'SS', 'EN8', 'EN24', 'IS2062'], unit: '', is_mandatory: true, is_searchable: true },
      { id: 's2', parameter_name: 'Shape', parameter_code: 'SHAPE', parameter_type: 'list', list_options: ['Round Bar', 'Flat Bar', 'Square Bar', 'Angle', 'Channel', 'Pipe'], unit: '', is_mandatory: true, is_searchable: true },
      { id: 's3', parameter_name: 'Diameter', parameter_code: 'DIA', parameter_type: 'number', unit: 'mm', validation_min: 5, validation_max: 500, is_mandatory: false, is_searchable: true },
      { id: 's4', parameter_name: 'Length', parameter_code: 'LEN', parameter_type: 'number', unit: 'mm', validation_min: 100, validation_max: 12000, is_mandatory: false, is_searchable: true },
      { id: 's5', parameter_name: 'Thickness', parameter_code: 'THK', parameter_type: 'number', unit: 'mm', is_mandatory: false, is_searchable: true },
      { id: 's6', parameter_name: 'Width', parameter_code: 'WID', parameter_type: 'number', unit: 'mm', is_mandatory: false, is_searchable: true },
      { id: 's7', parameter_name: 'Finish', parameter_code: 'FIN', parameter_type: 'list', list_options: ['Black', 'Bright', 'Galvanized', 'Coated', 'Turned'], unit: '', is_mandatory: false, is_searchable: true },
      { id: 's8', parameter_name: 'Standard', parameter_code: 'STD', parameter_type: 'list', list_options: ['IS', 'DIN', 'ASTM', 'BS', 'JIS'], unit: '', is_mandatory: false, is_searchable: false },
    ],
  },
];

const MOCK_STOCK_GROUPS = [
  { id: 'sg-001', code: 'ALL', name: 'All Items', level: 1, parentId: null },
  { id: 'sg-002', code: 'FG', name: 'Finished Goods', level: 2, parentId: 'sg-001' },
  { id: 'sg-003', code: 'RM', name: 'Raw Materials', level: 2, parentId: 'sg-001' },
  { id: 'sg-004', code: 'WIP', name: 'Work-in-Progress', level: 2, parentId: 'sg-001' },
  { id: 'sg-005', code: 'PKG', name: 'Packing Materials', level: 2, parentId: 'sg-001' },
  { id: 'sg-006', code: 'SPARES', name: 'Spare Parts', level: 3, parentId: 'sg-003' },
];

/** Panel variant — renders inside CommandCenterPage without SidebarProvider/ERPHeader wrapper */
export function ParametricPanel() {
  const [templates, setTemplates] = useState<ParameterTemplate[]>(SYSTEM_TEMPLATES);
  // [JWT] Replace with GET /api/inventory/parameter-templates
  const [search, setSearch] = useState('');
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ParameterTemplate | null>(null);
  const [tplForm, setTplForm] = useState({
    name: '',
    template_code: '',
    description: '',
    industry_category: 'general',
    name_pattern: '',
    template_scope: ['stock_matrix'] as string[],
  });
  const [tplParams, setTplParams] = useState<ParameterEntry[]>([]);
  const [newListOption, setNewListOption] = useState('');
  const [groupLinks, setGroupLinks] = useState<StockGroupTemplateLink[]>([]);
  // [JWT] Replace with GET /api/inventory/stock-group-template-links
  const [selectedStockGroupId, setSelectedStockGroupId] = useState<string | null>(null);

  const openCreateTemplate = () => {
    setEditingTemplate(null);
    setTplForm({
      name: '', template_code: '', description: '',
      industry_category: 'general', name_pattern: '',
      template_scope: ['stock_matrix'],
    });
    setTplParams([]);
    setTemplateDialogOpen(true);
  };

  const openEditTemplate = (t: ParameterTemplate) => {
    setEditingTemplate(t);
    setTplForm({
      name: t.name,
      template_code: t.template_code,
      description: t.description ?? '',
      industry_category: t.industry_category,
      name_pattern: t.name_pattern,
      template_scope: [...t.template_scope],
    });
    setTplParams(t.parameters.map(p => ({ ...p })));
    setTemplateDialogOpen(true);
  };

  const addParameter = () => {
    setTplParams(prev => [...prev, {
      id: `p-${Date.now()}`, parameter_name: '', parameter_code: '',
      parameter_type: 'simple', unit: '',
      is_mandatory: false, is_searchable: true,
    }]);
  };

  const updateParam = (index: number, field: keyof ParameterEntry, value: unknown) => {
    setTplParams(prev => { const u = [...prev]; u[index] = { ...u[index], [field]: value } as ParameterEntry; return u; });
  };

  const removeParam = (index: number) => {
    setTplParams(prev => prev.filter((_, i) => i !== index));
  };

  const saveTemplate = () => {
    if (!tplForm.name.trim()) { toast.error('Template name is required'); return; }
    if (tplParams.length === 0) { toast.error('Add at least one parameter'); return; }
    if (editingTemplate) {
      const updated = templates.map(t => t.id === editingTemplate.id ? {
        ...t, ...tplForm,
        parameters: tplParams,
        parameter_count: tplParams.length,
      } : t);
      setTemplates(updated);
      toast.success(`${tplForm.name} updated`);
      // [JWT] Replace with PATCH /api/inventory/parameter-templates/:id
    } else {
      const newTemplate: ParameterTemplate = {
        id: `tpl-${Date.now()}`,
        ...tplForm,
        parameters: tplParams,
        parameter_count: tplParams.length,
        is_system: false,
        is_active: true,
      };
      setTemplates(prev => [...prev, newTemplate]);
      toast.success(`${tplForm.name} created`);
      // [JWT] Replace with POST /api/inventory/parameter-templates
    }
    setTemplateDialogOpen(false);
  };

  const deleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    toast.success('Template deleted');
    // [JWT] Replace with DELETE /api/inventory/parameter-templates/:id
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
      parameter_count: template.parameter_count,
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

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.template_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings2 className="h-6 w-6" /> Parametric Hub
          </h1>
          <p className="text-sm text-muted-foreground">
            Parameter templates and stock group assignments
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total Templates</CardDescription>
          <CardTitle className="text-2xl">{templates.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>System Templates</CardDescription>
          <CardTitle className="text-2xl">{templates.filter(t => t.is_system).length}</CardTitle>
          </CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Groups Linked</CardDescription>
          <CardTitle className="text-2xl">
            {new Set(groupLinks.map(l => l.stock_group_id)).size}
          </CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Stock Matrix</CardDescription>
          <CardTitle className="text-2xl">
            {templates.filter(t => t.template_scope.includes('stock_matrix')).length}
          </CardTitle></CardHeader></Card>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">
            <Settings2 className="h-4 w-4 mr-1.5" /> Templates
          </TabsTrigger>
          <TabsTrigger value="groups">
            <Boxes className="h-4 w-4 mr-1.5" /> Group Assignment
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Parameter Templates</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-8 h-9 w-56" placeholder="Search..."
                      value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <Button size="sm" className="gap-1" onClick={openCreateTemplate}>
                    <Plus className="h-4 w-4" /> Add Template
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {filtered.length === 0 && !search ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Settings2 className="h-7 w-7 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold mb-1">No parameter templates yet</p>
                      <p className="text-sm text-muted-foreground max-w-xs">
                        GEN-001 auto-creates when you set up a company.
                      </p>
                    </div>
                    <Button size="sm" className="gap-1" onClick={openCreateTemplate}>
                      <Plus className="h-4 w-4" /> Create First Template
                    </Button>
                  </div>
                ) : filtered.map(t => (
                  <div key={t.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="font-mono text-xs">{t.template_code}</Badge>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium">{t.name}</span>
                          {t.is_system && <Lock className="h-3 w-3 text-muted-foreground" />}
                        </div>
                        <p className="text-xs text-muted-foreground">{t.parameter_count} parameters</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {t.template_scope.map(s => (
                        <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                      {!t.is_system && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7 ml-1"
                            onClick={() => openEditTemplate(t)}>
                            <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => deleteTemplate(t.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT — Stock Group list */}
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

            {/* RIGHT — Linked Templates */}
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
                          l.stock_group_id === selectedStockGroupId &&
                          l.parameter_template_id === t.id))
                        .map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} ({t.parameter_count} params)
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
                              <input type="checkbox" checked={link.is_mandatory}
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

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? `Edit: ${editingTemplate.name}` : 'New Parameter Template'}
            </DialogTitle>
            <DialogDescription>
              Define the parameters that describe items in a stock group
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* ── Template Details ── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Template Name <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. Steel Flat Bar Template"
                  value={tplForm.name}
                  onChange={e => setTplForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Template Code</Label>
                <Input placeholder="e.g. STL-FLAT-001"
                  value={tplForm.template_code}
                  onChange={e => setTplForm(f => ({ ...f, template_code: e.target.value.toUpperCase() }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Industry Category</Label>
                <Select value={tplForm.industry_category}
                  onValueChange={v => setTplForm(f => ({ ...f, industry_category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.emoji} {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Item Name Pattern</Label>
                <Input placeholder="e.g. {grade} {shape} {dia}mm"
                  value={tplForm.name_pattern}
                  onChange={e => setTplForm(f => ({ ...f, name_pattern: e.target.value }))} />
                <p className="text-xs text-muted-foreground">
                  Use {'{code}'} to reference parameter codes. Example: {'{grade} {shape} {dia}mm x {len}mm'}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="What items use this template?"
                value={tplForm.description}
                onChange={e => setTplForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label>Scope — where this template is used</Label>
              <div className="flex gap-4">
                {(['stock_matrix', 'general', 'transaction'] as const).map(scope => (
                  <label key={scope} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox"
                      checked={tplForm.template_scope.includes(scope)}
                      onChange={e => setTplForm(f => ({
                        ...f,
                        template_scope: e.target.checked
                          ? [...f.template_scope, scope]
                          : f.template_scope.filter(s => s !== scope)
                      }))} />
                    {scope === 'stock_matrix' ? 'Stock Matrix' : scope === 'general' ? 'General' : 'Transactions (PO/SO)'}
                  </label>
                ))}
              </div>
            </div>

            <Separator />

            {/* ── Parameters Builder ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Parameters ({tplParams.length})</Label>
                <Button size="sm" variant="outline" className="gap-1" onClick={addParameter}>
                  <Plus className="h-3.5 w-3.5" /> Add Parameter
                </Button>
              </div>

              {tplParams.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
                  No parameters yet. Click &quot;Add Parameter&quot; to start.
                </div>
              )}

              {tplParams.map((param, idx) => (
                <div key={param.id} className="border rounded-lg p-3 space-y-3 bg-muted/20">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Parameter Name</Label>
                      <Input className="h-8" placeholder="e.g. Grade"
                        value={param.parameter_name}
                        onChange={e => updateParam(idx, 'parameter_name', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Code (auto-uppercase)</Label>
                      <Input className="h-8" placeholder="e.g. GRADE"
                        value={param.parameter_code}
                        onChange={e => updateParam(idx, 'parameter_code', e.target.value.toUpperCase())} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select value={param.parameter_type}
                        onValueChange={v => updateParam(idx, 'parameter_type', v)}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PARAMETER_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Unit of Measure</Label>
                      <Input className="h-8" placeholder="mm / kg / pcs / °C"
                        value={param.unit ?? ''}
                        onChange={e => updateParam(idx, 'unit', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Default Value</Label>
                      <Input className="h-8" placeholder="Optional default"
                        value={param.default_value ?? ''}
                        onChange={e => updateParam(idx, 'default_value', e.target.value)} />
                    </div>
                    <div className="flex items-end gap-4 pb-1">
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="checkbox" checked={param.is_mandatory}
                          onChange={e => updateParam(idx, 'is_mandatory', e.target.checked)} />
                        Required
                      </label>
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="checkbox" checked={param.is_searchable}
                          onChange={e => updateParam(idx, 'is_searchable', e.target.checked)} />
                        Searchable
                      </label>
                      <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto"
                        onClick={() => removeParam(idx)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {param.parameter_type === 'number' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Min Value</Label>
                        <Input type="number" className="h-8"
                          value={param.validation_min ?? ''}
                          onChange={e => updateParam(idx, 'validation_min', parseFloat(e.target.value))} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Max Value</Label>
                        <Input type="number" className="h-8"
                          value={param.validation_max ?? ''}
                          onChange={e => updateParam(idx, 'validation_max', parseFloat(e.target.value))} />
                      </div>
                    </div>
                  )}

                  {param.parameter_type === 'list' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Dropdown Options (press Enter to add)</Label>
                      <div className="flex flex-wrap gap-1.5 p-2 border rounded-md bg-background min-h-[36px]">
                        {(param.list_options ?? []).map((opt, oi) => (
                          <Badge key={oi} variant="secondary" className="gap-1">
                            {opt}
                            <button className="ml-1 hover:text-destructive"
                              onClick={() => updateParam(idx, 'list_options',
                                (param.list_options ?? []).filter((_, i) => i !== oi))}>
                              ×
                            </button>
                          </Badge>
                        ))}
                        <Input className="h-6 border-0 p-0 text-xs w-24 focus-visible:ring-0"
                          placeholder="Add option..."
                          value={newListOption}
                          onChange={e => setNewListOption(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newListOption.trim()) {
                              updateParam(idx, 'list_options', [...(param.list_options ?? []), newListOption.trim()]);
                              setNewListOption('');
                              e.preventDefault();
                            }
                          }} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveTemplate} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              {editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Parametric() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader />
        <main className="flex-1 p-6">
          <ParametricPanel />
        </main>
      </div>
    </SidebarProvider>
  );
}
