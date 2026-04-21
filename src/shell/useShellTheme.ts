/**
 * useShellTheme — Hook exposing Shell theme context.
 *
 * PURPOSE       Read current accent / mode / tenantBrand from ShellThemeProvider.
 * INPUT         none (uses React context)
 * OUTPUT        ThemeContextValue
 * DEPENDENCIES  ./ShellThemeContext
 * TALLY-ON-TOP BEHAVIOR  none
 * SPEC DOC      Operix_ONE_Shell_Specification.xlsx
 */
import { useContext } from 'react';
import { ThemeContext } from './ShellThemeContext';

export function useShellTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useShellTheme must be used inside ShellThemeProvider');
  return ctx;
}
