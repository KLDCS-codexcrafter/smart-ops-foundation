/**
 * useDraftAutoSave — Sprint 2.7-d-1 · auto-save form state to localStorage every 30s.
 *
 * Storage key:    erp_draft_${formKey}_${entityCode}
 * Storage value:  { savedAt: ISO, formData: serialized }
 *
 * Silent on quota error · doesn't break the form.
 *
 * [JWT] Phase 2: replace with PUT /api/drafts/:formKey
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseDraftAutoSaveResult {
  saveNow: () => void;
  clearDraft: () => void;
  hasDraft: boolean;
  draftAge: number; // seconds since last save (0 if no draft)
}

function draftKey(formKey: string, entityCode: string): string {
  return `erp_draft_${formKey}_${entityCode}`;
}

/**
 * writeDraftToStorage — pure helper · serializes form state into the draft envelope
 * and writes it to localStorage. Returns true on success, false on silent guard
 * (empty entityCode) or quota / serialize failure.
 *
 * Consumed by both `useDraftAutoSave` (production) and the SD5 test (no renderHook needed).
 *
 * [JWT] Phase 2: replace with PUT /api/drafts/:formKey
 */
export function writeDraftToStorage<T>(
  formKey: string,
  entityCode: string,
  formState: T,
): boolean {
  if (!entityCode) return false;
  try {
    const payload = JSON.stringify({
      savedAt: new Date().toISOString(),
      formData: JSON.stringify(formState),
    });
    localStorage.setItem(draftKey(formKey, entityCode), payload);
    return true;
  } catch {
    return false;
  }
}

function readDraftMeta(key: string): { savedAt: string } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: string };
    return parsed && typeof parsed.savedAt === 'string' ? { savedAt: parsed.savedAt } : null;
  } catch {
    return null;
  }
}

export function useDraftAutoSave<T>(
  formKey: string,
  entityCode: string,
  formState: T,
  intervalMs: number = 30000,
): UseDraftAutoSaveResult {
  const stateRef = useRef<T>(formState);
  stateRef.current = formState;

  const key = draftKey(formKey, entityCode);

  const [hasDraft, setHasDraft] = useState<boolean>(() => readDraftMeta(key) !== null);
  const [draftAge, setDraftAge] = useState<number>(() => {
    const meta = readDraftMeta(key);
    return meta ? Math.max(0, Math.floor((Date.now() - new Date(meta.savedAt).getTime()) / 1000)) : 0;
  });

  const saveNow = useCallback(() => {
    if (writeDraftToStorage(formKey, entityCode, stateRef.current)) {
      setHasDraft(true);
      setDraftAge(0);
    }
  }, [entityCode, formKey]);

  const clearDraft = useCallback(() => {
    try {
      // [JWT] DELETE /api/drafts/:formKey
      localStorage.removeItem(key);
    } catch {
      /* silent */
    }
    setHasDraft(false);
    setDraftAge(0);
  }, [key]);

  // Auto-save on interval
  useEffect(() => {
    if (!entityCode) return;
    const id = window.setInterval(() => {
      saveNow();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [entityCode, intervalMs, saveNow]);

  // Refresh draftAge once per second
  useEffect(() => {
    if (!hasDraft) return;
    const id = window.setInterval(() => {
      const meta = readDraftMeta(key);
      if (meta) {
        setDraftAge(Math.max(0, Math.floor((Date.now() - new Date(meta.savedAt).getTime()) / 1000)));
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [hasDraft, key]);

  return { saveNow, clearDraft, hasDraft, draftAge };
}
