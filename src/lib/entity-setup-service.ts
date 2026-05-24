/**
 * @file        src/lib/entity-setup-service.ts
 * @sprint      T-Phase-3.PROD-2.5 · Sub-theme 4 · Q-LOCK-4 + Q-LOCK-5 + Q-LOCK-14
 * @purpose     Manufacturing-mode preset loading for entity setup ·
 *              narrow scope · NO cascading COA/org-structure overwrites.
 * @disciplines FR-26 entity-scoped reads · FR-93 engine-side ls-helper
 * @[JWT]       Phase 2: POST /api/foundation/entity-setup/apply-mfg-mode
 */

import type { ManufacturingMode } from '@/types/manufacturing-mode';
import {
  MANUFACTURING_MODE_LABELS,
  MANUFACTURING_MODE_DESCRIPTIONS,
  MANUFACTURING_MODE_ICONS,
  DEFAULT_MANUFACTURING_MODE,
} from '@/types/manufacturing-mode';
import type { MockEntity } from '@/data/mock-entities';
import { loadEntities } from '@/data/mock-entities';

// Per Q-LOCK-5 · MfgModePreset includes baseline + leak routing + UI badge config
export interface MfgModePreset {
  mode: ManufacturingMode;
  label: string;
  icon: string;
  description: string;
  defaultIndustryActivities: string[];
  orgStructurePreset: { divisions: string[]; departments: string[] };
  l4COAPackKey: 'discrete_mfg' | 'process_mfg' | 'repetitive_mfg' | 'mixed_mode_mfg' | 'na';
  productionOrderDefaults: { mode: 'discrete' | 'process_batch' | 'repetitive_lot' };
  applicableLeaks: string[];
  ui: {
    badgeColor: 'blue' | 'amber' | 'green' | 'purple' | 'gray';
    description: string;
  };
}

const PRESETS: Record<ManufacturingMode, MfgModePreset> = {
  discrete: {
    mode: 'discrete',
    label: MANUFACTURING_MODE_LABELS.discrete,
    icon: MANUFACTURING_MODE_ICONS.discrete,
    description: MANUFACTURING_MODE_DESCRIPTIONS.discrete,
    defaultIndustryActivities: ['steel-metals', 'electronics-electrical', 'engineering-goods', 'capital-goods', 'contract-manufacturing', 'assembly-operations'],
    orgStructurePreset: {
      divisions: ['Fabrication', 'Machining', 'Assembly', 'Quality'],
      departments: ['Production Planning', 'Shop Floor', 'Tool Room', 'Despatch'],
    },
    l4COAPackKey: 'discrete_mfg',
    productionOrderDefaults: { mode: 'discrete' },
    applicableLeaks: ['LEAK-1', 'LEAK-2', 'LEAK-3', 'LEAK-4', 'LEAK-5', 'LEAK-6', 'LEAK-7', 'LEAK-8', 'LEAK-12', 'LEAK-13', 'LEAK-14'],
    ui: { badgeColor: 'blue', description: 'Countable units · ETO · job shop' },
  },
  process: {
    mode: 'process',
    label: MANUFACTURING_MODE_LABELS.process,
    icon: MANUFACTURING_MODE_ICONS.process,
    description: MANUFACTURING_MODE_DESCRIPTIONS.process,
    defaultIndustryActivities: ['pharmaceuticals', 'chemicals-petrochemicals', 'food-beverage-processing'],
    orgStructurePreset: {
      divisions: ['Plant Operations', 'Quality', 'Laboratory', 'Utilities'],
      departments: ['Process Control', 'Batch Production', 'CIP/SIP', 'Effluent Treatment'],
    },
    l4COAPackKey: 'process_mfg',
    productionOrderDefaults: { mode: 'process_batch' },
    applicableLeaks: ['LEAK-1', 'LEAK-2', 'LEAK-3', 'LEAK-4', 'LEAK-9', 'LEAK-10', 'LEAK-11', 'LEAK-12', 'LEAK-13'],
    ui: { badgeColor: 'amber', description: 'Batch · continuous-flow · GMP' },
  },
  repetitive: {
    mode: 'repetitive',
    label: MANUFACTURING_MODE_LABELS.repetitive,
    icon: MANUFACTURING_MODE_ICONS.repetitive,
    description: MANUFACTURING_MODE_DESCRIPTIONS.repetitive,
    defaultIndustryActivities: ['fmcg-manufacturing', 'plastics-packaging'],
    orgStructurePreset: {
      divisions: ['Packaging Lines', 'Quality', 'Logistics'],
      departments: ['Line Supervision', 'Materials Feed', 'Pack Out'],
    },
    l4COAPackKey: 'repetitive_mfg',
    productionOrderDefaults: { mode: 'repetitive_lot' },
    applicableLeaks: ['LEAK-2', 'LEAK-4', 'LEAK-6', 'LEAK-7', 'LEAK-8', 'LEAK-13', 'LEAK-14'],
    ui: { badgeColor: 'green', description: 'High volume · same product' },
  },
  mixed_mode: {
    mode: 'mixed_mode',
    label: MANUFACTURING_MODE_LABELS.mixed_mode,
    icon: MANUFACTURING_MODE_ICONS.mixed_mode,
    description: MANUFACTURING_MODE_DESCRIPTIONS.mixed_mode,
    defaultIndustryActivities: ['textiles-apparel', 'fmcg-manufacturing', 'plastics-packaging'],
    orgStructurePreset: {
      divisions: ['BU-Discrete', 'BU-Process', 'BU-Packaging', 'Shared Services'],
      departments: ['Multi-BU Planning', 'Shared QC', 'Common Despatch'],
    },
    l4COAPackKey: 'mixed_mode_mfg',
    productionOrderDefaults: { mode: 'discrete' },
    applicableLeaks: ['LEAK-1', 'LEAK-2', 'LEAK-3', 'LEAK-4', 'LEAK-5', 'LEAK-6', 'LEAK-7', 'LEAK-8', 'LEAK-9', 'LEAK-10', 'LEAK-11', 'LEAK-12', 'LEAK-13', 'LEAK-14'],
    ui: { badgeColor: 'purple', description: 'Multi-BU · discrete + process + repetitive' },
  },
  na: {
    mode: 'na',
    label: MANUFACTURING_MODE_LABELS.na,
    icon: MANUFACTURING_MODE_ICONS.na,
    description: MANUFACTURING_MODE_DESCRIPTIONS.na,
    defaultIndustryActivities: ['others'],
    orgStructurePreset: { divisions: [], departments: [] },
    l4COAPackKey: 'na',
    productionOrderDefaults: { mode: 'discrete' },
    applicableLeaks: [],
    ui: { badgeColor: 'gray', description: 'Trading / Services · no manufacturing' },
  },
};

