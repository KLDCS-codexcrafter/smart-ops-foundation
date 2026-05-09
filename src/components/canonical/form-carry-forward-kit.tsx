/**
 * @file src/components/canonical/form-carry-forward-kit.tsx
 * @purpose Canonical FR-29 12-item carry-forward kit · re-exports the 6 mount components,
 *          decimal-helpers, and provides type contract + dev-time invariant hook for forms
 *          to declare their FR-29 coverage.
 * @who All form authors (every Sprint·card)
 * @when 2026-05-09
 * @sprint T-Phase-1.A.5.d-2-Trident-Closeout-FR29-Sidebar
 * @iso ISO 25010 Maintainability · Reusability
 * @whom Audit Owner
 * @decisions D-NEW-CE (FormCarryForwardKit canonical · α-d-2 Q-LOCK-5 Path B'+Q-LOCK-11a)
 * @disciplines FR-29 (12-item carry-forward) · FR-30 (canonical header) · FR-19 (sibling module)
 * @reuses src/components/uth/* · src/hooks/useSprint27d1Mount · src/lib/decimal-helpers
 * @[JWT] N/A (composition module · no storage · no API)
 */

// ─── 1. Canonical re-exports (forms import from THIS module, not directly from uth/) ───
export { UseLastVoucherButton } from '@/components/uth/UseLastVoucherButton';
export { Sprint27d2Mount } from '@/components/uth/Sprint27d2Mount';
export { Sprint27eMount, type Sprint27eMountHandle } from '@/components/uth/Sprint27eMount';
export { DraftRecoveryDialog } from '@/components/uth/DraftRecoveryDialog';
export { useSprint27d1Mount } from '@/hooks/useSprint27d1Mount';
export { dAdd, dSub, dMul, dPct, round2, dEq, dSum } from '@/lib/decimal-helpers';

// ─── 2. The canonical 12-item type contract (per FR-29 · MasterPlan §6.2) ───
export interface FormCarryForwardConfig {
  /** 1. UseLastVoucherButton · D-228 one-click duplicate of last entry */
  useLastVoucher: boolean;
  /** 2. useSprint27d1Mount · audit-trail capture */
  sprint27d1: boolean;
  /** 3. Sprint27d2Mount · keyboard shortcuts + bulk paste + line-item search */
  sprint27d2: boolean;
  /** 4. Sprint27eMount · OOB-9 InlineQuickAdd + OOB-10 PinFromVoucher */
  sprint27e: boolean;
  /** 5. KeyboardShortcutOverlay (auto-included by Sprint27d2Mount) */
  keyboardOverlay: boolean;
  /** 6. DraftRecoveryDialog · resume drafts on form crash */
  draftRecovery: boolean;
  /** 7. decimal-helpers (dMul · round2 · dPct · etc.) */
  decimalHelpers: boolean;
  /** 8. Standard File Header (FR-30 11-tag canonical) */
  fr30Header: boolean;
  /** 9. Smart Defaults (last vendor · last warehouse) — opt-in only when hook exists */
  smartDefaults: boolean;
  /** 10. Pinned Templates UI surface (auto via Sprint27eMount) */
  pinnedTemplates: boolean;
  /** 11. Ctrl+S save shortcut (auto via Sprint27d2Mount) */
  ctrlSSave: boolean;
  /** 12. Save-and-new carryover (preserve party/date when chaining) */
  saveAndNewCarryover: boolean;
}

// ─── 3. Dev-time invariant hook · warns if any item is missing ───
/**
 * Call once at the top of each capture form to declare its FR-29 coverage.
 * In dev mode, logs a warning if any of the 12 items is `false`.
 * In prod, the hook is inert (zero runtime cost).
 */
export function useFormCarryForwardChecklist(
  formName: string,
  config: FormCarryForwardConfig,
): void {
  if (import.meta.env.DEV) {
    const missing = (Object.keys(config) as Array<keyof FormCarryForwardConfig>)
      .filter((k) => config[k] === false);
    if (missing.length > 0) {
      // eslint-disable-next-line no-console -- dev-time discipline diagnostic
      console.warn(
        `[FormCarryForwardKit] ${formName} · ${missing.length}/12 FR-29 items deferred:`,
        missing.join(' · '),
      );
    }
  }
}

// ─── 4. The 12-item canonical roster (consumable as a list for documentation tools) ───
export const FORM_CARRY_FORWARD_ROSTER: ReadonlyArray<{
  n: number; key: keyof FormCarryForwardConfig; label: string; importedFrom: string;
}> = [
  { n: 1,  key: 'useLastVoucher',      label: 'UseLastVoucherButton (D-228)',          importedFrom: '@/components/uth/UseLastVoucherButton' },
  { n: 2,  key: 'sprint27d1',          label: 'useSprint27d1Mount (audit-trail)',      importedFrom: '@/hooks/useSprint27d1Mount' },
  { n: 3,  key: 'sprint27d2',          label: 'Sprint27d2Mount (keyboard + bulk)',     importedFrom: '@/components/uth/Sprint27d2Mount' },
  { n: 4,  key: 'sprint27e',           label: 'Sprint27eMount (QuickAdd + Pin)',       importedFrom: '@/components/uth/Sprint27eMount' },
  { n: 5,  key: 'keyboardOverlay',     label: 'KeyboardShortcutOverlay (via d2)',      importedFrom: '@/components/uth/KeyboardShortcutOverlay' },
  { n: 6,  key: 'draftRecovery',       label: 'DraftRecoveryDialog',                   importedFrom: '@/components/uth/DraftRecoveryDialog' },
  { n: 7,  key: 'decimalHelpers',      label: 'decimal-helpers (dMul/round2/etc.)',    importedFrom: '@/lib/decimal-helpers' },
  { n: 8,  key: 'fr30Header',          label: 'FR-30 canonical header',                importedFrom: 'inline · per-file' },
  { n: 9,  key: 'smartDefaults',       label: 'Smart Defaults (aspirational hook)',    importedFrom: 'TBD · Phase 2 backend' },
  { n: 10, key: 'pinnedTemplates',     label: 'Pinned Templates UI (via 27e)',         importedFrom: '@/components/uth/PinnedTemplatesQuickLauncher' },
  { n: 11, key: 'ctrlSSave',           label: 'Ctrl+S save shortcut (via 27d2)',       importedFrom: '@/hooks/useFormKeyboardShortcuts' },
  { n: 12, key: 'saveAndNewCarryover', label: 'Save-and-new party/date carryover',     importedFrom: '@/lib/save-and-new-carryover' },
];
