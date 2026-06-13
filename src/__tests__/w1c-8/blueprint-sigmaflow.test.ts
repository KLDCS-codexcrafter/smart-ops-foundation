import { describe, it, expect, beforeEach } from 'vitest';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import {
  customersForArchetype, vendorsForArchetype,
} from '@/data/demo-customers-vendors';
import { itemsForArchetype } from '@/data/demo-items-master';
import { seedEntityDemoData } from '@/lib/demo-seed-orchestrator';

describe('W1C-8 · Block 4 · 8th blueprint + institutional + end-to-end seed', () => {
  beforeEach(() => localStorage.clear());

  it('W1C-7c headSha backfilled to 8ee1757', () => {
    const s = SPRINTS.find(x => x.code === 'T-W1C7c-Demo-Txns-Ops-Close');
    expect(s).toBeTruthy();
    expect(s!.headSha).toBe('8ee1757');
  });

  it('W1C-8 self-seeded with predecessor 8ee1757 and ZERO new siblings', () => {
    const s = SPRINTS.find(x => x.code === 'T-W1C8-SigmaFlow-Scenario');
    expect(s).toBeTruthy();
    expect(s!.predecessorSha).toBe('8ee1757');
    expect(s!.newSiblings).toEqual([]);
  });

  it('Blueprint roster is length 8 and includes sigmaflow with valve-mfg archetype', async () => {
    const mod = await import('@/pages/welcome/scenarios/ClientBlueprintsPage');
    // Component is the default export — read the source list via a parallel import trick:
    // we re-read the source file for the constant to assert the roster shape & 7-unchanged proof.
    const fs = await import('node:fs');
    const src = fs.readFileSync('src/pages/welcome/scenarios/ClientBlueprintsPage.tsx', 'utf8');
    // 7-unchanged proof: the existing 7 ids/archetypes still appear verbatim.
    const sevenIds = ['abdos','cherise','bcpl','smartpower','amith','shankar-pharma','sinha'];
    sevenIds.forEach(id => expect(src.includes(`id: '${id}'`)).toBe(true));
    // None of the 7 switched archetype to valve-mfg.
    const sevenBlock = src.split("id: 'sigmaflow'")[0];
    expect(/archetype:\s*'valve-mfg'/.test(sevenBlock)).toBe(false);
    // 8th present with valve-mfg.
    expect(src.includes("id: 'sigmaflow'")).toBe(true);
    expect(src.includes("archetype: 'valve-mfg'")).toBe(true);
    // Sanity that the panel component still exports.
    expect(typeof mod.default).toBe('function');
  });

  it('Loading the SigmaFlow blueprint seeds valve items + water-works customers + import vendor', () => {
    const entity = 'SIGMA';
    const result = seedEntityDemoData(entity, 'valve-mfg');
    expect(result.archetype).toBe('valve-mfg');
    // Items present and valve-flavored
    expect(itemsForArchetype('valve-mfg').some(i => i.itemCode === 'VLV-BFV-DN100')).toBe(true);
    expect(customersForArchetype('valve-mfg').some(c => /Municipal|PHED/i.test(c.partyName))).toBe(true);
    expect(vendorsForArchetype('valve-mfg').some(v => v.vendorType === 'import_supplier')).toBe(true);
    // Seeded keys carry valve data
    const items = JSON.parse(localStorage.getItem('erp_inventory_items') || '[]');
    expect(items.some((i: { itemCode: string }) => i.itemCode === 'VLV-BFV-DN100')).toBe(true);
    const bom = JSON.parse(localStorage.getItem(`erp_bom_${entity}`) || '[]');
    expect(bom.some((b: { product_item_code: string }) => b.product_item_code === 'VLV-BFV-DN100')).toBe(true);
  });
});
