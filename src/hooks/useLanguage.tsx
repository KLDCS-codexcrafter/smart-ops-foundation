/**
 * useLanguage.tsx — Language/i18n context
 * 23 Indian Eighth Schedule languages defined.
 * English: fully active. All others: architecture ready, translations coming soon.
 * Persisted to localStorage key 'app_language'.
 *
 * Types/constants live in `useLanguage.types.ts` (D-139 split for HMR).
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { LANGUAGES, type SupportedLanguage, type LanguageOption } from './useLanguage.types';

const VALID = new Set(LANGUAGES.map(l => l.code));

interface LanguageCtx {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  languages: LanguageOption[];
}

const Ctx = createContext<LanguageCtx | null>(null);

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

  return <Ctx.Provider value={{ language, setLanguage, languages: LANGUAGES }}>{children}</Ctx.Provider>;
}

export function useLanguage(): LanguageCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLanguage must be inside LanguageProvider');
  return ctx;
}
