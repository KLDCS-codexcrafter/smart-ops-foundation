/**
 * @file        src/pages/erp/docvault/transactions/DocumentRegister.tsx
 * @purpose     DocVault register · cross-card filter UI (Q-LOCK-15a) + S143.T1 control columns/filters
 * @who         Document Controller · all departments
 * @when        2026-05-09 · S143.T1 hotfix
 * @sprint      T-Phase-1.A.8.α-a-DocVault-Foundation · Block D.1 ·
 *              T-Phase-1.A.8.α-a-T1-Audit-Fix · Block A · F-3b ·
 *              Sprint 143 · T-TaskFlow-A641.7 · T1 hotfix Block 4
 * @decisions   D-NEW-CJ canonical · Q-LOCK-15a cross-card filter UI · D-NEW-CE FormCarryForwardKit ·
 *              S143.T1: control-meta columns + filters via getControl() · materialised defaults
 *              (no writes) for legacy docs · row action "Control" opens DocumentControlPanel.
 * @reuses      docvault-engine.loadDocuments · docvault-control-engine.getControl/listFolders
 * @[JWT]       GET /api/docvault/documents · query filters Phase 2
 */
import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Lock, Settings2 } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { loadDocuments } from '@/lib/docvault-engine';
import { getControl, listFolders } from '@/lib/docvault-control-engine';
import DocumentControlPanel from '../DocumentControlPanel';
import {
  useFormCarryForwardChecklist, type FormCarryForwardConfig,
} from '@/lib/form-carry-forward-kit';
import type {
  DocumentCategory, DocumentLifecycleStatus, ConfidentialityLevel,
} from '@/types/docvault';

const CATEGORIES: DocumentCategory[] = [
  'policy', 'procedure', 'work_instruction', 'contract', 'agreement',
  'certificate', 'license', 'statutory', 'legal', 'financial',
  'technical', 'quality', 'hr', 'correspondence', 'general',
];
const LIFECYCLE: DocumentLifecycleStatus[] = [
  'active', 'under_review', 'published', 'expired', 'archived',
];
const CONF: ConfidentialityLevel[] = [
  'public', 'internal', 'confidential', 'restricted', 'top_secret',
];

export function DocumentRegister(): JSX.Element {
  const { entityCode } = useEntityCode();
  const currentUser = useCurrentUser();
  const userId = currentUser?.id ?? 'mock-user';

  const _fr29: FormCarryForwardConfig = {
    useLastVoucher: true, sprint27d1: false, sprint27d2: false, sprint27e: false,
    keyboardOverlay: false, draftRecovery: false, decimalHelpers: false, fr30Header: true,
    smartDefaults: false, pinnedTemplates: false, ctrlSSave: false, saveAndNewCarryover: false,
  };
  useFormCarryForwardChecklist('DocumentRegister', _fr29);
  void _fr29;

  const [refreshTick, setRefreshTick] = useState(0);
  const docs = useMemo(
    () => loadDocuments(entityCode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, refreshTick],
  );
  const folders = useMemo(
    () => listFolders(entityCode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, refreshTick],
  );
  const folderName = (id?: string | null): string =>
    (id && folders.find((f) => f.id === id)?.name) ?? '—';

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [lifecycleFilter, setLifecycleFilter] = useState<string>('all');
  const [confFilter, setConfFilter] = useState<string>('all');
  const [folderFilter, setFolderFilter] = useState<string>('all');

  const [controlDocId, setControlDocId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return docs.filter((d) => {
      if (search && !d.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter && d.document_type !== typeFilter) return false;
      if (projectFilter && d.project_id !== projectFilter) return false;
      if (customerFilter && d.customer_id !== customerFilter) return false;
      if (vendorFilter && d.vendor_id !== vendorFilter) return false;
      if (equipmentFilter && d.equipment_id !== equipmentFilter) return false;
      const c = getControl(d);
      if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
      if (lifecycleFilter !== 'all' && c.lifecycle_status !== lifecycleFilter) return false;
      if (confFilter !== 'all' && c.confidentiality !== confFilter) return false;
      if (folderFilter !== 'all' && (c.folder_id ?? '') !== folderFilter) return false;
      return true;
    });
  }, [
    docs, search, typeFilter, projectFilter, customerFilter, vendorFilter, equipmentFilter,
    categoryFilter, lifecycleFilter, confFilter, folderFilter,
  ]);

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold">Documents Register</h1>

      <Card className="glass-card rounded-2xl">
        <CardContent className="pt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
          <Input placeholder="Search title..." value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-lg" />
          <Input placeholder="Type (drawing, mom, ...)" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-lg" />
          <Input placeholder="Project ID" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="rounded-lg" />
          <Input placeholder="Customer ID" value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} className="rounded-lg" />
          <Input placeholder="Vendor ID" value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} className="rounded-lg" />
          <Input placeholder="Equipment ID" value={equipmentFilter} onChange={(e) => setEquipmentFilter(e.target.value)} className="rounded-lg" />
        </CardContent>
      </Card>

      <Card className="glass-card rounded-2xl">
        <CardContent className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="rounded-lg" data-testid="filter-category"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={lifecycleFilter} onValueChange={setLifecycleFilter}>
            <SelectTrigger className="rounded-lg"><SelectValue placeholder="Lifecycle" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All lifecycles</SelectItem>
              {LIFECYCLE.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={confFilter} onValueChange={setConfFilter}>
            <SelectTrigger className="rounded-lg"><SelectValue placeholder="Confidentiality" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All confidentiality</SelectItem>
              {CONF.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={folderFilter} onValueChange={setFolderFilter}>
            <SelectTrigger className="rounded-lg"><SelectValue placeholder="Folder" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All folders</SelectItem>
              <SelectItem value="">Unfiled</SelectItem>
              {folders.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="glass-card rounded-2xl">
        <CardContent className="pt-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Lifecycle</TableHead>
                <TableHead>Conf.</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Folder</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">
                    No documents.
                  </TableCell>
                </TableRow>
              ) : filtered.map((d) => {
                const c = getControl(d);
                return (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {c.locked_by && <Lock className="h-3.5 w-3.5 text-warning" aria-label="locked" />}
                        <span>{d.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{c.document_code ?? '—'}</TableCell>
                    <TableCell className="text-xs">{c.category ?? '—'}</TableCell>
                    <TableCell><Badge variant="secondary">{c.lifecycle_status}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{c.confidentiality}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{c.owner_id}</TableCell>
                    <TableCell className="text-xs">{folderName(c.folder_id)}</TableCell>
                    <TableCell className="font-mono">{d.current_version}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(d.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setControlDocId(d.id)}>
                        <Settings2 className="h-3.5 w-3.5 mr-1" />Control
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {controlDocId && (
        <DocumentControlPanel
          entityCode={entityCode}
          documentId={controlDocId}
          currentUserId={userId}
          open={controlDocId !== null}
          onClose={() => { setControlDocId(null); setRefreshTick((t) => t + 1); }}
        />
      )}
    </div>
  );
}

export default DocumentRegister;
