/**
 * @file production-trace-register.test.tsx — RPT-6a dashboard recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProductionTraceRegisterPanel as Comp } from '../ProductionTraceRegister';

describe('RPT-6a · prod-trace (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<MemoryRouter><Comp /></MemoryRouter>);
    expect(screen.getByTestId('prod-trace-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('prod-trace-integrity-badge')).toBeInTheDocument();
  });
});
