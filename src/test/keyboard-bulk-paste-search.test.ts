/**
 * keyboard-bulk-paste-search.test.ts
 * Sprint T-Phase-2.7-d-2 · 6 new tests KB1-KB6
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  matchFormShortcut,
  evaluateInlineFormula,
  UNIVERSAL_FORM_BINDINGS,
} from '@/lib/form-keyboard-engine';
import { searchLineItems, FULL_TEXT_THRESHOLD } from '@/lib/line-item-search';
import {
  parseBulkPaste,
  detectPasteFormat,
  shouldAutoTriggerBulkPaste,
} from '@/lib/bulk-paste-engine';

const ENTITY = 'KBTEST';

function makeKeyEvent(init: {
  key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean;
  targetTag?: 'INPUT' | 'TEXTAREA' | 'DIV';
}): KeyboardEvent {
  const e = new KeyboardEvent('keydown', {
    key: init.key,
    ctrlKey: !!init.ctrl,
    shiftKey: !!init.shift,
    altKey: !!init.alt,
    metaKey: !!init.meta,
  });
  if (init.targetTag) {
    const el = document.createElement(init.targetTag.toLowerCase());
    Object.defineProperty(e, 'target', { value: el, enumerable: true });
  }
  return e;
}

describe('Sprint 2.7-d-2 · keyboard + search + bulk-paste', () => {
  beforeEach(() => { localStorage.clear(); });

  it('KB1 · matchFormShortcut discriminates Ctrl+S vs Ctrl+Shift+S', () => {
    const eDraft = makeKeyEvent({ key: 's', ctrl: true });
    const eDraftMatch = matchFormShortcut(eDraft, UNIVERSAL_FORM_BINDINGS);
    expect(eDraftMatch?.binding.action).toBe('save_draft');

    const ePost = makeKeyEvent({ key: 'S', ctrl: true, shift: true });
    const ePostMatch = matchFormShortcut(ePost, UNIVERSAL_FORM_BINDINGS);
    expect(ePostMatch?.binding.action).toBe('save_post');
  });

  it('KB2 · Enter inside textarea does NOT match (fireInTextarea: false on Ctrl+Enter)', () => {
    const e = makeKeyEvent({ key: 'Enter', ctrl: true, targetTag: 'TEXTAREA' });
    const m = matchFormShortcut(e, UNIVERSAL_FORM_BINDINGS);
    expect(m).toBeNull();
  });

  it('KB3 · Escape inside textarea DOES match (fireInTextarea: true)', () => {
    const e = makeKeyEvent({ key: 'Escape', targetTag: 'TEXTAREA' });
    const m = matchFormShortcut(e, UNIVERSAL_FORM_BINDINGS);
    expect(m?.binding.action).toBe('cancel_or_close');
  });

  it('KB4 · evaluateInlineFormula handles =12*1.18 · =qty*rate context · invalid → null', () => {
    expect(evaluateInlineFormula('=12*1.18')).toBeCloseTo(14.16, 2);
    expect(evaluateInlineFormula('=qty*rate', { qty: 5, rate: 100 })).toBe(500);
    expect(evaluateInlineFormula('100+50')).toBe(150);
    expect(evaluateInlineFormula('=100*15%')).toBe(15);
    expect(evaluateInlineFormula('=foo+bar')).toBeNull();
    expect(evaluateInlineFormula('=12 ** 2')).toBeNull();
    expect(evaluateInlineFormula('')).toBeNull();
  });

  it('KB5 · searchLineItems uses full-text ≤100 rows · falls back >100 rows', () => {
    const small = Array.from({ length: 5 }, (_, i) => ({
      item_name: `Widget ${i}`,
      description: i === 2 ? 'special MAGIC keyword' : 'plain',
      hsn_sac_code: '8501',
    }));
    const r1 = searchLineItems(small, 'magic');
    expect(r1.searchScope).toBe('full-text');
    expect(r1.matches).toHaveLength(1);
    expect(r1.matches[0].rowIndex).toBe(2);

    const big = Array.from({ length: FULL_TEXT_THRESHOLD + 5 }, (_, i) => ({
      item_name: `Item ${i}`,
      description: i === 50 ? 'magic in description' : '',
      hsn_sac_code: '8501',
    }));
    const r2 = searchLineItems(big, 'magic');
    expect(r2.searchScope).toBe('3-field-fallback');
    expect(r2.fallbackReason).toBeTruthy();
    // description NOT searched in fallback · so 0 matches
    expect(r2.matches).toHaveLength(0);

    const r3 = searchLineItems(big, 'item 50');
    expect(r3.matches.some((m) => m.rowIndex === 50)).toBe(true);
  });

  it('KB6 · parseBulkPaste detects TSV/CSV/JSON · matched/unmatched counts correct', () => {
    // Seed item master
    localStorage.setItem(`erp_group_items_${ENTITY}`, JSON.stringify([
      { id: 'i1', name: 'Widget A', hsn_sac_code: '8501' },
      { id: 'i2', name: 'Widget B', hsn_sac_code: '8501' },
    ]));

    const tsv = 'Widget A\t10\t100\nWidget B\t5\t200\nUnknown Item\t1\t50';
    expect(detectPasteFormat(tsv)).toBe('tsv');
    const tsvR = parseBulkPaste(tsv, ENTITY);
    expect(tsvR.format).toBe('tsv');
    expect(tsvR.rows).toHaveLength(3);
    expect(tsvR.matchedCount).toBe(2);
    expect(tsvR.unmatchedCount).toBe(1);

    const csv = 'item_name,qty,rate\nWidget A,3,99\nMystery,2,10';
    expect(detectPasteFormat(csv)).toBe('csv');
    const csvR = parseBulkPaste(csv, ENTITY);
    expect(csvR.matchedCount).toBe(1);
    expect(csvR.unmatchedCount).toBe(1);

    const json = JSON.stringify([
      { item_name: 'Widget A', qty: 1, rate: 100 },
      { item_name: 'Nope', qty: 2, rate: 50 },
    ]);
    expect(detectPasteFormat(json)).toBe('json');
    const jsonR = parseBulkPaste(json, ENTITY);
    expect(jsonR.matchedCount).toBe(1);
    expect(jsonR.unmatchedCount).toBe(1);

    // shouldAutoTriggerBulkPaste
    expect(shouldAutoTriggerBulkPaste(tsv)).toBe(true);
    expect(shouldAutoTriggerBulkPaste('single line')).toBe(false);
    expect(shouldAutoTriggerBulkPaste('a\nb\nc')).toBe(false); // no separator
  });
});
