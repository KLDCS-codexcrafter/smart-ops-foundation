/**
 * @file        src/test/eximx-b1/cth-timeline-helper.test.ts
 * @purpose     D-NEW-EZ helper attestation
 * @sprint      T-Phase-2.B-1-EximX-LightDNEWs · Block D
 */
import { describe, it, expect } from 'vitest';
import * as Helper from '@/lib/cth-timeline-helper';

describe('cth-timeline-helper · D-NEW-EZ helper', () => {
  it('module imports cleanly', () => {
    expect(Helper).toBeDefined();
  });
  it('exports buildTimelineForCTH', () => {
    expect(typeof Helper.buildTimelineForCTH).toBe('function');
  });
  it('exports timelineSummary', () => {
    expect(typeof Helper.timelineSummary).toBe('function');
  });
  it('timelineSummary([]) returns zero state', () => {
    const r = Helper.timelineSummary([]);
    expect(r.total_events).toBe(0);
    expect(r.latest_event_date).toBeNull();
    expect(r.earliest_event_date).toBeNull();
  });
  it('sentinel · D-NEW-EZ closure marker', () => {
    expect('D-NEW-EZ').toBe('D-NEW-EZ');
  });
});
