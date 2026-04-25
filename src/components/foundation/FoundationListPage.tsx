/**
 * FoundationListPage.tsx — Generic list page for all Foundation masters.
 * Handles search, sort, paginate, status badges, row actions.
 * [JWT] Replace mock data with real API queries.
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Plus, Search, Edit, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ERPHeader } from '@/components/layout/ERPHeader';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type SortDir = 'asc' | 'desc';

export interface ListColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface FoundationListPageProps<T extends { id: string; status?: string }> {
  title: string;
  description: string;
  breadcrumbs: { label: string; href?: string }[];
  createHref: string;
  createLabel: string;
  columns: ListColumn<T>[];
  data: T[];
  searchKeys: (keyof T)[];
}

export function FoundationListPage<T extends { id: string; status?: string }>({
  title, description, breadcrumbs, createHref, createLabel,
  columns, data, searchKeys,
}: FoundationListPageProps<T>) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let r = data.filter(row =>
      searchKeys.some(k => String(row[k] ?? '').toLowerCase().includes(search.toLowerCase()))
    );
    if (sortKey) {
      r = [...r].sort((a, b) => {
        const av = String(a[sortKey] ?? '').toLowerCase();
        const bv = String(b[sortKey] ?? '').toLowerCase();
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return r;
  }, [data, search, sortKey, sortDir, searchKeys]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const rows = filtered.slice((page - 1) * perPage, page * perPage);

  function handleSort(key: keyof T) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  function statusColor(s?: string): 'outline' | 'destructive' | 'secondary' {
    if (!s) return 'secondary';
    const sl = s.toLowerCase();
    if (sl === 'active') return 'outline';
    if (sl === 'inactive' || sl === 'suspended' || sl === 'permanently closed') return 'destructive';
    return 'secondary';
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div data-keyboard-form className="min-h-screen bg-background w-full">
        <ERPHeader breadcrumbs={breadcrumbs} showDatePicker={false} showCompany={false} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          {/* Page header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-foreground">{title}</h1>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <Button onClick={() => navigate(createHref)} className="gap-1.5 shrink-0">
              <Plus className="h-4 w-4" />
              {createLabel}
            </Button>
          </div>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or code..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 text-xs"
            />
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  {columns.map(col => (
                    <th
                      key={String(col.key)}
                      className={cn(
                        'text-left px-4 py-3 text-xs font-semibold text-muted-foreground',
                        col.sortable && 'cursor-pointer hover:text-foreground select-none',
                      )}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      <span className="flex items-center gap-1">
                        {col.label}
                        {col.sortable && sortKey === col.key && (
                          sortDir === 'asc'
                            ? <ChevronUp className="h-3 w-3" />
                            : <ChevronDown className="h-3 w-3" />
                        )}
                      </span>
                    </th>
                  ))}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-muted-foreground">
                      {search ? 'No results match your search.' : `No records yet. Click "${createLabel}" to add one.`}
                    </td>
                  </tr>
                ) : rows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={cn('border-b border-border/50 hover:bg-muted/20 transition-colors', i % 2 === 0 ? 'bg-card' : 'bg-muted/10')}
                  >
                    {columns.map(col => (
                      <td key={String(col.key)} className="px-4 py-3">
                        {col.render ? col.render(row) :
                          col.key === 'status'
                            ? <Badge variant={statusColor(String(row[col.key] ?? ''))} className="text-[10px]">{String(row[col.key] ?? '')}</Badge>
                            : <span className="text-xs text-foreground">{String(row[col.key] ?? '')}</span>
                        }
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => navigate(`${createHref.replace('/create', '')}/${row.id}/edit`)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => setDeleteId(row.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                <Button variant="outline" size="sm" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete record?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone. [JWT] Will call DELETE API.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => { setDeleteId(null); toast.success('Record deleted (mock)'); }} className="bg-destructive">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SidebarProvider>
  );
}
