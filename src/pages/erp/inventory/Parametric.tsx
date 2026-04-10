import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Lock, Settings2, Boxes, Trash2 } from 'lucide-react';

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
  industry_category: string;
  parameter_count: number;
  is_system: boolean;
  is_active: boolean;
  template_scope: string[];
}

// [JWT] Replace with GET /api/inventory/parameter-templates
const SYSTEM_TEMPLATES: ParameterTemplate[] = [
  { id: 'sys-001', template_code: 'GEN-001', name: 'General Parameters',
    industry_category: 'general', parameter_count: 5, is_system: true,
    is_active: true, template_scope: ['stock_matrix', 'general'] },
  { id: 'sys-002', template_code: 'STL-001', name: 'Steel Parameters',
    industry_category: 'steel', parameter_count: 8, is_system: true,
    is_active: true, template_scope: ['stock_matrix', 'steel'] },
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
  const [groupLinks, setGroupLinks] = useState<StockGroupTemplateLink[]>([]);
  // [JWT] Replace with GET /api/inventory/stock-group-template-links
  const [selectedStockGroupId, setSelectedStockGroupId] = useState<string | null>(null);

  const handleAddGroupLink = (stockGroupId: string, templateId: string, isMandatory: boolean) => {
    const group    = MOCK_STOCK_GROUPS.find(g => g.id === stockGroupId);
    const template = templates.find(t => t.id === templateId);
    if (!group || !template) return;
    const link: StockGroupTemplateLink = {
      id: `link-${Date.now()}`,
      stock_group_id: stockGroupId,   stock_group_name: group.name,
      stock_group_code: group.code,   stock_group_level: group.level,
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
                  <Button size="sm" className="gap-1">
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
                    <Button size="sm" className="gap-1">
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
