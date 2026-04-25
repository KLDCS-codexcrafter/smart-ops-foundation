/**
 * @file     useLanguage.types.ts
 * @purpose  Types and constants extracted from useLanguage.tsx to satisfy
 *           react-refresh/only-export-components.
 * @who      Operix Engineering
 * @when     Apr-2026
 * @sprint   T-H1.5-Z-Cleanup-1c-a
 * @iso      Maintainability (HIGH+ component file scope cleaned)
 *           Performance (HIGH+ HMR fast-refresh works correctly)
 * @whom     useLanguage.tsx · components that import language metadata
 * @depends  none
 */
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
