/**
 * @file repetitive-line-oee-report.test.tsx — RPT-6a toggle recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Comp from '../RepetitiveLineOEEReport';

describe('RPT-6a · prod-line-oee (toggle recipe)', () => {
  it('mounts toggle host + integrity badge', () => {
    render(<MemoryRouter><Comp /></MemoryRouter>);
    expect(screen.getByTestId('prod-line-oee-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('prod-line-oee-integrity-badge')).toBeInTheDocument();
  });
});
