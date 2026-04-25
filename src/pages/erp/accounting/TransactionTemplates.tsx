import { useState, useMemo, useRef, useCallback } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { FileText, Shield, CreditCard, Plus, Edit2, Trash2, Search, Star, StarOff, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { useTransactionTemplates } from '@/hooks/useTransactionTemplates';
import type { TransactionTemplate, TransactionTemplateType } from '@/types/transaction-template';
import { TEMPLATE_VARIABLES, PREVIEW_VARS, VOUCHER_TYPE_NAMES,
  applyVariables } from '@/types/transaction-template';
import { cn } from '@/lib/utils';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';

const DEPT_LABELS = ['Sales','Purchase','Accounts','Stores','HR','Admin','Universal'];

const TYPE_META: Record<TransactionTemplateType, {
  label: string; icon: React.ElementType; color: string; desc: string;
}> = {
  narration: {
    label: 'Narrations',
    icon: FileText,
    color: 'bg-teal-500/10 text-teal-700 border-teal-500/30',
    desc: 'Internal accounting text — bookkeeping record on the voucher'
  },
  terms_conditions: {
    label: 'Terms & Conditions',
    icon: Shield,
    color: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
    desc: 'Commercial clauses — goods, delivery, quality, jurisdiction — printed on document'
  },
  payment_enforcement: {
    label: 'Payment Enforcement',
    icon: CreditCard,
    color: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
    desc: 'Financial obligation clauses — interest, bounce penalty, advance, credit block'
  },
};

const BLANK: Omit<TransactionTemplate,'id'|'code'|'created_at'|'updated_at'> = {
  name: '',
  type: 'narration',
  department_label: 'Universal',
  applicable_department_ids: [],
  applicable_voucher_types: [],
  content: '',
  is_default: false,
  language: 'en',
  status: 'active',
};

export function TransactionTemplatesPanel() {
  const { templates, narrationCount, termsCount, enforcementCount,
    createTemplate, updateTemplate, deleteTemplate, toggleStatus } = useTransactionTemplates();

  const [activeTab, setActiveTab] = useState<TransactionTemplateType>('narration');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TransactionTemplate | null>(null);
  const [form, setForm] = useState(BLANK);
  const [previewOpen, setPreviewOpen] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      if (t.type !== activeTab) return false;
      if (search && !t.name.toLowerCase().includes(search.toLowerCase()) &&
          !t.code.toLowerCase().includes(search.toLowerCase())) return false;
      if (deptFilter !== 'all' && t.department_label !== deptFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      return true;
    });
  }, [templates, activeTab, search, deptFilter, statusFilter]);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ ...BLANK, type: activeTab });
    setSheetOpen(true);
  };

  const openEdit = (t: TransactionTemplate) => {
    setEditTarget(t);
    setForm({
      name: t.name, type: t.type, department_label: t.department_label,
      applicable_department_ids: t.applicable_department_ids,
      applicable_voucher_types: t.applicable_voucher_types,
      content: t.content, is_default: t.is_default,
      language: t.language, status: t.status,
    });
    setSheetOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.content.trim()) { toast.error('Content is required'); return; }
    if (editTarget) {
      updateTemplate(editTarget.id, form);
    } else {
      createTemplate(form);
    }
    setSheetOpen(false);
    setForm(BLANK);
    setEditTarget(null);
  };

  const handleCtrlSave = useCallback(() => {
    if (!sheetOpen) return;
    handleSave();
  }, [sheetOpen, handleSave]);
  useCtrlS(handleCtrlSave);

  const insertVariable = (variable: string) => {
    const ta = contentRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = form.content.substring(0, start);
    const after = form.content.substring(end);
    const newContent = before + variable + after;
    setForm(f => ({ ...f, content: newContent }));
    setTimeout(() => {
      ta.focus();
      const pos = start + variable.length;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  const orgDepts: { id: string; name: string }[] = useMemo(() => {
    try {
      // [JWT] GET /api/foundation/departments
      const raw = localStorage.getItem('erp_departments');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, []);

  const renderTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead style={{ width: 80 }}>Code</TableHead>
          <TableHead>Name</TableHead>
          <TableHead style={{ width: 90 }}>Department</TableHead>
          <TableHead>Voucher Types</TableHead>
          <TableHead style={{ width: 60 }}>Default</TableHead>
          <TableHead style={{ width: 70 }}>Status</TableHead>
          <TableHead style={{ width: 100 }}>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredTemplates.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
              No templates found. Click "+ New Template" to create one.
            </TableCell>
          </TableRow>
        ) : filteredTemplates.map(t => (
          <TableRow key={t.id} className="group">
            <TableCell className="font-mono text-xs text-teal-600">{t.code}</TableCell>
            <TableCell className="font-semibold text-sm">{t.name}</TableCell>
            <TableCell>
              <Badge variant="outline" className={cn('text-[10px]',
                t.department_label === 'Universal' ? 'bg-teal-500/10 text-teal-700 border-teal-500/30' : ''
              )}>{t.department_label}</Badge>
            </TableCell>
            <TableCell>
              {t.applicable_voucher_types.length === 0 ? (
                <Badge variant="outline" className="text-[10px]">All</Badge>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {t.applicable_voucher_types.slice(0, 2).map(vt => (
                    <Badge key={vt} variant="outline" className="text-[10px]">{vt}</Badge>
                  ))}
                  {t.applicable_voucher_types.length > 2 && (
                    <Badge variant="outline" className="text-[10px]">+{t.applicable_voucher_types.length - 2} more</Badge>
                  )}
                </div>
              )}
            </TableCell>
            <TableCell>
              {t.is_default ? <Star className="h-4 w-4 text-amber-500 fill-amber-500" /> : <StarOff className="h-4 w-4 text-muted-foreground/30" />}
            </TableCell>
            <TableCell>
              <Badge variant="outline" className={cn('text-[10px]',
                t.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground'
              )}>{t.status === 'active' ? 'Active' : 'Inactive'}</Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleStatus(t.id)}>
                  {t.status === 'active' ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTemplate(t.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6" data-keyboard-form>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transaction Templates</h1>
          <p className="text-sm text-muted-foreground">Standard narrations, terms & conditions, and payment enforcement clauses</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> New Template</Button>
      </div>

      {/* Stats strip */}
      <div className="flex gap-3">
        {([
          { label: 'Narrations', count: narrationCount, cls: TYPE_META.narration.color },
          { label: 'Terms & Conditions', count: termsCount, cls: TYPE_META.terms_conditions.color },
          { label: 'Payment Enforcement', count: enforcementCount, cls: TYPE_META.payment_enforcement.color },
        ] as const).map(s => (
          <Badge key={s.label} variant="outline" className={cn('text-xs px-3 py-1', s.cls)}>
            {s.label}: {s.count}
          </Badge>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as TransactionTemplateType)}>
        <TabsList>
          {(Object.entries(TYPE_META) as [TransactionTemplateType, typeof TYPE_META[TransactionTemplateType]][]).map(([key, meta]) => {
            const Icon = meta.icon;
            const count = key === 'narration' ? narrationCount : key === 'terms_conditions' ? termsCount : enforcementCount;
            return (
              <TabsTrigger key={key} value={key} className="gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                {meta.label}
                <Badge variant="secondary" className="text-[10px] ml-1 h-4 min-w-[18px] px-1">{count}</Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {(Object.keys(TYPE_META) as TransactionTemplateType[]).map(typeKey => (
          <TabsContent key={typeKey} value={typeKey} className="space-y-4">
            {/* Filter bar */}
            <div className="flex gap-3 items-center">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search templates..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {DEPT_LABELS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {renderTable()}
          </TabsContent>
        ))}
      </Tabs>

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editTarget ? 'Edit Template' : 'New Template'}</SheetTitle>
            <SheetDescription>
              {editTarget ? `Editing ${editTarget.code}` : 'Create a new transaction template'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={onEnterNext} placeholder="Template name" />
            </div>

            <div>
              <Label className="text-xs">Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as TransactionTemplateType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="narration">Narration</SelectItem>
                  <SelectItem value="terms_conditions">Terms & Conditions</SelectItem>
                  <SelectItem value="payment_enforcement">Payment Enforcement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Department Label</Label>
              <Select value={form.department_label} onValueChange={v => setForm(f => ({ ...f, department_label: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEPT_LABELS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {orgDepts.length > 0 && (
              <div>
                <Label className="text-xs">Link to Org Departments</Label>
                <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                  {orgDepts.map(dept => (
                    <label key={dept.id} className="flex items-center gap-2 py-1 px-2 hover:bg-muted/30 cursor-pointer text-xs">
                      <input type="checkbox"
                        checked={form.applicable_department_ids.includes(dept.id)}
                        onChange={e => {
                          const next = e.target.checked
                            ? [...form.applicable_department_ids, dept.id]
                            : form.applicable_department_ids.filter(x => x !== dept.id);
                          setForm(f => ({ ...f, applicable_department_ids: next }));
                        }}
                      />
                      {dept.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs">Applicable Voucher Types</Label>
              <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-0.5">
                {VOUCHER_TYPE_NAMES.map(vt => (
                  <label key={vt} className="flex items-center gap-2 py-1 px-2 hover:bg-muted/30 cursor-pointer text-xs">
                    <input type="checkbox"
                      checked={form.applicable_voucher_types.includes(vt)}
                      onChange={e => {
                        const next = e.target.checked
                          ? [...form.applicable_voucher_types, vt]
                          : form.applicable_voucher_types.filter(x => x !== vt);
                        setForm(f => ({ ...f, applicable_voucher_types: next }));
                      }}
                    />
                    {vt}
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Leave all unchecked = applies to all voucher types</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Is Default</Label>
                <Switch checked={form.is_default} onCheckedChange={v => setForm(f => ({ ...f, is_default: v }))} />
              </div>
            </div>

            <div>
              <Label className="text-xs">Language</Label>
              <Select value={form.language} onValueChange={v => setForm(f => ({ ...f, language: v as 'en' | 'hi' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs">Status</Label>
              <Switch checked={form.status === 'active'} onCheckedChange={v => setForm(f => ({ ...f, status: v ? 'active' : 'inactive' }))} />
              <span className="text-xs text-muted-foreground">{form.status === 'active' ? 'Active' : 'Inactive'}</span>
            </div>

            <Separator />

            <div>
              <Label className="text-xs">Content *</Label>
              <Textarea
                ref={contentRef}
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={8}
                className="font-mono text-xs resize-y"
                placeholder="Enter template content with {variables}..."
              />
              <p className="text-[10px] text-muted-foreground mt-1 text-right">{form.content.length} characters</p>
            </div>

            {/* Variable chips */}
            <div>
              <Label className="text-[10px] text-muted-foreground">Insert variable:</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {TEMPLATE_VARIABLES.map(v => (
                  <button key={v} type="button" onClick={() => insertVariable(v)}
                    className="px-2 py-0.5 text-[10px] rounded-full border bg-muted/50 hover:bg-primary/10 hover:border-primary/30 transition-colors font-mono">
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Preview */}
            <Collapsible open={previewOpen} onOpenChange={setPreviewOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", previewOpen && "rotate-180")} />
                Preview — rendered output
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 p-3 rounded-lg border bg-muted/30 text-xs whitespace-pre-wrap font-mono">
                  {form.content ? applyVariables(form.content, PREVIEW_VARS) : '(no content)'}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} data-primary>
                {editTarget ? 'Update Template' : 'Save Template'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function TransactionTemplates() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background flex flex-col">
        <ERPHeader
          breadcrumbs={[
            { label: 'Operix Core', href: '/erp/dashboard' },
            { label: 'Command Center', href: '/erp/command-center' },
            { label: 'FineCore Masters' },
            { label: 'Transaction Templates' },
          ]}
          showDatePicker={false} showCompany={false}
        />
        <div className="flex-1 overflow-auto p-6">
          <TransactionTemplatesPanel />
        </div>
      </div>
    </SidebarProvider>
  );
}
