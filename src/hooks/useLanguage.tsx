/**
 * useLanguage.ts — Language/i18n context
 * 23 Indian Eighth Schedule languages defined.
 * English: fully active. All others: architecture ready, translations coming soon.
 * Persisted to localStorage key 'app_language'.
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type SupportedLanguage =
  'en' | 'hi' | 'bn' | 'te' | 'mr' | 'ta' | 'gu' | 'ur' | 'kn' | 'or'
  | 'ml' | 'pa' | 'as' | 'mai' | 'sa' | 'ne' | 'sd' | 'ks' | 'doi' | 'kok'
  | 'sat' | 'bo' | 'mni';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  active: boolean;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', active: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', active: false },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', active: false },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', active: false },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', active: false },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', active: false },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', active: false },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', active: false },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', active: false },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', active: false },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', active: false },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', active: false },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', active: false },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली', active: false },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', active: false },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', active: false },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي', active: false },
  { code: 'ks', name: 'Kashmiri', nativeName: 'كٲشُر', active: false },
  { code: 'doi', name: 'Dogri', nativeName: 'डोगरी', active: false },
  { code: 'kok', name: 'Konkani', nativeName: 'कोंकणी', active: false },
  { code: 'sat', name: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', active: false },
  { code: 'bo', name: 'Bodo', nativeName: 'बड़ो', active: false },
  { code: 'mni', name: 'Manipuri', nativeName: 'মৈতৈলোন্', active: false },
];

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
