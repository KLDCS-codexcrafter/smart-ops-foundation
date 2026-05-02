/**
 * stock-viz-saveandnew-autosave-smartdefaults.test.ts
 * Sprint T-Phase-2.7-d-1 · 6 new tests SD1-SD6
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  getDetailedAvailabilityMap,
} from '@/lib/stock-reservation-engine';
import {
  extractCarryOverFields,
  applyCarryOverToForm,
} from '@/lib/save-and-new-carryover';
import { useDraftAutoSave } from '@/hooks/useDraftAutoSave';
import { resolveSmartLedger } from '@/lib/smart-defaults-engine';
import { stockReservationsKey, type StockReservation } from '@/types/stock-reservation';

const ENTITY = 'TEST';

function seedReservations(rows: Partial<StockReservation>[]) {
  const now = new Date().toISOString();
  const full: StockReservation[] = rows.map((r, i) => ({
    id: r.id ?? `r${i}`,
    entity_id: ENTITY,
    item_name: r.item_name ?? 'WIDGET',
    reserved_qty: r.reserved_qty ?? 1,
    level: r.level ?? 'quote',
    status: r.status ?? 'active',
    source_type: r.source_type ?? 'quotation',
    source_id: r.source_id ?? `s${i}`,
    source_no: r.source_no ?? `Q${i}`,
    customer_name: null,
    salesman_name: null,
    reserved_at: now,
    expires_at: null,
    released_at: null,
    created_at: now,
    updated_at: now,
    project_centre_id: null,
  }));
  localStorage.setItem(stockReservationsKey(ENTITY), JSON.stringify(full));
}

function seedInventory(items: Array<{ name: string; on_hand_qty: number }>) {
  localStorage.setItem(
    'erp_inventory_items',
    JSON.stringify(items.map(i => ({ name: i.name, itemName: i.name, on_hand_qty: i.on_hand_qty }))),
  );
}

describe('Sprint 2.7-d-1 · SD1-SD6', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // SD1
  it('SD1 · getDetailedAvailabilityMap splits quote vs order reservations', () => {
    seedInventory([{ name: 'WIDGET', on_hand_qty: 100 }]);
    seedReservations([
      { item_name: 'WIDGET', reserved_qty: 5, level: 'quote' },
      { item_name: 'WIDGET', reserved_qty: 3, level: 'quote' },
      { item_name: 'WIDGET', reserved_qty: 7, level: 'order' },
    ]);
    const map = getDetailedAvailabilityMap(['WIDGET'], ENTITY);
    const cell = map.get('WIDGET')!;
    expect(cell.onHand).toBe(100);
    expect(cell.reservedByQuotes).toBe(8);
    expect(cell.reservedByOrders).toBe(7);
    expect(cell.totalReserved).toBe(15);
    expect(cell.available).toBe(85);
  });

  // SD2
  it('SD2 · status thresholds (red/amber/green)', () => {
    seedInventory([
      { name: 'A', on_hand_qty: 5 },   // available 5 vs requested 10 → red
      { name: 'B', on_hand_qty: 15 },  // available 15 vs requested 10 → amber (15 < 20)
      { name: 'C', on_hand_qty: 50 },  // available 50 vs requested 10 → green (50 >= 20)
    ]);
    const requested = new Map([['A', 10], ['B', 10], ['C', 10]]);
    const map = getDetailedAvailabilityMap(['A', 'B', 'C'], ENTITY, requested);
    expect(map.get('A')!.status).toBe('red');
    expect(map.get('B')!.status).toBe('amber');
    expect(map.get('C')!.status).toBe('green');
  });

  // SD3
  it('SD3 · extractCarryOverFields picks date+voucher_type+party · drops everything else', () => {
    const saved = {
      voucher_date: '2026-05-02',
      voucher_type_id: 'vt-q',
      voucher_type_name: 'Quotation',
      customer_id: 'cust-1',
      customer_name: 'Acme Pvt Ltd',
      total_amount: 99999,                 // should be dropped
      items: [{ item_name: 'X', qty: 1 }], // should be dropped
      narration: 'do not carry',           // should be dropped
    };
    const co = extractCarryOverFields(saved);
    expect(co.voucher_date).toBe('2026-05-02');
    expect(co.voucher_type_id).toBe('vt-q');
    expect(co.voucher_type_name).toBe('Quotation');
    expect(co.customer_id).toBe('cust-1');
    expect(co.customer_name).toBe('Acme Pvt Ltd');
    expect((co as Record<string, unknown>).total_amount).toBeUndefined();
    expect((co as Record<string, unknown>).items).toBeUndefined();
    expect((co as Record<string, unknown>).narration).toBeUndefined();
  });

  // SD4
  it('SD4 · applyCarryOverToForm idempotent · does not mutate input', () => {
    const blank = { voucher_date: '', customer_id: '', narration: '' };
    const co = { voucher_date: '2026-05-02', customer_id: 'C1' };
    const before = JSON.stringify(blank);
    const r1 = applyCarryOverToForm(blank, co);
    const r2 = applyCarryOverToForm(r1, co);
    expect(JSON.stringify(blank)).toBe(before);     // input not mutated
    expect(r1).toEqual(r2);                         // idempotent
    expect(r1.voucher_date).toBe('2026-05-02');
    expect(r1.customer_id).toBe('C1');
    expect(r1.narration).toBe('');                  // unaffected blank field preserved
  });

  // SD5
  it('SD5 · useDraftAutoSave writes to correct localStorage key on interval', () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() =>
        useDraftAutoSave('quotation-new', ENTITY, { foo: 1 }, 30000),
      );
      expect(result.current.hasDraft).toBe(false);
      act(() => {
        vi.advanceTimersByTime(30001);
      });
      const raw = localStorage.getItem(`erp_draft_quotation-new_${ENTITY}`);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(typeof parsed.savedAt).toBe('string');
      const data = JSON.parse(parsed.formData);
      expect(data.foo).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  // SD6
  it('SD6 · resolveSmartLedger returns top frequency · null on empty', () => {
    expect(resolveSmartLedger('GRN', ENTITY)).toBeNull();
    const grns = [
      { ledger_id: 'L1', ledger_name: 'Purchases A' },
      { ledger_id: 'L1', ledger_name: 'Purchases A' },
      { ledger_id: 'L1', ledger_name: 'Purchases A' },
      { ledger_id: 'L2', ledger_name: 'Purchases B' },
    ];
    localStorage.setItem(`erp_grns_${ENTITY}`, JSON.stringify(grns));
    const r = resolveSmartLedger('GRN', ENTITY);
    expect(r).not.toBeNull();
    expect(r!.ledger_id).toBe('L1');
    expect(r!.occurrence_count).toBe(3);
    expect(r!.confidence).toBe('med'); // 3 occurrences = med (2-5)
  });

  afterEach(() => {
    localStorage.clear();
  });
});
