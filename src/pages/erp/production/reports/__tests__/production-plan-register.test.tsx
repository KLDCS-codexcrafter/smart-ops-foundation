/**
 * @file production-plan-register.test.tsx — RPT-6a toggle recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProductionPlanRegisterPanel as Comp } from '../ProductionPlanRegister';

describe('RPT-6a · prod-plan (toggle recipe)', () => {
  it('mounts toggle host + integrity badge', () => {
    render(<MemoryRouter><Comp /></MemoryRouter>);
    expect(screen.getByTestId('prod-plan-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('prod-plan-integrity-badge')).toBeInTheDocument();
  });
});
