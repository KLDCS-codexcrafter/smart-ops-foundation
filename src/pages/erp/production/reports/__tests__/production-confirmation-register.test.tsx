/**
 * @file production-confirmation-register.test.tsx — RPT-6a dashboard recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProductionConfirmationRegisterPanel as Comp } from '../ProductionConfirmationRegister';

describe('RPT-6a · prod-confirmation (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<MemoryRouter><Comp /></MemoryRouter>);
    expect(screen.getByTestId('prod-confirmation-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('prod-confirmation-integrity-badge')).toBeInTheDocument();
  });
});
