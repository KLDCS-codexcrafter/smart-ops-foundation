/**
 * @file        src/types/manufacturing-mode.ts
 * @sprint      T-Phase-3.PROD-2.5 · Sub-theme 1 · Q-LOCK-1
 * @purpose     Manufacturing-mode type system · used by entity-setup-service +
 *              ParentCompany wizard + FoundationModule + ProductionModule.
 * @disciplines Backward-compat type · existing entity-loading code defaults to 'discrete'
 */

export type ManufacturingMode = 'discrete' | 'process' | 'repetitive' | 'mixed_mode' | 'na';

export const MANUFACTURING_MODE_LABELS: Record<ManufacturingMode, string> = {
  discrete: 'Discrete Manufacturing',
  process: 'Process / Continuous-Flow',
  repetitive: 'Repetitive Manufacturing',
  mixed_mode: 'Mixed-Mode (Multi-Type)',
  na: 'Not Applicable',
};

export const MANUFACTURING_MODE_DESCRIPTIONS: Record<ManufacturingMode, string> = {
  discrete: 'Countable units · machining · assembly · ETO. Example: Sinha Industries · Smartpower · Cherise.',
  process: 'Batch · campaign · pharma · chemicals · F&B. Example: BCPL · Shankar Pharma.',
  repetitive: 'Same product · long horizons · packaging · bottling · LED. Example: FMCG packaging lines.',
  mixed_mode: 'Plant runs discrete + process + repetitive simultaneously. Example: Abdos Multi-BU.',
  na: 'Non-manufacturing business. Production module hidden.',
};

export const MANUFACTURING_MODE_ICONS: Record<ManufacturingMode, string> = {
  discrete: '🔧',
  process: '🧪',
  repetitive: '🔁',
  mixed_mode: '🎛️',
  na: '🛒',
};

export const DEFAULT_MANUFACTURING_MODE: ManufacturingMode = 'discrete';