/** Load the preset for a given mfg-mode (pure function · no I/O). */
export function loadManufacturingModePreset(mode: ManufacturingMode): MfgModePreset {
  return PRESETS[mode] ?? PRESETS[DEFAULT_MANUFACTURING_MODE];
}

/**
 * Apply mfg-mode to an entity · Q-LOCK-14 SAFE WRITE (mode field only · NO cascading).
 * Writes ONLY to the entity's manufacturingMode field in localStorage 'erp_group_entities'.
 */
export function applyManufacturingModeToEntity(entityCode: string, mode: ManufacturingMode): void {
  try {
    // [JWT] PATCH /api/foundation/entities/:entityCode { manufacturingMode }
    const raw = localStorage.getItem('erp_group_entities');
    const entities: MockEntity[] = raw ? (JSON.parse(raw) as MockEntity[]) : loadEntities();
    const next = entities.map(e =>
      e.shortCode === entityCode ? { ...e, manufacturingMode: mode } : e,
    );
    localStorage.setItem('erp_group_entities', JSON.stringify(next));
  } catch (err) {
    console.warn('[entity-setup-service] applyManufacturingModeToEntity failed:', err);
  }
}

/** Get current entity's mfg-mode · defaults to 'discrete' if unset (Q-LOCK-3 safe default). */
export function getEntityManufacturingMode(entityCode: string): ManufacturingMode {
  try {
    // [JWT] GET /api/foundation/entities/:entityCode/manufacturing-mode
    const entities = loadEntities();
    const entity = entities.find(e => e.shortCode === entityCode);
    return entity?.manufacturingMode ?? DEFAULT_MANUFACTURING_MODE;
  } catch {
    return DEFAULT_MANUFACTURING_MODE;
  }
}

/** Inherit mfg-mode from parent entity · used when adding subsidiary/branch entities. */
export function inheritManufacturingModeFromParent(
  entityCode: string,
  parentEntityCode: string,
): void {
  const parentMode = getEntityManufacturingMode(parentEntityCode);
  applyManufacturingModeToEntity(entityCode, parentMode);
}
