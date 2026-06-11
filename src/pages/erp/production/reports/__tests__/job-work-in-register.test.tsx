/**
 * @file job-work-in-register.test.tsx — RPT-6a dashboard recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { JobWorkInRegisterPanel as Comp } from '../JobWorkInRegister';

describe('RPT-6a · prod-jw-in (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<MemoryRouter><Comp /></MemoryRouter>);
    expect(screen.getByTestId('prod-jw-in-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('prod-jw-in-integrity-badge')).toBeInTheDocument();
  });
});
