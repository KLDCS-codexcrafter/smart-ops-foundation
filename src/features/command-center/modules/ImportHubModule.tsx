/**
 * ImportHubModule.tsx — Excel/CSV import center for opening balances + masters.
 * [JWT] Replace localStorage reads/writes with REST endpoints as annotated.
 */
import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import {
  ChevronDown, ChevronRight, Download, Upload, FileSpreadsheet,
  CheckCircle2, AlertTriangle, XCircle, RotateCcw, FileWarning,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useEntityCode } from '@/hooks/useEntityCode';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';
import {
  openingBillsKey, openingLoansKey,
  type OpeningBillEntry, type OpeningLoanEntry,
} from '@/types/opening-balance';

// ───────────────────────── Storage key helpers ─────────────────────────
const ITEM_OS_KEY     = (e: string) => `erp_item_opening_stock_${e}`;
const INVENTORY_KEY   = 'erp_inventory_items';
const GODOWN_KEY      = 'erp_godowns';
const LEDGER_KEY      = 'erp_group_ledger_definitions';
const EMPLOYEE_KEY    = 'erp_employees';
const CUSTOMER_KEY    = 'erp_group_customer_master';
const VENDOR_KEY      = 'erp_group_vendor_master';

// ───────────────────────── Small utilities ─────────────────────────
function ls<T>(key: string): T[] {
  try {
    // [JWT] GET /api/storage/:key
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function ss<T>(key: string, data: T[]): void {
  // [JWT] POST /api/storage/:key
  localStorage.setItem(key, JSON.stringify(data));
}

interface ColumnSpec {
  field: string;
  header: string;
  required: boolean;
  type?: 'string' | 'number' | 'date' | 'boolean';
  fk?: 'item' | 'godown' | 'ledger' | 'employee';
}

interface ParsedRow {
  rowNum: number;
  data: Record<string, unknown>;
  status: 'valid' | 'warning' | 'error';
  reason?: string;
}

interface ImportTabProps {
  tabKey: string;
  label: string;
  columns: ColumnSpec[];
  storageKey: string;
  onImport: (rows: Record<string, unknown>[], importStartTime: string) => number;
}

// ───────────────────────── Reusable Import Tab ─────────────────────────
function ImportTab({ tabKey, label, columns, storageKey, onImport }: ImportTabProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importDone, setImportDone] = useState(false);
  const [importStartTime, setImportStartTime] = useState<string>('');
  const [showRollback, setShowRollback] = useState(false);

  const summary = useMemo(() => {
    const v = rows.filter(r => r.status === 'valid').length;
    const w = rows.filter(r => r.status === 'warning').length;
    const e = rows.filter(r => r.status === 'error').length;
    return { v, w, e, importable: v + w };
  }, [rows]);

  // ── Step 1: Download Template ─────────────────────────────────
  function downloadTemplate() {
    const headers = columns.map(c => c.header + (c.required ? ' *' : ''));
    const sample: (string | number)[] = columns.map(c => {
      if (c.type === 'number') return 0;
      if (c.type === 'date') return '2026-04-01';
      if (c.type === 'boolean') return 'No';
      return `Sample ${c.field}`;
    });
    const tplSheet = XLSX.utils.aoa_to_sheet([headers, sample]);

    // Reference sheet — pull live lookup data
    const items     = ls<{ code: string; name: string }>(INVENTORY_KEY).map(i => i.code);
    const godowns   = ls<{ name: string }>(GODOWN_KEY).map(g => g.name);
    const ledgers   = ls<{ ledger_code: string }>(LEDGER_KEY).map(l => l.ledger_code);
    const employees = ls<{ code: string }>(EMPLOYEE_KEY).map(e => e.code);
    const customers = ls<{ name: string }>(CUSTOMER_KEY).map(c => c.name);
    const vendors   = ls<{ name: string }>(VENDOR_KEY).map(v => v.name);

    const maxLen = Math.max(items.length, godowns.length, ledgers.length, employees.length, customers.length, vendors.length, 1);
    const refRows: (string | undefined)[][] = [['Item Codes', 'Godown Names', 'Ledger Codes', 'Employee Codes', 'Customer Names', 'Vendor Names']];
    for (let i = 0; i < maxLen; i++) {
      refRows.push([items[i], godowns[i], ledgers[i], employees[i], customers[i], vendors[i]]);
    }
    const refSheet = XLSX.utils.aoa_to_sheet(refRows);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, tplSheet, 'Template');
    XLSX.utils.book_append_sheet(wb, refSheet, 'Reference');
    XLSX.writeFile(wb, `${tabKey}_template.xlsx`);
    toast.success('Template downloaded');
  }

  // ── Step 2/3: Parse + Validate ──────────────────────────────
  async function handleFile(f: File) {
    setFileName(f.name);
    setImportDone(false);
    const buffer = await f.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

    // Build header → field map (case-insensitive trim, strip trailing *)
    const headerMap: Record<string, string> = {};
    columns.forEach(c => {
      const norm = c.header.toLowerCase().trim();
      headerMap[norm] = c.field;
    });

    const itemCodes = new Set(ls<{ code: string }>(INVENTORY_KEY).map(i => i.code));
    const godownNames = new Set(ls<{ name: string }>(GODOWN_KEY).map(g => g.name));
    const ledgerCodes = new Set(ls<{ ledger_code: string }>(LEDGER_KEY).map(l => l.ledger_code));
    const employeeCodes = new Set(ls<{ code: string }>(EMPLOYEE_KEY).map(e => e.code));

    const parsed: ParsedRow[] = json.map((raw, idx) => {
      const data: Record<string, unknown> = {};
      Object.entries(raw).forEach(([k, v]) => {
        const norm = k.toLowerCase().trim().replace(/\s*\*\s*$/, '').trim();
        const field = headerMap[norm];
        if (field) data[field] = v;
      });

      let status: ParsedRow['status'] = 'valid';
      let reason: string | undefined;

      for (const c of columns) {
        const val = data[c.field];
        const empty = val === null || val === undefined || val === '';
        if (c.required && empty) {
          status = 'error';
          reason = `Missing required: ${c.header}`;
          break;
        }
        if (!empty) {
          if (c.type === 'number' && Number.isNaN(Number(val))) {
            status = 'error'; reason = `Invalid number: ${c.header}`; break;
          }
          if (c.type === 'date' && Number.isNaN(new Date(String(val)).getTime())) {
            status = 'error'; reason = `Invalid date: ${c.header}`; break;
          }
          if (c.fk) {
            const set =
              c.fk === 'item' ? itemCodes :
              c.fk === 'godown' ? godownNames :
              c.fk === 'ledger' ? ledgerCodes : employeeCodes;
            if (!set.has(String(val))) {
              status = status === 'valid' ? 'warning' : status;
              reason = `Unknown ${c.fk}: ${val}`;
            }
          }
        }
      }
      return { rowNum: idx + 2, data, status, reason };
    });
    setRows(parsed);
    toast.success(`Parsed ${parsed.length} rows`);
  }

  // ── Step 5: Import ─────────────────────────────────────────
  function runImport() {
    const importable = rows.filter(r => r.status !== 'error').map(r => r.data);
    if (importable.length === 0) { toast.error('No importable rows'); return; }
    const startTime = new Date().toISOString();
    const written = onImport(importable, startTime);
    setImportStartTime(startTime);
    setImportDone(true);
    toast.success(`${written} rows imported, ${rows.length - written} skipped`);
  }

  // ── Step 6: Error report ───────────────────────────────────
  function downloadErrorReport() {
    const headers = [...columns.map(c => c.header), 'Import Status'];
    const aoa: (string | number | null)[][] = [headers];
    rows.forEach(r => {
      const dataCells = columns.map(c => (r.data[c.field] as string | number | null) ?? '');
      aoa.push([...dataCells, r.status === 'error' ? `SKIPPED: ${r.reason || 'error'}` : 'OK']);
    });
    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Errors');
    XLSX.writeFile(wb, `${tabKey}_error_report.xlsx`);
    toast.success('Error report downloaded');
  }

  // ── Step 7: Rollback ───────────────────────────────────────
  function runRollback() {
    if (!importStartTime) return;
    const existing = ls<Record<string, unknown>>(storageKey);
    const filtered = existing.filter(r => {
      const ts = (r.created_at as string) || '';
      return !(ts && ts >= importStartTime);
    });
    const removed = existing.length - filtered.length;
    // [JWT] DELETE /api/import/rollback/:tabKey
    ss(storageKey, filtered);
    setImportDone(false);
    setRows([]);
    setShowRollback(false);
    toast.success(`${removed} rows removed`);
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 glass-card border-border/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{label}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Step 1 — Download template. Step 2 — Upload .xlsx or .csv. Step 3 — Review & import.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-3.5 w-3.5" /> Download Template
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" /> Upload File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = '';
              }}
            />
          </div>
        </div>

        {fileName && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span className="font-mono">{fileName}</span>
          </div>
        )}
      </Card>

      {rows.length > 0 && (
        <Card className="p-4 glass-card border-border/50">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="text-xs text-muted-foreground">
              <span className="text-success font-semibold">{summary.v} valid</span>
              {' · '}
              <span className="text-warning font-semibold">{summary.w} warnings</span>
              {' · '}
              <span className="text-destructive font-semibold">{summary.e} errors</span>
              {' — will import '}
              <span className="font-mono text-foreground">{summary.importable}</span>
              {' rows'}
            </div>
            <div className="flex items-center gap-2">
              {summary.e > 0 && (
                <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                  <FileWarning className="h-3.5 w-3.5" /> Error Report
                </Button>
              )}
              {importDone && (
                <Button variant="outline" size="sm" onClick={() => setShowRollback(true)}>
                  <RotateCcw className="h-3.5 w-3.5" /> Rollback
                </Button>
              )}
              <Button
                size="sm"
                data-primary
                onClick={runImport}
                disabled={summary.importable === 0 || importDone}
              >
                Import {summary.importable} rows
              </Button>
            </div>
          </div>

          <div className="border border-border/50 rounded-lg overflow-x-auto max-h-96">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/40 backdrop-blur-sm">
                <tr>
                  <th className="px-2 py-1.5 text-left font-semibold">Row</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Status</th>
                  {columns.map(c => (
                    <th key={c.field} className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">
                      {c.header}
                    </th>
                  ))}
                  <th className="px-2 py-1.5 text-left font-semibold">Reason</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={`${tabKey}-${r.rowNum}`} className="border-t border-border/30 hover:bg-muted/20">
                    <td className="px-2 py-1.5 font-mono text-muted-foreground">{r.rowNum}</td>
                    <td className="px-2 py-1.5">
                      {r.status === 'valid' && (
                        <Badge variant="outline" className="text-success border-success/40 gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Valid
                        </Badge>
                      )}
                      {r.status === 'warning' && (
                        <Badge variant="outline" className="text-warning border-warning/40 gap-1">
                          <AlertTriangle className="h-3 w-3" /> Warning
                        </Badge>
                      )}
                      {r.status === 'error' && (
                        <Badge variant="outline" className="text-destructive border-destructive/40 gap-1">
                          <XCircle className="h-3 w-3" /> Error
                        </Badge>
                      )}
                    </td>
                    {columns.map(c => (
                      <td key={c.field} className="px-2 py-1.5 font-mono whitespace-nowrap">
                        {String(r.data[c.field] ?? '')}
                      </td>
                    ))}
                    <td className="px-2 py-1.5 text-muted-foreground">{r.reason || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <AlertDialog open={showRollback} onOpenChange={setShowRollback}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rollback this import?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all rows imported in this session. Confirm?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runRollback}>Confirm Rollback</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ───────────────────────── Column specs ─────────────────────────
const OPENING_STOCK_COLS: ColumnSpec[] = [
  { field: 'item_code',         header: 'item_code',         required: true,  type: 'string', fk: 'item' },
  { field: 'godown_name',       header: 'godown_name',       required: true,  type: 'string', fk: 'godown' },
  { field: 'qty',               header: 'qty',               required: true,  type: 'number' },
  { field: 'rate',              header: 'rate',              required: true,  type: 'number' },
  { field: 'batch_no',          header: 'batch_no',          required: false, type: 'string' },
  { field: 'mfg_date',          header: 'mfg_date',          required: false, type: 'date' },
  { field: 'expiry_date',       header: 'expiry_date',       required: false, type: 'date' },
  { field: 'serial_no',         header: 'serial_no',         required: false, type: 'string' },
  { field: 'mrp',               header: 'mrp',               required: false, type: 'number' },
  { field: 'std_purchase_rate', header: 'std_purchase_rate', required: false, type: 'number' },
];

const LEDGER_BAL_COLS: ColumnSpec[] = [
  { field: 'ledger_code', header: 'ledger_code', required: true,  type: 'string', fk: 'ledger' },
  { field: 'dr_amount',   header: 'dr_amount',   required: true,  type: 'number' },
  { field: 'cr_amount',   header: 'cr_amount',   required: true,  type: 'number' },
  { field: 'note',        header: 'note',        required: false, type: 'string' },
];

const PARTY_BILLS_COLS: ColumnSpec[] = [
  { field: 'ledger_code', header: 'ledger_code', required: true,  type: 'string', fk: 'ledger' },
  { field: 'bill_no',     header: 'bill_no',     required: true,  type: 'string' },
  { field: 'bill_date',   header: 'bill_date',   required: true,  type: 'date' },
  { field: 'amount',      header: 'amount',      required: true,  type: 'number' },
  { field: 'dr_cr',       header: 'dr_cr',       required: true,  type: 'string' },
  { field: 'bill_type',   header: 'bill_type',   required: true,  type: 'string' },
  { field: 'due_date',    header: 'due_date',    required: false, type: 'date' },
  { field: 'credit_days', header: 'credit_days', required: false, type: 'number' },
  { field: 'tds_yn',      header: 'tds_yn',      required: false, type: 'string' },
  { field: 'tds_section', header: 'tds_section', required: false, type: 'string' },
  { field: 'tds_amount',  header: 'tds_amount',  required: false, type: 'number' },
  { field: 'pan',         header: 'pan',         required: false, type: 'string' },
  { field: 'tan',         header: 'tan',         required: false, type: 'string' },
];

const EMP_LOAN_COLS: ColumnSpec[] = [
  { field: 'employee_code',      header: 'employee_code',      required: true,  type: 'string', fk: 'employee' },
  { field: 'loan_type',          header: 'loan_type',          required: true,  type: 'string' },
  { field: 'disbursement_date',  header: 'disbursement_date',  required: true,  type: 'date' },
  { field: 'original_amount',    header: 'original_amount',    required: true,  type: 'number' },
  { field: 'outstanding_amount', header: 'outstanding_amount', required: true,  type: 'number' },
  { field: 'interest_rate',      header: 'interest_rate',      required: false, type: 'number' },
  { field: 'emi_amount',         header: 'emi_amount',         required: false, type: 'number' },
  { field: 'next_emi_date',      header: 'next_emi_date',      required: false, type: 'date' },
  { field: 'tenure_months',      header: 'tenure_months',      required: false, type: 'number' },
];

const CUSTOMER_COLS: ColumnSpec[] = [
  { field: 'name',         header: 'name',         required: true,  type: 'string' },
  { field: 'gstin',        header: 'gstin',        required: true,  type: 'string' },
  { field: 'state',        header: 'state',        required: true,  type: 'string' },
  { field: 'pan',          header: 'pan',          required: false, type: 'string' },
  { field: 'cin',          header: 'cin',          required: false, type: 'string' },
  { field: 'address_line', header: 'address_line', required: false, type: 'string' },
  { field: 'credit_days',  header: 'credit_days',  required: false, type: 'number' },
  { field: 'credit_limit', header: 'credit_limit', required: false, type: 'number' },
  { field: 'mobile',       header: 'mobile',       required: false, type: 'string' },
];

const VENDOR_COLS: ColumnSpec[] = [
  { field: 'name',        header: 'name',        required: true,  type: 'string' },
  { field: 'gstin',       header: 'gstin',       required: true,  type: 'string' },
  { field: 'vendor_type', header: 'vendor_type', required: true,  type: 'string' },
  { field: 'state',       header: 'state',       required: true,  type: 'string' },
  { field: 'pan',         header: 'pan',         required: false, type: 'string' },
  { field: 'tan',         header: 'tan',         required: false, type: 'string' },
  { field: 'tds_section', header: 'tds_section', required: false, type: 'string' },
  { field: 'credit_days', header: 'credit_days', required: false, type: 'number' },
  { field: 'currency',    header: 'currency',    required: false, type: 'string' },
];

const INVENTORY_COLS: ColumnSpec[] = [
  { field: 'code',              header: 'code',              required: true,  type: 'string' },
  { field: 'name',              header: 'name',              required: true,  type: 'string' },
  { field: 'stock_group_name',  header: 'stock_group_name',  required: true,  type: 'string' },
  { field: 'primary_uom_symbol',header: 'primary_uom_symbol',required: true,  type: 'string' },
  { field: 'brand_name',        header: 'brand_name',        required: false, type: 'string' },
  { field: 'hsn_sac_code',      header: 'hsn_sac_code',      required: false, type: 'string' },
  { field: 'igst_rate',         header: 'igst_rate',         required: false, type: 'number' },
  { field: 'batch_tracking',    header: 'batch_tracking',    required: false, type: 'boolean' },
  { field: 'serial_tracking',   header: 'serial_tracking',   required: false, type: 'boolean' },
  { field: 'reorder_level',     header: 'reorder_level',     required: false, type: 'number' },
  { field: 'moq',               header: 'moq',               required: false, type: 'number' },
];

const EMPLOYEE_COLS: ColumnSpec[] = [
  { field: 'code',             header: 'code',             required: true,  type: 'string' },
  { field: 'name',             header: 'name',             required: true,  type: 'string' },
  { field: 'designation',      header: 'designation',      required: true,  type: 'string' },
  { field: 'department_name',  header: 'department_name',  required: true,  type: 'string' },
  { field: 'date_of_joining',  header: 'date_of_joining',  required: true,  type: 'date' },
  { field: 'pan',              header: 'pan',              required: false, type: 'string' },
  { field: 'mobile',           header: 'mobile',           required: false, type: 'string' },
  { field: 'bank_account',     header: 'bank_account',     required: false, type: 'string' },
  { field: 'ifsc',             header: 'ifsc',             required: false, type: 'string' },
];

// ───────────────────────── Generic mass-importer ─────────────────────────
function makeAppender(storageKey: string) {
  return (rows: Record<string, unknown>[], importStartTime: string): number => {
    const existing = ls<Record<string, unknown>>(storageKey);
    const stamped = rows.map((r, i) => ({
      id: `imp-${Date.now()}-${i}`,
      ...r,
      created_at: importStartTime,
      updated_at: importStartTime,
    }));
    // [JWT] POST /api/storage/:key/bulk
    ss(storageKey, [...existing, ...stamped]);
    return stamped.length;
  };
}

// ───────────────────────── Module shell ─────────────────────────
export function ImportHubModule() {
  const { entityCode } = useEntityCode();

  const [openingOpen, setOpeningOpen] = useState(true);
  const [mastersOpen, setMastersOpen] = useState(false);

  if (!entityCode) {
    return <SelectCompanyGate />;
  }

  // ── Custom importers for opening balance bills / loans ───────────
  const importBills = (rows: Record<string, unknown>[], startTime: string): number => {
    const existing = ls<OpeningBillEntry>(openingBillsKey(entityCode));
    const stamped: OpeningBillEntry[] = rows.map((r, i) => ({
      id: `obimp-${Date.now()}-${i}`,
      entity_id: entityCode,
      ledger_id: String(r.ledger_code ?? ''),
      ledger_name: String(r.ledger_code ?? ''),
      party_type: String(r.dr_cr) === 'Dr' ? 'debtor' : 'creditor',
      bill_type: (String(r.bill_type ?? 'invoice').toLowerCase().replace(/\s+/g, '_') as OpeningBillEntry['bill_type']),
      bill_no: String(r.bill_no ?? ''),
      bill_date: String(r.bill_date ?? ''),
      due_date: r.due_date ? String(r.due_date) : undefined,
      credit_days: r.credit_days ? Number(r.credit_days) : undefined,
      dr_cr: String(r.dr_cr) === 'Dr' ? 'Dr' : 'Cr',
      amount: Number(r.amount ?? 0),
      tds_applicable: String(r.tds_yn ?? '').toLowerCase() === 'yes',
      tds_section: r.tds_section ? String(r.tds_section) : undefined,
      tds_amount: r.tds_amount ? Number(r.tds_amount) : undefined,
      party_pan: r.pan ? String(r.pan) : undefined,
      party_tan: r.tan ? String(r.tan) : undefined,
      status: 'draft',
      created_at: startTime,
    }));
    // [JWT] POST /api/opening-balances/bills/bulk
    ss(openingBillsKey(entityCode), [...existing, ...stamped]);
    return stamped.length;
  };

  const importLoans = (rows: Record<string, unknown>[], startTime: string): number => {
    const existing = ls<OpeningLoanEntry>(openingLoansKey(entityCode));
    const employees = ls<{ code: string; name?: string; id?: string }>(EMPLOYEE_KEY);
    const stamped: OpeningLoanEntry[] = rows.map((r, i) => {
      const emp = employees.find(e => e.code === String(r.employee_code));
      const orig = Number(r.original_amount ?? 0);
      const out  = Number(r.outstanding_amount ?? 0);
      return {
        id: `olimp-${Date.now()}-${i}`,
        entity_id: entityCode,
        entry_type: 'loan_receivable',
        employee_id: emp?.id,
        person_name: emp?.name || String(r.employee_code),
        person_code: String(r.employee_code),
        loan_type_name: String(r.loan_type ?? ''),
        disbursement_date: String(r.disbursement_date ?? ''),
        original_amount: orig,
        recovered_amount: orig - out,
        outstanding_amount: out,
        interest_rate: Number(r.interest_rate ?? 0),
        emi_amount: Number(r.emi_amount ?? 0),
        next_emi_date: r.next_emi_date ? String(r.next_emi_date) : undefined,
        remaining_tenure_months: Number(r.tenure_months ?? 0),
        ledger_id: '',
        status: 'draft',
        created_at: startTime,
      };
    });
    // [JWT] POST /api/opening-balances/loans/bulk
    ss(openingLoansKey(entityCode), [...existing, ...stamped]);
    return stamped.length;
  };

  // Opening stock importer — entity-scoped key
  const importOpeningStock = makeAppender(ITEM_OS_KEY(entityCode));

  // Ledger balances — appended to a dedicated bucket
  const importLedgerBal = makeAppender(`erp_opening_ledger_balances_${entityCode}`);

  return (
    <div data-keyboard-form className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Import Hub</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bulk import opening balances and master data for entity{' '}
          <span className="font-mono text-foreground">{entityCode}</span>
        </p>
      </div>

      {/* SECTION A — Opening Balance Imports */}
      <Collapsible open={openingOpen} onOpenChange={setOpeningOpen}>
        <Card className="glass-card border-border/50 overflow-hidden">
          <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-2">
              {openingOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <h2 className="text-sm font-semibold text-foreground">Opening Balance Imports</h2>
            </div>
            <Badge variant="outline" className="text-xs">Entity-scoped</Badge>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 border-t border-border/50">
              <Tabs defaultValue="opening-stock">
                <TabsList className="grid grid-cols-4 w-full max-w-2xl">
                  <TabsTrigger value="opening-stock">Opening Stock</TabsTrigger>
                  <TabsTrigger value="ledger-bal">Ledger Balances</TabsTrigger>
                  <TabsTrigger value="party-bills">Party Bills</TabsTrigger>
                  <TabsTrigger value="emp-loans">Employee Loans</TabsTrigger>
                </TabsList>
                <TabsContent value="opening-stock" className="mt-4">
                  <ImportTab
                    tabKey="opening-stock"
                    label="Opening Stock — item-wise inventory"
                    columns={OPENING_STOCK_COLS}
                    storageKey={ITEM_OS_KEY(entityCode)}
                    onImport={importOpeningStock}
                  />
                </TabsContent>
                <TabsContent value="ledger-bal" className="mt-4">
                  <ImportTab
                    tabKey="ledger-bal"
                    label="Ledger Balances — opening Dr/Cr per ledger"
                    columns={LEDGER_BAL_COLS}
                    storageKey={`erp_opening_ledger_balances_${entityCode}`}
                    onImport={importLedgerBal}
                  />
                </TabsContent>
                <TabsContent value="party-bills" className="mt-4">
                  <ImportTab
                    tabKey="party-bills"
                    label="Party Bills — bill-by-bill outstanding"
                    columns={PARTY_BILLS_COLS}
                    storageKey={openingBillsKey(entityCode)}
                    onImport={importBills}
                  />
                </TabsContent>
                <TabsContent value="emp-loans" className="mt-4">
                  <ImportTab
                    tabKey="emp-loans"
                    label="Employee Loans — opening loan receivables"
                    columns={EMP_LOAN_COLS}
                    storageKey={openingLoansKey(entityCode)}
                    onImport={importLoans}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* SECTION B — Master Imports */}
      <Collapsible open={mastersOpen} onOpenChange={setMastersOpen}>
        <Card className="glass-card border-border/50 overflow-hidden">
          <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-2">
              {mastersOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <h2 className="text-sm font-semibold text-foreground">Master Imports</h2>
            </div>
            <Badge variant="outline" className="text-xs">Group-level</Badge>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 border-t border-border/50">
              <Tabs defaultValue="customers">
                <TabsList className="grid grid-cols-4 w-full max-w-2xl">
                  <TabsTrigger value="customers">Customers</TabsTrigger>
                  <TabsTrigger value="vendors">Vendors</TabsTrigger>
                  <TabsTrigger value="items">Inventory Items</TabsTrigger>
                  <TabsTrigger value="employees">Employees</TabsTrigger>
                </TabsList>
                <TabsContent value="customers" className="mt-4">
                  <ImportTab
                    tabKey="customers"
                    label="Customer Master"
                    columns={CUSTOMER_COLS}
                    storageKey={CUSTOMER_KEY}
                    onImport={makeAppender(CUSTOMER_KEY)}
                  />
                </TabsContent>
                <TabsContent value="vendors" className="mt-4">
                  <ImportTab
                    tabKey="vendors"
                    label="Vendor Master"
                    columns={VENDOR_COLS}
                    storageKey={VENDOR_KEY}
                    onImport={makeAppender(VENDOR_KEY)}
                  />
                </TabsContent>
                <TabsContent value="items" className="mt-4">
                  <ImportTab
                    tabKey="items"
                    label="Inventory Item Master"
                    columns={INVENTORY_COLS}
                    storageKey={INVENTORY_KEY}
                    onImport={makeAppender(INVENTORY_KEY)}
                  />
                </TabsContent>
                <TabsContent value="employees" className="mt-4">
                  <ImportTab
                    tabKey="employees"
                    label="Employee Master"
                    columns={EMPLOYEE_COLS}
                    storageKey={EMPLOYEE_KEY}
                    onImport={makeAppender(EMPLOYEE_KEY)}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
