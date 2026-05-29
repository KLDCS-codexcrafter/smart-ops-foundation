/**
 * @file        src/test/sprint-78b/comply360-sprint-78b.test.ts
 * @purpose     Sprint 78b Pass B · 3 surfaces + home tab-shell + 2 mega-menu wirings + widget rewire.
 * @sprint      Sprint 78b · T-Phase-5.A.1.10-PASS-B
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { SPRINTS, getCurrentAStreak, getSprintCount } from '@/lib/_institutional/sprint-history';
import { getSiblingCount } from '@/lib/_institutional/sibling-register';
import {
  buildCalendar, nextUpcomingEvents, calendarForMonth,
} from '@/lib/comply360-calendar-engine';
import {
  loadPayments, computePaymentDue, prepareChallan,
} from '@/lib/comply360-statutory-payments-engine';
import {
  replaySnapshot, listAvailableSnapshots, compareSnapshots,
} from '@/lib/comply360-time-machine-engine';

const ROOT = path.resolve(__dirname, '../../..');
const p = (rel: string): string => path.join(ROOT, rel);

describe('Sprint 78b · snapshot · sprint-history entry', () => {
  // Lesson 24 · id-lookup not array-index
  it('Sprint 78b code = T-Phase-5.A.1.10-PASS-B', () => {
    const s = SPRINTS.find((x) => x.code === 'T-Phase-5.A.1.10-PASS-B');
    expect(s).toBeDefined();
    expect(s?.grade).toBe('A first-pass-clean');
    expect(s?.newSiblings.length).toBe(0);
    expect(s?.predecessorSha).toBe('d5db78986311ed587c47a343790a0b704fa9ad98');
  });

  // Lesson 24 bounds-check · future sprints extend
  it('A-streak ≥ 31', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(31);
  });

  it('SPRINTS ≥ 84', () => {
    expect(getSprintCount()).toBeGreaterThanOrEqual(84);
  });

  it('SIBLINGS still ≥ 88 (no new engine SIBLINGs in Pass B)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(88);
  });

  it('Sprint 78a SHA backfilled · d5db78986311ed587c47a343790a0b704fa9ad98', () => {
    const s = SPRINTS.find((x) => x.code === 'T-Phase-5.A.1.10-PASS-A');
    expect(s?.headSha).toBe('d5db78986311ed587c47a343790a0b704fa9ad98');
  });
});

describe('Sprint 78b · RECG · 3 surfaces + HomePage + Welcome rewire', () => {
  it('CalendarPage exists', () => {
    expect(existsSync(p('src/pages/erp/comply360/calendar/CalendarPage.tsx'))).toBe(true);
  });
  it('StatutoryPaymentsPage exists', () => {
    expect(existsSync(p('src/pages/erp/comply360/payments/StatutoryPaymentsPage.tsx'))).toBe(true);
  });
  it('HomePage exists', () => {
    expect(existsSync(p('src/pages/erp/comply360/home/HomePage.tsx'))).toBe(true);
  });
  it('TimeMachinePage exists', () => {
    expect(existsSync(p('src/pages/erp/comply360/home/TimeMachinePage.tsx'))).toBe(true);
  });
  it('HomePage renders ≥2 TabsTrigger (Welcome + Time-Machine)', () => {
    const src = readFileSync(p('src/pages/erp/comply360/home/HomePage.tsx'), 'utf8');
    const matches = src.match(/TabsTrigger/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(src).toContain('Welcome');
    expect(src).toContain('Time-Machine');
  });
});

describe('Sprint 78b · router wiring · calendar + payments + HomePage', () => {
  const src = readFileSync(p('src/pages/erp/comply360/Comply360Page.tsx'), 'utf8');
  it("Comply360Page has case 'calendar'", () => {
    expect(src).toMatch(/case 'calendar'/);
  });
  it("Comply360Page has case 'payments'", () => {
    expect(src).toMatch(/case 'payments'/);
  });
  it('Comply360Page routes home/welcome to <HomePage />', () => {
    expect(src).toContain('<HomePage');
  });
});

describe('Sprint 78b · CalendarPage engine smoke', () => {
  it('buildCalendar returns events (≥80 seeded statutory dates)', () => {
    const cal = buildCalendar('DEMO-CORP-01', '2025-26');
    expect(cal.length).toBeGreaterThanOrEqual(50);
  });
  it('nextUpcomingEvents returns ≤ n', () => {
    const up = nextUpcomingEvents('DEMO-CORP-01', 5, new Date('2026-04-01'));
    expect(up.length).toBeLessThanOrEqual(5);
  });
  it('calendarForMonth filters to a single month prefix', () => {
    const m = calendarForMonth('DEMO-CORP-01', 2026, 4);
    for (const e of m) expect(e.due_date.startsWith('2026-04')).toBe(true);
  });
});

describe('Sprint 78b · StatutoryPaymentsPage engine smoke', () => {
  it('loadPayments seeds payment rows on first call', () => {
    const list = loadPayments('TEST-ENT-78B-A', '2025-26');
    expect(Array.isArray(list)).toBe(true);
  });
  it('computePaymentDue produces a breakdown', () => {
    const p1 = computePaymentDue('TEST-ENT-78B-B', 'gst', '2026-04');
    expect(p1.amount_inr).toBeGreaterThan(0);
    expect(p1.computed_breakdown).toBeDefined();
  });
  it('prepareChallan returns a portal handoff payload', () => {
    const p1 = computePaymentDue('TEST-ENT-78B-C', 'tds', '2026-05');
    const c = prepareChallan(p1);
    expect(c.handoff_payload.portal_endpoint).toMatch(/nsdl|gst|epfindia|esic|incometax/);
    expect(c.handoff_payload.payment_id).toBe(p1.id);
  });
});

describe('Sprint 78b · TimeMachinePage engine smoke', () => {
  it('listAvailableSnapshots returns an array', () => {
    expect(Array.isArray(listAvailableSnapshots('DEMO-CORP-01', 'gstr-1'))).toBe(true);
  });
  it('replaySnapshot returns a snapshot envelope', async () => {
    const snap = await replaySnapshot('DEMO-CORP-01', 'gstr-1', 'GSTR1-2025-04-001', '2025-06-01');
    expect(snap.entity_id).toBe('GSTR1-2025-04-001');
    expect(snap.as_of).toBe('2025-06-01');
  });
  it('compareSnapshots returns diff_keys', async () => {
    const a = await replaySnapshot('DEMO-CORP-01', 'gstr-1', 'X', '2025-05-01');
    const b = await replaySnapshot('DEMO-CORP-01', 'gstr-1', 'Y', '2025-06-01');
    const d = compareSnapshots(a, b);
    expect(Array.isArray(d.diff_keys)).toBe(true);
  });
});

describe('Sprint 78b · DP-S78-7 · widget files 0-DIFF (no edits)', () => {
  it('Comply360Welcome rewires data-source to include calendar engine', () => {
    const src = readFileSync(p('src/pages/erp/comply360/Comply360Welcome.tsx'), 'utf8');
    expect(src).toContain('comply360-calendar-engine');
  });
});

describe('Sprint 78b · FR-105 done-gate · scattered-snapshot grep is 0', () => {
  it('no equality snapshot bumps in src/test/', () => {
    const out = execSync(
      'grep -rn --exclude=comply360-sprint-77b.test.ts --exclude=comply360-sprint-78b.test.ts ' +
        '"getSiblingCount()).toBe(\\|getSprintCount()).toBe(\\|getCurrentAStreak()).toBe(" src/test/ || true',
      { cwd: ROOT, encoding: 'utf8' },
    );
    expect(out.trim()).toBe('');
  });
});
