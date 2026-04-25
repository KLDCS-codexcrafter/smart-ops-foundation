/**
 * @file     LanguageContext.ts
 * @purpose  React context + consumer hook for LanguageProvider, extracted from
 *           useLanguage.tsx so the component file only exports components
 *           (react-refresh/only-export-components).
 * @who      Operix Engineering
 * @when     Apr-2026
 * @sprint   T-H1.5-Z-Cleanup-1c-a
 * @iso      Maintainability (HIGH+ component file scope cleaned)
 *           Performance (HIGH+ HMR fast-refresh works correctly)
 * @whom     useLanguage.tsx · UserProfileDropdown · LanguageSwitcher · Profile
 * @depends  react · ./useLanguage.types
 */
import { createContext, useContext } from 'react';
import type { SupportedLanguage, LanguageOption } from './useLanguage.types';

export interface LanguageCtx {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  languages: LanguageOption[];
}

export const LanguageContext = createContext<LanguageCtx | null>(null);

export function useLanguage(): LanguageCtx {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be inside LanguageProvider');
  return ctx;
}
