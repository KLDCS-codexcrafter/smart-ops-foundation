/**
 * @file process-genealogy-tracker.test.tsx — RPT-6a dashboard recipe
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProcessGenealogyTrackerPanel as Comp } from '../ProcessGenealogyTracker';

describe('RPT-6a · prod-genealogy (dashboard recipe)', () => {
  it('mounts dashboard host + integrity badge', () => {
    render(<MemoryRouter><Comp /></MemoryRouter>);
    expect(screen.getByTestId('prod-genealogy-dashboard-host')).toBeInTheDocument();
    expect(screen.getByTestId('prod-genealogy-integrity-badge')).toBeInTheDocument();
  });
});
