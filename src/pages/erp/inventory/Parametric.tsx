import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Search, Plus, Lock, Settings2 } from 'lucide-react';

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

export default function Parametric() {
  const [templates, setTemplates] = useState<ParameterTemplate[]>(SYSTEM_TEMPLATES);
  // [JWT] Replace with GET /api/inventory/parameter-templates
  const [search, setSearch] = useState('');

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.template_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader />
        <main className="flex-1 p-6">
          <div className="max-w-5xl mx-auto space-y-6">
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
              <Card><CardHeader className="pb-2"><CardDescription>Active</CardDescription>
                <CardTitle className="text-2xl">{templates.filter(t => t.is_active).length}</CardTitle>
                </CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>Stock Matrix</CardDescription>
                <CardTitle className="text-2xl">
                  {templates.filter(t => t.template_scope.includes('stock_matrix')).length}
                </CardTitle></CardHeader></Card>
            </div>

            {/* Template list */}
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
                  {filtered.map(t => (
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
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
