import React, { useState, useMemo, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { Switch } from '@/components/ui/switch';
import { FileText, BookOpen, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { HRDocument, CompanyPolicy, DocumentCategory, PolicyCategory } from '@/types/recruitment';
import { HR_DOCUMENTS_KEY, COMPANY_POLICIES_KEY, DOCUMENT_CATEGORY_LABELS, POLICY_CATEGORY_LABELS } from '@/types/recruitment';
import type { Employee } from '@/types/employee';
import { EMPLOYEES_KEY } from '@/types/employee';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';

export function DocumentsAndPoliciesPanel() {
  // ── Cross-module reads ───────────────────────────────────────
  const employees = useMemo<Employee[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/employees
      const raw = localStorage.getItem(EMPLOYEES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, []);

  // ── Documents state ──────────────────────────────────────────
  const [documents, setDocuments] = useState<HRDocument[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/documents
      const raw = localStorage.getItem(HR_DOCUMENTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const saveDocuments = (items: HRDocument[]) => {
    // [JWT] PUT /api/pay-hub/documents
    localStorage.setItem(HR_DOCUMENTS_KEY, JSON.stringify(items));
    setDocuments(items);
  };

  // ── Policies state ───────────────────────────────────────────
  const [policies, setPolicies] = useState<CompanyPolicy[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/policies
      const raw = localStorage.getItem(COMPANY_POLICIES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const savePolicies = (items: CompanyPolicy[]) => {
    // [JWT] PUT /api/pay-hub/policies
    localStorage.setItem(COMPANY_POLICIES_KEY, JSON.stringify(items));
    setPolicies(items);
  };

  // ── Code generators ──────────────────────────────────────────
  const nextDocCode = () => `DOC-${String(documents.length + 1).padStart(6, '0')}`;
  const nextPolCode = () => `POL-${String(policies.length + 1).padStart(6, '0')}`;

  // ── Search ───────────────────────────────────────────────────
  const [docSearch, setDocSearch] = useState('');
  const [polSearch, setPolSearch] = useState('');

  // ── Document Sheet ───────────────────────────────────────────
  const [docSheetOpen, setDocSheetOpen] = useState(false);
  const [docEditId, setDocEditId] = useState<string | null>(null);
  const BLANK_DOC: {
    docCode: string; employeeId: string; employeeCode: string; employeeName: string;
    category: DocumentCategory; title: string; issueDate: string;
    fileRef: string; notes: string; generatedContent: string;
  } = {
    docCode: '', employeeId: '', employeeCode: '', employeeName: '',
    category: 'offer_letter', title: '', issueDate: '',
    fileRef: '', notes: '', generatedContent: '',
  };
  const [docForm, setDocForm] = useState(BLANK_DOC);
  const duf = <K extends keyof typeof BLANK_DOC>(k: K, v: (typeof BLANK_DOC)[K]) =>
    setDocForm(prev => ({ ...prev, [k]: v }));

  const handleDocSave = useCallback(() => {
    if (!docSheetOpen) return;
    if (!docForm.title.trim()) return toast.error('Document title is required');
    if (!docForm.employeeId) return toast.error('Select an employee');
    const now = new Date().toISOString();
    if (docEditId) {
      saveDocuments(documents.map(d => d.id === docEditId
        ? { ...d, ...docForm, updated_at: now } : d));
    } else {
      saveDocuments([...documents, {
        ...docForm, id: `doc-${Date.now()}`, docCode: nextDocCode(),
        created_at: now, updated_at: now,
      }]);
    }
    toast.success('Document saved');
    setDocSheetOpen(false); setDocEditId(null); setDocForm(BLANK_DOC);
  }, [docSheetOpen, docForm, docEditId, documents]);

  // ── Policy Sheet ─────────────────────────────────────────────
  const [polSheetOpen, setPolSheetOpen] = useState(false);
  const [polEditId, setPolEditId] = useState<string | null>(null);
  const BLANK_POL: {
    policyCode: string; title: string; category: PolicyCategory;
    version: string; effectiveDate: string; reviewDate: string;
    owner: string; content: string; acknowledgementRequired: boolean;
    status: 'draft' | 'active' | 'archived';
  } = {
    policyCode: '', title: '', category: 'hr',
    version: 'v1.0', effectiveDate: '', reviewDate: '',
    owner: 'HR', content: '', acknowledgementRequired: false,
    status: 'draft',
  };
  const [polForm, setPolForm] = useState(BLANK_POL);
  const puf = <K extends keyof typeof BLANK_POL>(k: K, v: (typeof BLANK_POL)[K]) =>
    setPolForm(prev => ({ ...prev, [k]: v }));

  const handlePolSave = useCallback(() => {
    if (!polSheetOpen) return;
    if (!polForm.title.trim()) return toast.error('Policy title is required');
    const now = new Date().toISOString();
    if (polEditId) {
      savePolicies(policies.map(p => p.id === polEditId
        ? { ...p, ...polForm, updated_at: now } : p));
    } else {
      savePolicies([...policies, {
        ...polForm, id: `pol-${Date.now()}`, policyCode: nextPolCode(),
        created_at: now, updated_at: now,
      }]);
    }
    toast.success('Policy saved');
    setPolSheetOpen(false); setPolEditId(null); setPolForm(BLANK_POL);
  }, [polSheetOpen, polForm, polEditId, policies]);

  // ── masterSave ────────────────────────────────────────────────
  const masterSave = useCallback(() => {
    if (docSheetOpen) { handleDocSave(); return; }
    if (polSheetOpen) { handlePolSave(); return; }
  }, [docSheetOpen, polSheetOpen, handleDocSave, handlePolSave]);
  useCtrlS(masterSave);

  // ── Filtered lists ────────────────────────────────────────────
  const filteredDocs = useMemo(() => {
    if (!docSearch) return documents;
    const s = docSearch.toLowerCase();
    return documents.filter(d =>
      d.docCode.toLowerCase().includes(s) ||
      d.title.toLowerCase().includes(s) ||
      d.employeeName.toLowerCase().includes(s)
    );
  }, [documents, docSearch]);

  const filteredPols = useMemo(() => {
    if (!polSearch) return policies;
    const s = polSearch.toLowerCase();
    return policies.filter(p =>
      p.policyCode.toLowerCase().includes(s) ||
      p.title.toLowerCase().includes(s)
    );
  }, [policies, polSearch]);

  const POL_STATUS_COLORS: Record<string, string> = {
    draft: 'bg-slate-500/10 text-slate-600 border-slate-400/30',
    active: 'bg-green-500/10 text-green-700 border-green-500/30',
    archived: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <div className="space-y-4" data-keyboard-form>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-lg bg-violet-500/15 flex items-center justify-center">
          <FileText className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Documents & Policies</h2>
          <p className="text-xs text-muted-foreground">HR document vault and company policy library</p>
        </div>
      </div>

      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents" className="gap-1">
            <FileText className="h-3.5 w-3.5" /> Document Vault
            {documents.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{documents.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="policies" className="gap-1">
            <BookOpen className="h-3.5 w-3.5" /> Policy Library
            {policies.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{policies.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* ═══ TAB: documents ═══ */}
        <TabsContent value="documents" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="pl-7 h-8 w-[250px] text-xs" placeholder="Search documents..." value={docSearch} onChange={e => setDocSearch(e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <Button size="sm" onClick={() => { setDocEditId(null); setDocForm(BLANK_DOC); setDocSheetOpen(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New Document
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Doc Code</TableHead>
                <TableHead className="text-xs">Title</TableHead>
                <TableHead className="text-xs">Employee</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Issue Date</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No documents found</TableCell></TableRow>
              )}
              {filteredDocs.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="text-xs font-mono">{d.docCode}</TableCell>
                  <TableCell className="text-xs font-medium">{d.title}</TableCell>
                  <TableCell className="text-xs">{d.employeeName}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{DOCUMENT_CATEGORY_LABELS[d.category]}</Badge></TableCell>
                  <TableCell className="text-xs">{d.issueDate ? format(parseISO(d.issueDate), 'dd MMM yyyy') : '—'}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                      setDocEditId(d.id);
                      setDocForm({
                        docCode: d.docCode, employeeId: d.employeeId, employeeCode: d.employeeCode,
                        employeeName: d.employeeName, category: d.category, title: d.title,
                        issueDate: d.issueDate, fileRef: d.fileRef, notes: d.notes,
                        generatedContent: d.generatedContent,
                      });
                      setDocSheetOpen(true);
                    }}>Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* ═══ TAB: policies ═══ */}
        <TabsContent value="policies" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="pl-7 h-8 w-[250px] text-xs" placeholder="Search policies..." value={polSearch} onChange={e => setPolSearch(e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <Button size="sm" onClick={() => { setPolEditId(null); setPolForm(BLANK_POL); setPolSheetOpen(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New Policy
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Code</TableHead>
                <TableHead className="text-xs">Title</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Version</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Effective</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPols.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No policies found</TableCell></TableRow>
              )}
              {filteredPols.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs font-mono">{p.policyCode}</TableCell>
                  <TableCell className="text-xs font-medium">{p.title}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{POLICY_CATEGORY_LABELS[p.category]}</Badge></TableCell>
                  <TableCell className="text-xs">{p.version}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${POL_STATUS_COLORS[p.status] || ''}`}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{p.effectiveDate ? format(parseISO(p.effectiveDate), 'dd MMM yyyy') : '—'}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                      setPolEditId(p.id);
                      setPolForm({
                        policyCode: p.policyCode, title: p.title, category: p.category,
                        version: p.version, effectiveDate: p.effectiveDate, reviewDate: p.reviewDate,
                        owner: p.owner, content: p.content, acknowledgementRequired: p.acknowledgementRequired,
                        status: p.status,
                      });
                      setPolSheetOpen(true);
                    }}>Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* ═══ Document Sheet ═══ */}
      <Sheet open={docSheetOpen} onOpenChange={v => { if (!v) { setDocSheetOpen(false); setDocEditId(null); setDocForm(BLANK_DOC); } }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{docEditId ? 'Edit Document' : 'New Document'}</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4" data-keyboard-form>
            <div>
              <Label className="text-xs">Employee *</Label>
              <Select value={docForm.employeeId} onValueChange={v => {
                const emp = employees.find(e => e.id === v);
                duf('employeeId', v);
                duf('employeeCode', emp?.empCode || '');
                duf('employeeName', emp?.displayName || '');
              }}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.empCode} — {e.displayName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Title *</Label><Input value={docForm.title} onChange={e => duf('title', e.target.value)} onKeyDown={onEnterNext} /></div>
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={docForm.category} onValueChange={v => duf('category', v as DocumentCategory)}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(DOCUMENT_CATEGORY_LABELS) as DocumentCategory[]).map(c => (
                    <SelectItem key={c} value={c}>{DOCUMENT_CATEGORY_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Issue Date</Label><SmartDateInput value={docForm.issueDate} onChange={v => duf('issueDate', v)} /></div>
            <div><Label className="text-xs">File Reference</Label><Input value={docForm.fileRef} onChange={e => duf('fileRef', e.target.value)} placeholder="upload Phase 2" onKeyDown={onEnterNext} /></div>
            <div><Label className="text-xs">Notes</Label><Textarea value={docForm.notes} onChange={e => duf('notes', e.target.value)} rows={3} /></div>
          </div>
          <SheetFooter>
            <Button data-primary onClick={handleDocSave}>Save Document</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ═══ Policy Sheet ═══ */}
      <Sheet open={polSheetOpen} onOpenChange={v => { if (!v) { setPolSheetOpen(false); setPolEditId(null); setPolForm(BLANK_POL); } }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{polEditId ? 'Edit Policy' : 'New Policy'}</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4" data-keyboard-form>
            <div><Label className="text-xs">Title *</Label><Input value={polForm.title} onChange={e => puf('title', e.target.value)} onKeyDown={onEnterNext} /></div>
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={polForm.category} onValueChange={v => puf('category', v as PolicyCategory)}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(POLICY_CATEGORY_LABELS) as PolicyCategory[]).map(c => (
                    <SelectItem key={c} value={c}>{POLICY_CATEGORY_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Version</Label><Input value={polForm.version} onChange={e => puf('version', e.target.value)} onKeyDown={onEnterNext} /></div>
              <div><Label className="text-xs">Owner</Label><Input value={polForm.owner} onChange={e => puf('owner', e.target.value)} onKeyDown={onEnterNext} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Effective Date</Label><SmartDateInput value={polForm.effectiveDate} onChange={v => puf('effectiveDate', v)} /></div>
              <div><Label className="text-xs">Review Date</Label><SmartDateInput value={polForm.reviewDate} onChange={v => puf('reviewDate', v)} /></div>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={polForm.status} onValueChange={v => puf('status', v as 'draft' | 'active' | 'archived')}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={polForm.acknowledgementRequired} onCheckedChange={v => puf('acknowledgementRequired', v)} />
              <Label className="text-xs">Acknowledgement Required</Label>
            </div>
            <div><Label className="text-xs">Policy Content</Label><Textarea value={polForm.content} onChange={e => puf('content', e.target.value)} rows={8} /></div>
          </div>
          <SheetFooter>
            <Button data-primary onClick={handlePolSave}>Save Policy</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function DocumentsAndPolicies() {
  return <DocumentsAndPoliciesPanel />;
}
