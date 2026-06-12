import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InwardReceiptRegisterPanel } from '../InwardReceiptRegister';

describe('RPT-8a · dp-inward (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge + chart host', () => {
    render(<MemoryRouter><InwardReceiptRegisterPanel /></MemoryRouter>);
    expect(screen.getByTestId('dp-inward-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('dp-inward-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('dp-inward-chart-host')).toBeInTheDocument();
  });
});
