/**
 * @file        rag.ts
 * @purpose     Pure RAG (Red/Amber/Green) status resolver + token palette.
 *              The deferred RPT-1a scorecard primitive · brought forward in RPT-2a-i.
 * @sprint      RPT-2a-i · Dashboard primitive + Comply360 reference cohort
 * @decisions   D-RPT-6 (RAG resolution is pure · no React · no writes · client-only)
 * @[JWT]       N/A — deterministic compute
 */

export type RagStatus = 'green' | 'amber' | 'red';

export interface RagThresholds {
  /** Amber band edge */
  amber: number;
  /** Red band edge */
  red: number;
  /** 'higher-good': value ≥ amber → green, ≥ red → amber, else red.
   *  'lower-good':  value ≤ amber → green, ≤ red → amber, else red. */
  direction: 'higher-good' | 'lower-good';
}

export function resolveRag(value: number, thresholds: RagThresholds): RagStatus {
  const { amber, red, direction } = thresholds;
  if (direction === 'higher-good') {
    if (value >= amber) return 'green';
    if (value >= red) return 'amber';
    return 'red';
  }
  // lower-good
  if (value <= amber) return 'green';
  if (value <= red) return 'amber';
  return 'red';
}

/**
 * Token-aligned RAG palette · uses semantic design tokens
 * (consumers compose Tailwind classes around these labels).
 */
export const RAG_PALETTE: Record<RagStatus, string> = {
  green: 'text-success',
  amber: 'text-warning',
  red: 'text-destructive',
};
