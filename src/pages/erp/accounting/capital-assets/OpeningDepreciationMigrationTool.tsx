/**
 * OpeningDepreciationMigrationTool.tsx
 * Sprint 67 FAR-3 · Block 8 · Q-LOCK-7 A · CSV import for opening depreciation
 */
import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { faUnitsKey } from '@/types/fixed-asset';
import type { AssetUnitRecord } from '@/types/fixed-asset';

interface ImportRow {
  asset_id: string;
  opening_wdv: number;
  accumulated_depreciation: number;
  status: 'matched' | 'unmatched' | 'updated';
  message?: string;
}

interface OpeningDepreciationMigrationToolPanelProps {
  entityCode: string;
}

export function OpeningDepreciationMigrationToolPanel({ entityCode }: OpeningDepreciationMigrationToolPanelProps) {
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [summary, setSummary] = useState<{ matched: number; unmatched: number; updated: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      processCSV(text);
    };
    reader.readAsText(file);
  };

  const processCSV = (csvText: string) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      alert('CSV must have header + at least 1 data row');
      return;
    }
    // [JWT] Replace with POST /api/fa/opening-depreciation-import
    const unitsKey = faUnitsKey(entityCode);
    const existingUnits: AssetUnitRecord[] = JSON.parse(localStorage.getItem(unitsKey) ?? '[]');
    const rows: ImportRow[] = [];
    let matched = 0, unmatched = 0, updated = 0;
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim());
      if (parts.length < 3) continue;
      const [asset_id, openingWDV, accumDepr] = parts;
      const opening_wdv = parseFloat(openingWDV) || 0;
      const accumulated_depreciation = parseFloat(accumDepr) || 0;
      const existing = existingUnits.find((u) => u.asset_id === asset_id);
      if (existing) {
        existing.opening_wdv = opening_wdv;
        existing.accumulated_depreciation = accumulated_depreciation;
        existing.net_book_value = existing.gross_block_cost - accumulated_depreciation;
        existing.updated_at = new Date().toISOString();
        rows.push({ asset_id, opening_wdv, accumulated_depreciation, status: 'updated', message: 'Updated existing record' });
        updated++; matched++;
      } else {
        rows.push({ asset_id, opening_wdv, accumulated_depreciation, status: 'unmatched', message: 'No matching asset_id · row skipped' });
        unmatched++;
      }
    }
    localStorage.setItem(unitsKey, JSON.stringify(existingUnits));
    setImportRows(rows);
    setSummary({ matched, unmatched, updated });
  };

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" />Opening Depreciation Migration Tool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertTitle>CSV format</AlertTitle>
            <AlertDescription>
              Columns: <code className="font-mono">asset_id,opening_wdv,accumulated_depreciation</code>. Idempotent.
            </AlertDescription>
          </Alert>
          <div className="flex items-center gap-2">
            <Label htmlFor="csv-upload">Choose CSV file</Label>
            <input id="csv-upload" ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVUpload} className="text-sm" />
          </div>
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardHeader><CardTitle>Import summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="rounded-lg border p-3"><div className="flex items-center gap-2 text-success"><CheckCircle2 className="h-4 w-4" />Matched</div><div className="text-2xl font-bold">{summary.matched}</div></div>
              <div className="rounded-lg border p-3"><div className="flex items-center gap-2 text-primary"><Upload className="h-4 w-4" />Updated</div><div className="text-2xl font-bold">{summary.updated}</div></div>
              <div className="rounded-lg border p-3"><div className="flex items-center gap-2 text-warning"><AlertTriangle className="h-4 w-4" />Unmatched</div><div className="text-2xl font-bold">{summary.unmatched}</div></div>
            </div>
          </CardContent>
        </Card>
      )}

      {importRows.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Imported rows ({importRows.length})</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Asset ID</TableHead><TableHead>Opening WDV</TableHead><TableHead>Accumulated Depr</TableHead><TableHead>Status</TableHead><TableHead>Message</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {importRows.map((row, idx) => (
                  <TableRow key={`${row.asset_id}-${idx}`}>
                    <TableCell className="font-mono">{row.asset_id}</TableCell>
                    <TableCell>₹{row.opening_wdv.toLocaleString('en-IN')}</TableCell>
                    <TableCell>₹{row.accumulated_depreciation.toLocaleString('en-IN')}</TableCell>
                    <TableCell><span className="font-medium">{row.status}</span></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default OpeningDepreciationMigrationToolPanel;
