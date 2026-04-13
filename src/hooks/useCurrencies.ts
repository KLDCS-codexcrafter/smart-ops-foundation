/**
 * useCurrencies.ts — Currency master CRUD hook
 * Pattern: identical to all 27 other ERP hooks (localStorage + [JWT] comments)
 * [JWT] Replace with GET/POST/PUT/DELETE /api/accounting/currencies
 */
import { useState } from 'react';
import { toast } from 'sonner';
import type { Currency, ForexRate } from '@/types/currency';

const KEY = 'erp_currencies';
const RATES_KEY = 'erp_forex_rates';

const loadCurrencies = (): Currency[] => {
  try {
    // [JWT] GET /api/accounting/currencies
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const stored = JSON.parse(raw) as Currency[];
      if (stored.length > 0) return stored;
    }
  } catch { /* ignore */ }

  // First load — seed the base currency from parent company
  try {
    // [JWT] GET /api/foundation/parent-company/base-currency
    const baseCurrencyCode = localStorage.getItem('erp_base_currency') || 'INR';
    // [JWT] GET /api/foundation/parent-company
    const parentRaw = localStorage.getItem('erp_parent_company');
    const parent = parentRaw ? JSON.parse(parentRaw) : {};
    const now = new Date().toISOString();
    const baseCurrency: Currency = {
      id: `cur-base-${Date.now()}`,
      iso_code: baseCurrencyCode,
      name: parent.currencyFormalName || (baseCurrencyCode === 'INR' ? 'Indian Rupee' : baseCurrencyCode),
      formal_name: parent.currencyFormalName || (baseCurrencyCode === 'INR' ? 'Indian Rupee' : baseCurrencyCode),
      symbol: parent.currencySymbol || (baseCurrencyCode === 'INR' ? '₹' : baseCurrencyCode),
      decimal_places: 2,
      symbol_before_amount: true,
      space_between: false,
      show_in_millions: false,
      is_base_currency: true,
      is_active: true,
      entity_id: null,
      created_at: now,
      updated_at: now,
    };
    const seeds = [baseCurrency];
    localStorage.setItem(KEY, JSON.stringify(seeds));
    // [JWT] POST /api/accounting/currencies/init
    return seeds;
  } catch { return []; }
};

