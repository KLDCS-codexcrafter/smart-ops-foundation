/**
 * DistributorExcelSync.tsx — UI for Excel export/import
 * Module id: dh-t-excel-sync
 */
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { distributorsKey, type Distributor } from '@/types/distributor';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import {
  distributorsToRows, mergeDistributorRows, type ExcelScope, type ExcelRow,
} from '@/lib/distributor-excel-engine';

const ENTITY = DEFAULT_ENTITY_SHORTCODE;

function readDistributors(): Distributor[] {
  try {
    // [JWT] GET /api/distributors
    const raw = localStorage.getItem(distributorsKey(ENTITY));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function writeDistributors(list: Distributor[]): void {
  try {
    // [JWT] PUT /api/distributors/bulk
    localStorage.setItem(distributorsKey(ENTITY), JSON.stringify(list));
  } catch { /* ignore */ }
}

export function DistributorExcelSyncPanel() {
  const [scope, setScope] = useState<ExcelScope>('distributors');

  const handleExport = () => {
    const list = readDistributors();
    const rows = distributorsToRows(list);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Distributors');
    XLSX.writeFile(wb, `distributors_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`Exported ${rows.length} distributors`);
  };

  const handleImport = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws) as ExcelRow[];
      const existing = readDistributors();
      const result = mergeDistributorRows(rows, existing);
      const next = [...existing];
      result.updated.forEach(u => {
        const idx = next.findIndex(d => d.partner_code === u.partner_code);
        if (idx >= 0) next[idx] = u;
      });
      next.push(...result.added);
      writeDistributors(next);
      toast.success(
        `Imported: ${result.added.length} added, ${result.updated.length} updated, ${result.skipped.length} skipped`,
      );
    } catch {
      toast.error('Import failed');
    }
    ev.target.value = '';
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl animate-fade-in">
      <div className="space-y-1">
        <h2 className="text-xl font-bold">Excel / API Sync</h2>
        <p className="text-sm text-muted-foreground">
          Download distributor data as Excel, edit offline, re-import. The Excel
          schema matches the REST API payload — any consumer can plug in directly.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Data scope</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={scope} onValueChange={v => setScope(v as ExcelScope)}>
            <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="distributors">Distributors</SelectItem>
              <SelectItem value="price-lists">Price Lists (coming)</SelectItem>
              <SelectItem value="orders">Orders (coming)</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 pt-2">
            <Button
              onClick={handleExport}
              className="bg-indigo-600 hover:bg-indigo-700"
              data-primary="true"
              disabled={scope !== 'distributors'}
            >
              <Download className="h-4 w-4 mr-1.5" />
              Export to Excel
            </Button>
            <Label
              htmlFor="import-file"
              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md border cursor-pointer hover:bg-muted/50"
            >
              <Upload className="h-4 w-4" />
              <span className="text-sm">Import from Excel</span>
            </Label>
            <Input
              id="import-file"
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImport}
              disabled={scope !== 'distributors'}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">API schema</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-2">Each Excel row = one API payload:</p>
          <pre className="text-[11px] bg-muted/30 p-2 rounded border font-mono whitespace-pre-wrap">
{`POST /api/distributors
{ partner_code, legal_name, tier, gstin,
  contact_mobile, contact_email,
  full_address,
  credit_limit_paise, outstanding_paise, status }`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

export default DistributorExcelSyncPanel;
