/**
 * @file monthly-production-accounts.test.tsx
 * @sprint RPT-1b · MonthlyProductionAccounts wrap
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MonthlyProductionAccounts from '../MonthlyProductionAccounts';
import { setLocale } from '@/lib/i18n-engine';

vi.mock('@/hooks/useEntityCode', () => ({
  useEntityCode: () => ({ entityCode: 'E1' }),
}));

function setup() {
  // CL-FREEZE-FIX · self-seed: reset i18n singleton (module state survives
  // localStorage.clear) so a prior test that flipped locale to 'hi' cannot
  // bleed the Hindi title into this English-asserting test.
  setLocale('en');
  localStorage.setItem(
    'erp_companies',
    JSON.stringify([{ entityCode: 'E1', legalEntityName: 'Acme Mfg', businessActivity: 'Manufacturing' }]),
  );
}

beforeEach(() => { setup(); });

describe('RPT-1b · MonthlyProductionAccounts', () => {
  it('renders title', () => {
    setup();
    render(<MonthlyProductionAccounts />);
    expect(screen.getAllByText(/Monthly Production Accounts/i).length).toBeGreaterThanOrEqual(1);
  });
  it('preserves Raw Materials Consumed section', () => {
    setup();
    render(<MonthlyProductionAccounts />);
    expect(screen.getByText('Raw Materials Consumed')).toBeInTheDocument();
  });
  it('mounts TableChartToggle defaulting to Table', () => {
    setup();
    render(<MonthlyProductionAccounts />);
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table').getAttribute('data-state')).toBe('active');
  });
  it('renders integrity badge + period chip', () => {
    setup();
    render(<MonthlyProductionAccounts />);
    expect(screen.getByTestId('mpa-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('mpa-period-chip')).toBeInTheDocument();
  });
});
