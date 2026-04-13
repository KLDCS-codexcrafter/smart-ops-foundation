/**
 * CurrencyMaster.tsx — CUR-1 Currency Master
 * Full CRUD for multi-currency configuration.
 * [JWT] All persistence via localStorage — see useCurrencies hook
 */
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft, Plus, Search, Star, ToggleLeft, Trash2, Edit3, Coins,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCurrencies } from '@/hooks/useCurrencies';
import type { Currency } from '@/types/currency';

// ── Panel (for Command Center) ──────────────────────────────────────────────
export function CurrencyMasterPanel() {
  return <CurrencyMasterContent />;
}

// ── Standalone route ────────────────────────────────────────────────────────
export default function CurrencyMaster() {
  const navigate = useNavigate();
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background w-full">
        <ERPHeader
          breadcrumbs={[
            { label: 'Operix Core', href: '/erp/dashboard' },
            { label: 'Accounting', href: '/erp/accounting' },
            { label: 'Currency Master' },
          ]}
          showDatePicker={false}
          showCompany={false}
        />
        <main className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate('/erp/accounting')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Currency Master</h1>
              <p className="text-sm text-muted-foreground">Manage currencies, exchange rates and formatting</p>
            </div>
          </div>
          <CurrencyMasterContent />
        </main>
      </div>
    </SidebarProvider>
  );
}

// ── Blank form ──────────────────────────────────────────────────────────────
type CurrencyForm = Omit<Currency, 'id' | 'created_at' | 'updated_at'>;

const blankForm: CurrencyForm = {
  iso_code: '',
  name: '',
  symbol: '',
  decimal_places: 2,
  decimal_symbol: '.',
  thousand_separator: ',',
  symbol_position: 'before',
  is_base_currency: false,
  is_active: true,
  exchange_rate: 1,
  rate_date: new Date().toISOString().slice(0, 10),
  notes: '',
};

