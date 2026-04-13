/**
 * useCurrencies.ts — CUR-1 Currency Master hook
 * localStorage key: erp_currencies
 * [JWT] All CRUD via /api/accounting/currencies
 */
import { useState, useCallback, useMemo } from 'react';
import type { Currency } from '@/types/currency';
import { SEED_CURRENCIES } from '@/types/currency';

const LS_KEY = 'erp_currencies';

const ls = <T,>(k: string): T[] => {
  try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; }
};

function seed(): Currency[] {
  const now = new Date().toISOString();
  return SEED_CURRENCIES.map((s, i) => ({
    ...s,
    id: `cur-${String(i + 1).padStart(3, '0')}`,
    created_at: now,
    updated_at: now,
  }));
}

function init(): Currency[] {
  // [JWT] GET /api/accounting/currencies
  const existing = ls<Currency>(LS_KEY);
  if (existing.length > 0) return existing;
  const seeded = seed();
  // [JWT] SEED /api/accounting/currencies
  localStorage.setItem(LS_KEY, JSON.stringify(seeded));
  return seeded;
}

export function useCurrencies() {
  const [currencies, setCurrencies] = useState<Currency[]>(init);

  const save = useCallback((next: Currency[]) => {
    setCurrencies(next);
    // [JWT] PUT /api/accounting/currencies
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    // Also persist base currency code for cross-module lookup
    const base = next.find(c => c.is_base_currency);
    if (base) {
      // [JWT] PUT /api/accounting/base-currency
      localStorage.setItem('erp_base_currency', base.iso_code);
    }
  }, []);

  const updateCurrency = useCallback((id: string, patch: Partial<Currency>) => {
    save(currencies.map(c => c.id === id ? { ...c, ...patch, updated_at: new Date().toISOString() } : c));
  }, [currencies, save]);

  const addCurrency = useCallback((data: Omit<Currency, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const newCur: Currency = {
      ...data,
      id: `cur-${Date.now()}`,
      created_at: now,
      updated_at: now,
    };
    save([...currencies, newCur]);
    return newCur;
  }, [currencies, save]);

  const deleteCurrency = useCallback((id: string) => {
    const target = currencies.find(c => c.id === id);
    if (target?.is_base_currency) return false; // cannot delete base
    save(currencies.filter(c => c.id !== id));
    return true;
  }, [currencies, save]);

  const setBaseCurrency = useCallback((id: string) => {
    save(currencies.map(c => ({
      ...c,
      is_base_currency: c.id === id,
      exchange_rate: c.id === id ? 1 : c.exchange_rate,
      updated_at: new Date().toISOString(),
    })));
  }, [currencies, save]);

  const toggleActive = useCallback((id: string) => {
    const target = currencies.find(c => c.id === id);
    if (!target || target.is_base_currency) return; // base always active
    save(currencies.map(c => c.id === id ? { ...c, is_active: !c.is_active, updated_at: new Date().toISOString() } : c));
  }, [currencies, save]);

  const stats = useMemo(() => ({
    total: currencies.length,
    active: currencies.filter(c => c.is_active).length,
    inactive: currencies.filter(c => !c.is_active).length,
    base: currencies.find(c => c.is_base_currency),
  }), [currencies]);

  return { currencies, stats, updateCurrency, addCurrency, deleteCurrency, setBaseCurrency, toggleActive };
}
