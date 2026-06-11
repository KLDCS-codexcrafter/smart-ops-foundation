/**
 * @file form27q.test.tsx — RPT-2e-iii
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Form27QPanel } from '../Form27Q';

describe('Form27Q (RPT-2e-iii wrap)', () => {
  it('mounts toggle host + period + integrity badge', () => {
    render(<Form27QPanel entityCode="TEST_ENT" />);
    expect(screen.getByTestId('fc-form27q-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('fc-form27q-period-chip')).toBeInTheDocument();
    expect(screen.getByTestId('fc-form27q-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
  });
});
