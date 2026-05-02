/**
 * Sprint T-Phase-2.7-e · OOB-9 Quick-Add + OOB-10 Pinned Templates
 * Tests PT1-PT4 (target vitest 252/252).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { upsertParty, loadPartyMaster } from '@/lib/party-master-engine';
import {
  pinTemplate,
  loadPinnedTemplatesForWidget,
  cloneTemplateToFormState,
} from '@/lib/pinned-templates-engine';
import { LEGACY_CUSTOMER_KEY, partyMasterKey } from '@/types/party';
import { pinnedTemplatesKey, PINNED_TEMPLATES_WIDGET_LIMIT } from '@/types/pinned-template';

const ENTITY = 'TST_PT';

beforeEach(() => {
  localStorage.clear();
});

describe('Sprint 2.7-e · OOB-9 Quick-Add', () => {
  it('PT1 · upsertParty creates with created_via_quick_add=true and syncs legacy customer key', () => {
    const r = upsertParty({
      entity_id: ENTITY,
      party_name: 'Acme Traders',
      party_type: 'customer',
      created_via_quick_add: true,
      created_by: 'u1',
    });
    expect(r.isNew).toBe(true);
    expect(r.party.created_via_quick_add).toBe(true);
    expect(r.party.party_code).toMatch(/^CUST\/0001$/);

    const canonical = JSON.parse(localStorage.getItem(partyMasterKey(ENTITY)) ?? '[]');
    expect(canonical).toHaveLength(1);

    const legacy = JSON.parse(localStorage.getItem(LEGACY_CUSTOMER_KEY) ?? '[]');
    expect(legacy.some((c: { partyName: string }) => c.partyName === 'Acme Traders')).toBe(true);
  });

  it('PT2 · upsertParty returns warning for malformed GSTIN but does NOT block save', () => {
    const r = upsertParty({
      entity_id: ENTITY,
      party_name: 'Bad GST Co',
      party_type: 'vendor',
      gstin: 'BADGSTIN',
      created_via_quick_add: true,
    });
    expect(r.isNew).toBe(true);
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.warnings.some((w) => w.toLowerCase().includes('gstin'))).toBe(true);
    expect(loadPartyMaster(ENTITY)).toHaveLength(1);
  });
});

describe('Sprint 2.7-e · OOB-10 Pinned Templates', () => {
  it('PT3 · pinTemplate + cloneTemplateToFormState round-trip preserves qty/rate · use_count increments', () => {
    const tpl = pinTemplate({
      entity_id: ENTITY,
      template_name: 'Monthly rent',
      voucher_type_id: 'INVOICE',
      voucher_type_name: 'Invoice',
      party_id: 'p1',
      party_name: 'ABC Properties',
      party_type: 'customer',
      line_items: [
        { item_name: 'Rent', qty: 1, rate: 50000 },
        { item_name: 'Maintenance', qty: 1, rate: 5000 },
      ],
      narration: 'Office rent',
      pinned_by: 'u1',
    });
    expect(tpl.use_count).toBe(0);

    const cloned = cloneTemplateToFormState(ENTITY, tpl.id);
    expect(cloned).not.toBeNull();
    expect(cloned!.line_items).toHaveLength(2);
    expect(cloned!.line_items[0].qty).toBe(1);
    expect(cloned!.line_items[0].rate).toBe(50000);
    expect(cloned!.party_id).toBe('p1');
    expect(cloned!.narration).toBe('Office rent');

    const after = loadPinnedTemplatesForWidget(ENTITY)[0];
    expect(after.use_count).toBe(1);
    expect(Date.parse(after.last_used_at)).toBeGreaterThanOrEqual(Date.parse(tpl.last_used_at));
  });

  it('PT4 · loadPinnedTemplatesForWidget caps at 20 sorted by last_used_at desc · empty when none', () => {
    expect(loadPinnedTemplatesForWidget(ENTITY)).toEqual([]);

    for (let i = 0; i < 25; i++) {
      pinTemplate({
        entity_id: ENTITY,
        template_name: `T${i}`,
        voucher_type_id: 'GRN',
        voucher_type_name: 'GRN',
        party_id: `pty_${i}`,
        line_items: [{ item_name: `item_${i}`, qty: i + 1, rate: 100 }],
        pinned_by: 'u1',
      });
    }

    const stored = JSON.parse(localStorage.getItem(pinnedTemplatesKey(ENTITY)) ?? '[]');
    expect(stored.length).toBe(25);

    const widget = loadPinnedTemplatesForWidget(ENTITY);
    expect(widget.length).toBe(PINNED_TEMPLATES_WIDGET_LIMIT);
    for (let i = 1; i < widget.length; i++) {
      expect(Date.parse(widget[i - 1].last_used_at)).toBeGreaterThanOrEqual(
        Date.parse(widget[i].last_used_at),
      );
    }
  });
});
