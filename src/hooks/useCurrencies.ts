/**
 * useCurrencies.ts — CUR-1 Currency & Forex Rate hook
 * localStorage keys: erp_currencies, erp_forex_rates, erp_base_currency
 * [JWT] All CRUD via /api/accounting/currencies + /api/accounting/forex-rates
 */
import { useState, useCallback, useMemo } from 'react';
import type { Currency, ForexRate } from '@/types/currency';

const LS_CUR = 'erp_currencies';
const LS_RATE = 'erp_forex_rates';

const ls = <T,>(k: string): T[] => {
  try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; }
};

function seedBase(): Currency[] {
  const now = new Date().toISOString();
  // [JWT] GET /api/accounting/base-currency
  const baseCode = localStorage.getItem('erp_base_currency') || 'INR';
  const base: Currency = {
    id: 'cur-base',
    iso_code: baseCode,
    name: baseCode === 'INR' ? 'Indian Rupee' : baseCode,
    formal_name: baseCode === 'INR' ? 'Indian Rupee' : baseCode,
    symbol: baseCode === 'INR' ? '₹' : baseCode,
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
  return [base];
}

function init(): { currencies: Currency[]; rates: ForexRate[] } {
  // [JWT] GET /api/accounting/currencies
  let currencies = ls<Currency>(LS_CUR);
  if (currencies.length === 0) {
    currencies = seedBase();
    // [JWT] SEED /api/accounting/currencies
    localStorage.setItem(LS_CUR, JSON.stringify(currencies));
  }
  // [JWT] GET /api/accounting/forex-rates
  const rates = ls<ForexRate>(LS_RATE);
  return { currencies, rates };
}

export function useCurrencies() {
  const [data, setData] = useState(init);

  const saveCurrencies = useCallback((next: Currency[]) => {
    // [JWT] PUT /api/accounting/currencies
    localStorage.setItem(LS_CUR, JSON.stringify(next));
    const base = next.find(c => c.is_base_currency);
    if (base) {
      // [JWT] PUT /api/accounting/base-currency
      localStorage.setItem('erp_base_currency', base.iso_code);
    }
    setData(d => ({ ...d, currencies: next }));
  }, []);

  const saveRates = useCallback((next: ForexRate[]) => {
    // [JWT] PUT /api/accounting/forex-rates
    localStorage.setItem(LS_RATE, JSON.stringify(next));
    setData(d => ({ ...d, rates: next }));
  }, []);

  const createCurrency = useCallback((form: Omit<Currency, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const cur: Currency = {
      ...form,
      iso_code: form.iso_code.toUpperCase(),
      id: `cur-${Date.now()}`,
      created_at: now,
      updated_at: now,
    };
    // Duplicate check
    if (data.currencies.some(c => c.iso_code === cur.iso_code)) {
      return null;
    }
    saveCurrencies([...data.currencies, cur]);
    return cur;
  }, [data.currencies, saveCurrencies]);

  const updateCurrency = useCallback((id: string, patch: Partial<Currency>) => {
    saveCurrencies(data.currencies.map(c =>
      c.id === id ? { ...c, ...patch, updated_at: new Date().toISOString() } : c
    ));
  }, [data.currencies, saveCurrencies]);

  const deleteCurrency = useCallback((id: string) => {
    const target = data.currencies.find(c => c.id === id);
    if (!target || target.is_base_currency) return false;
    saveCurrencies(data.currencies.filter(c => c.id !== id));
    // Also delete associated rates
    saveRates(data.rates.filter(r => r.currency_id !== id));
    return true;
  }, [data.currencies, data.rates, saveCurrencies, saveRates]);

  const toggleActive = useCallback((id: string) => {
    const target = data.currencies.find(c => c.id === id);
    if (!target || target.is_base_currency) return;
    saveCurrencies(data.currencies.map(c =>
      c.id === id ? { ...c, is_active: !c.is_active, updated_at: new Date().toISOString() } : c
    ));
  }, [data.currencies, saveCurrencies]);

  // ── Forex Rates ────────────────────────────────────────────────────────────

  const addRate = useCallback((rate: Omit<ForexRate, 'id' | 'created_at'>) => {
    const now = new Date().toISOString();
    const newRate: ForexRate = {
      ...rate,
      id: `fxr-${Date.now()}`,
      created_at: now,
    };
    saveRates([...data.rates, newRate]);
    return newRate;
  }, [data.rates, saveRates]);

  const updateRate = useCallback((id: string, patch: Partial<ForexRate>) => {
    saveRates(data.rates.map(r => r.id === id ? { ...r, ...patch } : r));
  }, [data.rates, saveRates]);

  const deleteRate = useCallback((id: string) => {
    saveRates(data.rates.filter(r => r.id !== id));
  }, [data.rates, saveRates]);

  const getRatesForCurrency = useCallback((currencyId: string): ForexRate[] => {
    return data.rates
      .filter(r => r.currency_id === currencyId)
      .sort((a, b) => new Date(b.applicable_from).getTime() - new Date(a.applicable_from).getTime());
  }, [data.rates]);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const baseCurrency = useMemo(() => data.currencies.find(c => c.is_base_currency) ?? null, [data.currencies]);

  const stats = useMemo(() => ({
    total: data.currencies.length,
    foreign: data.currencies.filter(c => !c.is_base_currency).length,
    active: data.currencies.filter(c => c.is_active).length,
    withRates: data.currencies.filter(c => !c.is_base_currency && data.rates.some(r => r.currency_id === c.id)).length,
  }), [data.currencies, data.rates]);

  return {
    currencies: data.currencies,
    rates: data.rates,
    stats,
    baseCurrency,
    createCurrency,
    updateCurrency,
    deleteCurrency,
    toggleActive,
    addRate,
    updateRate,
    deleteRate,
    getRatesForCurrency,
  };
}