const loadRates = (): ForexRate[] => {
  try {
    // [JWT] GET /api/accounting/forex-rates
    const raw = localStorage.getItem(RATES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export function useCurrencies() {
  const [currencies, setCurrencies] = useState<Currency[]>(loadCurrencies);
  const [rates, setRates] = useState<ForexRate[]>(loadRates);

  const saveCurrencies = (data: Currency[]) => {
    localStorage.setItem(KEY, JSON.stringify(data));
    // [JWT] Replace with API calls
  };
  const saveRates = (data: ForexRate[]) => {
    localStorage.setItem(RATES_KEY, JSON.stringify(data));
    // [JWT] Replace with API calls
  };

  const createCurrency = (form: Omit<Currency, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    // Validate: ISO code must be unique
    if (currencies.some(c => c.iso_code.toUpperCase() === form.iso_code.toUpperCase())) {
      toast.error(`Currency ${form.iso_code} already exists`);
      return null;
    }
    const c: Currency = { ...form, id: `cur-${Date.now()}`, created_at: now, updated_at: now };
    const updated = [...currencies, c];
    setCurrencies(updated);
    saveCurrencies(updated);
    toast.success(`${c.name} (${c.iso_code}) created`);
    // [JWT] POST /api/accounting/currencies
    return c;
  };

  const updateCurrency = (id: string, patch: Partial<Currency>) => {
    const c = currencies.find(x => x.id === id);
    if (!c) return;
    if (patch.iso_code && patch.iso_code !== c.iso_code) {
      if (currencies.some(x => x.id !== id && x.iso_code.toUpperCase() === patch.iso_code!.toUpperCase())) {
        toast.error(`Currency code ${patch.iso_code} already exists`);
        return;
      }
    }
    const updated = currencies.map(x =>
      x.id === id ? { ...x, ...patch, updated_at: new Date().toISOString() } : x
    );
    setCurrencies(updated);
    saveCurrencies(updated);
    toast.success(`${c.name} updated`);
    // [JWT] PUT /api/accounting/currencies/:id
  };

  const deleteCurrency = (id: string) => {
    const c = currencies.find(x => x.id === id);
    if (!c) return;
    if (c.is_base_currency) {
      toast.error('Cannot delete the base currency');
      return;
    }
    // Guard: check if used in any ledger
    try {
      // [JWT] GET /api/group/finecore/ledger-definitions
      const ledgers = JSON.parse(localStorage.getItem('erp_ledger_definitions') || '[]');
      const inUse = ledgers.some((l: any) => l.currency === c.iso_code || l.currency_id === c.id);
      if (inUse) {
        toast.error(`${c.iso_code} is assigned to a ledger — cannot delete`);
        return;
      }
    } catch { /* ignore */ }
    const updated = currencies.filter(x => x.id !== id);
    const updatedRates = rates.filter(r => r.currency_id !== id);
    setCurrencies(updated);
    saveCurrencies(updated);
    setRates(updatedRates);
    saveRates(updatedRates);
    toast.success(`${c.name} deleted`);
    // [JWT] DELETE /api/accounting/currencies/:id
  };

  const toggleActive = (id: string) => {
    const c = currencies.find(x => x.id === id);
    if (!c) return;
    if (c.is_base_currency) { toast.error('Base currency cannot be deactivated'); return; }
    updateCurrency(id, { is_active: !c.is_active });
  };

  // ── Rates ──────────────────────────────────────────────────────────────────

  const addRate = (rate: Omit<ForexRate, 'id' | 'created_at'>) => {
    const now = new Date().toISOString();
    const r: ForexRate = { ...rate, id: `fxr-${Date.now()}`, created_at: now };
    const updated = [...rates, r];
    setRates(updated);
    saveRates(updated);
    // [JWT] POST /api/accounting/forex-rates
  };

  const updateRate = (id: string, patch: Partial<ForexRate>) => {
    const updated = rates.map(r => r.id === id ? { ...r, ...patch } : r);
    setRates(updated);
    saveRates(updated);
    // [JWT] PUT /api/accounting/forex-rates/:id
  };

  const deleteRate = (id: string) => {
    const updated = rates.filter(r => r.id !== id);
    setRates(updated);
    saveRates(updated);
    // [JWT] DELETE /api/accounting/forex-rates/:id
  };

  const getRatesForCurrency = (currencyId: string): ForexRate[] =>
    rates
      .filter(r => r.currency_id === currencyId)
      .sort((a, b) => new Date(b.applicable_from).getTime() - new Date(a.applicable_from).getTime());

  /**
   * Get the applicable rate for a currency on a given date.
   * Returns the most recent rate entry whose applicable_from <= targetDate.
   * Priority: last_voucher_rate > selling/buying rate.
   */
  const getApplicableRate = (currencyId: string, targetDate: string, type: 'selling' | 'buying' | 'standard' = 'selling'): number | null => {
    const sorted = rates
      .filter(r => r.currency_id === currencyId && r.applicable_from <= targetDate)
      .sort((a, b) => new Date(b.applicable_from).getTime() - new Date(a.applicable_from).getTime());
    if (!sorted.length) return null;
    const r = sorted[0];
    if (r.last_voucher_rate !== null) return r.last_voucher_rate;
    if (type === 'selling') return r.selling_rate;
    if (type === 'buying') return r.buying_rate;
    return r.standard_rate;
  };

  const getCurrencyByCode = (isoCode: string): Currency | null =>
    currencies.find(c => c.iso_code.toUpperCase() === isoCode.toUpperCase()) ?? null;

  /**
   * Format an amount in a given currency using stored symbol, decimals, and position settings.
   * Falls back to 2dp if currency not found.
   */
  const formatAmount = (amount: number, isoCode: string): string => {
    const c = getCurrencyByCode(isoCode);
    if (!c) return amount.toFixed(2);
    const formatted = parseFloat(amount.toFixed(c.decimal_places))
      .toLocaleString('en-IN', { minimumFractionDigits: c.decimal_places, maximumFractionDigits: c.decimal_places });
    const spaced = c.space_between ? ' ' : '';
    return c.symbol_before_amount
      ? `${c.symbol}${spaced}${formatted}`
      : `${formatted}${spaced}${c.symbol}`;
  };

  const baseCurrency = currencies.find(c => c.is_base_currency) ?? null;
  const activeForeign = currencies.filter(c => !c.is_base_currency && c.is_active);

  const stats = {
    total: currencies.length,
    active: currencies.filter(c => c.is_active).length,
    foreign: currencies.filter(c => !c.is_base_currency).length,
    withRates: currencies.filter(c =>
      !c.is_base_currency && rates.some(r => r.currency_id === c.id)
    ).length,
  };

  return {
    currencies, rates, stats, baseCurrency, activeForeign,
    createCurrency, updateCurrency, deleteCurrency, toggleActive,
    addRate, updateRate, deleteRate, getRatesForCurrency, getApplicableRate,
    getCurrencyByCode, formatAmount,
  };
}
