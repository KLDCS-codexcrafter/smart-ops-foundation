import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AddressBookReportPage } from '../AddressBookReportPage';

describe('RPT-8b · fd-addressbook (toggle recipe)', () => {
  it('mounts TableChartToggle host + integrity badge, defaults to Table', () => {
    render(<AddressBookReportPage />);
    expect(screen.getByTestId('fd-addressbook-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('fd-addressbook-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('tct-tab-table')).toHaveAttribute('data-state', 'active');
  });
});
