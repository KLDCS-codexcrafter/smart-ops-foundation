/**
 * @file     DishaniContext.types.ts
 * @purpose  Type extracted from DishaniContext.tsx to satisfy
 *           react-refresh/only-export-components.
 * @who      Operix Engineering
 * @when     Apr-2026
 * @sprint   T-H1.5-Z-Cleanup-1c-a
 * @iso      Maintainability (HIGH+ component file scope cleaned)
 *           Performance (HIGH+ HMR fast-refresh works correctly)
 * @whom     DishaniContext.tsx · ask-dishani consumers
 * @depends  none
 */
export interface DishaniMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}
