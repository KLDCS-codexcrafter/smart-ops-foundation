/**
 * CurrencyMaster.tsx — CUR-1
 * Design: List-table + right-side Sheet (same pattern as VoucherTypesMaster)
 * Sheet has 2 sections: Identity + Rate of Exchange (date-wise sub-table)
 * Base currency row: read-only identity, no delete, no toggle
 * Foreign currencies: full CRUD
 * Rate of Exchange: Tally model — date-wise selling/buying/standard per currency
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { onEnterNext } from '@/lib/keyboard';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Lock, Plus, Trash2, Edit2, ChevronDown, Search,
  RefreshCw, Info, TrendingUp, X, DollarSign,
  ArrowUpRight, ArrowDownLeft, Download, Loader2,
} from 'lucide-react';
import { useCurrencies } from '@/hooks/useCurrencies';
import type { Currency, ForexRate } from '@/types/currency';
import { searchWorldCurrencies, getWorldCurrency, type WorldCurrencyEntry } from '@/data/world-currencies';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';

// ── Blank forms ───────────────────────────────────────────────────────────────

const BLANK_CURRENCY = {
  iso_code: '', name: '', formal_name: '', symbol: '',
  decimal_places: 2, symbol_before_amount: true, space_between: false,
  show_in_millions: false, is_base_currency: false, is_active: true, entity_id: null,
};

const BLANK_RATE = {
  applicable_from: format(new Date(), 'yyyy-MM-dd'),
  selling_rate: null as number | null,
  buying_rate: null as number | null,
  standard_rate: null as number | null,
  last_voucher_rate: null as number | null,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRate(v: number | null): string {
  if (v === null) return '—';
  return v.toLocaleString('en-IN', { maximumFractionDigits: 4 });
}

function RateInput({ label, value, onChange, hint }: {
  label: string; value: number | null; onChange: (v: number | null) => void; hint?: string;
}) {
  return (
    <div data-keyboard-form className="space-y-1">
      <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</Label>
      <Input
        type="number" step="0.0001" min="0"
        value={value ?? ''}
        onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className="h-8 text-sm font-mono"
        placeholder="0.0000"
      />
      {hint && <p className="text-[10px] text-muted-foreground/60">{hint}</p>}
    </div>
  );
}

// ── Rate sub-screen (inside sheet) ────────────────────────────────────────────

function RateSubScreen({
  currencyId, currencyName, isoCode, baseCurrencySymbol,
  rates, onAdd, onUpdate, onDelete,
}: {
  currencyId: string; currencyName: string; isoCode: string; baseCurrencySymbol: string;
  rates: ForexRate[];
  onAdd: (r: Omit<ForexRate, 'id' | 'created_at'>) => void;
  onUpdate: (id: string, patch: Partial<ForexRate>) => void;
  onDelete: (id: string) => void;
}) {
  const [newRate, setNewRate] = useState({ ...BLANK_RATE });
  const [addDate, setAddDate] = useState<Date>(new Date());
  const [editId, setEditId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [ecbMeta, setEcbMeta] = useState<{ date: string } | null>(null);

  const fetchEcbRate = async () => {
    setFetching(true);
    try {
      // [JWT] GET /api/foundation/parent-company/base-currency
      const base = localStorage.getItem('erp_base_currency') || 'INR';
      // [JWT] GET /api/forex/live-rate — future; using ECB via Frankfurter for now
      const res = await fetch(
        `https://api.frankfurter.app/latest?from=${base}&to=${isoCode}`
      );
      const data = await res.json();
      const foreignPerBase = data.rates[isoCode];
      if (!foreignPerBase) { toast.error('Currency not available from ECB'); return; }
      const basePerForeign = parseFloat((1 / foreignPerBase).toFixed(4));
      setNewRate(r => ({ ...r, standard_rate: basePerForeign }));
      setEcbMeta({ date: data.date });
      toast.success(`ECB rate fetched: ${basePerForeign}`);
    } catch {
      toast.error('Could not fetch rate — enter manually');
    } finally {
      setFetching(false);
    }
  };

  const handleAdd = () => {
    if (!newRate.selling_rate && !newRate.buying_rate && !newRate.standard_rate) {
      toast.error('Enter at least one rate (selling, buying, or standard)');
      return;
    }
    onAdd({
      currency_id: currencyId,
      applicable_from: format(addDate, 'yyyy-MM-dd'),
      selling_rate: newRate.selling_rate,
      buying_rate: newRate.buying_rate,
      standard_rate: newRate.standard_rate,
      last_voucher_rate: null,
    });
    setNewRate({ ...BLANK_RATE });
    toast.success('Rate added');
  };

  const sorted = [...rates].sort(
    (a, b) => new Date(b.applicable_from).getTime() - new Date(a.applicable_from).getTime()
  );

  return (
    <div data-keyboard-form className="space-y-3">
      {/* Context info */}
      <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 px-3 py-2 text-[11px]">
        <div className="flex items-center gap-2 mb-1.5">
          <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-foreground font-medium">Selling rate</span>
          <span className="text-muted-foreground">— rate you GET when receiving {isoCode} (export receipts)</span>
        </div>
        <div className="flex items-center gap-2">
          <ArrowDownLeft className="h-3.5 w-3.5 text-rose-500" />
          <span className="text-foreground font-medium">Buying rate</span>
          <span className="text-muted-foreground">— rate you PAY when sending {isoCode} (import payments)</span>
        </div>
      </div>

      {/* Add new rate row */}
      <div className="rounded-lg border border-border/50 bg-muted/10 p-3 space-y-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Add rate for date</p>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Applicable From</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="mt-1 h-8 w-full text-sm justify-start font-normal">
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {format(addDate, 'dd MMM yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={addDate} onSelect={d => d && setAddDate(d)} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <Button
            variant="outline" size="sm" className="h-8 text-[11px] gap-1.5 shrink-0"
            onClick={fetchEcbRate} disabled={fetching}
          >
            {fetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            ECB Rate
          </Button>
        </div>
        {ecbMeta && (
          <p className="text-[10px] text-muted-foreground/60">
            ECB reference date: {ecbMeta.date} — pre-filled standard rate only
          </p>
        )}
        <div className="grid grid-cols-3 gap-2">
          <RateInput
            label={`Selling (${baseCurrencySymbol})`}
            value={newRate.selling_rate}
            onChange={v => setNewRate(r => ({ ...r, selling_rate: v }))}
            hint="Export receipts"
          />
          <RateInput
            label={`Buying (${baseCurrencySymbol})`}
            value={newRate.buying_rate}
            onChange={v => setNewRate(r => ({ ...r, buying_rate: v }))}
            hint="Import payments"
          />
          <RateInput
            label="Standard"
            value={newRate.standard_rate}
            onChange={v => setNewRate(r => ({ ...r, standard_rate: v }))}
            hint="Variance ref"
          />
        </div>
        <Button size="sm" className="h-7 text-xs w-full" onClick={handleAdd}>
          <Plus className="h-3 w-3 mr-1" /> Add Rate
        </Button>
      </div>

      {/* Rate history table */}
      {sorted.length > 0 ? (
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border/50">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Selling</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Buying</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Standard</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Last Txn</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={r.id} className={cn(
                  'border-b border-border/30 last:border-0 hover:bg-muted/20',
                  i === 0 && 'bg-emerald-50/30 dark:bg-emerald-950/10'
                )}>
                  <td className="px-3 py-2 font-mono text-foreground">
                    {format(new Date(r.applicable_from), 'dd MMM yyyy')}
                    {i === 0 && <span className="ml-1.5 text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">CURRENT</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-700 dark:text-emerald-400">
                    {formatRate(r.selling_rate)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-rose-700 dark:text-rose-400">
                    {formatRate(r.buying_rate)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                    {formatRate(r.standard_rate)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground text-[10px]">
                    {r.last_voucher_rate !== null ? formatRate(r.last_voucher_rate) : '—'}
                  </td>
                  <td className="px-2 py-2">
                    {r.last_voucher_rate === null && (
                      <button
                        onClick={() => onDelete(r.id)}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-6">
          <TrendingUp className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-[12px] text-muted-foreground">No rates defined yet</p>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">Add a rate above to use this currency in transactions</p>
        </div>
      )}
    </div>
  );

}

// ── Currency Sheet ────────────────────────────────────────────────────────────

function CurrencySheet({
  open, onOpenChange, editCurrency,
  onSave, rates, onAddRate, onUpdateRate, onDeleteRate, baseCurrencySymbol,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  editCurrency: Currency | null;
  onSave: (form: typeof BLANK_CURRENCY) => void;
  rates: ForexRate[];
  onAddRate: (r: Omit<ForexRate, 'id' | 'created_at'>) => void;
  onUpdateRate: (id: string, p: Partial<ForexRate>) => void;
  onDeleteRate: (id: string) => void;
  baseCurrencySymbol: string;
}) {
  const isEdit = !!editCurrency;
  const isBase = isEdit && editCurrency!.is_base_currency;

  const initForm = useCallback(() =>
    editCurrency ? {
      iso_code: editCurrency.iso_code,
      name: editCurrency.name,
      formal_name: editCurrency.formal_name,
      symbol: editCurrency.symbol,
      decimal_places: editCurrency.decimal_places,
      symbol_before_amount: editCurrency.symbol_before_amount,
      space_between: editCurrency.space_between,
      show_in_millions: editCurrency.show_in_millions,
      is_base_currency: editCurrency.is_base_currency,
      is_active: editCurrency.is_active,
      entity_id: editCurrency.entity_id,
    } : { ...BLANK_CURRENCY },
  [editCurrency]);

  const [form, setForm] = useState(initForm);
  const upd = (p: Partial<typeof BLANK_CURRENCY>) => setForm(f => ({ ...f, ...p }));
  const [isoQuery, setIsoQuery] = useState('');
  const [isoOpen, setIsoOpen] = useState(false);

  // Autofill from world currency catalog when ISO is selected
  const applyWorldCurrency = (entry: WorldCurrencyEntry) => {
    upd({
      iso_code: entry.iso_code,
      name: entry.name,
      formal_name: entry.name,
      symbol: entry.symbol,
      decimal_places: entry.decimal_places,
      symbol_before_amount: entry.symbol_before_amount,
      space_between: entry.space_between,
    });
    setIsoQuery('');
    setIsoOpen(false);
  };

  useEffect(() => {
    if (open) setForm(initForm());
  }, [open, initForm]);

  // Live preview
  const sampleAmount = 1000;
  const preview = (() => {
    const sym = form.symbol || '?';
    const num = sampleAmount.toFixed(form.decimal_places);
    const spaced = form.space_between ? ' ' : '';
    return form.symbol_before_amount
      ? `${sym}${spaced}${num}`
      : `${num}${spaced}${sym}`;
  })();

  const save = () => {
    if (!form.iso_code.trim()) { toast.error('ISO code is required'); return; }
    if (!form.name.trim()) { toast.error('Currency name is required'); return; }
    if (!form.symbol.trim()) { toast.error('Symbol is required'); return; }
    onSave(form);
    onOpenChange(false);
  };

  const currencyRates = isEdit ? rates.filter(r => r.currency_id === editCurrency!.id) : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[460px] p-0 flex flex-col overflow-hidden">
        <SheetHeader className="px-5 py-4 border-b border-border/50 shrink-0">
          <SheetTitle className="text-[15px]">
            {isBase ? 'Base Currency' : isEdit ? `Edit — ${editCurrency!.name}` : 'New Currency'}
          </SheetTitle>
          <SheetDescription className="text-[12px]">
            {isBase ? 'Base currency identity. Rate of exchange not applicable.' : isEdit ? 'Edit currency settings and rates of exchange.' : 'Define a foreign currency for multi-currency transactions.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* IDENTITY */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-2 w-full group py-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex-1 text-left">Identity</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50 transition-transform group-data-[state=closed]:-rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">
                    ISO Code <span className="text-destructive">*</span>
                  </Label>
                  {isBase ? (
                    <div className="mt-1 h-8 flex items-center gap-1.5 px-3 rounded-md border border-border bg-muted/50 text-sm font-mono text-muted-foreground">
                      <Lock className="h-3 w-3" /> {form.iso_code}
                    </div>
                  ) : (
                    <div className="relative mt-1">
                      <Input
                        value={isoQuery !== '' ? isoQuery : form.iso_code}
                        onChange={e => { setIsoQuery(e.target.value.toUpperCase().slice(0, 10)); setIsoOpen(true); }}
                        onFocus={() => setIsoOpen(true)}
                        placeholder="USD · Dollar · United States…"
                        className="h-8 text-sm font-mono"
                      />
                      {isoOpen && (
                        <>
                          <div className="absolute z-50 top-full left-0 mt-0.5 w-full max-h-56 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
                            {searchWorldCurrencies(isoQuery, 20).map(entry => (
                              <button key={entry.iso_code} type="button"
                                className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-muted/60 transition-colors text-[12px]"
                                onMouseDown={e => { e.preventDefault(); applyWorldCurrency(entry); }}>
                                <span className="text-base w-5 shrink-0">{entry.flag}</span>
                                <span className="font-mono font-bold w-10 shrink-0 text-foreground">{entry.iso_code}</span>
                                <span className="text-foreground flex-1">{entry.name}</span>
                                <span className="text-muted-foreground font-mono text-[11px] shrink-0">{entry.symbol}</span>
                              </button>
                            ))}
                            {searchWorldCurrencies(isoQuery, 20).length === 0 && (
                              <div className="px-3 py-2 text-[11px] text-muted-foreground">No match — type the 3-letter ISO code directly</div>
                            )}
                          </div>
                          <div className="fixed inset-0 z-40" onMouseDown={() => { setIsoOpen(false); setIsoQuery(''); }} />
                        </>
                      )}
                    </div>
                  )}
                  {form.iso_code && !isBase && (() => {
                    const w = getWorldCurrency(form.iso_code);
                    return w && w.countries.length > 0 ? (
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        Used in: {w.countries.slice(0, 3).join(', ')}{w.countries.length > 3 ? ` +${w.countries.length - 3} more` : ''}
                      </p>
                    ) : null;
                  })()}
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Symbol <span className="text-destructive">*</span></Label>
                  <Input
                    value={form.symbol}
                    onChange={e => upd({ symbol: e.target.value.slice(0, 5) })}
                    placeholder="$" maxLength={5}
                    className="mt-1 h-8 text-sm font-mono"
                    disabled={isBase}
                  />
                </div>
              </div>

              <div>
                <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Name <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={e => { upd({ name: e.target.value }); if (!isEdit) upd({ formal_name: e.target.value }); }}
                  placeholder="US Dollar" className="mt-1 h-8 text-sm" disabled={isBase} />
              </div>

              <div>
                <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Formal Name</Label>
                <Input value={form.formal_name} onChange={e => upd({ formal_name: e.target.value })}
                  placeholder="US Dollar" className="mt-1 h-8 text-sm" disabled={isBase} />
                <p className="text-[10px] text-muted-foreground/60 mt-1">Used in transaction screens and reports</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Decimals</Label>
                  <Input type="number" min={0} max={4} value={form.decimal_places}
                    onChange={e => upd({ decimal_places: Number(e.target.value) })}
                    className="mt-1 h-8 text-sm font-mono" disabled={isBase} />
                </div>
                <div className="col-span-2">
                  <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Preview</Label>
                  <div className="mt-1 h-8 flex items-center px-3 rounded-md border border-border bg-muted/30 text-sm font-mono text-foreground">
                    {preview}
                  </div>
                </div>
              </div>

              {!isBase && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                    <span className="text-[13px] text-foreground">Symbol before amount</span>
                    <Switch checked={form.symbol_before_amount} onCheckedChange={v => upd({ symbol_before_amount: v })} className="scale-75" />
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                    <span className="text-[13px] text-foreground">Space between symbol and amount</span>
                    <Switch checked={form.space_between} onCheckedChange={v => upd({ space_between: v })} className="scale-75" />
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px] text-foreground">Show amounts in millions</span>
                    <Switch checked={form.show_in_millions} onCheckedChange={v => upd({ show_in_millions: v })} className="scale-75" />
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* RATE OF EXCHANGE — only for foreign currencies in edit mode */}
          {!isBase && isEdit && (
            <>
              <Separator />
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center gap-2 w-full group py-1">
                  <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex-1 text-left">
                    Rates of Exchange
                    {currencyRates.length > 0 && (
                      <span className="ml-2 text-[10px] text-muted-foreground/60 normal-case">{currencyRates.length} rate{currencyRates.length !== 1 ? 's' : ''}</span>
                    )}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50 transition-transform group-data-[state=closed]:-rotate-90" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <RateSubScreen
                    currencyId={editCurrency!.id}
                    currencyName={editCurrency!.name}
                    isoCode={editCurrency!.iso_code}
                    baseCurrencySymbol={baseCurrencySymbol}
                    rates={currencyRates}
                    onAdd={onAddRate}
                    onUpdate={onUpdateRate}
                    onDelete={onDeleteRate}
                  />
                </CollapsibleContent>
              </Collapsible>
            </>
          )}

          {!isBase && !isEdit && (
            <div className="flex items-start gap-2 rounded-md border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20 px-3 py-2.5 text-[11px] text-blue-700 dark:text-blue-400">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              Save the currency first, then open Edit to add Rates of Exchange.
            </div>
          )}

        </div>

        {!isBase && (
          <div className="px-5 py-3 border-t border-border/50 flex gap-2 shrink-0">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button size="sm" className="flex-1 h-8 text-xs" onClick={save}>
              {isEdit ? 'Save Changes' : 'Create Currency'}
            </Button>
          </div>
        )}
        {isBase && (
          <div className="px-5 py-3 border-t border-border/50 shrink-0">
            <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export function CurrencyMasterPanel() {
  const {
    currencies, rates, stats, baseCurrency,
    createCurrency, updateCurrency, deleteCurrency, toggleActive,
    addRate, updateRate, deleteRate, getRatesForCurrency,
  } = useCurrencies();

  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editCurrency, setEditCurrency] = useState<Currency | null>(null);
  const [delTarget, setDelTarget] = useState<Currency | null>(null);

  const openNew = () => { setEditCurrency(null); setSheetOpen(true); };
  const openEdit = (c: Currency) => { setEditCurrency(c); setSheetOpen(true); };

  const handleSave = (form: typeof BLANK_CURRENCY) => {
    if (editCurrency) {
      updateCurrency(editCurrency.id, form);
    } else {
      createCurrency(form);
    }
  };

  const filtered = useMemo(() =>
    currencies.filter(c => {
      const q = search.toLowerCase();
      return !q || c.iso_code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.symbol.includes(q);
    }), [currencies, search]
  );

  const base = filtered.find(c => c.is_base_currency);
  const foreign = filtered.filter(c => !c.is_base_currency);

  const baseSym = baseCurrency?.symbol || '₹';

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background flex flex-col">
        <ERPHeader />
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Command strip */}
          <div className="border-b border-border/50 bg-card/60 backdrop-blur-sm px-6 py-3 shrink-0">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="shrink-0">
                <h1 className="text-[15px] font-semibold text-foreground">Currency Master</h1>
                <p className="text-[11px] text-muted-foreground">
                  {stats.total} total · {stats.foreign} foreign · {stats.withRates} with rates
                </p>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/40 border border-border/40">
                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Base:</span>
                  <span className="font-semibold text-foreground font-mono">{baseCurrency?.iso_code ?? '—'}</span>
                  <span className="text-muted-foreground">{baseCurrency?.symbol}</span>
                </div>
              </div>

              <div className="relative ml-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search currencies…" className="pl-8 h-8 text-xs w-44 bg-muted/30" />
              </div>

              <div className="flex-1" />
              <Button size="sm" className="h-8 text-xs gap-1.5 shrink-0" onClick={openNew}>
                <Plus className="h-3.5 w-3.5" /> New Currency
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-sm min-w-[700px]">
              <thead>
                <tr className="bg-muted/40 border-b border-border/50">
                  {['', 'Currency', 'ISO Code', 'Symbol', 'Decimals', 'Selling Rate', 'Buying Rate', 'Active', 'Actions'].map((h, i) => (
                    <th key={i} className={cn(
                      'px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground',
                      i === 0 ? 'w-7' : 'text-left',
                      i >= 7 ? 'text-right' : '',
                    )}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Base currency */}
                {base && (
                  <>
                    <tr>
                      <td colSpan={9} className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/20 border-b border-border/30">
                        Base currency — set in company governance · read-only
                      </td>
                    </tr>
                    <tr className="hover:bg-muted/20 transition-colors border-b border-border/30">
                      <td className="px-3 py-2.5"><Lock className="h-3 w-3 text-muted-foreground/30" /></td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-foreground">{base.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-medium">Base</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{base.formal_name}</p>
                      </td>
                      <td className="px-3 py-2.5"><span className="font-mono text-[12px] bg-muted px-1.5 py-0.5 rounded">{base.iso_code}</span></td>
                      <td className="px-3 py-2.5 font-mono text-sm">{base.symbol}</td>
                      <td className="px-3 py-2.5 text-muted-foreground text-sm">{base.decimal_places}</td>
                      <td className="px-3 py-2.5 text-muted-foreground text-[12px]">—</td>
                      <td className="px-3 py-2.5 text-muted-foreground text-[12px]">—</td>
                      <td className="px-3 py-2.5"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500" /></td>
                      <td className="px-3 py-2.5 text-right">
                        <button onClick={() => openEdit(base)} className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground transition-colors">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  </>
                )}

                {/* Foreign currencies */}
                {foreign.length > 0 && (
                  <>
                    <tr>
                      <td colSpan={9} className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/20 border-b border-border/30 border-t border-border/20">
                        Foreign currencies ({foreign.length})
                      </td>
                    </tr>
                    {foreign.map(c => {
                      const cRates = getRatesForCurrency(c.id);
                      const latest = cRates[0] ?? null;
                      return (
                        <tr key={c.id} className={cn('hover:bg-muted/20 transition-colors border-b border-border/30 last:border-0', !c.is_active && 'opacity-50')}>
                          <td className="px-3 py-2.5 w-7"></td>
                          <td className="px-3 py-2.5">
                            <span className="text-[13px] font-medium text-foreground">{c.name}</span>
                            <p className="text-[10px] text-muted-foreground">{c.formal_name}</p>
                          </td>
                          <td className="px-3 py-2.5"><span className="font-mono text-[12px] bg-muted px-1.5 py-0.5 rounded">{c.iso_code}</span></td>
                          <td className="px-3 py-2.5 font-mono text-sm">{c.symbol}</td>
                          <td className="px-3 py-2.5 text-muted-foreground text-sm">{c.decimal_places}</td>
                          <td className="px-3 py-2.5">
                            {latest?.selling_rate != null
                              ? <span className="font-mono text-[12px] text-emerald-700 dark:text-emerald-400">{baseSym}{formatRate(latest.selling_rate)}</span>
                              : <span className="text-[11px] text-amber-600 dark:text-amber-400">No rate</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            {latest?.buying_rate != null
                              ? <span className="font-mono text-[12px] text-rose-700 dark:text-rose-400">{baseSym}{formatRate(latest.buying_rate)}</span>
                              : <span className="text-[11px] text-muted-foreground">—</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            <button onClick={() => toggleActive(c.id)}>
                              <span className={cn('inline-block w-2 h-2 rounded-full', c.is_active ? 'bg-emerald-500' : 'bg-muted-foreground/30')} />
                            </button>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1 justify-end">
                              <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors">
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => setDelTarget(c)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                )}

                {currencies.length <= 1 && !search && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <DollarSign className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No foreign currencies yet</p>
                      <p className="text-[12px] text-muted-foreground/60 mt-1">Add USD, EUR, AED and other currencies your business transacts in</p>
                    </td>
                  </tr>
                )}

                {search && filtered.length === 0 && (
                  <tr><td colSpan={9} className="py-8 text-center text-muted-foreground text-sm">No currencies match "{search}"</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <CurrencySheet
        open={sheetOpen} onOpenChange={setSheetOpen}
        editCurrency={editCurrency} onSave={handleSave}
        rates={rates}
        onAddRate={addRate} onUpdateRate={updateRate} onDeleteRate={deleteRate}
        baseCurrencySymbol={baseSym}
      />

      <AlertDialog open={!!delTarget} onOpenChange={v => !v && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {delTarget?.name} ({delTarget?.iso_code})?</AlertDialogTitle>
            <AlertDialogDescription>
              All rates of exchange for this currency will also be deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (delTarget) { deleteCurrency(delTarget.id); setDelTarget(null); } }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}

export default function CurrencyMasterPage() {
  return <CurrencyMasterPanel />;
}
