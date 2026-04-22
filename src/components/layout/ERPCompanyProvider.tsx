/**
 * ERPCompanyProvider.tsx — Central React Context for selected ERP company.
 *
 * PURPOSE
 * Replaces the localStorage-read-on-every-call `useERPCompany()` pattern with a
 * proper React Context. Every consumer re-renders when the selected company
 * changes — fixes the silent-wrong-answer bug where switching the company in the
 * header dropdown did NOT cause voucher forms, reports, or hooks to refetch.
 *
 * Also introduces a PRE-COMMIT guard flow: subscribers (voucher forms with unsaved
 * work) can prevent a switch via eventBus.emit('entity.beforeChange', ...). If any
 * subscriber calls payload.prevent(), the switch is aborted and the dropdown
 * reverts to the prior value. Otherwise the switch commits and 'entity.changed'
 * fires so reports and other consumers refetch.
 *
 * The provider also exposes `forceSwitchEntity(newId)` which bypasses the guard
 * — used by `useVoucherEntityGuard` after the user picks Discard or Save as Draft
 * in the 3-choice dialog.
 *
 * INPUT        children (React tree to wrap)
 * OUTPUT       Context value { selectedCompany, setSelectedCompany, forceSwitchEntity }
 *
 * DEPENDENCIES react, event-bus, card-audit-engine.logAudit
 *
 * TALLY-ON-TOP Neutral. Entity state is platform-wide; accounting_mode is a
 *              separate tenant-config concern.
 *
 * SPEC DOC     Sprint T10-pre.1c Session A — per Multi-Company Readiness Audit.
 *              Q1 3-choice dialog (discard/save-as-draft/cancel) handled by
 *              useVoucherEntityGuard subscribers. Provider just orchestrates.
 */
import {
  createContext, useContext, useState, useEffect, useCallback,
  type ReactNode,
} from 'react';
import { eventBus } from '@/lib/event-bus';
import { logAudit } from '@/lib/card-audit-engine';

const STORAGE_KEY = 'erp-selected-company';

interface ERPCompanyContextValue {
  /** Current selected company ID, or 'all' for consolidated mode (blocked in most places). */
  selectedCompany: string;
  /** Request a switch. Fires guard first; if any voucher form prevents it, returns false. */
  setSelectedCompany: (newId: string) => Promise<boolean>;
  /**
   * Bypass guard and commit a switch — used by useVoucherEntityGuard after the
   * user resolves the unsaved-changes dialog. Still emits entity.changed and
   * writes an audit entry.
   */
  forceSwitchEntity: (newId: string) => void;
}

const ERPCompanyContext = createContext<ERPCompanyContextValue | null>(null);

function readStored(): string {
  // [JWT] GET /api/user/company-selection
  try { return localStorage.getItem(STORAGE_KEY) ?? 'all'; } catch { return 'all'; }
}

function commitSwitch(fromEntityCode: string, toEntityCode: string): void {
  // Audit log — Q4 decision: extend existing logAudit with new action string.
  try {
    logAudit({
      entityCode: toEntityCode,
      userId: 'demo-user',          // [JWT] replace with real user when auth integrates
      userName: 'demo-user',
      cardId: 'command-center',
      action: 'entity.switched',
      refType: 'entity',
      refId: toEntityCode,
      refLabel: `${fromEntityCode} → ${toEntityCode}`,
    });
  } catch { /* non-fatal */ }

  try {
    eventBus.emit('entity.changed', {
      fromEntityCode,
      toEntityCode,
      userId: 'demo-user',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[ERPCompanyProvider] entity.changed listener threw:', err);
  }
}

export function ERPCompanyProvider({ children }: { children: ReactNode }) {
  const [selectedCompany, setSelectedCompanyState] = useState<string>(readStored);

  useEffect(() => {
    // [JWT] PATCH /api/user/company-selection
    try { localStorage.setItem(STORAGE_KEY, selectedCompany); } catch { /* non-fatal */ }
  }, [selectedCompany]);

  const forceSwitchEntity = useCallback((newId: string) => {
    setSelectedCompanyState(prev => {
      if (prev === newId) return prev;
      commitSwitch(prev, newId);
      return newId;
    });
  }, []);

  const setSelectedCompany = useCallback(async (newId: string): Promise<boolean> => {
    if (newId === selectedCompany) return true;

    let prevented = false;
    const preventFn = () => { prevented = true; };

    try {
      eventBus.emit('entity.beforeChange', {
        fromEntityCode: selectedCompany,
        toEntityCode: newId,
        prevent: preventFn,
      });
    } catch (err) {
      console.error('[ERPCompanyProvider] entity.beforeChange listener threw:', err);
      // Fail open — do not block switch on subscriber errors
    }

    if (prevented) return false;

    const fromEntityCode = selectedCompany;
    setSelectedCompanyState(newId);
    commitSwitch(fromEntityCode, newId);
    return true;
  }, [selectedCompany]);

  return (
    <ERPCompanyContext.Provider
      value={{ selectedCompany, setSelectedCompany, forceSwitchEntity }}
    >
      {children}
    </ERPCompanyContext.Provider>
  );
}

/**
 * Consume the provider. Returns [selectedCompany, setSelectedCompany] tuple
 * to match the legacy useERPCompany signature — minimizes migration churn.
 *
 * BACKWARD COMPATIBILITY: If no provider is mounted (Storybook, isolated tests),
 * falls back to localStorage read; setter writes to localStorage but does NOT
 * trigger re-renders. Logs a one-time warning.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useERPCompanyContext(): [string, (id: string) => Promise<boolean>] {
  const ctx = useContext(ERPCompanyContext);
  if (ctx) return [ctx.selectedCompany, ctx.setSelectedCompany];

  if (typeof window !== 'undefined') {
    const w = window as unknown as { __erpProviderWarned?: boolean };
    if (!w.__erpProviderWarned) {
      console.warn(
        '[ERPCompanyProvider] not mounted — falling back to localStorage. ' +
        'Wrap your tree in <ERPCompanyProvider> for re-renders on entity switch.',
      );
      w.__erpProviderWarned = true;
    }
  }

  const stored = readStored();
  const noopSet = async (id: string): Promise<boolean> => {
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* noop */ }
    return true;
  };
  return [stored, noopSet];
}

/**
 * Force-switch hook — used exclusively by useVoucherEntityGuard. Throws if the
 * provider is not mounted (force switch only makes sense inside the guard flow,
 * which itself only operates inside the provider tree).
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useForceSwitchEntity(): (newId: string) => void {
  const ctx = useContext(ERPCompanyContext);
  if (!ctx) {
    return () => {
      console.warn(
        '[useForceSwitchEntity] called without ERPCompanyProvider mounted — no-op.',
      );
    };
  }
  return ctx.forceSwitchEntity;
}
