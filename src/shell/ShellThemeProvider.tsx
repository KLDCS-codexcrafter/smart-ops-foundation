/**
 * ShellThemeProvider — Sets product accent CSS variables on the root.
 *
 * PURPOSE  Apply --shell-accent / --shell-accent-foreground per product.
 * INPUT    accent, mode, tenantBrand, children
 * OUTPUT   Themed React subtree
 * DEPENDENCIES  ./types, ./theme/accents, ./ShellThemeContext
 * TALLY-ON-TOP BEHAVIOR  none
 * SPEC DOC  Operix_ONE_Shell_Specification.xlsx
 */
import { useEffect, type ReactNode } from 'react';
import { ACCENTS } from './theme/accents';
import { ThemeContext, type ThemeContextValue } from './ShellThemeContext';

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
