/**
 * FoundationEntityHub.tsx — Unified tabbed entity list
 * Replaces CompanyList, SubsidiaryList, BranchOfficeList.
 * Tab controlled by ?tab= URL param.
 * Create/edit routes unchanged.
 */
// i18n-todo: Sprint T-Phase-1.2.5h-c2 · phased migration · top-strings wrapped where safe; remaining strings tracked for Phase 1.6
import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2, Layers, GitBranch, Plus, Search,
  Edit, Trash2, ChevronUp, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Tab = 'companies' | 'subsidiaries' | 'branch-offices';

// ── localStorage helpers ─────────────────────────────────────────
// [JWT] GET /api/foundation/entities
const ls = <T,>(k: string): T[] => { try { return JSON.parse(localStorage.getItem(k)||'[]'); } catch { return []; } };

const BRANCH_TYPE_COLORS: Record<string, string> = {
  'Service Centre':       'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Retail Store':         'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'Sales Office':         'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  'Collection Centre':    'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'Branch Office':        'bg-slate-500/10 text-slate-600 border-slate-500/20',
  'Regional Office':      'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  'Liaison Office':       'bg-pink-500/10 text-pink-600 border-pink-500/20',
  'Project Site Office':  'bg-orange-500/10 text-orange-600 border-orange-500/20',
  'Support Office':       'bg-teal-500/10 text-teal-600 border-teal-500/20',
  'Delivery Point':       'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
};

// ── Status badge colour ───────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls = s === 'active' ? 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10'
    : s === 'inactive' || s === 'suspended' || s === 'permanently closed'
      ? 'text-destructive border-destructive/30 bg-destructive/10'
      : 'text-amber-600 border-amber-500/30 bg-amber-500/10';
  return <Badge variant='outline' className={cn('text-[10px]', cls)}>{status}</Badge>;
}

