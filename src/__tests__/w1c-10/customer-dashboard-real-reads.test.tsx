/**
 * @sprint W1C-10 · T-W1C10-Smoke-Cleanup · F-2
 * Behavioral: CustomerDashboard reads real seeded customer orders from the
 * canonical key and renders them; empty entity → honest empty-state with no
 * synthetic rows.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { customerOrdersKey, type CustomerOrder } from '@/types/customer-order';
import CustomerDashboard from '@/pages/customer/CustomerDashboard';

const ENTITY = 'SMRT';

const dashSrc = readFileSync('src/pages/customer/CustomerDashboard.tsx', 'utf8');

function makeOrder(overrides: Partial<CustomerOrder>): CustomerOrder {
  const now = new Date().toISOString();
  return {
    id: 'o1', order_no: 'ORD-W1C10-001',
    customer_id: 'CUST-1', customer_name: 'Test Customer',
    entity_code: ENTITY, status: 'delivered',
    lines: [{ id: 'l1', item_id: 'i1', item_code: 'IC1', item_name: 'Widget', uom: 'PCS', qty: 2, unit_price_paise: 50000, line_total_paise: 100000 }],
    subtotal_paise: 100000, applied_schemes: [],
    scheme_discount_paise: 0, loyalty_points_redeemed: 0,
    loyalty_discount_paise: 0, net_payable_paise: 100000,
    loyalty_points_earned: 0,
    placed_at: now, delivered_at: now,
    created_at: now, updated_at: now,
    ...overrides,
  };
}

describe('W1C-10 F-2 · CustomerDashboard real reads', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('source file has no hardcoded RECENT_INVOICES/RECENT_ORDERS/MONTHLY_PURCHASES constants', () => {
    expect(dashSrc).not.toMatch(/const\s+RECENT_INVOICES\s*=/);
    expect(dashSrc).not.toMatch(/const\s+RECENT_ORDERS\s*=/);
    expect(dashSrc).not.toMatch(/const\s+MONTHLY_PURCHASES\s*=/);
    expect(dashSrc).toMatch(/customerOrdersKey/);
  });

  it('renders honest empty-state when entity has no seeded orders', () => {
    render(
      <MemoryRouter><CustomerDashboard /></MemoryRouter>
    );
    expect(screen.getByText(/No transactions yet/i)).toBeInTheDocument();
    // No synthetic invoice numbers like INV-2026-0412 (the deleted hardcoded fake)
    expect(screen.queryByText(/INV-2026-0412/)).toBeNull();
  });

  it('renders real seeded orders (no fakes injected)', () => {
    const orders = [
      makeOrder({ id: 'o1', order_no: 'ORD-W1C10-001' }),
      makeOrder({ id: 'o2', order_no: 'ORD-W1C10-002', status: 'placed', delivered_at: null }),
    ];
    localStorage.setItem(customerOrdersKey(ENTITY), JSON.stringify(orders));

    render(
      <MemoryRouter><CustomerDashboard /></MemoryRouter>
    );

    // Real seeded order numbers appear (we render multiple instances — both panels)
    expect(screen.getAllByText('ORD-W1C10-001').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ORD-W1C10-002').length).toBeGreaterThan(0);
    // Empty-state is gone
    expect(screen.queryByText(/No transactions yet/i)).toBeNull();
    // The deleted hardcoded synthetic row must NOT appear
    expect(screen.queryByText(/INV-2026-0412/)).toBeNull();
  });
});
