/**
 * @file form24q.test.tsx — RPT-2e-iii
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Form24QPanel } from '../Form24Q';

describe('Form24Q (RPT-2e-iii wrap)', () => {
  it('mounts toggle host + period + integrity badge', () => {
    render(<Form24QPanel entityCode="TEST_ENT" />);
    expect(screen.getByTestId('fc-form24q-toggle-host')).toBeInTheDocument();
    expect(screen.getByTestId('fc-form24q-period-chip')).toBeInTheDocument();
    expect(screen.getByTestId('fc-form24q-integrity-badge')).toBeInTheDocument();
    expect(screen.getByTestId('table-chart-toggle')).toBeInTheDocument();
  });
});
