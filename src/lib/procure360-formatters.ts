/**
 * @file        src/lib/procure360-formatters.ts
 * @purpose     Procure360 formatter utilities · consistent date/currency/number formatting across panels
 * @sprint      T-Phase-2.B-Procure360-Phase2-Polish-Part-B-ii · Block A item 11 · D-NEW-GC
 * @decisions   Q-LOCK-3(a) carry-forward consolidation · single SSOT for formatting
 * @disciplines FR-22 canonical · pure helpers · zero side effects
 */

/**
 * Format date as DD/MM/YYYY (India standard).
 * Empty/invalid input returns '—'.
 */
export function formatDateIN(input: string | Date | null | undefined): string {
  if (!input) return '—';
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Format currency as ₹X,XX,XXX.XX (Indian lakhs/crores grouping).
 */
export function formatCurrencyIN(amount: number | null | undefined, decimals: number = 2): string {
  if (amount == null || isNaN(amount)) return '—';
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
  return `₹${formatted}`;
}

/**
 * Format number with Indian grouping.
 */
export function formatNumberIN(value: number | null | undefined, decimals: number = 0): string {
  if (value == null || isNaN(value)) return '—';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format percentage with consistent decimal places.
 */
export function formatPercentIN(value: number | null | undefined, decimals: number = 1): string {
  if (value == null || isNaN(value)) return '—';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Debounce utility (300ms default) for search inputs.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number = 300,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delayMs);
  };
}
