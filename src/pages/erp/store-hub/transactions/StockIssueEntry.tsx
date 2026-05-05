/**
 * StockIssueEntry.tsx — Card #7 Block F · D-381
 * Sprint T-Phase-1.2.6f-d-2-card7-7-pre-1
 *
 * Stock Issue entry form: Department + Recipient + Lines table.
 * Save Draft + Submit & Post (createStockIssue → postStockIssue → Stock Journal).
 * Matches Card #6 InwardReceiptEntry pattern.
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Send, Save, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { createStockIssue, postStockIssue } from '@/lib/stock-issue-engine';
import type { StoreHubModule } from '../StoreHubSidebar';

interface LineDraft {
  key: string;
  item_id: string;
  item_code: string;
  item_name: string;
  uom: string;
  qty: number;
  rate: number;
  source_godown_id: string;
  source_godown_name: string;
  batch_no: string;
  remarks: string;
}

function emptyLine(): LineDraft {
  return {
    key: `sil-draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    item_id: '', item_code: '', item_name: '', uom: 'NOS',
    qty: 0, rate: 0,
    source_godown_id: 'gd-stores', source_godown_name: 'Main Stores',
    batch_no: '', remarks: '',
  };
}

interface Props {
  onModuleChange: (m: StoreHubModule) => void;
}

export function StockIssueEntryPanel({ onModuleChange }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const [department, setDepartment] = useState('');
  const [recipient, setRecipient] = useState('');
  const [purpose, setPurpose] = useState('');
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [busy, setBusy] = useState(false);

  const updateLine = (idx: number, patch: Partial<LineDraft>) => {
    setLines(prev => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };
  const addLine = () => setLines(prev => [...prev, emptyLine()]);
  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));

  const total = lines.reduce((s, l) => s + l.qty * l.rate, 0);

  const validate = (): string | null => {
    if (!department.trim()) return 'Department is required';
    if (!recipient.trim()) return 'Recipient is required';
    if (!lines.length) return 'At least one line is required';
    for (const l of lines) {
      if (!l.item_name.trim()) return 'All lines need an item name';
      if (l.qty <= 0) return 'Line qty must be greater than zero';
    }
    return null;
  };

  async function handleSaveDraft() {
    const err = validate();
    if (err) { toast.error(err); return; }
    setBusy(true);
    try {
      const si = await createStockIssue({
        entity_id: entityCode,
        department_name: department,
        recipient_name: recipient,
        purpose: purpose || 'Department issue',
        narration,
        lines: lines.map(l => ({
          item_id: l.item_id || l.item_code || l.item_name,
          item_code: l.item_code || l.item_name,
          item_name: l.item_name,
          uom: l.uom, qty: l.qty, rate: l.rate,
          source_godown_id: l.source_godown_id,
          source_godown_name: l.source_godown_name,
          batch_no: l.batch_no || null,
          remarks: l.remarks,
        })),
      }, entityCode, 'u-store-1');
      toast.success(`Draft saved · ${si.issue_no}`);
      onModuleChange('sh-t-stock-issue-register');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save draft');
    } finally { setBusy(false); }
  }

  async function handleSubmitPost() {
    const err = validate();
    if (err) { toast.error(err); return; }
    setBusy(true);
    try {
      const si = await createStockIssue({
        entity_id: entityCode,
        department_name: department,
        recipient_name: recipient,
        purpose: purpose || 'Department issue',
        narration,
        lines: lines.map(l => ({
          item_id: l.item_id || l.item_code || l.item_name,
          item_code: l.item_code || l.item_name,
          item_name: l.item_name,
          uom: l.uom, qty: l.qty, rate: l.rate,
          source_godown_id: l.source_godown_id,
          source_godown_name: l.source_godown_name,
          batch_no: l.batch_no || null,
          remarks: l.remarks,
        })),
      }, entityCode, 'u-store-1');
      const posted = await postStockIssue(si.id, entityCode, 'u-store-1');
      toast.success(`Issued · ${posted?.issue_no} · Stock Journal posted`);
      onModuleChange('sh-t-stock-issue-register');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to post stock issue');
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="h-5 w-5 text-indigo-600" /> Stock Issue Entry
        </h1>
        <p className="text-sm text-muted-foreground">
          Release stock from Stores to a department · posts a Stock Journal voucher
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recipient</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="dept">Department *</Label>
            <Input id="dept" value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Production" />
          </div>
          <div>
            <Label htmlFor="rec">Recipient *</Label>
            <Input id="rec" value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="Person name" />
          </div>
          <div>
            <Label htmlFor="purp">Purpose</Label>
            <Input id="purp" value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g. Job ABC-101" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Items ({lines.length})</CardTitle>
          <Button size="sm" variant="outline" onClick={addLine}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Line
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="text-[10px]">
                <TableHead className="w-8">#</TableHead>
                <TableHead className="min-w-[160px]">Item</TableHead>
                <TableHead className="w-20">UOM</TableHead>
                <TableHead className="w-20">Qty</TableHead>
                <TableHead className="w-24">Rate</TableHead>
                <TableHead className="w-24 text-right">Value</TableHead>
                <TableHead className="w-28">Batch</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l, idx) => (
                <TableRow key={l.key} className="text-xs">
                  <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell>
                    <Input value={l.item_name} onChange={e => updateLine(idx, { item_name: e.target.value })}
                      className="h-7 text-xs" placeholder="Item name" />
                  </TableCell>
                  <TableCell>
                    <Input value={l.uom} onChange={e => updateLine(idx, { uom: e.target.value })}
                      className="h-7 text-xs w-20" />
                  </TableCell>
                  <TableCell>
                    <Input type="number" value={l.qty || ''} onChange={e => updateLine(idx, { qty: Number(e.target.value) })}
                      className="h-7 text-xs w-20" />
                  </TableCell>
                  <TableCell>
                    <Input type="number" value={l.rate || ''} onChange={e => updateLine(idx, { rate: Number(e.target.value) })}
                      className="h-7 text-xs w-24" />
                  </TableCell>
                  <TableCell className="font-mono text-right">
                    ₹{(l.qty * l.rate).toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell>
                    <Input value={l.batch_no} onChange={e => updateLine(idx, { batch_no: e.target.value })}
                      className="h-7 text-xs w-28" />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeLine(idx)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end mt-3">
            <span className="text-sm font-mono">Total: ₹{total.toLocaleString('en-IN')}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Narration</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={narration} onChange={e => setNarration(e.target.value)} rows={2}
            placeholder="Optional notes about this issue" />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled={busy} onClick={handleSaveDraft}>
          <Save className="h-3.5 w-3.5 mr-1" /> Save Draft
        </Button>
        <Button disabled={busy} onClick={handleSubmitPost} className="bg-indigo-600 hover:bg-indigo-700">
          <Send className="h-3.5 w-3.5 mr-1" /> Submit &amp; Post
        </Button>
      </div>
    </div>
  );
}

export default StockIssueEntryPanel;
