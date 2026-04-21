/**
 * accents.ts — 7 product accent palettes
 *
 * PURPOSE  Static palette table mapping ThemeAccent → HSL values + Tailwind class.
 * INPUT    none
 * OUTPUT   ACCENTS record
 * DEPENDENCIES  ../types
 * TALLY-ON-TOP BEHAVIOR  none
 * SPEC DOC  Operix_ONE_Shell_Specification.xlsx Sheet 7-A
 */

import type { ThemeAccent } from '../types';

export interface AccentPalette {
  primary: string;       // HSL
  primaryForeground: string;
  tailwindClass: string;
}

export const ACCENTS: Record<ThemeAccent, AccentPalette> = {
  indigo:  { primary: '243 75% 58%', primaryForeground: '0 0% 100%', tailwindClass: 'indigo-500' },
  cyan:    { primary: '189 94% 43%', primaryForeground: '0 0% 100%', tailwindClass: 'cyan-500' },
  emerald: { primary: '152 81% 41%', primaryForeground: '0 0% 100%', tailwindClass: 'emerald-500' },
  amber:   { primary: '32 95% 44%',  primaryForeground: '0 0% 100%', tailwindClass: 'amber-500' },
  rose:    { primary: '340 82% 55%', primaryForeground: '0 0% 100%', tailwindClass: 'rose-500' },
  violet:  { primary: '262 83% 58%', primaryForeground: '0 0% 100%', tailwindClass: 'violet-500' },
  slate:   { primary: '215 20% 50%', primaryForeground: '0 0% 100%', tailwindClass: 'slate-500' },
};
