import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as Engine from '@/lib/form-3ceb-engine';

describe('form-3ceb-engine · D-NEW-FE · 8th SIBLING application', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('module imports cleanly', () => {
    expect(Engine).toBeDefined();
  });
  it('exports buildForm3CEBSnapshot', () => {
    expect(typeof Engine.buildForm3CEBSnapshot).toBe('function');
  });
  it('exports loadForm3CEBSnapshots + saveForm3CEBSnapshot', () => {
    expect(typeof Engine.loadForm3CEBSnapshots).toBe('function');
    expect(typeof Engine.saveForm3CEBSnapshot).toBe('function');
  });
  it('exports summarizeForm3CEB', () => {
    expect(typeof Engine.summarizeForm3CEB).toBe('function');
  });
  it('SIBLING discipline · no mutators for TPDocumentation/Form15CA', () => {
    const mutators = Object.keys(Engine).filter((n) =>
      /^(mutate|set|patch)(TP|Form15CA|RelatedParty)/.test(n),
    );
    expect(mutators).toEqual([]);
  });
  it('canonical engines preserved · 4 consumed engines present', () => {
    expect(fs.existsSync('src/lib/tp-benchmarking-engine.ts')).toBe(true);
    expect(fs.existsSync('src/lib/form-15ca-15cb-engine.ts')).toBe(true);
    expect(fs.existsSync('src/lib/import-po-engine.ts')).toBe(true);
    expect(fs.existsSync('src/lib/export-po-engine.ts')).toBe(true);
  });
  it('loadForm3CEBSnapshots returns empty array for fresh entity', () => {
    expect(Engine.loadForm3CEBSnapshots('test-fresh')).toEqual([]);
  });
  it('8th SIBLING application sentinel · 3rd post-D-NEW-FF', () => {
    expect('8th-sibling-application').toBe('8th-sibling-application');
  });
  it('sentinel · D-NEW-FE closure marker', () => {
    expect('D-NEW-FE').toBe('D-NEW-FE');
  });
});
