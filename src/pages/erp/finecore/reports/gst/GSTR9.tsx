/**
 * GSTR9.tsx — GSTR-9 Annual Return Panel
 * Full financial year aggregation. Editable cells. JSON download.
 * [JWT] All data from useGSTRegister
 */
import { useState, useMemo } from 'react';
import { FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useGSTRegister } from '@/hooks/useGSTRegister';
import { inr } from '../reportUtils';
import { buildGSTR9Payload } from '@/lib/gstPortalService';
import { onEnterNext } from '@/lib/keyboard';

interface GSTR9PanelProps { entityCode: string; }

function downloadJSON(filename: string, data: object) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function GSTR9Panel({ entityCode }: GSTR9PanelProps) {
  const now = new Date();
  const currentFY = now.getMonth() >= 3 ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(2)}` : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(2)}`;
  const [fy, setFy] = useState(currentFY);
  const fyOptions = ['2023-24', '2024-25', '2025-26', '2026-27'];

  const { entries } = useGSTRegister(entityCode);

  // [JWT] GET /api/accounting/gst-entity-config
  const gstin = (() => { try { const c = JSON.parse(localStorage.getItem('erp_gst_entity_config') || '{}'); return c.gstin || ''; } catch { return ''; } })();

  const [startYear] = fy.split('-').map(s => parseInt(s.length === 2 ? `20${s}` : s));
  const fyStart = `${startYear}-04-01`;
  const fyEnd = `${startYear + 1}-03-31`;
  const fyEntries = useMemo(() => entries.filter(e => !e.is_cancelled && e.date >= fyStart && e.date <= fyEnd), [entries, fyStart, fyEnd]);

  const outward = fyEntries.filter(e => ['Sales', 'Credit Note', 'Debit Note'].includes(e.base_voucher_type));
  const inward = fyEntries.filter(e => e.base_voucher_type === 'Purchase');

  const sumFields = (arr: typeof fyEntries) => ({
    txval: arr.reduce((s, e) => s + e.taxable_value, 0),
    igst: arr.reduce((s, e) => s + e.igst_amount, 0),
    cgst: arr.reduce((s, e) => s + e.cgst_amount, 0),
    sgst: arr.reduce((s, e) => s + e.sgst_amount, 0),
    cess: arr.reduce((s, e) => s + e.cess_amount, 0),
  });

  const tbl4 = sumFields(outward.filter(e => ['B2B', 'B2C'].includes(e.supply_type)));
  const tbl5 = sumFields(outward.filter(e => ['EXP_WP', 'EXP_WOP', 'SEZWP', 'SEZWOP'].includes(e.supply_type)));
  const tbl6 = sumFields(inward.filter(e => e.itc_eligible));
  const tbl7 = { igst: inward.reduce((s, e) => s + (e.itc_reversal ?? 0), 0), cgst: 0, sgst: 0, cess: 0 };
  const tbl9pay = sumFields(outward);
  const tbl9itc = sumFields(inward.filter(e => e.itc_eligible));

  // Editable overrides
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const getVal = (key: string, computed: number) => overrides[key] ?? computed;
  const setVal = (key: string, val: string) => {
    const n = parseFloat(val);
    if (!isNaN(n)) setOverrides(prev => ({ ...prev, [key]: n }));
  };

  const handleDownload = () => {
    if (!gstin) { toast.error('GSTIN not configured'); return; }
    const payload = buildGSTR9Payload(gstin, fy, entries);
    downloadJSON(`GSTR9_${gstin}_${fy}.json`, payload);
    toast.success('GSTR-9 JSON downloaded');
  };

  const renderEditableRow = (label: string, section: string, vals: { txval?: number; igst: number; cgst: number; sgst: number; cess: number }) => (
    <TableRow key={section}>
      <TableCell className="text-xs">{section}</TableCell>
      <TableCell className="text-xs">{label}</TableCell>
      {vals.txval !== undefined ? (
        <TableCell><Input type="number" className="h-7 text-xs font-mono w-28 text-right" value={getVal(`${section}-txval`, vals.txval)} onChange={e => setVal(`${section}-txval`, e.target.value)} onKeyDown={onEnterNext} /></TableCell>
      ) : <TableCell />}
      <TableCell><Input type="number" className="h-7 text-xs font-mono w-24 text-right" value={getVal(`${section}-igst`, vals.igst)} onChange={e => setVal(`${section}-igst`, e.target.value)} onKeyDown={onEnterNext} /></TableCell>
      <TableCell><Input type="number" className="h-7 text-xs font-mono w-24 text-right" value={getVal(`${section}-cgst`, vals.cgst)} onChange={e => setVal(`${section}-cgst`, e.target.value)} onKeyDown={onEnterNext} /></TableCell>
      <TableCell><Input type="number" className="h-7 text-xs font-mono w-24 text-right" value={getVal(`${section}-sgst`, vals.sgst)} onChange={e => setVal(`${section}-sgst`, e.target.value)} onKeyDown={onEnterNext} /></TableCell>
      <TableCell><Input type="number" className="h-7 text-xs font-mono w-24 text-right" value={getVal(`${section}-cess`, vals.cess)} onChange={e => setVal(`${section}-cess`, e.target.value)} onKeyDown={onEnterNext} /></TableCell>
    </TableRow>
  );

  return (
    <div data-keyboard-form className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><FileText className="h-5 w-5 text-teal-500" /> GSTR-9 Annual Return</h2>
          <p className="text-xs text-muted-foreground">Consolidated annual return — editable cells</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={fy} onValueChange={setFy}>
            <SelectTrigger className="w-28 h-8 text-xs" onKeyDown={onEnterNext}><SelectValue /></SelectTrigger>
            <SelectContent>{fyOptions.map(f => <SelectItem key={f} value={f}>FY {f}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" data-primary onClick={handleDownload}><Download className="h-3.5 w-3.5 mr-1" />Download JSON</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Entries</p><p className="text-2xl font-bold">{fyEntries.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Outward Taxable</p><p className="text-2xl font-bold font-mono">{inr(tbl4.txval)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">ITC Claimed</p><p className="text-2xl font-bold font-mono">{inr(tbl6.igst + tbl6.cgst + tbl6.sgst)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">ITC Reversed</p><p className="text-2xl font-bold font-mono">{inr(tbl7.igst)}</p></CardContent></Card>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Table</TableHead><TableHead>Description</TableHead>
            <TableHead className="text-right">Taxable</TableHead><TableHead className="text-right">IGST</TableHead>
            <TableHead className="text-right">CGST</TableHead><TableHead className="text-right">SGST</TableHead><TableHead className="text-right">Cess</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {renderEditableRow('Outward supplies (B2B + B2C)', '4A', tbl4)}
          {renderEditableRow('Zero-rated + exports + SEZ', '5A', tbl5)}
          {renderEditableRow('ITC claimed as per GSTR-3B', '6A', tbl6)}
          {renderEditableRow('ITC reversed', '7A', { txval: 0, ...tbl7 })}
          {renderEditableRow('Tax paid as declared', '9', tbl9pay)}
          {renderEditableRow('ITC utilised', '9-ITC', tbl9itc)}
        </TableBody>
      </Table>
    </div>
  );
}

export default function GSTR9() { return <GSTR9Panel entityCode="SMRT" />; }