// ── Content ─────────────────────────────────────────────────────────────────
function CurrencyMasterContent() {
  const { currencies, stats, updateCurrency, addCurrency, deleteCurrency, setBaseCurrency, toggleActive } = useCurrencies();
  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Currency | null>(null);
  const [form, setForm] = useState<CurrencyForm>(blankForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = currencies.filter(c =>
    !search || c.iso_code.toLowerCase().includes(search.toLowerCase()) || c.name.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = useCallback(() => {
    setEditTarget(null);
    setForm(blankForm);
    setSheetOpen(true);
  }, []);

  const openEdit = useCallback((c: Currency) => {
    setEditTarget(c);
    setForm({
      iso_code: c.iso_code,
      name: c.name,
      symbol: c.symbol,
      decimal_places: c.decimal_places,
      decimal_symbol: c.decimal_symbol,
      thousand_separator: c.thousand_separator,
      symbol_position: c.symbol_position,
      is_base_currency: c.is_base_currency,
      is_active: c.is_active,
      exchange_rate: c.exchange_rate,
      rate_date: c.rate_date,
      notes: c.notes,
    });
    setSheetOpen(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!form.iso_code.trim()) return toast.error('ISO code is required');
    if (!form.name.trim()) return toast.error('Currency name is required');
    if (!form.symbol.trim()) return toast.error('Symbol is required');
    if (form.iso_code.length < 3) return toast.error('ISO code must be 3 characters');

    if (editTarget) {
      updateCurrency(editTarget.id, form);
      toast.success(`${form.iso_code} updated`);
    } else {
      // Check duplicate
      if (currencies.some(c => c.iso_code.toUpperCase() === form.iso_code.toUpperCase())) {
        return toast.error(`Currency ${form.iso_code} already exists`);
      }
      addCurrency({ ...form, iso_code: form.iso_code.toUpperCase() });
      toast.success(`${form.iso_code.toUpperCase()} added`);
    }
    setSheetOpen(false);
  }, [form, editTarget, currencies, updateCurrency, addCurrency]);

  const confirmDelete = useCallback(() => {
    if (!deleteId) return;
    const ok = deleteCurrency(deleteId);
    if (ok) toast.success('Currency deleted');
    else toast.error('Cannot delete base currency');
    setDeleteId(null);
  }, [deleteId, deleteCurrency]);

  const formatPreview = (f: CurrencyForm) => {
    const num = 12345.67;
    const [intPart, decPart] = num.toFixed(f.decimal_places).split('.');
    const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, f.thousand_separator);
    const full = f.decimal_places > 0 ? `${formatted}${f.decimal_symbol}${decPart}` : formatted;
    return f.symbol_position === 'before' ? `${f.symbol}${full}` : `${full} ${f.symbol}`;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total },
          { label: 'Active', value: stats.active },
          { label: 'Inactive', value: stats.inactive },
          { label: 'Base', value: stats.base?.iso_code || '—' },
        ].map(s => (
          <div key={s.label} className="rounded-xl bg-card/60 backdrop-blur-xl border border-border p-4 text-center">
            <p className="text-2xl font-bold text-foreground font-mono">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 text-xs" placeholder="Search currencies..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add Currency</Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="w-20">Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-16">Symbol</TableHead>
              <TableHead className="w-28 text-right">Rate</TableHead>
              <TableHead className="w-28">Preview</TableHead>
              <TableHead className="w-20 text-center">Status</TableHead>
              <TableHead className="w-28 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(c => (
              <TableRow key={c.id} className="text-xs">
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-semibold">{c.iso_code}</span>
                    {c.is_base_currency && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                  </div>
                </TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell className="font-mono">{c.symbol}</TableCell>
                <TableCell className="text-right font-mono">
                  {c.is_base_currency ? '1.0000' : c.exchange_rate.toFixed(4)}
                </TableCell>
                <TableCell className="font-mono text-muted-foreground">
                  {formatPreview({
                    ...blankForm,
                    symbol: c.symbol,
                    decimal_places: c.decimal_places,
                    decimal_symbol: c.decimal_symbol,
                    thousand_separator: c.thousand_separator,
                    symbol_position: c.symbol_position,
                  })}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={`text-[10px] ${c.is_active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground'}`}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    {!c.is_base_currency && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleActive(c.id)}>
                          <ToggleLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(c.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    {!c.is_base_currency && c.is_active && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" title="Set as base" onClick={() => {
                        setBaseCurrency(c.id);
                        toast.success(`${c.iso_code} is now the base currency`);
                      }}>
                        <Star className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  <Coins className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No currencies found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editTarget ? `Edit ${editTarget.iso_code}` : 'Add Currency'}</SheetTitle>
            <SheetDescription>
              {editTarget ? 'Update currency details and formatting' : 'Add a new currency to the system'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 mt-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">ISO Code <span className="text-destructive">*</span></Label>
                <Input
                  className="text-xs font-mono uppercase"
                  maxLength={3}
                  value={form.iso_code}
                  onChange={e => setForm(f => ({ ...f, iso_code: e.target.value.toUpperCase().slice(0, 3) }))}
                  placeholder="e.g. INR"
                  disabled={!!editTarget}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Symbol <span className="text-destructive">*</span></Label>
                <Input className="text-xs" value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))} placeholder="e.g. ₹" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Currency Name <span className="text-destructive">*</span></Label>
              <Input className="text-xs" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Indian Rupee" />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Exchange Rate</Label>
                <Input
                  className="text-xs font-mono"
                  type="number"
                  step="0.0001"
                  value={form.exchange_rate}
                  onChange={e => setForm(f => ({ ...f, exchange_rate: parseFloat(e.target.value) || 0 }))}
                  disabled={form.is_base_currency}
                />
                <p className="text-[10px] text-muted-foreground">1 {form.iso_code || 'FCY'} = {form.exchange_rate} {stats.base?.iso_code || 'INR'}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Rate Date</Label>
                <Input className="text-xs" type="date" value={form.rate_date} onChange={e => setForm(f => ({ ...f, rate_date: e.target.value }))} />
              </div>
            </div>

            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Number Formatting</p>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Decimals</Label>
                <Select value={String(form.decimal_places)} onValueChange={v => setForm(f => ({ ...f, decimal_places: parseInt(v) }))}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Dec. Symbol</Label>
                <Select value={form.decimal_symbol} onValueChange={v => setForm(f => ({ ...f, decimal_symbol: v as '.' | ',' }))}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value=".">. (dot)</SelectItem>
                    <SelectItem value=",">, (comma)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Thousands</Label>
                <Select value={form.thousand_separator} onValueChange={v => setForm(f => ({ ...f, thousand_separator: v as ',' | '.' | ' ' | '' }))}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value=",">, (comma)</SelectItem>
                    <SelectItem value=".">. (dot)</SelectItem>
                    <SelectItem value=" ">(space)</SelectItem>
                    <SelectItem value="">(none)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Symbol Position</Label>
              <Select value={form.symbol_position} onValueChange={v => setForm(f => ({ ...f, symbol_position: v as 'before' | 'after' }))}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="before">Before amount ({form.symbol}100)</SelectItem>
                  <SelectItem value="after">After amount (100 {form.symbol})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Live preview */}
            <div className="rounded-lg border bg-muted/30 p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Preview</p>
              <p className="text-lg font-mono font-semibold">{formatPreview(form)}</p>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Notes</Label>
              <Input className="text-xs" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} disabled={form.is_base_currency} />
              <span className="text-xs text-muted-foreground">Active</span>
            </div>

            <div className="flex gap-2 pt-4">
              <Button className="flex-1" onClick={handleSave}>{editTarget ? 'Update' : 'Create'}</Button>
              <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Currency?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the currency. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
