/**
 * @file process-batch-register.test.tsx — RPT-6a dashboard recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProcessBatchRegisterPanel as Comp } from '../ProcessBatchRegister';

describe('RPT-6a · prod-batch (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<MemoryRouter><Comp /></MemoryRouter>);
    expect(screen.getByTestId('prod-batch-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('prod-batch-integrity-badge')).toBeInTheDocument();
  });
});
