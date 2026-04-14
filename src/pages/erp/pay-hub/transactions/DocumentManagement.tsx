import React, { useState, useMemo, useCallback, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { Separator } from '@/components/ui/separator';
import {
  FolderOpen, FileText, Camera, Upload, Eye, Download, Trash2,
  Plus, Search, Filter, Printer, RefreshCw, AlertTriangle, X,
  CheckCircle2, Edit,
} from 'lucide-react';
import { toast } from 'sonner';
import type { EmployeeDocument, DocTemplate, DocMgmtTab, EmpDocCategory, TemplateCategory } from '@/types/doc-management';
import {
  EMPLOYEE_DOCS_KEY, DOC_TEMPLATES_KEY,
  EMP_DOC_CATEGORY_LABELS, TEMPLATE_CATEGORY_LABELS,
  SEEDED_TEMPLATES,
} from '@/types/doc-management';
import type { Employee } from '@/types/employee';
import { EMPLOYEES_KEY } from '@/types/employee';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { cn } from '@/lib/utils';

// ── File size + Base64 helpers ───────────────────────────────────
const MAX_FILE_BYTES = 1_048_576; // 1 MB hard limit
const WARN_FILE_BYTES = 512_000;  // 500 KB soft warning

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function extractPlaceholders(html: string): string[] {
  return [...new Set((html.match(/\{\{[^}]+\}\}/g) ?? []))];
}

// ── Attach type badge colors ─────────────────────────────────────
const ATTACH_TYPE_COLORS: Record<string, string> = {
  upload: 'bg-slate-500/10 text-slate-600 border-slate-400/30',
  camera: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  webcam: 'bg-violet-500/10 text-violet-600 border-violet-500/30',
  scan: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
};

const TMPL_CAT_COLORS: Record<TemplateCategory, string> = {
  offer: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  confirmation: 'bg-green-500/10 text-green-700 border-green-500/30',
  compensation: 'bg-violet-500/10 text-violet-700 border-violet-500/30',
  disciplinary: 'bg-red-500/10 text-red-700 border-red-500/30',
  separation: 'bg-slate-500/10 text-slate-700 border-slate-400/30',
  joining: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  compliance: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/30',
  appraisal: 'bg-pink-500/10 text-pink-700 border-pink-500/30',
};

// ══════════════════════════════════════════════════════════════════
// Component
// ══════════════════════════════════════════════════════════════════

interface DocumentManagementPanelProps { defaultTab?: DocMgmtTab; }

