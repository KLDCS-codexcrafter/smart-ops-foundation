/**
 * SecondarySales.tsx — Distributor sell-through capture
 * Sprint 7. Distributor reports sales they made FROM their stock to retailers/sub-dealers.
 * No accounting impact — informs forecasting and trade promo schemes.
 * [JWT] GET /api/salesx/secondary-sales?entityCode={entityCode}
 * [JWT] POST /api/salesx/secondary-sales
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { Plus, Save, Trash2, X, ListTree } from 'lucide-react';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import {
  type SecondarySales, type SecondarySalesLine, type EndCustomerType,
  secondarySalesKey, END_CUSTOMER_LABELS,
} from '@/types/secondary-sales';
import { dMul, round2 } from '@/lib/decimal-helpers';

interface Props { entityCode: string }

interface CustomerLite {
  id: string;
  partyCode: string;
  partyName: string;
  customerType?: string;
}
interface ItemLite {
  id: string;
  itemCode: string;
  itemName: string;
  uom?: string;
  rate?: number;
}

const NOW = () => new Date().toISOString();
const todayISO = () => new Date().toISOString().slice(0, 10);
const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const formatINR = (n: number) => `₹${inrFmt.format(n)}`;

function loadSales(entityCode: string): SecondarySales[] {
  try {
    // [JWT] GET /api/salesx/secondary-sales
    const raw = localStorage.getItem(secondarySalesKey(entityCode));
    return raw ? (JSON.parse(raw) as SecondarySales[]) : [];
  } catch { return []; }
}
function saveSales(entityCode: string, list: SecondarySales[]): void {
  // [JWT] PATCH /api/salesx/secondary-sales
  localStorage.setItem(secondarySalesKey(entityCode), JSON.stringify(list));
}
function loadDistributors(): CustomerLite[] {
  try {
    const raw = localStorage.getItem('erp_group_customer_master');
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(c => ({
      id: c.id ?? c.partyCode,
      partyCode: c.partyCode,
      partyName: c.partyName,
      customerType: c.customerType,
    })) : [];
  } catch { return []; }
}
function loadItems(): ItemLite[] {
  try {
    const raw = localStorage.getItem('erp_inventory_items');
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(i => ({
      id: i.id ?? i.itemCode,
      itemCode: i.itemCode,
      itemName: i.itemName,
      uom: i.uom ?? i.baseUOM ?? 'Nos',
      rate: i.standardRate ?? i.salesRate ?? 0,
    })) : [];
  } catch { return []; }
}

function nextSecondaryCode(existing: SecondarySales[]): string {
  const today = new Date();
  const fyStart = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  const fy = `${String(fyStart).slice(2)}-${String(fyStart + 1).slice(2)}`;
  const prefix = `SEC/${fy}/`;
  const nums = existing
    .filter(s => s.secondary_code.startsWith(prefix))
    .map(s => parseInt(s.secondary_code.split('/').pop() || '0', 10))
    .filter(n => !isNaN(n));
  const next = (nums.length > 0 ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

interface FormState {
  sale_date: string;
  distributor_id: string;
  end_customer_type: EndCustomerType;
  end_customer_name: string;
  end_customer_code: string;
  notes: string;
  lines: SecondarySalesLine[];
  editingId: string | null;
}

const BLANK: FormState = {
  sale_date: todayISO(),
  distributor_id: '',
  end_customer_type: 'retailer',
  end_customer_name: '',
  end_customer_code: '',
  notes: '',
  lines: [],
  editingId: null,
};

export function SecondarySalesPanel({ entityCode }: Props) {
  const [sales, setSales] = useState<SecondarySales[]>(() => loadSales(entityCode));
  const [distributors, setDistributors] = useState<CustomerLite[]>(() => loadDistributors());
  const [items, setItems] = useState<ItemLite[]>(() => loadItems());
  const [form, setForm] = useState<FormState>(BLANK);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    setSales(loadSales(entityCode));
    setDistributors(loadDistributors());
    setItems(loadItems());
  }, [entityCode]);

  const totalAmount = useMemo(
    () => form.lines.reduce((sum, l) => sum + l.amount, 0),
    [form.lines],
  );

  const addLine = useCallback(() => {
    const newLine: SecondarySalesLine = {
      id: `sl-${Date.now()}`,
      item_code: '',
      item_name: '',
      qty: 1,
      uom: 'Nos',
      rate: 0,
      amount: 0,
    };
    setForm(f => ({ ...f, lines: [...f.lines, newLine] }));
  }, []);

  const updateLine = useCallback((id: string, patch: Partial<SecondarySalesLine>) => {
    setForm(f => ({
      ...f,
      lines: f.lines.map(l => {
        if (l.id !== id) return l;
        const updated = { ...l, ...patch };
        updated.amount = round2(dMul(updated.qty, updated.rate));
        return updated;
      }),
    }));
  }, []);

  const removeLine = useCallback((id: string) => {
    setForm(f => ({ ...f, lines: f.lines.filter(l => l.id !== id) }));
  }, []);

  const onPickItem = useCallback((lineId: string, itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    updateLine(lineId, {
      item_code: item.itemCode,
      item_name: item.itemName,
      uom: item.uom ?? 'Nos',
      rate: item.rate ?? 0,
    });
  }, [items, updateLine]);

  const handleSave = useCallback(() => {
    if (!form.distributor_id) { toast.error('Select distributor'); return; }
    if (form.lines.length === 0) { toast.error('Add at least one line'); return; }
    if (form.lines.some(l => !l.item_code || l.qty <= 0)) {
      toast.error('Each line needs an item and qty > 0'); return;
    }
    const dist = distributors.find(d => d.id === form.distributor_id);
    if (!dist) { toast.error('Distributor not found'); return; }

    const list = loadSales(entityCode);
    let next: SecondarySales[];
    if (form.editingId) {
      next = list.map(s => s.id === form.editingId ? {
        ...s,
        sale_date: form.sale_date,
        distributor_id: dist.id,
        distributor_name: dist.partyName,
        end_customer_type: form.end_customer_type,
        end_customer_name: form.end_customer_name || null,
        end_customer_code: form.end_customer_code || null,
        lines: form.lines,
        total_amount: totalAmount,
        notes: form.notes || null,
        updated_at: NOW(),
      } : s);
      toast.success('Updated');
    } else {
      const newRow: SecondarySales = {
        id: `ss-${Date.now()}`,
        entity_id: entityCode,
        secondary_code: nextSecondaryCode(list),
        sale_date: form.sale_date,
        distributor_id: dist.id,
        distributor_name: dist.partyName,
        end_customer_type: form.end_customer_type,
        end_customer_name: form.end_customer_name || null,
        end_customer_code: form.end_customer_code || null,
        lines: form.lines,
        total_amount: totalAmount,
        capture_mode: 'manual',
        api_request_id: null,
        notes: form.notes || null,
        created_at: NOW(),
        updated_at: NOW(),
      };
      next = [...list, newRow];
      toast.success(`Saved ${newRow.secondary_code}`);
    }
    saveSales(entityCode, next);
    setSales(next);
    setForm(BLANK);
    setShowForm(false);
  }, [form, totalAmount, distributors, entityCode]);

  const handleEdit = useCallback((s: SecondarySales) => {
    setForm({
      sale_date: s.sale_date,
      distributor_id: s.distributor_id,
      end_customer_type: s.end_customer_type,
      end_customer_name: s.end_customer_name ?? '',
      end_customer_code: s.end_customer_code ?? '',
      notes: s.notes ?? '',
      lines: s.lines,
      editingId: s.id,
    });
    setShowForm(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    if (!confirm('Delete this secondary sales record?')) return;
    const next = sales.filter(s => s.id !== id);
    saveSales(entityCode, next);
    setSales(next);
    toast.success('Deleted');
  }, [sales, entityCode]);

  useCtrlS(handleSave);

  return (
    <div className="space-y-4" data-keyboard-form>
      <Card className="border-orange-500/20">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ListTree className="h-4 w-4 text-orange-500" />
            Secondary Sales
          </CardTitle>
          {!showForm && (
            <Button
              size="sm"
              onClick={() => { setForm(BLANK); setShowForm(true); }}
              className="bg-orange-500 hover:bg-orange-600 text-white h-8"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> New Entry
            </Button>
          )}
        </CardHeader>

        {showForm && (
          <CardContent className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Sale Date</Label>
                <SmartDateInput
                  value={form.sale_date}
                  onChange={v => setForm(f => ({ ...f, sale_date: v }))}
                />
              </div>
              <div>
                <Label className="text-xs">Distributor</Label>
                <Select
                  value={form.distributor_id}
                  onValueChange={v => setForm(f => ({ ...f, distributor_id: v }))}
                >
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {distributors.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.partyName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">End Customer Type</Label>
                <Select
                  value={form.end_customer_type}
                  onValueChange={v => setForm(f => ({ ...f, end_customer_type: v as EndCustomerType }))}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(END_CUSTOMER_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">End Customer Name</Label>
                <Input
                  className="h-9"
                  value={form.end_customer_name}
                  onChange={e => setForm(f => ({ ...f, end_customer_name: e.target.value }))}
                  onKeyDown={onEnterNext}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="border rounded-lg">
              <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                <p className="text-xs font-semibold">Line Items</p>
                <Button size="sm" variant="ghost" onClick={addLine} className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Add Line
                </Button>
              </div>
              {form.lines.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-4">No lines added.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Item</TableHead>
                      <TableHead className="text-xs text-right">Qty</TableHead>
                      <TableHead className="text-xs">UOM</TableHead>
                      <TableHead className="text-xs text-right">Rate (₹)</TableHead>
                      <TableHead className="text-xs text-right">Amount (₹)</TableHead>
                      <TableHead className="text-xs w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.lines.map(l => (
                      <TableRow key={l.id}>
                        <TableCell className="py-1">
                          <Select value={items.find(i => i.itemCode === l.item_code)?.id ?? ''}
                            onValueChange={v => onPickItem(l.id, v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pick item" /></SelectTrigger>
                            <SelectContent className="max-h-72">
                              {items.map(i => (
                                <SelectItem key={i.id} value={i.id}>{i.itemName}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-1">
                          <Input
                            type="number"
                            className="h-8 text-xs text-right font-mono"
                            value={l.qty}
                            onChange={e => updateLine(l.id, { qty: Number(e.target.value) || 0 })}
                            onKeyDown={onEnterNext}
                          />
                        </TableCell>
                        <TableCell className="py-1 text-xs">{l.uom}</TableCell>
                        <TableCell className="py-1">
                          <Input
                            type="number"
                            className="h-8 text-xs text-right font-mono"
                            value={l.rate}
                            onChange={e => updateLine(l.id, { rate: Number(e.target.value) || 0 })}
                            onKeyDown={onEnterNext}
                          />
                        </TableCell>
                        <TableCell className="py-1 text-xs text-right font-mono">
                          {formatINR(l.amount)}
                        </TableCell>
                        <TableCell className="py-1">
                          <Button size="sm" variant="ghost" onClick={() => removeLine(l.id)} className="h-7 w-7 p-0">
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="flex justify-end px-3 py-2 border-t bg-muted/30">
                <p className="text-sm font-mono font-semibold">Total: {formatINR(totalAmount)}</p>
              </div>
            </div>

            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea
                className="text-xs"
                rows={2}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setForm(BLANK); setShowForm(false); }}>
                <X className="h-3.5 w-3.5 mr-1" /> Cancel
              </Button>
              <Button data-primary onClick={handleSave} className="bg-orange-500 hover:bg-orange-600 text-white">
                <Save className="h-3.5 w-3.5 mr-1" />
                {form.editingId ? 'Update' : 'Save'} (Ctrl+S)
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Secondary Sales History ({sales.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">No records yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Code</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Distributor</TableHead>
                  <TableHead className="text-xs">End Customer</TableHead>
                  <TableHead className="text-xs text-right">Lines</TableHead>
                  <TableHead className="text-xs text-right">Total (₹)</TableHead>
                  <TableHead className="text-xs w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.slice().sort((a, b) => b.sale_date.localeCompare(a.sale_date)).map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs font-mono">{s.secondary_code}</TableCell>
                    <TableCell className="text-xs font-mono">{s.sale_date}</TableCell>
                    <TableCell className="text-xs">{s.distributor_name}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className="text-[10px]">
                        {END_CUSTOMER_LABELS[s.end_customer_type]}
                      </Badge>
                      {s.end_customer_name && <span className="ml-2">{s.end_customer_name}</span>}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">{s.lines.length}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{formatINR(s.total_amount)}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(s)} className="h-7 text-[10px] px-2">
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(s.id)} className="h-7 w-7 p-0">
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SecondarySalesPanel;
