/**
 * @file src/lib/form-carry-forward-kit.ts
 * @purpose Lib half of the canonical FR-29 12-item carry-forward kit · types · roster ·
 *          dev-time invariant hook · re-exports of non-JSX hooks + decimal helpers.
 *          Companion to src/components/canonical/form-carry-forward-kit.tsx (UI re-exports).
 * @who All form authors (every Sprint·card)
 * @when 2026-05-09
 * @sprint T-Phase-1.A.5.d-2-T1-AuditFix · Block A (closes F-1 D-NEW-CB violation)
 * @iso ISO 25010 Maintainability · Reusability
 * @whom Audit Owner
 * @decisions D-NEW-CE (FormCarryForwardKit canonical) · D-NEW-CB (parsers/utils in lib/, never component files)
 * @disciplines FR-29 · FR-30 · FR-19 (sibling module)
 * @reuses src/hooks/useSprint27d1Mount · src/lib/decimal-helpers
 * @[JWT] N/A (composition module · no storage · no API)
 */

// ─── 1. Re-exports of non-JSX hooks/utilities ───
export { useSprint27d1Mount } from '@/hooks/useSprint27d1Mount';
export { dAdd, dSub, dMul, dPct, round2, dEq, dSum } from '@/lib/decimal-helpers';

// ─── 2. The canonical 12-item type contract (per FR-29 · MasterPlan §6.2) ───
export interface FormCarryForwardConfig {
  useLastVoucher: boolean;
  sprint27d1: boolean;
  sprint27d2: boolean;
  sprint27e: boolean;
  keyboardOverlay: boolean;
  draftRecovery: boolean;
  decimalHelpers: boolean;
  fr30Header: boolean;
  smartDefaults: boolean;
  pinnedTemplates: boolean;
  ctrlSSave: boolean;
  saveAndNewCarryover: boolean;
}

// ─── 3. Dev-time invariant hook · warns if any item is missing ───
export function useFormCarryForwardChecklist(
  formName: string,
  config: FormCarryForwardConfig,
): void {
  if (import.meta.env.DEV) {
    const missing = (Object.keys(config) as Array<keyof FormCarryForwardConfig>)
      .filter((k) => config[k] === false);
    if (missing.length > 0) {
      console.warn(
        `[FormCarryForwardKit] ${formName} · ${missing.length}/12 FR-29 items deferred:`,
        missing.join(' · '),
      );
    }
  }
}

// ─── 4. Roster · runtime-readable list ───
export const FORM_CARRY_FORWARD_ROSTER: ReadonlyArray<{
  n: number; key: keyof FormCarryForwardConfig; label: string; importedFrom: string;
}> = [
  { n: 1,  key: 'useLastVoucher',      label: 'UseLastVoucherButton (D-228)',          importedFrom: '@/components/canonical/form-carry-forward-kit' },
  { n: 2,  key: 'sprint27d1',          label: 'useSprint27d1Mount (audit-trail)',      importedFrom: '@/lib/form-carry-forward-kit' },
  { n: 3,  key: 'sprint27d2',          label: 'Sprint27d2Mount (keyboard + bulk)',     importedFrom: '@/components/canonical/form-carry-forward-kit' },
  { n: 4,  key: 'sprint27e',           label: 'Sprint27eMount (QuickAdd + Pin)',       importedFrom: '@/components/canonical/form-carry-forward-kit' },
  { n: 5,  key: 'keyboardOverlay',     label: 'KeyboardShortcutOverlay (via d2)',      importedFrom: 'auto via Sprint27d2Mount' },
  { n: 6,  key: 'draftRecovery',       label: 'DraftRecoveryDialog',                   importedFrom: '@/components/canonical/form-carry-forward-kit' },
  { n: 7,  key: 'decimalHelpers',      label: 'decimal-helpers (dMul/round2/etc.)',    importedFrom: '@/lib/form-carry-forward-kit' },
  { n: 8,  key: 'fr30Header',          label: 'FR-30 canonical header',                importedFrom: 'inline · per-file' },
  { n: 9,  key: 'smartDefaults',       label: 'Smart Defaults (aspirational hook)',    importedFrom: 'TBD · Phase 2 backend' },
  { n: 10, key: 'pinnedTemplates',     label: 'Pinned Templates UI (via 27e)',         importedFrom: 'auto via Sprint27eMount' },
  { n: 11, key: 'ctrlSSave',           label: 'Ctrl+S save shortcut (via 27d2)',       importedFrom: 'auto via Sprint27d2Mount' },
  { n: 12, key: 'saveAndNewCarryover', label: 'Save-and-new party/date carryover',     importedFrom: 'inline · per-form handleSaveAndNew' },
];
