import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StockMovementRegisterPanel } from '../StockMovementRegister';

describe('RPT-6b · st-movement (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<MemoryRouter><StockMovementRegisterPanel /></MemoryRouter>);
    expect(screen.getByTestId('st-movement-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('st-movement-integrity-badge')).toBeInTheDocument();
  });
});
