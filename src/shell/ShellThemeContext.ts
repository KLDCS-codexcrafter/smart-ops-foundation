/**
 * ShellThemeContext — React context for Shell theme values.
 *
 * PURPOSE       Holds accent / mode / tenantBrand for ShellThemeProvider consumers.
 * INPUT         none
 * OUTPUT        React Context
 * DEPENDENCIES  ./types
 * TALLY-ON-TOP BEHAVIOR  none
 * SPEC DOC      Operix_ONE_Shell_Specification.xlsx
 */
import { createContext } from 'react';
import type { ThemeAccent, TenantBrand } from './types';

export interface ThemeContextValue {
  accent: ThemeAccent;
  mode: 'light' | 'dark' | 'auto';
  tenantBrand?: TenantBrand;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
