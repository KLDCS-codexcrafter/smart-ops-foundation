/**
 * @file     MasterImportExportButtons.tsx
 * @purpose  Generic toolbar for master pages · Template/CSV/Excel/Import buttons.
 *           Composes master-import-engine + master-export-engine into a reusable UI.
 * @who      Operix Engineering
 * @when     Apr-2026
 * @sprint   T-H1.5-Z-Z9
 * @iso      Functional Suitability (HIGH+ bulk-import baseline)
 *           Maintainability (HIGH+ single component reused across all masters)
 *           Usability (HIGH+ template generation · clear per-row error reporting)
 * @whom     CustomerMaster · VendorMaster · LedgerMaster · LogisticMaster · SchemeMaster
 */

import { useRef, useState } from 'react';
import { Download, Upload, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import type { ImportSchema, ImportResult } from '@/lib/master-import-engine';
import { importMasterFile } from '@/lib/master-import-engine';
import {
  exportTemplate, exportToCSV, exportToExcel, exportErrorReport,
} from '@/lib/master-export-engine';

interface MasterImportExportButtonsProps<T extends Record<string, unknown>> {
  schema: ImportSchema<T>;
  records: T[];
  /** Called after a successful import so the consumer can refresh state. */
  onImported?: () => void;
  className?: string;
}

export function MasterImportExportButtons<T extends Record<string, unknown>>({
  schema, records, onImported, className,
}: MasterImportExportButtonsProps<T>) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const triggerFileSelect = () => fileInputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const result: ImportResult = await importMasterFile(file, schema);
      if (result.errors.length > 0) {
        toast.error(
          `${schema.entityName} import failed · ${result.errors.length} error(s)`,
          {
            description: result.errors.slice(0, 3)
              .map(er => `Line ${er.line}: ${er.message}`).join(' · '),
            action: {
              label: 'Download report',
              onClick: () => exportErrorReport(schema.entityName, result.errors),
            },
          },
        );
      } else {
        toast.success(
          `${schema.entityName} import complete`,
          {
            description: `${result.importedCount} added · ${result.updatedCount} updated · ${result.totalRows} rows processed`,
          },
        );
        onImported?.();
      }
    } catch (err) {
      toast.error(`Import failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5" disabled={busy}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => exportTemplate(schema)} className="gap-2">
            <FileText className="h-3.5 w-3.5" /> Empty template (CSV)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => exportToCSV(records, schema)}
            disabled={records.length === 0}
            className="gap-2"
          >
            <FileText className="h-3.5 w-3.5" /> Current data (CSV)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => exportToExcel(records, schema)}
            disabled={records.length === 0}
            className="gap-2"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> Current data (Excel)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline" size="sm" className="gap-1.5"
        onClick={triggerFileSelect} disabled={busy}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        Import
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        hidden
        onChange={handleFile}
      />
    </div>
  );
}
