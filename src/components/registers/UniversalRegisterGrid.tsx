/**
 * UniversalRegisterGrid.tsx — Generic Tally-Prime-style register over <T extends { id: string }>
 *
 * Sprint T-Phase-1.2.6a · Card #2.6 sub-sprint 1 of 5 · D-226 UTS Foundation
 *
 * Sibling abstraction: the FineCore RegisterGrid (voucher-typed) at
 * `src/components/finecore/registers/RegisterGrid.tsx` STAYS UNTOUCHED and
 * continues to back 13 production voucher consumers. This component is for
 * non-voucher consumers landing in 1.2.6b/c/d.
 *
 * Features:
 *   - Date-range filter (uses meta.dateAccessor)
 *   - Search box (case-insensitive substring across all rendered cell strings)
 *   - Optional status dropdown (statusOptions + statusKey)
 *   - Optional custom filter slot (customFilters)
 *   - 5-card summary strip (summaryBuilder)
 *   - Paginated table (50 rows/page)
 *   - Hierarchical expand row (chevron, when getExpandedRows is provided)
 *   - Export menu — Excel / PDF / Word / CSV via universal-export-engine
 *   - Empty-state message
 */

import { useMemo, useState, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ChevronDown, ChevronRight, Download, FileSpreadsheet, FileText, FileType,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  RegisterColumn, RegisterMeta, SummaryCard, StatusOption,
} from '@/components/registers/UniversalRegisterTypes';
import {
  exportRegisterAsCSV, exportRegisterAsXLSX, exportRegisterAsPDF, exportRegisterAsWord,
} from '@/lib/universal-export-engine';

const PAGE_SIZE = 50;

interface UniversalRegisterGridProps<T extends { id: string }> {
  entityCode: string;
  meta: RegisterMeta<T>;
  rows: T[];
  columns: RegisterColumn<T>[];
  /** Builds the 5-card summary strip from the filtered rows. */
  summaryBuilder?: (filtered: T[]) => SummaryCard[];
  /** When provided, renders an expand chevron and a child detail row. */
  getExpandedRows?: (row: T) => ReactNode;
  /** Drill-down on clickable cells. */
  onNavigateToRecord?: (row: T) => void;
  /** Optional extra filter UI (rendered in the filter bar). */
  customFilters?: ReactNode;
  /** Optional status dropdown. */
  statusOptions?: StatusOption[];
  /** Field on T that holds the status string. */
  statusKey?: keyof T;
}

const TONE_CLASS: Record<NonNullable<SummaryCard['tone']>, string> = {
  neutral:  'text-foreground',
  positive: 'text-success',
  negative: 'text-destructive',
  warning:  'text-warning',
};

export function UniversalRegisterGrid<T extends { id: string }>(
  props: UniversalRegisterGridProps<T>,
) {
  const {
    meta, rows, columns, summaryBuilder, getExpandedRows,
    onNavigateToRecord, customFilters, statusOptions, statusKey,
  } = props;

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter(r => {
      const d = meta.dateAccessor(r);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      if (status !== 'all' && statusKey) {
        const sv = r[statusKey];
        if (String(sv) !== status) return false;
      }
      if (!needle) return true;
      // Search across exportable string/number cells
      return columns.some(c => {
        if (c.exportKey === undefined) return false;
        const v = typeof c.exportKey === 'function' ? c.exportKey(r) : r[c.exportKey];
        if (v === null || v === undefined) return false;
        return String(v).toLowerCase().includes(needle);
      });
    });
  }, [rows, columns, meta, dateFrom, dateTo, search, status, statusKey]);

  const summary = summaryBuilder ? summaryBuilder(filtered) : [];
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const exportOpts = {
    filename: meta.registerCode,
    title: meta.title,
    summary,
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle>{meta.title}</CardTitle>
            {meta.description && (
              <p className="text-sm text-muted-foreground mt-1">{meta.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {filtered.length} record{filtered.length === 1 ? '' : 's'}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportRegisterAsXLSX(filtered, columns, exportOpts)}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportRegisterAsPDF(filtered, columns, exportOpts)}>
                  <FileType className="h-4 w-4 mr-2" /> PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { void exportRegisterAsWord(filtered, columns, exportOpts); }}>
                  <FileText className="h-4 w-4 mr-2" /> Word
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportRegisterAsCSV(filtered, columns, exportOpts)}>
                  <FileText className="h-4 w-4 mr-2" /> CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter bar */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">From</label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                   className="w-40 font-mono" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">To</label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                   className="w-40 font-mono" />
          </div>
          <div className="flex-1 min-w-[12rem]">
            <label className="text-xs text-muted-foreground block mb-1">Search</label>
            <Input placeholder="Search..." value={search}
                   onChange={e => { setSearch(e.target.value); setPage(0); }} />
          </div>
          {statusOptions && statusKey && (
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Status</label>
              <Select value={status} onValueChange={v => { setStatus(v); setPage(0); }}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {statusOptions.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {customFilters}
        </div>

        {/* Summary strip */}
        {summary.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {summary.map((s, i) => (
              <div key={`${s.label}-${i}`} className="rounded-lg border bg-card p-3">
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className={cn('text-lg font-mono mt-0.5', TONE_CLASS[s.tone ?? 'neutral'])}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No records match the current filters.
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  {getExpandedRows && <TableHead className="w-10" />}
                  {columns.map(c => (
                    <TableHead key={c.key} className={cn(c.width, c.align === 'right' && 'text-right',
                      c.align === 'center' && 'text-center')}>
                      {c.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map(row => {
                  const isOpen = !!expanded[row.id];
                  return (
                    <>
                      <TableRow key={row.id}>
                        {getExpandedRows && (
                          <TableCell className="w-10">
                            <button
                              type="button"
                              onClick={() => setExpanded(p => ({ ...p, [row.id]: !p[row.id] }))}
                              className="text-muted-foreground hover:text-foreground"
                              aria-label={isOpen ? 'Collapse row' : 'Expand row'}
                            >
                              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          </TableCell>
                        )}
                        {columns.map(c => (
                          <TableCell key={c.key} className={cn(
                            c.align === 'right' && 'text-right font-mono',
                            c.align === 'center' && 'text-center',
                          )}>
                            {c.clickable && onNavigateToRecord ? (
                              <button
                                type="button"
                                onClick={() => onNavigateToRecord(row)}
                                className="text-primary hover:underline font-mono"
                              >
                                {c.render(row)}
                              </button>
                            ) : (
                              c.render(row)
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                      {getExpandedRows && isOpen && (
                        <TableRow key={`${row.id}-expand`} className="bg-muted/30">
                          <TableCell colSpan={columns.length + 1} className="p-4">
                            {getExpandedRows(row)}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Page {safePage + 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={safePage === 0}
                      onClick={() => setPage(p => Math.max(0, p - 1))}>Prev</Button>
              <Button variant="outline" size="sm" disabled={safePage >= totalPages - 1}
                      onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
