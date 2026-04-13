/**
 * currency.ts — CUR-1 Currency Master types
 * [JWT] All CRUD via /api/accounting/currencies
 */

export interface Currency {
  id: string;
  iso_code: string;           // ISO 4217 — e.g. INR, USD
  name: string;               // Indian Rupee
  symbol: string;             // ₹
  decimal_places: number;     // 2
  decimal_symbol: '.' | ',';
  thousand_separator: ',' | '.' | ' ' | '';
  symbol_position: 'before' | 'after';
  is_base_currency: boolean;  // only one true per tenant
  is_active: boolean;
  exchange_rate: number;      // 1 for base; e.g. 83.25 for USD→INR
  rate_date: string;          // ISO date of last rate update
  notes: string;
  created_at: string;
  updated_at: string;
}

export const SEED_CURRENCIES: Omit<Currency, 'id' | 'created_at' | 'updated_at'>[] = [
  { iso_code: 'INR', name: 'Indian Rupee',         symbol: '₹',  decimal_places: 2, decimal_symbol: '.', thousand_separator: ',', symbol_position: 'before', is_base_currency: true,  is_active: true,  exchange_rate: 1,     rate_date: new Date().toISOString().slice(0, 10), notes: 'Base currency' },
  { iso_code: 'USD', name: 'US Dollar',             symbol: '$',  decimal_places: 2, decimal_symbol: '.', thousand_separator: ',', symbol_position: 'before', is_base_currency: false, is_active: true,  exchange_rate: 83.25, rate_date: new Date().toISOString().slice(0, 10), notes: '' },
  { iso_code: 'EUR', name: 'Euro',                  symbol: '€',  decimal_places: 2, decimal_symbol: ',', thousand_separator: '.', symbol_position: 'before', is_base_currency: false, is_active: true,  exchange_rate: 91.50, rate_date: new Date().toISOString().slice(0, 10), notes: '' },
  { iso_code: 'GBP', name: 'British Pound Sterling',symbol: '£',  decimal_places: 2, decimal_symbol: '.', thousand_separator: ',', symbol_position: 'before', is_base_currency: false, is_active: true,  exchange_rate: 105.80,rate_date: new Date().toISOString().slice(0, 10), notes: '' },
  { iso_code: 'AED', name: 'UAE Dirham',            symbol: 'د.إ', decimal_places: 2, decimal_symbol: '.', thousand_separator: ',', symbol_position: 'before', is_base_currency: false, is_active: true,  exchange_rate: 22.67, rate_date: new Date().toISOString().slice(0, 10), notes: '' },
  { iso_code: 'JPY', name: 'Japanese Yen',          symbol: '¥',  decimal_places: 0, decimal_symbol: '.', thousand_separator: ',', symbol_position: 'before', is_base_currency: false, is_active: false, exchange_rate: 0.56,  rate_date: new Date().toISOString().slice(0, 10), notes: '' },
  { iso_code: 'SGD', name: 'Singapore Dollar',      symbol: 'S$', decimal_places: 2, decimal_symbol: '.', thousand_separator: ',', symbol_position: 'before', is_base_currency: false, is_active: false, exchange_rate: 62.10, rate_date: new Date().toISOString().slice(0, 10), notes: '' },
  { iso_code: 'CHF', name: 'Swiss Franc',           symbol: 'CHF',decimal_places: 2, decimal_symbol: '.', thousand_separator: ',', symbol_position: 'before', is_base_currency: false, is_active: false, exchange_rate: 94.20, rate_date: new Date().toISOString().slice(0, 10), notes: '' },
  { iso_code: 'AUD', name: 'Australian Dollar',     symbol: 'A$', decimal_places: 2, decimal_symbol: '.', thousand_separator: ',', symbol_position: 'before', is_base_currency: false, is_active: false, exchange_rate: 54.80, rate_date: new Date().toISOString().slice(0, 10), notes: '' },
  { iso_code: 'CAD', name: 'Canadian Dollar',       symbol: 'C$', decimal_places: 2, decimal_symbol: '.', thousand_separator: ',', symbol_position: 'before', is_base_currency: false, is_active: false, exchange_rate: 61.40, rate_date: new Date().toISOString().slice(0, 10), notes: '' },
];
