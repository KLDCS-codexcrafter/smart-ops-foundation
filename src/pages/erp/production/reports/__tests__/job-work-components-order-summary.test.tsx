/**
 * @file job-work-components-order-summary.test.tsx — RPT-6a toggle recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { JobWorkComponentsOrderSummaryPanel as Comp } from '../JobWorkComponentsOrderSummary';

describe('RPT-6a · prod-jw-components (toggle recipe)', () => {
  it('mounts toggle host + integrity badge', () => {
    render(<MemoryRouter><Comp /></MemoryRouter>);
    expect(screen.getByTestId('prod-jw-components-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('prod-jw-components-integrity-badge')).toBeInTheDocument();
  });
});
