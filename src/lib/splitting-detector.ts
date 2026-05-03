/**
 * @file        splitting-detector.ts
 * @sprint      T-Phase-1.2.6f-pre-2 · Block C4 · OOB-45
 * @purpose     Re-export of splitting detection from requestx-report-engine.
 *              Kept as separate module per spec block boundary.
 */
export { detectSplittingPattern } from './requestx-report-engine';
export type { SplittingFlag } from './requestx-report-engine';
