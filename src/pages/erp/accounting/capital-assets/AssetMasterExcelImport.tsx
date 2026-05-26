/**
 * AssetMasterExcelImport.tsx
 * Sprint 67 FAR-3 · Block 9 · Q-LOCK-8 A · XLSX bulk import
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle } from 'lucide-react';
import { faUnitsKey, IT_ACT_RATES } from '@/types/fixed-asset';
import type { AssetUnitRecord, ITActBlock } from '@/types/fixed-asset';
import * as XLSX from 'xlsx';

interface ImportRow {
  rowIndex: number;
  asset_id: string;
  item_name: string;
  gross_block_cost: number;
  it_act_block: string;
  status: 'created' | 'updated' | 'invalid';
  message?: string;
}

interface AssetMasterExcelImportPanelProps {
  entityCode: string;
}

export function AssetMasterExcelImportPanel({ entityCode }: AssetMasterExcelImportPanelProps) {
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [summary, setSummary] = useState<{ created: number; updated: number; invalid: number } | null>(null);

  const handleExcelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);
      processRows(json);
    };
    reader.readAsArrayBuffer(file);
  };

  const isValidITActBlock = (s: string): s is ITActBlock =>
    ['Building', 'Plant & Machinery', 'Computers & Software', 'Vehicles', 'Furniture & Fixtures', 'Intangibles', 'Others'].includes(s);

  const processRows = (json: Record<string, unknown>[]) => {
    // [JWT] Replace with POST /api/fa/asset-master-bulk-import
    const unitsKey = faUnitsKey(entityCode);
    const existingUnits: AssetUnitRecord[] = JSON.parse(localStorage.getItem(unitsKey) ?? '[]');
    const rows: ImportRow[] = [];
    let created = 0, updated = 0, invalid = 0;

    json.forEach((row, idx) => {
      const asset_id = String(row.asset_id ?? row['Asset ID'] ?? '').trim();
      const item_name = String(row.item_name ?? row['Item Name'] ?? '').trim();
      const gross_block_cost = parseFloat(String(row.gross_block_cost ?? row['Gross Block Cost'] ?? 0));
      const it_act_block = String(row.it_act_block ?? row['IT Act Block'] ?? '').trim();

      if (!asset_id || !item_name || !isValidITActBlock(it_act_block) || gross_block_cost <= 0) {
        rows.push({ rowIndex: idx + 2, asset_id, item_name, gross_block_cost, it_act_block, status: 'invalid', message: 'Invalid row · missing required fields or invalid IT Act block' });
        invalid++;
        return;
      }

      const existing = existingUnits.find((u) => u.asset_id === asset_id);
      const it_act_depr_rate = IT_ACT_RATES[it_act_block as ITActBlock];

      if (existing) {
        existing.item_name = item_name;
        existing.gross_block_cost = gross_block_cost;
        existing.it_act_block = it_act_block as ITActBlock;
        existing.it_act_depr_rate = it_act_depr_rate;
        existing.updated_at = new Date().toISOString();
        rows.push({ rowIndex: idx + 2, asset_id, item_name, gross_block_cost, it_act_block, status: 'updated', message: 'Updated existing asset' });
        updated++;
      } else {
        const newUnit: AssetUnitRecord = {
          id: `unit-${Date.now()}-${idx}`,
          entity_id: entityCode,
          item_id: `imported-${asset_id}`,
          item_name,
          ledger_definition_id: 'imported',
          ledger_name: 'Imported via Excel',
          asset_id,
          asset_id_prefix: asset_id.split('/')[0] ?? 'PPE',
          asset_id_suffix: asset_id.split('/')[1] ?? '',
          asset_id_seq: 0,
          gross_block_cost,
          salvage_value: 0,
          accumulated_depreciation: 0,
          net_book_value: gross_block_cost,
          opening_wdv: gross_block_cost,
          purchase_date: new Date().toISOString().split('T')[0],
          put_to_use_date: new Date().toISOString().split('T')[0],
          it_act_block: it_act_block as ITActBlock,
          it_act_depr_rate,
          location: 'TBD',
          department: 'TBD',
          custodian_name: '',
          status: 'active',
          capital_purchase_voucher_id: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        existingUnits.push(newUnit);
        rows.push({ rowIndex: idx + 2, asset_id, item_name, gross_block_cost, it_act_block, status: 'created', message: 'Created new asset' });
        created++;
      }
    });

    localStorage.setItem(unitsKey, JSON.stringify(existingUnits));
    setImportRows(rows);
    setSummary({ created, updated, invalid });
  };

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" />Asset Master Excel Import</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            <FileSpreadsheet className="h-4 w-4" />
            <AlertTitle>Excel format (XLSX)</AlertTitle>
            <AlertDescription>
              Columns: <code className="font-mono">asset_id, item_name, gross_block_cost, it_act_block</code>. Idempotent.
            </AlertDescription>
          </Alert>
          <div className="flex items-center gap-2">
            <Label htmlFor="xlsx-upload">Choose XLSX file</Label>
            <input id="xlsx-upload" type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="text-sm" />
          </div>
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardHeader><CardTitle>Import summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="rounded-lg border p-3"><div className="flex items-center gap-2 text-success"><CheckCircle2 className="h-4 w-4" />Created</div><div className="text-2xl font-bold">{summary.created}</div></div>
              <div className="rounded-lg border p-3"><div className="flex items-center gap-2 text-primary"><Upload className="h-4 w-4" />Updated</div><div className="text-2xl font-bold">{summary.updated}</div></div>
              <div className="rounded-lg border p-3"><div className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" />Invalid</div><div className="text-2xl font-bold">{summary.invalid}</div></div>
            </div>
          </CardContent>
        </Card>
      )}

      {importRows.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Import results ({importRows.length})</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Row</TableHead><TableHead>Asset ID</TableHead><TableHead>Item</TableHead><TableHead>Cost</TableHead><TableHead>Block</TableHead><TableHead>Status</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {importRows.map((row, idx) => (
                  <TableRow key={`${row.rowIndex}-${idx}`}>
                    <TableCell>{row.rowIndex}</TableCell>
                    <TableCell className="font-mono">{row.asset_id}</TableCell>
                    <TableCell>{row.item_name}</TableCell>
                    <TableCell>₹{row.gross_block_cost.toLocaleString('en-IN')}</TableCell>
                    <TableCell>{row.it_act_block}</TableCell>
                    <TableCell><span className="font-medium">{row.status}</span></TableCell>
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

export default AssetMasterExcelImportPanel;
