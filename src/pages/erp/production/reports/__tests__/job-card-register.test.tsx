/**
 * @file job-card-register.test.tsx — RPT-6a dashboard recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { JobCardRegisterPanel as Comp } from '../JobCardRegister';

describe('RPT-6a · prod-jobcard (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<MemoryRouter><Comp /></MemoryRouter>);
    expect(screen.getByTestId('prod-jobcard-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('prod-jobcard-integrity-badge')).toBeInTheDocument();
  });
});
