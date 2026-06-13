/**
 * @file        stock-availability-guard.test.ts
 * @sprint      W1C-5 · Block 3 · audit B-02 HIGH
 * @purpose     Attack-test: stock-issue OUT > available MUST throw.
 *              Override via CompanySettings.allow_negative_stock is audit-logged.
 *              Untracked items pass (cannot assert what isn't tracked).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createStockIssue, postStockIssue } from '@/lib/stock-issue-engine';
import type { CompanySettings } from '@/types/company-settings';

const ENTITY = 'W1C5STK';
const ENTITY_ID = 'ent-w1c5-stk';

function seedInventory(itemName: string, onHand: number) {
  localStorage.setItem('erp_inventory_items', JSON.stringify([
    { name: itemName, itemName, on_hand_qty: onHand },
  ]));
}

function seedSetting(allow: boolean) {
  const s: CompanySettings = {
    id: 'cs-1', entity_id: ENTITY_ID,
    mrp_tax_treatment: 'inclusive',
    mrp_tax_treatment_label: 'Tax Inclusive',
    rate_change_requires_reason: true,
    base_currency: 'INR',
    money_decimal_places: null,
    default_costing_method: 'weighted_avg',
    allow_negative_stock: allow,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  localStorage.setItem('erp_company_settings', JSON.stringify([s]));
}

async function makeIssue(itemName: string, qty: number) {
  return createStockIssue({
    entity_id: ENTITY_ID,
    department_id: null, department_name: 'Prod',
    recipient_id: null, recipient_name: 'Foreman',
    purpose: 'attack-test',
    lines: [{
      item_id: 'i1', item_code: 'I1', item_name: itemName,
      uom: 'pcs', qty, rate: 10,
      source_godown_id: 'g1', source_godown_name: 'G1',
    }],
  }, ENTITY, 'u-1');
}

describe('W1C-5 · Block 3 · Stock Availability guard (attack-test)', () => {
  beforeEach(() => { localStorage.clear(); });

  it('THROWS when requested > available on tracked item', async () => {
    seedInventory('Widget-A', 5);
    const si = await makeIssue('Widget-A', 10);
    await expect(postStockIssue(si.id, ENTITY, 'u-1'))
      .rejects.toThrow(/Insufficient stock: Widget-A available 5, requested 10/);
  });

  it('ALLOWS when requested <= available', async () => {
    seedInventory('Widget-B', 20);
    const si = await makeIssue('Widget-B', 8);
    await expect(postStockIssue(si.id, ENTITY, 'u-1')).resolves.toBeTruthy();
  });

  it('ALLOWS shortage when allow_negative_stock=true (audit-logged)', async () => {
    seedInventory('Widget-C', 1);
    seedSetting(true);
    const si = await makeIssue('Widget-C', 50);
    const out = await postStockIssue(si.id, ENTITY, 'u-1');
    expect(out?.status).toBe('issued');
  });

  it('ALLOWS untracked item (not in inventory map) — cannot assert', async () => {
    // No inventory seed — item is untracked
    const si = await makeIssue('Ghost-Item', 999);
    await expect(postStockIssue(si.id, ENTITY, 'u-1')).resolves.toBeTruthy();
  });
});
