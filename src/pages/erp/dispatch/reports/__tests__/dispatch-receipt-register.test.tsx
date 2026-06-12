import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DispatchReceiptRegisterPanel } from '../DispatchReceiptRegister';

describe('RPT-8a · dp-receipts (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge + chart host', () => {
    render(<MemoryRouter><DispatchReceiptRegisterPanel /></MemoryRouter>);
    expect(screen.getByTestId('dp-receipts-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('dp-receipts-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('dp-receipts-chart-host')).toBeInTheDocument();
  });
});
