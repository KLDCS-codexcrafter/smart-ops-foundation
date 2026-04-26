/**
 * @file     RegisterGrid.tsx
 * @purpose  Shared grid used by all 13 voucher-type register pages. Provides filter bar,
 *           summary strip, paginated table, Excel export (via 2c voucher-export-engine),
 *           and DayBook drill-down. Config-driven columns for 2d-C future customization.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created Apr-2026 · T10-pre.2d-B
 * @sprint   T10-pre.2d-B (original), T10-pre.2d-C (RegisterConfig consumption + grouping)
 * @iso      Performance Efficiency (HIGH — pagination 50/page, useMemo)
 *           Functional Suitability (HIGH — all register concerns in one place)
 *           Maintainability (HIGH — column array driven)
 * @whom     Accountants (view) · auditors (export + drill) · (future 2d-C) RegisterConfig consumer
 * @depends  RegisterTypes.ts · voucher-export-engine.ts · useVouchers hook · reportUtils.ts
 * @consumers 13 register panels
 */

import { useState, useMemo, useEffect } from 'react';
import { FileSpreadsheet, Search, FileText, FileDown, FileType2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationPrevious, PaginationNext,
} from '@/components/ui/pagination';
import { toast } from 'sonner';
import { onEnterNext } from '@/lib/keyboard';
import type { Voucher } from '@/types/voucher';
import { useVouchers } from '@/hooks/useVouchers';
import { today } from '@/pages/erp/finecore/reports/reportUtils';
import {
  exportVoucherAsXLSX, exportVoucherAsPDF, exportVoucherAsWord,
  type ExportRows, type ExportSheet,
} from '@/lib/voucher-export-engine';
import type { RegisterColumn, RegisterMeta, RegisterFilters, SummaryCard } from './RegisterTypes';
import {
  loadRegisterConfig, resolveToggles, resolveDefaultGroup,
} from '@/lib/register-config-storage';
import { resolveGroupValue } from './RegisterGroupResolver';

export interface RegisterGridProps {
  /** Active entity code — passed from FinCorePage. */
  entityCode: string;
  /** Register metadata — defines scope, title, drill-down type. */
  meta: RegisterMeta;
  /** Column definitions (display + export). */
  columns: RegisterColumn<Voucher>[];
  /**
   * Builder for the 5-card summary strip. Receives the filtered vouchers;
   * returns an array of SummaryCard (up to 5 cards). Optional.
   */
  summaryBuilder?: (filtered: Voucher[]) => SummaryCard[];
  /**
   * Navigation callback. Fires with 'fc-rpt-daybook' + optional initialFilters.
   * Parent FinCorePage wires this to setActiveModule + DayBookPanel's initialFilters prop.
   */
  onNavigateToDayBook: (initialFilters: Partial<RegisterFilters> & { typeFilter?: string }) => void;
}

const ROWS_PER_PAGE = 50;

/**
 * @purpose   Shared register grid rendering for all 13 register types.
 * @iso       Performance Efficiency (HIGH) — useMemo on filter, sort, paginate;
 *            derived state not recomputed unless inputs change.
 * @iso       Functional Suitability (HIGH) — all register concerns in one place.
 */
