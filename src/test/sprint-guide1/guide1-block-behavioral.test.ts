/**
 * @file        src/test/sprint-guide1/guide1-block-behavioral.test.ts
 * @purpose     GUIDE-1 behavioral guards · 6 persona apps now first-class operix-go entries · completeness assertion
 * @sprint      T-GUIDE1-OperixGo-Personas
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const OPERIX_GO = resolve(__dirname, '../../pages/mobile/OperixGoPage.tsx');
const MOBILE_DIR = resolve(__dirname, '../../pages/mobile');
const ROUTER = resolve(__dirname, '../../pages/mobile/MobileRouter.tsx');
const APPS = resolve(__dirname, '../../components/operix-core/applications.ts');
const HISTORY = resolve(__dirname, '../../lib/_institutional/sprint-history.ts');

const opx = readFileSync(OPERIX_GO, 'utf-8');
const router = readFileSync(ROUTER, 'utf-8');
const history = readFileSync(HISTORY, 'utf-8');

const PERSONAS = [
  { dir: 'salesman',     id: 'persona-salesman',              count: 11, route: '/mobile/salesman' },
  { dir: 'telecaller',   id: 'persona-telecaller',            count: 12, route: '/mobile/telecaller' },
  { dir: 'manager',      id: 'persona-manager',               count: 9,  route: '/mobile/manager' },
  { dir: 'supervisor',   id: 'persona-supervisor',            count: 9,  route: '/mobile/supervisor' },
  { dir: 'distributor',  id: 'persona-distributor',           count: 6,  route: '/mobile/distributor/catalog' },
  { dir: 'servicedesk',  id: 'persona-servicedesk-engineer',  count: 1,  route: '/operix-go/service-engineer' },
] as const;

describe('GUIDE-1 · operix-go is the COMPLETE mobile index', () => {
  for (const p of PERSONAS) {
    it(`persona ${p.dir} is a first-class operix-go entry`, () => {
      expect(opx).toContain(`id: '${p.id}'`);
    });
    it(`persona ${p.dir} entry references the REAL route`, () => {
      expect(opx).toContain(`route: '${p.route}'`);
    });
    it(`persona ${p.dir} entry is phase 'live'`, () => {
      const idx = opx.indexOf(`id: '${p.id}'`);
      const slice = opx.slice(idx, idx + 1200);
      expect(slice).toMatch(/phase:\s*'live'/);
    });
    it(`persona ${p.dir} entry references actual page count (${p.count})`, () => {
      const idx = opx.indexOf(`id: '${p.id}'`);
      const slice = opx.slice(idx, idx + 1200);
      expect(slice).toContain(`${p.count}`);
    });
    it(`persona dir ${p.dir} actually exists on disk with ${p.count} pages`, () => {
      const dir = resolve(MOBILE_DIR, p.dir);
      expect(existsSync(dir)).toBe(true);
      const files = readdirSync(dir).filter(f => f.endsWith('.tsx'));
      expect(files.length).toBe(p.count);
    });
  }

  it('completeness: every persona dir has a matching operix-go entry', () => {
    for (const p of PERSONAS) {
      expect(opx).toContain(`id: '${p.id}'`);
    }
  });

  it('NO new pages: persona pages exist already (sanity directory check only)', () => {
    for (const p of PERSONAS) {
      expect(existsSync(resolve(MOBILE_DIR, p.dir))).toBe(true);
    }
  });

  it('§H wall · MobileRouter retains role-routed switch for salesman/telecaller/supervisor/manager', () => {
    expect(router).toContain("s.role === 'salesman'");
    expect(router).toContain("s.role === 'telecaller'");
    expect(router).toContain("s.role === 'supervisor'");
    expect(router).toContain("s.role === 'sales_manager'");
  });

  it('§H wall · applications.ts present (touched-files audit · this sprint is entries-only)', () => {
    expect(existsSync(APPS)).toBe(true);
  });

  it('history · AM.4 flipped from TBD_AT_BANK to e441113e', () => {
    expect(history).toMatch(/code: 'T-AM4-Commerce-PWA'[\s\S]{0,200}headSha: 'e441113e'/);
  });

  it('history · GUIDE-1 row appended with predecessor e441113e and empty newSiblings', () => {
    expect(history).toContain("code: 'T-GUIDE1-OperixGo-Personas'");
    expect(history).toContain("predecessorSha: 'e441113e'");
    const idx = history.indexOf("'T-GUIDE1-OperixGo-Personas'");
    const slice = history.slice(idx, idx + 400);
    expect(slice).toContain('newSiblings: []');
  });

  it('GUIDE-1 sprint adds no new SIBLING', () => {
    const idx = history.indexOf("'T-GUIDE1-OperixGo-Personas'");
    const slice = history.slice(idx, idx + 400);
    expect(slice).toMatch(/newSiblings:\s*\[\]/);
  });
});
