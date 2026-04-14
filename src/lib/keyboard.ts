import { useEffect } from 'react';

/**
 * 4DSmartOps Keyboard-First Standard — keyboard utilities for every form.
 *
 * Indian accountants are trained on Tally. Enter key = next field.
 * Ctrl+S = save. Every form uses these. Never removed, never changed.
 */

/**
 * onEnterNext — pressing Enter moves focus to the next focusable field, just like Tab.
 * When the last field is reached, the primary button fires.
 * Usage: add onKeyDown={onEnterNext} to every <Input> in a form.
 *        Add data-keyboard-form to the form wrapper div.
 *        Add data-primary to the Save / Create button.
 */
export const onEnterNext = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const form = (e.target as HTMLElement).closest('[data-keyboard-form]');
  if (!form) return;
  const fields = Array.from(form.querySelectorAll(
    'input:not([disabled]):not([type=hidden]),'
    + ' select:not([disabled]),'
    + ' textarea:not([disabled]),'
    + ' button[data-primary]'
  )) as HTMLElement[];
  const idx = fields.indexOf(e.target as HTMLElement);
  if (idx < 0) return;
  if (idx < fields.length - 1) {
    fields[idx + 1].focus();
  } else {
    (form.querySelector('button[data-primary]') as HTMLButtonElement)?.click();
  }
};

/**
 * useCtrlS — pressing Ctrl+S (or Cmd+S on Mac) triggers the save handler.
 * Usage: call useCtrlS(handleSave) inside any component with a form.
 */
export const useCtrlS = (handler: () => void) => {
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handler();
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [handler]);
};

/**
 * toIndianFormat — formats a number in Indian notation (lakhs, crores).
 * Example: 100000 → '1,00,000'
 */
export const toIndianFormat = (n: number): string => {
  if (isNaN(n)) return '0';
  if (n === 0) return '0';
  const [int, dec] = Math.abs(n).toFixed(2).split('.');
  const last3 = int.slice(-3);
  const rest = int.slice(0, -3);
  const formatted = rest
    ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3
    : last3;
  const sign = n < 0 ? '-' : '';
  return dec === '00' ? sign + formatted : `${sign}${formatted}.${dec}`;
};

/**
 * fromIndianFormat — strips Indian-format commas before parsing.
 * Example: '1,00,000' → 100000
 */
export const fromIndianFormat = (s: string): number =>
  parseFloat(s.replace(/,/g, '')) || 0;

/**
 * amountInputProps — spread on any amount <Input> to remove spinner
 * and show numeric keyboard on mobile.
 */
export const amountInputProps = {
  type: 'text' as const,
  inputMode: 'decimal' as const,
} as const;
