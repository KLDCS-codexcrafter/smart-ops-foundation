/**
 * error-engine-deep.test.ts — Sprint T-Phase-1.2.5h-c1 · M-1
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logError, readErrorLog, clearErrorLog } from '@/lib/error-engine';
import { errorLogKey, ERROR_LOG_MAX } from '@/types/error-log';

describe('error-engine · deep', () => {
  const ENT = 'TST';
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('erp_selected_company', ENT);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('EE1 · logError persists entry to entity-scoped key', () => {
    logError('validation', 'oops', { foo: 1 });
    expect(localStorage.getItem(errorLogKey(ENT))).toBeTruthy();
  });
  it('EE2 · logError captures category + severity + context', () => {
    const e = logError('voucher_post', 'post failed', { id: 'JV1' }, undefined, 'critical');
    expect(e.category).toBe('voucher_post');
    expect(e.severity).toBe('critical');
    expect(e.context.id).toBe('JV1');
  });
  it('EE3 · logError captures Error stack when provided', () => {
    const err = new Error('boom');
    const e = logError('network', 'fetch fail', {}, err);
    expect(e.stack).toBeTruthy();
    expect(e.stack).toContain('boom');
  });
  it('EE4 · circular buffer caps at ERROR_LOG_MAX', () => {
    for (let i = 0; i < ERROR_LOG_MAX + 25; i++) {
      logError('validation', `test-${i}`, { i });
    }
    const list = readErrorLog(ENT);
    expect(list.length).toBe(ERROR_LOG_MAX);
  });
  it('EE5 · readErrorLog filters by category', () => {
    logError('validation', 'a'); logError('voucher_post', 'b'); logError('network', 'c');
    const onlyValidation = readErrorLog(ENT, { category: 'validation' });
    expect(onlyValidation).toHaveLength(1);
    expect(onlyValidation[0].category).toBe('validation');
  });
  it('EE6 · readErrorLog limit clamps results', () => {
    for (let i = 0; i < 10; i++) logError('validation', `e${i}`);
    expect(readErrorLog(ENT, { limit: 3 })).toHaveLength(3);
  });
  it('EE7 · clearErrorLog wipes the entity bucket', () => {
    logError('validation', 'x');
    clearErrorLog(ENT);
    expect(readErrorLog(ENT)).toHaveLength(0);
  });
  it('EE8 · per-entity isolation (Q2-a)', () => {
    logError('validation', 'a');
    localStorage.setItem('erp_selected_company', 'OTHER');
    logError('validation', 'b');
    expect(readErrorLog(ENT)).toHaveLength(1);
    expect(readErrorLog('OTHER')).toHaveLength(1);
  });
});
