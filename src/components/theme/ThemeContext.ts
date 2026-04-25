/**
 * @file     ThemeContext.ts
 * @purpose  React context + consumer hook for ThemeProvider, extracted from
 *           ThemeProvider.tsx so the component file only exports components
 *           (react-refresh/only-export-components).
 * @who      Operix Engineering
 * @when     Apr-2026
 * @sprint   T-H1.5-Z-Cleanup-1c-a
 * @iso      Maintainability (HIGH+ component file scope cleaned)
 *           Performance (HIGH+ HMR fast-refresh works correctly)
 * @whom     ThemeProvider.tsx · ThemeToggle and other theme consumers
 * @depends  react
 */
import { createContext, useContext } from "react";

export type Theme = "dark" | "light";

export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextType | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