// ── Generic sortable table ────────────────────────────────────────
function EntityTable<T extends { id: string }>({
  rows, columns, emptyText, onEdit, onDelete,
}: {
  rows: T[];
  columns: { key: string; label: string; sortable?: boolean; render?: (r: T) => React.ReactNode }[];
  emptyText: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const av = String((a as Record<string, unknown>)[sortKey] ?? '').toLowerCase();
      const bv = String((b as Record<string, unknown>)[sortKey] ?? '').toLowerCase();
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [rows, sortKey, sortDir]);

  return (
    <div data-keyboard-form className='rounded-xl border border-border overflow-hidden'>
      <table className='w-full text-sm'>
        <thead className='bg-muted/50 border-b border-border'>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className={cn('text-left px-4 py-3 text-xs font-semibold text-muted-foreground',
                  col.sortable && 'cursor-pointer hover:text-foreground select-none')}
                onClick={() => {
                  if (!col.sortable) return;
                  if (sortKey === col.key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                  else { setSortKey(col.key); setSortDir('asc'); }
                }}
              >
                <span className='flex items-center gap-1'>
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    sortDir === 'asc'
                      ? <ChevronUp className='h-3 w-3' />
                      : <ChevronDown className='h-3 w-3' />
                  )}
                </span>
              </th>
            ))}
            <th className='text-left px-4 py-3 text-xs font-semibold text-muted-foreground'>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr><td colSpan={columns.length + 1}
              className='px-4 py-12 text-center text-sm text-muted-foreground'>
              {emptyText}
            </td></tr>
          ) : sorted.map((row, i) => (
            <tr key={row.id} className={cn('border-b border-border/50 hover:bg-muted/20 transition-colors',
              i % 2 === 0 ? 'bg-card' : 'bg-muted/10')}>
              {columns.map(col => (
                <td key={col.key} className='px-4 py-3 text-sm'>
                  {col.render ? col.render(row) : <span>{String((row as Record<string, unknown>)[col.key] ?? '')}</span>}
                </td>
              ))}
              <td className='px-4 py-3'>
                <div className='flex items-center gap-1'>
                  <Button variant='ghost' size='icon' className='h-7 w-7' onClick={() => onEdit(row.id)}>
                    <Edit className='h-3.5 w-3.5' />
                  </Button>
                  <Button variant='ghost' size='icon' className='h-7 w-7 text-destructive hover:text-destructive'
                    onClick={() => onDelete(row.id)}>
                    <Trash2 className='h-3.5 w-3.5' />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────
export function FoundationEntityHubPanel() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as Tab) || 'companies';
  const setTab = (t: Tab) => setSearchParams({ tab: t }, { replace: true });

  const [rawCompanies, setRawCompanies] = useState<Record<string, unknown>[]>(() => ls('erp_companies'));
  const [rawSubsidiaries, setRawSubsidiaries] = useState<Record<string, unknown>[]>(() => ls('erp_subsidiaries'));
  const [rawBranches, setRawBranches] = useState<Record<string, unknown>[]>(() => ls('erp_branch_offices'));

  const s = (v: unknown): string => v == null ? '' : String(v);

  const allCompanies = useMemo(() => rawCompanies.map(c => ({
    id: s(c.id),
    code: c.shortCode ? `${s(c.shortCode)}001` : '',
    shortCode: s(c.shortCode),
    name: s(c.legalEntityName || c.name),
    parentCompany: s(c.parentCompanyName) || '—',
    status: s(c.status) || 'Active',
    city: s(c.hqCity),
    state: s(c.hqState),
    entityLevel: s(c.entity_type) || 'company',
    createdAt: c.created_at ? s(c.created_at).slice(0,10) : '',
  })), [rawCompanies]);

  const allSubsidiaries = useMemo(() => rawSubsidiaries.map(sb => ({
    id: s(sb.id),
    code: s(sb.shortCode),
    name: s(sb.legalEntityName || sb.name),
    parentCompany: s(sb.parentCompanyName) || '—',
    reportingTo: sb.reportingToEntityId && sb.reportingToEntityId !== 'same' ? s(sb.reportingToEntityId) : '—',
    ownershipPct: sb.ownershipPercentage ? s(sb.ownershipPercentage) + '%' : '—',
    relationship: s(sb.subsidiaryRelationship) || '—',
    status: s(sb.status) || 'Active',
    city: s(sb.hqCity),
  })), [rawSubsidiaries]);

  const allBranches = useMemo(() => rawBranches.map(b => ({
    id: s(b.id),
    code: s(b.code),
    name: s(b.name),
    branchType: s(b.branchType),
    parentCompany: s(b.parentCompanyName || b.parentCompanyId) || '—',
    branchHead: s(b.branchHead) || '—',
    status: s(b.status) || 'Active',
    city: s(b.city),
    state: s(b.state),
  })), [rawBranches]);

  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filter data for active tab
  const companies = useMemo(() =>
    allCompanies.filter(r =>
      [r.name, r.code, r.shortCode, r.city].some(v => v.toLowerCase().includes(search.toLowerCase()))
    ), [search, allCompanies]);

  const subsidiaries = useMemo(() =>
    allSubsidiaries.filter(r =>
      [r.name, r.code, r.city].some(v => v.toLowerCase().includes(search.toLowerCase()))
    ), [search, allSubsidiaries]);

  const branches = useMemo(() =>
    allBranches.filter(r =>
      [r.name, r.code, r.city, r.branchType, r.branchHead].some(v => v.toLowerCase().includes(search.toLowerCase()))
    ), [search, allBranches]);

  // Reset search when tab changes
  function handleTabChange(t: string) {
    setTab(t as Tab);
    setSearch('');
  }

  const createPath: Record<Tab, string> = {
    'companies':      '/erp/foundation/companies/create',
    'subsidiaries':   '/erp/foundation/subsidiaries/create',
    'branch-offices': '/erp/foundation/branch-offices/create',
  };
  const createLabel: Record<Tab, string> = {
    'companies':      'Add Company',
    'subsidiaries':   'Add Subsidiary',
    'branch-offices': 'Add Branch Office',
  };
  const editPath: Record<Tab, (id: string) => string> = {
    'companies':      id => `/erp/foundation/companies/${id}/edit`,
    'subsidiaries':   id => `/erp/foundation/subsidiaries/${id}/edit`,
    'branch-offices': id => `/erp/foundation/branch-offices/${id}/edit`,
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <div className='min-h-screen bg-background w-full'>
        <ERPHeader
          breadcrumbs={[
            { label: 'Operix Core', href: '/erp/dashboard' },
            { label: 'Command Center', href: '/erp/command-center' },
            { label: 'Foundation' },
            { label: 'Entity Registry' },
          ]}
          showDatePicker={false}
          showCompany={false}
        />

        <div className='max-w-7xl mx-auto px-4 py-6 space-y-5'>
          {/* Page header */}
          <div className='flex items-start justify-between gap-4 flex-wrap'>
            <div>
              <h1 className='text-xl font-bold text-foreground'>Entity Registry</h1>
              <p className='text-sm text-muted-foreground mt-0.5'>
                Manage all registered entities — companies, subsidiaries, and branch offices.
              </p>
            </div>
            <Button onClick={() => navigate(createPath[activeTab])} className='gap-1.5 shrink-0'>
              <Plus className='h-4 w-4' />{createLabel[activeTab]}
            </Button>
          </div>

          {/* Count chips */}
          <div className='flex items-center gap-3 flex-wrap'>
            <div className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20'>
              <Building2 className='h-3.5 w-3.5 text-emerald-600' />
              <span className='text-xs font-medium text-emerald-700'>{allCompanies.length} Companies</span>
            </div>
            <div className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20'>
              <Layers className='h-3.5 w-3.5 text-blue-600' />
              <span className='text-xs font-medium text-blue-700'>{allSubsidiaries.length} Subsidiaries</span>
            </div>
            <div className='flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20'>
              <GitBranch className='h-3.5 w-3.5 text-indigo-600' />
              <span className='text-xs font-medium text-indigo-700'>
                {allBranches.filter(b => b.status === 'Active').length} / {allBranches.length} Branch Offices
              </span>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <div className='flex items-center justify-between gap-4 flex-wrap'>
              <TabsList className='bg-muted/30'>
                <TabsTrigger value='companies' className='flex items-center gap-1.5 text-xs'>
                  <Building2 className='h-3.5 w-3.5' />
                  Companies
                  <Badge variant='secondary' className='ml-1 text-[9px] px-1 py-0 h-4'>
                    {companies.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value='subsidiaries' className='flex items-center gap-1.5 text-xs'>
                  <Layers className='h-3.5 w-3.5' />
                  Subsidiaries
                  <Badge variant='secondary' className='ml-1 text-[9px] px-1 py-0 h-4'>
                    {subsidiaries.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value='branch-offices' className='flex items-center gap-1.5 text-xs'>
                  <GitBranch className='h-3.5 w-3.5' />
                  Branch Offices
                  <Badge variant='secondary' className='ml-1 text-[9px] px-1 py-0 h-4'>
                    {branches.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              {/* Search */}
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
                <Input placeholder='Search by name, code, city...' className='pl-9 text-xs h-9 w-64'
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>

            {/* Companies tab */}
            <TabsContent value='companies' className='mt-4'>
              <EntityTable
                rows={companies}
                onEdit={id => navigate(editPath['companies'](id))}
                onDelete={setDeleteId}
                emptyText='No companies registered yet. Click "Add Company" to create one.'
                columns={[
                  { key:'code',          label:'Code',           sortable:true },
                  { key:'shortCode',     label:'Short Code',
                    render: r => <span className='font-mono text-xs bg-muted px-1.5 py-0.5 rounded'>{(r as { shortCode?: string }).shortCode}</span> },
                  { key:'name',          label:'Name',           sortable:true },
                  { key:'parentCompany', label:'Parent Company', sortable:true },
                  { key:'status',        label:'Status',
                    render: r => <StatusBadge status={(r as { status?: string }).status ?? ''} /> },
                  { key:'city',          label:'City',           sortable:true },
                  { key:'state',         label:'State' },
                ]}
              />
            </TabsContent>

            {/* Subsidiaries tab */}
            <TabsContent value='subsidiaries' className='mt-4'>
              <EntityTable
                rows={subsidiaries}
                onEdit={id => navigate(editPath['subsidiaries'](id))}
                onDelete={setDeleteId}
                emptyText='No subsidiaries registered yet. Click "Add Subsidiary" to create one.'
                columns={[
                  { key:'code',          label:'Code',           sortable:true },
                  { key:'name',          label:'Name',           sortable:true },
                  { key:'parentCompany', label:'Parent Company', sortable:true },
                  { key:'ownershipPct',  label:'Ownership %',
                    render: r => <span className='font-mono font-semibold text-sm'>{(r as { ownershipPct?: string }).ownershipPct}</span> },
                  { key:'relationship',  label:'Relationship',
                    render: r => <Badge variant='outline' className='text-xs'>{(r as { relationship?: string }).relationship}</Badge> },
                  { key:'status',        label:'Status',
                    render: r => <StatusBadge status={(r as { status?: string }).status ?? ''} /> },
                  { key:'city',          label:'City',           sortable:true },
                ]}
              />
            </TabsContent>

            {/* Branch Offices tab */}
            <TabsContent value='branch-offices' className='mt-4'>
              <EntityTable
                rows={branches}
                onEdit={id => navigate(editPath['branch-offices'](id))}
                onDelete={setDeleteId}
                emptyText='No branch offices registered yet. Click "Add Branch Office" to create one.'
                columns={[
                  { key:'code',          label:'Code',           sortable:true },
                  { key:'name',          label:'Name',           sortable:true },
                  { key:'branchType',    label:'Type',
                    render: r => {
                      const t = (r as { branchType?: string }).branchType ?? '';
                      return <span className={cn('text-[10px] border rounded-full px-2 py-0.5 font-medium',
                        BRANCH_TYPE_COLORS[t] ?? 'bg-muted text-foreground')}>{t}</span>;
                    } },
                  { key:'parentCompany', label:'Company',        sortable:true },
                  { key:'branchHead',    label:'Branch Head' },
                  { key:'status',        label:'Status',
                    render: r => <StatusBadge status={(r as { status?: string }).status ?? ''} /> },
                  { key:'city',          label:'City',           sortable:true },
                  { key:'state',         label:'State' },
                ]}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete record?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. [JWT] Will call DELETE API.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (!deleteId) return;
                  const compIdx = rawCompanies.findIndex(r => r.id === deleteId);
                  const subIdx = rawSubsidiaries.findIndex(r => r.id === deleteId);
                  const brIdx = rawBranches.findIndex(r => r.id === deleteId);
                  if (compIdx >= 0) {
                    const next = rawCompanies.filter(r => r.id !== deleteId);
                    setRawCompanies(next);
                    // [JWT] PATCH /api/foundation/entities
                    localStorage.setItem('erp_companies', JSON.stringify(next));
                  } else if (subIdx >= 0) {
                    const next = rawSubsidiaries.filter(r => r.id !== deleteId);
                    setRawSubsidiaries(next);
                    // [JWT] PATCH /api/foundation/entities
                    localStorage.setItem('erp_subsidiaries', JSON.stringify(next));
                  } else if (brIdx >= 0) {
                    const next = rawBranches.filter(r => r.id !== deleteId);
                    setRawBranches(next);
                    // [JWT] PATCH /api/foundation/entities
                    localStorage.setItem('erp_branch_offices', JSON.stringify(next));
                  }
                  /* [JWT] DELETE /api/foundation/entities/:id */
                  setDeleteId(null);
                  toast.success('Record deleted');
                }}
                className='bg-destructive hover:bg-destructive/90'>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SidebarProvider>
  );
}
export default function FoundationEntityHub() { return <FoundationEntityHubPanel />; }
