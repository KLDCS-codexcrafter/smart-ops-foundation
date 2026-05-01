/**
 * i18n-engine.ts — Locale + translation primitives
 *
 * Sprint T-Phase-1.2.5h-c2 · Card #2.5 final sub-sprint
 *
 * Wraps react-i18next with Operix conventions:
 * - Per-entity locale persistence (erp_locale_${entityCode})
 * - English fallback when key missing in active locale
 * - Variable interpolation: t('hello', 'Hello {name}', { name: 'Alice' })
 *
 * [JWT] Phase 2: server-driven dictionaries via /api/i18n/{locale}.json
 */

import i18n from 'i18next';
import { initReactI18next, useTranslation as useI18nReact } from 'react-i18next';
import { en } from '@/data/i18n/en';
import { hi } from '@/data/i18n/hi';

export type Locale = 'en' | 'hi';

const LOCALE_KEY = (entityCode: string): string =>
  entityCode ? `erp_locale_${entityCode}` : 'erp_locale_system';

export function getLocale(entityCode = 'system'): Locale {
  try {
    // [JWT] GET /api/entity/storage/:key
    const raw = localStorage.getItem(LOCALE_KEY(entityCode));
    if (raw === 'en' || raw === 'hi') return raw;
  } catch { /* fall through */ }
  return 'en';
}

export function setLocale(locale: Locale, entityCode = 'system'): void {
  try {
    // [JWT] POST /api/entity/storage/:key
    localStorage.setItem(LOCALE_KEY(entityCode), locale);
    void i18n.changeLanguage(locale);
  } catch { /* localStorage unavailable */ }
}

if (!i18n.isInitialized) {
  void i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        hi: { translation: hi },
      },
      lng: getLocale(),
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
      returnNull: false,
    });
}

/** Operix-conventional translation hook. */
export function useT() {
  const { t } = useI18nReact();
  return (key: string, fallback?: string, vars?: Record<string, string | number>): string => {
    return t(key, { defaultValue: fallback ?? key, ...(vars ?? {}) }) as string;
  };
}

export default i18n;
