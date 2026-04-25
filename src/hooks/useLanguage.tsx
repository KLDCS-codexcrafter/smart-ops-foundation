/**
 * useLanguage.tsx — Language/i18n provider component
 * 23 Indian Eighth Schedule languages defined.
 * English: fully active. All others: architecture ready, translations coming soon.
 * Persisted to localStorage key 'app_language'.
 *
 * Context + consumer hook live in `LanguageContext.ts`.
 * Types/constants live in `useLanguage.types.ts`.
 */
import { useState, useCallback, type ReactNode } from 'react';
import { LANGUAGES, type SupportedLanguage } from './useLanguage.types';
import { LanguageContext } from './LanguageContext';

const VALID = new Set(LANGUAGES.map(l => l.code));

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLang] = useState<SupportedLanguage>(() => {
    // [JWT] GET /api/entity/storage/:key
    const saved = localStorage.getItem('app_language');
    return (saved && VALID.has(saved as SupportedLanguage)) ? saved as SupportedLanguage : 'en';
  });

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLang(lang);
    // [JWT] POST /api/entity/storage/:key
    localStorage.setItem('app_language', lang);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}
