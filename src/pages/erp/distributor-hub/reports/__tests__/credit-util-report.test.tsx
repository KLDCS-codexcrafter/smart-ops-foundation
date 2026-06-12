import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CreditUtilReportPanel } from '../CreditUtilReport';

describe('RPT-7c · db-credit-util (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge + chart host', () => {
    render(<MemoryRouter><CreditUtilReportPanel /></MemoryRouter>);
    expect(screen.getByTestId('db-credit-util-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('db-credit-util-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('db-credit-util-chart-host')).toBeInTheDocument();
  });
});
