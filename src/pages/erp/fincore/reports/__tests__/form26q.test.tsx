/**
 * @file form26q.test.tsx — RPT-2e-iii
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Form26QPanel } from '../Form26Q';

describe('Form26Q (RPT-2e-iii wrap)', () => {
  it('mounts toggle host + period + integrity badge', () => {
    render(<Form26QPanel entityCode="TEST_ENT" />);
    expect(screen.getByTestId('fc-form26q-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('fc-form26q-period-chip')).toBeInTheDocument();
    expect(screen.getByTestId('fc-form26q-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
  });
});