export function RegisterGrid({
  entityCode, meta, columns, summaryBuilder, onNavigateToDayBook,
}: RegisterGridProps) {
  const { vouchers } = useVouchers(entityCode);

  // [T10-pre.2d-C] D-137/138: Load RegisterConfig and resolve toggles + group.
  // Re-reads on every mount — users re-open the register after config change to see updates.
  const config = useMemo(() => loadRegisterConfig(entityCode), [entityCode]);
  const effectiveToggles = useMemo(
    () => resolveToggles(config, meta.registerCode),
    [config, meta.registerCode]
  );
  const effectiveGroup = useMemo(
    () => resolveDefaultGroup(config, meta.registerCode),
    [config, meta.registerCode]
  );

  // [T10-pre.2d-C] D-138: Filter columns by toggleKey — applies to BOTH display and export.
  // Columns with no toggleKey are always shown (always-on columns like Date, Voucher No, Total).
  const visibleColumns = useMemo(
    () => columns.filter(c => !c.toggleKey || effectiveToggles[c.toggleKey]),
    [columns, effectiveToggles]
  );

  const t = today();
  const monthStart = t.slice(0, 8) + '01';
  const [filters, setFilters] = useState<RegisterFilters>({
    dateFrom: monthStart,
    dateTo: t,
    search: '',
    statusFilter: 'all',
  });
  const [page, setPage] = useState(1);

  // [Analytical] Scope → date range → search → status → sort chronological
  const filtered = useMemo(() => {
    let result = vouchers.filter(meta.voucherFilter);
    result = result.filter(v => v.date >= filters.dateFrom && v.date <= filters.dateTo);
    if (filters.statusFilter !== 'all') {
      result = result.filter(v => v.status === filters.statusFilter);
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(v =>
        v.voucher_no.toLowerCase().includes(s)
        || (v.party_name?.toLowerCase().includes(s) ?? false)
        || (v.narration?.toLowerCase().includes(s) ?? false)
      );
    }
    // [T10-pre.2d-C] D-137: Sort by group key (primary) then date (secondary).
    // When effectiveGroup === 'none', group key is empty string for all rows — date sort wins.
    return result.sort((a, b) => {
      const ga = resolveGroupValue(a, effectiveGroup);
      const gb = resolveGroupValue(b, effectiveGroup);
      if (ga !== gb) return ga.localeCompare(gb);
      return a.date.localeCompare(b.date);
    });
  }, [vouchers, meta, filters, effectiveGroup]);

  // [Concrete] Summary cards
  const summaryCards = useMemo(
    () => summaryBuilder?.(filtered) ?? [],
    [filtered, summaryBuilder]
  );

  // [Performance] Paginate — only render 50 rows at a time
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const pageData = useMemo(() => {
    const startIdx = (page - 1) * ROWS_PER_PAGE;
    return filtered.slice(startIdx, startIdx + ROWS_PER_PAGE);
  }, [filtered, page]);

  // [Convergent] Reset page to 1 when filter changes if current page exceeds total.
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  // [Convergent] D-128: reuse 2c's voucher-export-engine.
  // A register export is a single-sheet "register summary" — one row per voucher.
  // Exported cells come from columns[].exportKey; columns without exportKey are skipped.
  // [T10-pre.2d-C] D-138: Export honors column-visibility toggles — hidden columns don't appear in Excel.
  const buildRegisterExportRows = (): ExportRows => {
    const exportable = visibleColumns.filter(c => c.exportKey !== undefined);
    const headers = exportable.map(c => c.exportLabel ?? c.label);
    const rows: (string | number | null)[][] = filtered.map(v =>
      exportable.map(c => {
        if (typeof c.exportKey === 'function') return c.exportKey(v);
        if (c.exportKey) {
          const val = v[c.exportKey];
          if (val === null || val === undefined) return null;
          if (typeof val === 'string' || typeof val === 'number') return val;
          return String(val);
        }
        return null;
      })
    );
    const sheet: ExportSheet = { name: meta.title.slice(0, 31), headers, rows };
    return {
      voucherType: meta.title,
      voucherNo: `${filters.dateFrom}_to_${filters.dateTo}`,
      sheets: [sheet],
    };
  };

  const handleExport = () => {
    try {
      exportVoucherAsXLSX(buildRegisterExportRows());
      toast.success(`Exported ${filtered.length} rows as Excel`);
    } catch (err) {
      // [Analytical] Diagnostic-only; banned-pattern targets console.log, not console.error.
      toast.error('Export failed. Check console for details.');
      console.error('Register export error:', err);
    }
  };

  // [T-T10-pre.2c-PDF] PDF export alongside Excel. Uses 'register' layout (landscape A4)
  // since this is a multi-row register view, not a single voucher.
  const handlePDFExport = () => {
    try {
      exportVoucherAsPDF(buildRegisterExportRows(), 'register');
      toast.success(`Exported ${filtered.length} rows as PDF`);
    } catch (err) {
      // [Analytical] Diagnostic-only; banned-pattern targets console.log, not console.error.
      toast.error('PDF export failed. Check console for details.');
      console.error('Register PDF export error:', err);
    }
  };

  const handleRowClick = (v: Voucher) => {
    // [Convergent] D-136: drill-down lands in DayBook, pre-filtered. Preserves context.
    onNavigateToDayBook({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      search: v.voucher_no,
      typeFilter: meta.drillDownType,
    });
  };

  return (
    <div data-keyboard-form className="p-6 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">{meta.title}</h2>
          <Badge variant="outline" className="text-[10px]">{filtered.length} rows</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button data-primary variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handlePDFExport} disabled={filtered.length === 0}>
            <FileDown className="h-3.5 w-3.5 mr-1" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <Card><CardContent className="p-3 flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">From</label>
          <Input type="date" value={filters.dateFrom}
            onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
            className="h-8 text-xs w-36" onKeyDown={onEnterNext} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">To</label>
          <Input type="date" value={filters.dateTo}
            onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
            className="h-8 text-xs w-36" onKeyDown={onEnterNext} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">Status</label>
          <Select value={filters.statusFilter}
            onValueChange={v => setFilters(f => ({ ...f, statusFilter: v as RegisterFilters['statusFilter'] }))}>
            <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="posted">Posted</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 flex-1 min-w-[180px]">
          <label className="text-[10px] text-muted-foreground">Search</label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input placeholder="Voucher no, party, or narration..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="h-8 text-xs pl-7" onKeyDown={onEnterNext} />
          </div>
        </div>
      </CardContent></Card>

      {/* Summary strip (optional) */}
      {summaryCards.length > 0 && (
        <div className="grid grid-cols-5 gap-3">
          {summaryCards.map(c => (
            <Card key={c.label}><CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground">{c.label}</p>
              <p className="text-sm font-bold">{c.value}</p>
            </CardContent></Card>
          ))}
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <Card><CardContent className="p-10 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No vouchers in this period</p>
        </CardContent></Card>
      ) : (
        <>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.map(col => (
                    <TableHead key={col.key}
                      className={`text-xs ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''} ${col.width ?? ''}`}>
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.map(v => (
                  <TableRow key={v.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(v)}>
                    {visibleColumns.map(col => (
                      <TableCell key={col.key}
                        className={`text-xs ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}>
                        {col.render(v)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious onClick={() => setPage(p => Math.max(1, p - 1))}
                    className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink isActive>Page {page} of {totalPages}</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
          <p className="text-[10px] text-muted-foreground text-center">
            Showing {(page - 1) * ROWS_PER_PAGE + 1}–{Math.min(page * ROWS_PER_PAGE, filtered.length)} of {filtered.length}
          </p>
        </>
      )}
    </div>
  );
}

/** Helper: reusable status badge for column render functions. */
export function StatusBadge({ status }: { status: string }) {
  if (status === 'posted') return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">Posted</Badge>;
  if (status === 'cancelled') return <Badge variant="destructive" className="text-[10px]">Cancelled</Badge>;
  if (status === 'in_transit') return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">In Transit</Badge>;
  if (status === 'received') return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">Received</Badge>;
  return <Badge variant="outline" className="text-[10px]">Draft</Badge>;
}
