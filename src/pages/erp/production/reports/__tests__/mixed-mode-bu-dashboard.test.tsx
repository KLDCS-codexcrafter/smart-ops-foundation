/**
 * @file mixed-mode-bu-dashboard.test.tsx — RPT-6a toggle recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Comp from '../MixedModeBUDashboard';

describe('RPT-6a · prod-mixed-bu (toggle recipe)', () => {
  it('mounts toggle host + integrity badge', () => {
    render(<MemoryRouter><Comp /></MemoryRouter>);
    expect(screen.getByTestId('prod-mixed-bu-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('prod-mixed-bu-integrity-badge')).toBeInTheDocument();
  });
});
