import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PackingSlipRegisterPanel } from '../PackingSlipRegister';

describe('RPT-8a · dp-packing (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge + chart host', () => {
    render(<MemoryRouter><PackingSlipRegisterPanel /></MemoryRouter>);
    expect(screen.getByTestId('dp-packing-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('dp-packing-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('dp-packing-chart-host')).toBeInTheDocument();
  });
});
