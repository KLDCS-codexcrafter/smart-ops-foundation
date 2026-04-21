/**
 * ShellThemeProvider — Sets product accent CSS variables on the root.
 *
 * PURPOSE  Apply --shell-accent / --shell-accent-foreground per product.
 * INPUT    accent, mode, tenantBrand, children
 * OUTPUT   Themed React subtree
 * DEPENDENCIES  ./types, ./theme/accents
 * TALLY-ON-TOP BEHAVIOR  none
 * SPEC DOC  Operix_ONE_Shell_Specification.xlsx
 */
import { createContext, useEffect, type ReactNode } from 'react';
import type { ThemeAccent, TenantBrand } from './types';
import { ACCENTS } from './theme/accents';

interface ThemeContextValue {
  accent: ThemeAccent;
  mode: 'light' | 'dark' | 'auto';
  tenantBrand?: TenantBrand;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

interface Props extends ThemeContextValue {
  children: ReactNode;
}

export function ShellThemeProvider({ accent, mode, tenantBrand, children }: Props) {
  useEffect(() => {
    const palette = ACCENTS[accent];
    const root = document.documentElement;
    const finalAccent = tenantBrand?.accent ?? palette.primary;
    root.style.setProperty('--shell-accent', finalAccent);
    root.style.setProperty('--shell-accent-foreground', palette.primaryForeground);
  }, [accent, tenantBrand]);

  return (
    <ThemeContext.Provider value={{ accent, mode, tenantBrand }}>
      {children}
    </ThemeContext.Provider>
  );
}