export function DocumentManagementPanel({ defaultTab = 'vault' }: DocumentManagementPanelProps) {
  // ── Cross-module read ────────────────────────────────────────
  const activeEmployees = useMemo<Employee[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/employees
      const raw = localStorage.getItem(EMPLOYEES_KEY);
      if (raw) return (JSON.parse(raw) as Employee[]).filter(e => e.status === 'active');
    } catch { /* ignore */ }
    return [];
  }, []);

  // ── Employee Documents state ─────────────────────────────────
  const [docs, setDocs] = useState<EmployeeDocument[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/documents/employee-docs
      const raw = localStorage.getItem(EMPLOYEE_DOCS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const saveDocs = (items: EmployeeDocument[]) => {
    // [JWT] PUT /api/pay-hub/documents/employee-docs
    localStorage.setItem(EMPLOYEE_DOCS_KEY, JSON.stringify(items));
    setDocs(items);
  };

  // ── Templates state (seed on first load) ─────────────────────
  const [templates, setTemplates] = useState<DocTemplate[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/documents/templates
      const raw = localStorage.getItem(DOC_TEMPLATES_KEY);
      if (raw) {
        const parsed: DocTemplate[] = JSON.parse(raw);
        if (parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    const now = new Date().toISOString();
    const seeded: DocTemplate[] = SEEDED_TEMPLATES.map((t, i) => ({
      ...t, id: `tmpl-${i + 1}`, hrOverrideData: '', hrOverrideFileName: '', lastUsed: '',
      created_at: now, updated_at: now,
      placeholders: extractPlaceholders(t.contentHtml),
    }));
    // [JWT] PUT /api/pay-hub/documents/templates (seed)
    localStorage.setItem(DOC_TEMPLATES_KEY, JSON.stringify(seeded));
    return seeded;
  });
  const saveTemplates = (items: DocTemplate[]) => {
    // [JWT] PUT /api/pay-hub/documents/templates
    localStorage.setItem(DOC_TEMPLATES_KEY, JSON.stringify(items));
    setTemplates(items);
  };

  // ── Search + filters ─────────────────────────────────────────
  const [docSearch, setDocSearch] = useState('');
  const [docCatFilter, setDocCatFilter] = useState<string>('all');
  const [docEmpFilter, setDocEmpFilter] = useState<string>('all');
  const [tmplSearch, setTmplSearch] = useState('');
  const [tmplCatFilter, setTmplCatFilter] = useState<string>('all');
  const [tmplTypeFilter, setTmplTypeFilter] = useState<string>('all');
  const [viewDocId, setViewDocId] = useState<string | null>(null);

  // ── Document Sheet state ─────────────────────────────────────
  const [docSheetOpen, setDocSheetOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const BLANK_DOC = {
    employeeId: '', employeeCode: '', employeeName: '',
    category: 'identity' as EmpDocCategory, title: '',
    issueDate: '', expiryDate: '', isExpired: false,
    fileName: '', fileType: '', fileSizeBytes: 0, fileData: '',
    attachType: 'upload' as DocAttachType, tags: [] as string[], notes: '',
    uploadedBy: 'HR Admin',
  };
  const [docForm, setDocForm] = useState(BLANK_DOC);
  const duf = <K extends keyof typeof BLANK_DOC>(k: K, v: (typeof BLANK_DOC)[K]) =>
    setDocForm(prev => ({ ...prev, [k]: v }));

  // ── File attach handler ──────────────────────────────────────
  const handleFileAttach = async (
    file: File,
    attachType: 'upload' | 'camera' | 'webcam' | 'scan'
  ) => {
    if (file.size > MAX_FILE_BYTES) {
      toast.error(`File too large (${formatBytes(file.size)}). Maximum allowed: 1 MB.`);
      return;
    }
    if (file.size > WARN_FILE_BYTES) {
      toast.warning(`Large file (${formatBytes(file.size)}). Consider compressing for faster loading.`);
    }
    try {
      const dataUrl = await readFileAsDataURL(file);
      duf('fileName', file.name);
      duf('fileType', file.type);
      duf('fileSizeBytes', file.size);
      duf('fileData', dataUrl);
      duf('attachType', attachType);
      if (!docForm.title) duf('title', file.name.replace(/\.[^.]+$/, '').replace(/_/g, ' '));
    } catch {
      toast.error('Failed to read file. Please try again.');
    }
  };

  const handleDocSave = useCallback(() => {
    if (!docSheetOpen) return;
    if (!docForm.employeeId) return toast.error('Select an employee');
    if (!docForm.title.trim()) return toast.error('Document title required');
    if (!docForm.fileData) return toast.error('Attach a file first');
    const now = new Date().toISOString();
    const code = `EDOC-${String(docs.length + 1).padStart(6, '0')}`;
    const expired = docForm.expiryDate
      ? new Date(docForm.expiryDate) < new Date() : false;
    saveDocs([...docs, {
      ...docForm, id: `doc-${Date.now()}`, docCode: code,
      isExpired: expired, created_at: now, updated_at: now,
    }]);
    toast.success('Document saved');
    setDocSheetOpen(false); setDocForm(BLANK_DOC);
  }, [docSheetOpen, docForm, docs]);

  // ── Template Sheet ───────────────────────────────────────────
  const [templateSheetOpen, setTemplateSheetOpen] = useState(false);
  const [editTmplId, setEditTmplId] = useState<string | null>(null);
  const [tmplForm, setTmplForm] = useState({
    title: '', category: 'offer' as TemplateCategory,
    description: '', contentHtml: '', isActive: true,
  });
  const hrUploadRef = useRef<HTMLInputElement>(null);
  const [hrUploadTargetId, setHrUploadTargetId] = useState<string | null>(null);

  const handleTemplateSave = useCallback(() => {
    if (!templateSheetOpen) return;
    if (!tmplForm.title.trim()) return toast.error('Title required');
    const now = new Date().toISOString();
    const placeholders = extractPlaceholders(tmplForm.contentHtml);
    if (editTmplId) {
      saveTemplates(templates.map(t => t.id !== editTmplId ? t : {
        ...t, ...tmplForm, placeholders, updated_at: now,
      }));
      toast.success('Template updated');
    } else {
      const code = `TMPL-CUSTOM-${String(templates.length + 1).padStart(3, '0')}`;
      saveTemplates([...templates, {
        ...tmplForm, id: `tmpl-cust-${Date.now()}`, templateCode: code,
        isSeeded: false, hrOverrideData: '', hrOverrideFileName: '',
        lastUsed: '', placeholders, created_at: now, updated_at: now,
      }]);
      toast.success('Custom template created');
    }
    setTemplateSheetOpen(false); setEditTmplId(null);
  }, [templateSheetOpen, tmplForm, editTmplId, templates]);

  // ── masterSave ───────────────────────────────────────────────
  const masterSave = useCallback(() => {
    if (docSheetOpen) { handleDocSave(); return; }
    if (templateSheetOpen) { handleTemplateSave(); return; }
  }, [docSheetOpen, templateSheetOpen, handleDocSave, handleTemplateSave]);
  useCtrlS(masterSave);

  // ── Template print ───────────────────────────────────────────
  const printTemplate = (tmpl: DocTemplate) => {
    const content = tmpl.hrOverrideData
      ? `<img src='${tmpl.hrOverrideData}' style='max-width:100%'/>`
      : tmpl.contentHtml;
    const win = window.open('', '_blank');
    if (!win) { toast.error('Pop-up blocked. Allow pop-ups to print.'); return; }
    win.document.write('<html><head><title>' + tmpl.title + '</title>' +
      '<style>body{font-family:Arial}@media print{.no-print{display:none}}</style>' +
      '</head><body>' + content +
      '<div class=no-print style=margin-top:20px><button onclick=window.print()>Print</button> <button onclick=window.close()>Close</button></div></body></html>');
    win.document.close();
    saveTemplates(templates.map(t => t.id !== tmpl.id ? t : {
      ...t, lastUsed: new Date().toISOString(),
    }));
  };

  // ── Template download ────────────────────────────────────────
  const downloadTemplate = (tmpl: DocTemplate) => {
    const content = tmpl.hrOverrideData
      ? `<img src='${tmpl.hrOverrideData}' style='max-width:100%'/>`
      : tmpl.contentHtml;
    const html = `<!DOCTYPE html><html><head><title>${tmpl.title}</title>
<style>body{font-family:Arial,sans-serif;padding:40px}</style>
</head><body>${content}</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tmpl.templateCode}_${tmpl.title.replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── HR upload custom version ─────────────────────────────────
  const handleHrUpload = async (tmplId: string, file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      toast.error(`File too large (${formatBytes(file.size)}). Max 1 MB.`);
      return;
    }
    try {
      const dataUrl = await readFileAsDataURL(file);
      saveTemplates(templates.map(t => t.id !== tmplId ? t : {
        ...t, hrOverrideData: dataUrl, hrOverrideFileName: file.name,
        updated_at: new Date().toISOString(),
      }));
      toast.success(`Custom version uploaded: ${file.name}`);
    } catch {
      toast.error('Failed to upload file.');
    }
  };

  // ── Filtered lists ───────────────────────────────────────────
  const filteredDocs = useMemo(() => {
    let list = docs;
    if (docSearch) {
      const s = docSearch.toLowerCase();
      list = list.filter(d =>
        d.docCode.toLowerCase().includes(s) || d.title.toLowerCase().includes(s) ||
        d.employeeName.toLowerCase().includes(s) || d.fileName.toLowerCase().includes(s)
      );
    }
    if (docCatFilter !== 'all') list = list.filter(d => d.category === docCatFilter);
    if (docEmpFilter !== 'all') list = list.filter(d => d.employeeId === docEmpFilter);
    return list;
  }, [docs, docSearch, docCatFilter, docEmpFilter]);

  const filteredTemplates = useMemo(() => {
    let list = templates;
    if (tmplSearch) {
      const s = tmplSearch.toLowerCase();
      list = list.filter(t =>
        t.templateCode.toLowerCase().includes(s) || t.title.toLowerCase().includes(s)
      );
    }
    if (tmplCatFilter !== 'all') list = list.filter(t => t.category === tmplCatFilter);
    if (tmplTypeFilter === 'seeded') list = list.filter(t => t.isSeeded);
    else if (tmplTypeFilter === 'custom') list = list.filter(t => !t.isSeeded);
    return list;
  }, [templates, tmplSearch, tmplCatFilter, tmplTypeFilter]);

  // ── Stats ────────────────────────────────────────────────────
  const totalStorageBytes = useMemo(() => docs.reduce((s, d) => s + d.fileSizeBytes, 0), [docs]);
  const activeTemplateCount = templates.filter(t => t.isActive).length;
  const viewDoc = viewDocId ? docs.find(d => d.id === viewDocId) : null;

  // ── Helpers for expiry badges ────────────────────────────────
  const expiryBadge = (d: EmployeeDocument) => {
    if (!d.expiryDate) return null;
    const exp = new Date(d.expiryDate);
    const now = new Date();
    if (exp < now) return <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600 border-red-500/30">Expired</Badge>;
    const diff = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diff <= 30) return <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">Expiring</Badge>;
    return <span className="text-xs">{format(parseISO(d.expiryDate), 'dd MMM yyyy')}</span>;
  };

  return (
    <div className="space-y-4" data-keyboard-form>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-lg bg-violet-500/15 flex items-center justify-center">
          <FolderOpen className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Document Management</h2>
          <p className="text-xs text-muted-foreground">Employee document vault and HR template library</p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs text-muted-foreground font-medium">Total Employee Docs</CardTitle></CardHeader>
          <CardContent className="px-4 pb-3"><p className="text-2xl font-bold">{docs.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs text-muted-foreground font-medium">Storage Used</CardTitle></CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold">{formatBytes(totalStorageBytes)}</p>
            <div className="mt-1 h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${Math.min((totalStorageBytes / (10 * 1_048_576)) * 100, 100)}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs text-muted-foreground font-medium">Active Templates</CardTitle></CardHeader>
          <CardContent className="px-4 pb-3"><p className="text-2xl font-bold">{activeTemplateCount}</p></CardContent>
        </Card>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="vault" className="gap-1">
            <FolderOpen className="h-3.5 w-3.5" /> Document Vault
            {docs.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{docs.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1">
            <FileText className="h-3.5 w-3.5" /> Template Library
            {templates.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{templates.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* ═══ TAB: vault ═══ */}
        <TabsContent value="vault" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="pl-7 h-8 w-[200px] text-xs" placeholder="Search docs..." value={docSearch} onChange={e => setDocSearch(e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <Select value={docCatFilter} onValueChange={setDocCatFilter}>
              <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {(Object.keys(EMP_DOC_CATEGORY_LABELS) as EmpDocCategory[]).map(c => (
                  <SelectItem key={c} value={c}>{EMP_DOC_CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={docEmpFilter} onValueChange={setDocEmpFilter}>
              <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="Employee" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.empCode} — {e.displayName}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <Button size="sm" onClick={() => { setDocForm(BLANK_DOC); setDocSheetOpen(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Document
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Code</TableHead>
                <TableHead className="text-xs">Employee</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Title</TableHead>
                <TableHead className="text-xs">File</TableHead>
                <TableHead className="text-xs">Size</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Expiry</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No documents found</TableCell></TableRow>
              )}
              {filteredDocs.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="text-xs font-mono">{d.docCode}</TableCell>
                  <TableCell className="text-xs">{d.employeeName}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{EMP_DOC_CATEGORY_LABELS[d.category]}</Badge></TableCell>
                  <TableCell className="text-xs font-medium">{d.title}</TableCell>
                  <TableCell>
                    {d.fileType.startsWith('image/') ? (
                      <img src={d.fileData} alt={d.fileName} className="h-8 w-8 object-cover rounded cursor-pointer border" onClick={() => setViewDocId(d.id)} />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => setViewDocId(d.id)} />
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{formatBytes(d.fileSizeBytes)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-[10px]', ATTACH_TYPE_COLORS[d.attachType])}>{d.attachType}</Badge>
                  </TableCell>
                  <TableCell>{expiryBadge(d)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setViewDocId(d.id)}>
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                        const a = document.createElement('a');
                        a.href = d.fileData; a.download = d.fileName; a.click();
                      }}>
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => {
                        saveDocs(docs.filter(x => x.id !== d.id));
                        toast.success('Document deleted');
                      }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* ═══ TAB: templates ═══ */}
        <TabsContent value="templates" className="space-y-3">
          <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 px-4 py-3 text-xs text-violet-700 dark:text-violet-300">
            <strong>12 ready-to-use HR document templates.</strong> Print, download as HTML, or upload your own customised version. HR-uploaded versions override the default template.
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="pl-7 h-8 w-[200px] text-xs" placeholder="Search templates..." value={tmplSearch} onChange={e => setTmplSearch(e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <Select value={tmplCatFilter} onValueChange={setTmplCatFilter}>
              <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {(Object.keys(TEMPLATE_CATEGORY_LABELS) as TemplateCategory[]).map(c => (
                  <SelectItem key={c} value={c}>{TEMPLATE_CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tmplTypeFilter} onValueChange={setTmplTypeFilter}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="seeded">Seeded Only</SelectItem>
                <SelectItem value="custom">Custom Only</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <Button size="sm" onClick={() => {
              setEditTmplId(null);
              setTmplForm({ title: '', category: 'offer', description: '', contentHtml: '', isActive: true });
              setTemplateSheetOpen(true);
            }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Custom Template
            </Button>
          </div>

          {/* Hidden HR upload input */}
          <input
            ref={hrUploadRef}
            type="file"
            accept="image/*,application/pdf,.doc,.docx"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file && hrUploadTargetId) handleHrUpload(hrUploadTargetId, file);
              e.target.value = '';
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTemplates.map(tmpl => (
              <Card key={tmpl.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className={cn('text-[10px]', TMPL_CAT_COLORS[tmpl.category])}>
                      {TEMPLATE_CATEGORY_LABELS[tmpl.category]}
                    </Badge>
                    <span className="text-[10px] font-mono text-muted-foreground">{tmpl.templateCode}</span>
                  </div>
                  <CardTitle className="text-sm mt-1">{tmpl.title}</CardTitle>
                  <p className="text-[11px] text-muted-foreground">{tmpl.description}</p>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-2">
                  {/* Placeholders */}
                  <div className="flex flex-wrap gap-1">
                    {tmpl.placeholders.slice(0, 3).map(p => (
                      <Badge key={p} variant="secondary" className="text-[9px] bg-violet-500/10 text-violet-700 border-violet-500/20">{p}</Badge>
                    ))}
                    {tmpl.placeholders.length > 3 && (
                      <Badge variant="secondary" className="text-[9px]">+{tmpl.placeholders.length - 3} more</Badge>
                    )}
                  </div>
                  {/* HR Override badge */}
                  {tmpl.hrOverrideData && (
                    <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-700 border-green-500/30">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Custom Version
                    </Badge>
                  )}
                  {tmpl.lastUsed && (
                    <p className="text-[10px] text-muted-foreground">Last used: {format(parseISO(tmpl.lastUsed), 'dd MMM yyyy')}</p>
                  )}
                  <Separator />
                  {/* Action row */}
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => printTemplate(tmpl)}>
                      <Printer className="h-3 w-3 mr-1" /> Print
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => downloadTemplate(tmpl)}>
                      <Download className="h-3 w-3 mr-1" /> Download
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                      setHrUploadTargetId(tmpl.id);
                      hrUploadRef.current?.click();
                    }}>
                      <Upload className="h-3 w-3 mr-1" /> Upload Custom
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                      setEditTmplId(tmpl.id);
                      setTmplForm({
                        title: tmpl.title, category: tmpl.category,
                        description: tmpl.description, contentHtml: tmpl.contentHtml,
                        isActive: tmpl.isActive,
                      });
                      setTemplateSheetOpen(true);
                    }}>
                      <Edit className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    {tmpl.hrOverrideData && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => {
                        saveTemplates(templates.map(t => t.id !== tmpl.id ? t : {
                          ...t, hrOverrideData: '', hrOverrideFileName: '', updated_at: new Date().toISOString(),
                        }));
                        toast.success('Custom version removed');
                      }}>
                        <X className="h-3 w-3 mr-1" /> Remove Custom
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══ Document Viewer Sheet ═══ */}
      <Sheet open={!!viewDoc} onOpenChange={v => { if (!v) setViewDocId(null); }}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader><SheetTitle>{viewDoc?.title ?? 'Document'}</SheetTitle></SheetHeader>
          {viewDoc && (
            <div className="py-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <span>{viewDoc.employeeName}</span> · <span>{viewDoc.fileName}</span> · <span>{formatBytes(viewDoc.fileSizeBytes)}</span>
              </div>
              {viewDoc.fileType.startsWith('image/') ? (
                <img src={viewDoc.fileData} alt={viewDoc.fileName} className="max-w-full rounded border" />
              ) : viewDoc.fileType === 'application/pdf' ? (
                <iframe src={viewDoc.fileData} className="w-full h-[600px] border rounded" title={viewDoc.title} />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Download to view this file type</p>
                  <Button size="sm" className="mt-3" onClick={() => {
                    const a = document.createElement('a');
                    a.href = viewDoc.fileData; a.download = viewDoc.fileName; a.click();
                  }}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Download
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ═══ Document Sheet ═══ */}
      <Sheet open={docSheetOpen} onOpenChange={v => { if (!v) { setDocSheetOpen(false); setDocForm(BLANK_DOC); } }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>New Employee Document</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4" data-keyboard-form>
            <div>
              <Label className="text-xs">Employee *</Label>
              <Select value={docForm.employeeId} onValueChange={v => {
                const emp = activeEmployees.find(e => e.id === v);
                duf('employeeId', v);
                duf('employeeCode', emp?.empCode || '');
                duf('employeeName', emp?.displayName || '');
              }}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{activeEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.empCode} — {e.displayName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Category *</Label>
              <Select value={docForm.category} onValueChange={v => duf('category', v as EmpDocCategory)}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(EMP_DOC_CATEGORY_LABELS) as EmpDocCategory[]).map(c => (
                    <SelectItem key={c} value={c}>{EMP_DOC_CATEGORY_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Document Title *</Label><Input value={docForm.title} onChange={e => duf('title', e.target.value)} onKeyDown={onEnterNext} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Issue Date</Label><SmartDateInput value={docForm.issueDate} onChange={v => duf('issueDate', v)} /></div>
              <div><Label className="text-xs">Expiry Date</Label><SmartDateInput value={docForm.expiryDate} onChange={v => duf('expiryDate', v)} /></div>
            </div>
            <div><Label className="text-xs">Tags (comma-separated)</Label><Input value={docForm.tags.join(', ')} onChange={e => duf('tags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} onKeyDown={onEnterNext} /></div>
            <div><Label className="text-xs">Notes</Label><Textarea value={docForm.notes} onChange={e => duf('notes', e.target.value)} rows={3} /></div>

            <Separator />
            <div>
              <Label className="text-xs font-semibold">Attach Document</Label>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5 mr-1" /> Upload File
                </Button>
                <Button size="sm" variant="outline" onClick={() => cameraInputRef.current?.click()}>
                  <Camera className="h-3.5 w-3.5 mr-1" /> Camera / Photo
                </Button>
                <Button size="sm" variant="outline" onClick={() => scanInputRef.current?.click()}>
                  <Search className="h-3.5 w-3.5 mr-1" /> Scan / Document
                </Button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf,.doc,.docx,.xlsx,.csv" className="hidden" onChange={e => { e.target.files?.[0] && handleFileAttach(e.target.files[0], 'upload'); e.target.value = ''; }} />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { e.target.files?.[0] && handleFileAttach(e.target.files[0], 'camera'); e.target.value = ''; }} />
              <input ref={scanInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => { e.target.files?.[0] && handleFileAttach(e.target.files[0], 'scan'); e.target.value = ''; }} />

              {docForm.fileData ? (
                <div className="mt-3 p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    {docForm.fileType.startsWith('image/') ? (
                      <img src={docForm.fileData} alt={docForm.fileName} className="h-10 w-10 object-cover rounded border" />
                    ) : (
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{docForm.fileName}</p>
                      <p className="text-[10px] text-muted-foreground">{formatBytes(docForm.fileSizeBytes)}</p>
                      <div className="mt-1 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', docForm.fileSizeBytes >= WARN_FILE_BYTES ? 'bg-amber-500' : 'bg-green-500')}
                          style={{ width: `${Math.round((docForm.fileSizeBytes / MAX_FILE_BYTES) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => {
                      duf('fileData', ''); duf('fileName', ''); duf('fileSizeBytes', 0); duf('fileType', '');
                    }}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 p-6 border-2 border-dashed rounded-lg text-center text-muted-foreground text-xs">
                  Click one of the buttons above to attach a file
                </div>
              )}
            </div>
          </div>
          <SheetFooter>
            <Button data-primary onClick={handleDocSave}>Save Document</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ═══ Template Sheet ═══ */}
      <Sheet open={templateSheetOpen} onOpenChange={v => { if (!v) { setTemplateSheetOpen(false); setEditTmplId(null); } }}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader><SheetTitle>{editTmplId ? 'Edit Template' : 'New Custom Template'}</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4" data-keyboard-form>
            <div><Label className="text-xs">Title *</Label><Input value={tmplForm.title} onChange={e => setTmplForm(p => ({ ...p, title: e.target.value }))} onKeyDown={onEnterNext} /></div>
            <div>
              <Label className="text-xs">Category *</Label>
              <Select value={tmplForm.category} onValueChange={v => setTmplForm(p => ({ ...p, category: v as TemplateCategory }))}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TEMPLATE_CATEGORY_LABELS) as TemplateCategory[]).map(c => (
                    <SelectItem key={c} value={c}>{TEMPLATE_CATEGORY_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Description</Label><Textarea value={tmplForm.description} onChange={e => setTmplForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div>
              <Label className="text-xs">HTML Content *</Label>
              <Textarea value={tmplForm.contentHtml} onChange={e => setTmplForm(p => ({ ...p, contentHtml: e.target.value }))} rows={16} className="font-mono text-xs" />
              <p className="text-[10px] text-muted-foreground mt-1">
                Use {'{{placeholders}}'} for dynamic fields. e.g. {'{{employeeName}}'}, {'{{doj}}'}, {'{{companyName}}'}
              </p>
              {tmplForm.contentHtml && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {extractPlaceholders(tmplForm.contentHtml).map(p => (
                    <Badge key={p} variant="secondary" className="text-[9px] bg-violet-500/10 text-violet-700">{p}</Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={tmplForm.isActive} onCheckedChange={v => setTmplForm(p => ({ ...p, isActive: v }))} />
              <Label className="text-xs">Active</Label>
            </div>
          </div>
          <SheetFooter>
            <Button data-primary onClick={handleTemplateSave}>Save Template</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function DocumentManagement() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background flex flex-col">
        <ERPHeader breadcrumbs={[{ label: 'Operix Core', href: '/erp/dashboard' }, { label: 'Pay Hub' }, { label: 'Document Management' }]} showDatePicker={false} showCompany={false} />
        <div className="flex-1 overflow-auto p-6">
          <DocumentManagementPanel />
        </div>
      </div>
    </SidebarProvider>
  );
}
